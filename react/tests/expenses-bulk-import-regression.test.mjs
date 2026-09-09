import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/Expenses');
const cache = new Map();
let calls = [];
let failRequest = false;
class ApiClientError extends Error { constructor(status, payload) { super('API error'); this.status = status; this.payload = payload; } }
const api = async (url, options) => {
  calls.push({ url, method: options.method, body: JSON.parse(options.body) });
  if (failRequest) throw new ApiClientError(400, { message: 'Row 2: paymentAccountId is invalid for this company.' });
  return { expenses: [] };
};
function load(file) {
  const path = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts'), resolve(file, 'index.tsx')]
    .find(value => existsSync(value) && /\.tsx?$/.test(value));
  if (!path) throw new Error(`Missing module: ${file}`);
  if (path.endsWith('/lib/apiClient.ts')) return { apiClient: api, ApiClientError };
  if (path.endsWith('/hooks/useExpensesTranslations.ts')) return {
    useExpensesTranslations: () => load(resolve(root, 'translations/index.ts')).getFinanceTranslations('es-MX'),
    useExpensesResolvedLocale: () => 'es-MX',
  };
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, 'utf8').replaceAll('import.meta.env', '({DEV:false})'), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = id => id.endsWith('.css') ? {} : id.startsWith('.') ? load(resolve(dirname(path), id)) : createRequire(path)(id);
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { parseDate, displayDate, parseMoney } = load(resolve(root, 'utils/expenseBulkInput.ts'));
const { canEditExpense, canReclassifyExpense } = load(resolve(root, 'utils/expenseFilters.ts'));
const { expensesService } = load(resolve(root, 'services/expenses.service.ts'));
const { toExpense } = load(resolve(root, 'adapters/expense.adapter.ts'));
const { toFinanceApiErrorMessage } = load(resolve(root, 'services/finance-api.errors.ts'));
const expense = overrides => ({ id: '12', folio: 'AUTO-EXP', businessUnit: '', business: '', concept: 'Test', amount: 100,
  taxes: 0, total: 100, amountPaid: 0, currency: 'MXN', status: 'pending', backendStatus: 'DRAFT', version: 0,
  date: new Date(2026, 8, 8), paymentMethod: 'transfer', type: 'real', accountingAccount: '20', paymentAccountId: '30', ...overrides });

test('day/month/year, ISO, compact and Excel dates preserve their calendar day in positive and negative time zones', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Pacific/Kiritimati', 'America/Mexico_City', 'UTC']) {
      process.env.TZ = zone;
      for (const input of ['08/09/2026', '8-9-2026', '2026-09-08', '20260908', '46273']) {
        assert.equal(parseDate(input), '2026-09-08', `${zone}: ${input}`);
        assert.equal(displayDate(parseDate(input)), '08/09/2026');
      }
      for (const input of ['31/02/2026', '29/02/2025', '2026-13-01', '09/31/2026', 'text']) assert.equal(parseDate(input), '');
      assert.equal(parseDate('29/02/2024'), '2024-02-29');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test('amounts accept spreadsheet conventions without interchanging currencies', () => {
  for (const input of ['$7,567.00', '7.567,00', 'MXN 7567.00']) assert.equal(parseMoney(input, 'MXN'), 7567);
  for (const input of ['USD 100', '-10', '1,23.45', '100.1234', 'text']) assert.ok(Number.isNaN(parseMoney(input, 'MXN')));
});

test('a 35-row import sends one pending batch and keeps the same request key and payload on retry', async () => {
  calls = []; failRequest = false;
  const rows = Array.from({ length: 35 }, (_, i) => expense({ concept: `Test ${i}` }));
  await expensesService.importExpenses(rows, 'stable-key');
  await expensesService.importExpenses(rows, 'stable-key');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].url, '/api/v1/finance/expenses/import');
  assert.equal(calls[0].body.expenses.length, 35);
  for (const row of calls[0].body.expenses) {
    assert.equal(row.settleOnCreate, false);
    assert.equal(row.paymentAccountId, 30);
    assert.equal(row.accountingAccountId, 20);
    assert.equal(row.expenseDate, '2026-09-08');
    assert.equal(row.currencyCode, 'MXN');
  }
  failRequest = true;
  await assert.rejects(expensesService.importExpenses(rows, 'stable-key'), ApiClientError);
  assert.match(toFinanceApiErrorMessage(new ApiClientError(400, { message: 'Row 2: paymentAccountId is invalid for this company.' })), /^Fila 2: Selecciona una cuenta de pago/);
  failRequest = false;
});

test('funds and posted journals stay protected while ordinary paid expenses allow account-only classification', () => {
  const paid = expense({ backendStatus: 'PAID', status: 'paid' });
  assert.equal(canEditExpense(paid), false);
  assert.equal(canReclassifyExpense(paid), true);
  for (const protectedExpense of [expense({ originFund: { id: '1', name: 'Fund', type: 'INTERNAL_COMPANY' } }),
    expense({ accountingPosted: true }), expense({ backendStatus: 'CANCELLED' })]) {
    assert.equal(canEditExpense(protectedExpense), false);
    assert.equal(canReclassifyExpense(protectedExpense), false);
  }
});

test('paid imports send gross totals and explicit tax evidence while pending imports keep the independent due date', async () => {
  calls = []; failRequest = false;
  await expensesService.importExpenses([
    expense({ total: 116, amount: 116, status: 'paid', taxIncluded: true, taxRate: 0.16, taxName: 'IVA' }),
    expense({ total: 100, status: 'pending', taxIncluded: false, dueDate: new Date(2026, 9, 1) }),
  ], 'gross-import');
  const [paid, pending] = calls[0].body.expenses;
  assert.equal(paid.settleOnCreate, true);
  assert.equal(paid.totalAmount, 116);
  assert.equal(paid.customFields.bulkTaxIncluded, true);
  assert.equal(paid.customFields.taxRate, 0.16);
  assert.equal(paid.paymentAccountId, 30);
  assert.equal(pending.settleOnCreate, false);
  assert.equal(pending.dueDate, '2026-10-01');
  assert.equal(pending.customFields.bulkTaxIncluded, false);
});

test('bulk status sends selected versions and payment instruction without client-supplied paid amounts', async () => {
  calls = []; failRequest = false;
  await expensesService.applyBulkStatus([expense({ version: 4 }), expense({ id: '13', version: 7 })], {
    target: 'PAID', paymentAccountId: '30', effectiveDate: '2026-09-09', requestKey: 'selected-status',
  });
  assert.equal(calls[0].url, '/api/v1/finance/expenses/bulk-status');
  assert.deepEqual(calls[0].body, { target: 'PAID', paymentAccountId: 30, effectiveDate: '2026-09-09',
    requestKey: 'selected-status', rows: [{ id: 12, expectedVersion: 4 }, { id: 13, expectedVersion: 7 }] });
});

test('new payment and tax validation errors identify the row and the corrective action in Spanish', () => {
  assert.match(toFinanceApiErrorMessage(new ApiClientError(400, {
    message: 'Row 3: Paid imports require a payment account on every row.',
  })), /^Fila 3: Selecciona una cuenta de pago/);
  assert.match(toFinanceApiErrorMessage(new ApiClientError(400, {
    message: 'Row 2: Included tax rate must be greater than zero and at most 100 percent.',
  })), /^Fila 2: La tasa del impuesto/);
  assert.match(toFinanceApiErrorMessage(new ApiClientError(409, {
    message: 'Only open expenses with a remaining balance can change here. Paid expenses require a reversal.',
  })), /revertir el pago/);
});

test('an overdue ordinary row renders quick payment while paid and fund rows do not', () => {
  const { EditableExpenseRow } = load(resolve(root, 'Expenses/components/EditableExpenseRow.tsx'));
  const copy = load(resolve(root, 'translations/index.ts')).getFinanceTranslations('es-MX');
  const props = { expense: expense({ status: 'overdue', backendStatus: 'APPROVED' }), attachmentsCount: 0,
    columnWidths: {}, isEditing: false, isColumnVisible: key => key === 'actions', isSelected: false,
    workflow: {}, actionVisibility: { showMarkPaid: true, showRecordPayment: false, showAudit: false },
    options: { accountingAccounts: [], businessUnits: [], businesses: [], providers: [], statuses: [], paymentMethods: [], users: [] },
    onSelectionChange: () => {} };
  const label = `aria-label="${copy.expenses.rowActions.markPaid}"`;
  assert.ok(renderToStaticMarkup(React.createElement(EditableExpenseRow, props)).includes(label));
  for (const change of [{ status: 'paid', backendStatus: 'PAID', amountPaid: 100 },
    { originFund: { id: '1', name: 'Fund', type: 'INTERNAL_COMPANY' } }]) {
    const markup = renderToStaticMarkup(React.createElement(EditableExpenseRow, { ...props, expense: { ...props.expense, ...change } }));
    assert.ok(!markup.includes(label));
  }
});

test('classification API sends only the account and expected version, never replacement amounts or payments', async () => {
  calls = [];
  // The fake API response is irrelevant here; inspect the request even though its adapter needs an expense.
  await expensesService.reclassifyExpense(expense({ version: 4 }), '22').catch(() => {});
  assert.equal(calls[0].method, 'PATCH');
  assert.deepEqual(calls[0].body, { accountingAccountId: 22, expectedVersion: 4 });
});

test('fund provenance and version survive the API adapter', () => {
  const result = toExpense({ id: 12, companyId: 1, folio: 'F-12', concept: 'Receipt', status: 'PAID', paymentStatus: 'PAID',
    expenseDate: '2026-09-08', totalAmount: 100, subtotalAmount: 100, taxAmount: 0, paidAmount: 100, currencyCode: 'MXN',
    version: 7, originFund: { id: 3, name: 'Maintenance fund', type: 'INTERNAL_COMPANY' }, accountingPosted: true });
  assert.equal(result.version, 7);
  assert.deepEqual(result.originFund, { id: '3', name: 'Maintenance fund', type: 'INTERNAL_COMPANY' });
  assert.equal(result.accountingPosted, true);
});

test('account column renders the real fund name without a selector and keeps the paid ordinary selector available', () => {
  const { EditableExpenseRow } = load(resolve(root, 'Expenses/components/EditableExpenseRow.tsx'));
  const props = { expense: expense({ backendStatus: 'PAID', status: 'paid' }), attachmentsCount: 0, columnWidths: {}, isEditing: false,
    isColumnVisible: key => key === 'accountingAccount', isSelected: false, workflow: {},
    options: { accountingAccounts: [{ value: '20', label: '1010 - Caja' }], businessUnits: [], businesses: [], providers: [], statuses: [], paymentMethods: [], users: [] },
    onReclassifyExpense: async () => {}, onSelectionChange: () => {} };
  const ordinary = renderToStaticMarkup(React.createElement(EditableExpenseRow, props));
  assert.match(ordinary, /role="combobox"/);
  const fund = renderToStaticMarkup(React.createElement(EditableExpenseRow, { ...props,
    expense: { ...props.expense, originFund: { id: '1', name: 'Fondo mantenimiento', type: 'INTERNAL_COMPANY' } } }));
  assert.match(fund, /Fondo mantenimiento/);
  assert.doesNotMatch(fund, /role="combobox"/);
});
