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
function load(file) {
  const path = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts'), resolve(file, 'index.tsx')]
    .find(value => existsSync(value) && /\.tsx?$/.test(value));
  if (!path) throw new Error(`Missing module: ${file}`);
  if (path.endsWith('/shared/kpiMonetaryApi.ts')) return { getKpiMonetaryAggregates: async queries => monetaryApi(queries) };
  if (path.endsWith('/hooks/useAuthorizationRevision.ts')) return { useAuthorizationRevision: () => 0 };
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

let monetaryApi;
const { groupExpenseRows, sortExpenseRows, expenseGroupPeriodLabel } = load(resolve(root, 'utils/expenseFundGroups.ts'));
const { filterExpenses } = load(resolve(root, 'utils/expenseFilters.ts'));
const { loadExpenseFundTotals } = load(resolve(root, 'hooks/useExpenseFundTotals.ts'));
const now = new Date(2026, 8, 8);
const filters = { periodFilter: 'this_month', searchTerm: '', providerFilter: 'all', businessFilter: 'all', businessUnitFilter: 'all', statusFilter: 'all' };
const fund = { id: '8', name: 'Fondo mantenimiento', type: 'INTERNAL_COMPANY' };
const make = (id, overrides = {}) => ({ id: String(id), folio: `PCX-${id}`, originFund: fund, currency: 'MXN',
  amount: 100, total: 116, taxes: 16, amountPaid: 116, date: now, dueDate: now, status: 'paid', backendStatus: 'PAID',
  business: '2', businessUnit: '1', providerId: '3', providerName: 'Proveedor A', concept: `Gasto ${id}`,
  accountingAccount: '20', paymentMethod: 'cash', type: 'real', version: 1, ...overrides });

test('groups a complete fund before pagination and keeps every original receipt without mutating inputs', () => {
  const expenses = Array.from({ length: 35 }, (_, i) => make(i + 1));
  const ordinary = make(100, { originFund: undefined });
  const rows = groupExpenseRows([...expenses, ordinary, expenses[0]]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].expenses.length, 35);
  assert.equal(rows[1].expense, ordinary);
  assert.deepEqual(rows[0].expenses, expenses);
  assert.equal(rows[0].total, undefined, 'a group is not a synthetic expense');
  assert.equal(rows.slice(0, 1)[0].expenses.length, 35, 'page boundary never cuts a fund');
});

test('groups by identity and native currency; excludes external funds and does not call reversals authorized', () => {
  const rows = groupExpenseRows([make(1), make(2, { currency: 'USD' }),
    make(3, { originFund: { ...fund, id: '9' } }),
    make(4, { originFund: { ...fund, type: 'EXTERNAL_MANAGED' } }), make(5, { backendStatus: 'CANCELLED' })]);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.slice(0, 3).map(row => row.key), ['fund:8:MXN', 'fund:8:USD', 'fund:9:MXN']);
  assert.equal(rows[3].kind, 'expense');
});

test('period, provider, unit, business, status and fund-name search filter children before grouping', () => {
  const expenses = [make(1), make(2, { providerId: '4', providerName: 'Proveedor B' }),
    make(3, { date: new Date(2026, 7, 30) }), make(4, { businessUnit: '9', business: '8' })];
  assert.equal(groupExpenseRows(filterExpenses(expenses, filters, now))[0].expenses.length, 3);
  assert.deepEqual(groupExpenseRows(filterExpenses(expenses, { ...filters, providerFilter: '3', businessUnitFilter: '1' }, now))[0].expenses.map(e => e.id), ['1']);
  assert.equal(filterExpenses(expenses, { ...filters, searchTerm: 'mantenimiento' }, now).length, 3);
  assert.equal(filterExpenses(expenses, { ...filters, statusFilter: 'overdue' }, now).length, 0);
  assert.deepEqual(filterExpenses(expenses, { ...filters, periodFilter: 'last_month' }, now).map(e => e.id), ['3']);
  assert.equal(groupExpenseRows(filterExpenses(expenses, { ...filters, periodFilter: 'this_year' }, now))[0].expenses.length, 4);
});

test('current overdue carryover remains an ordinary payable with its original recognition date', () => {
  const previousDate = new Date(2026, 7, 20);
  const carryover = make(1, { originFund: undefined, date: previousDate, dueDate: previousDate, status: 'pending', backendStatus: 'APPROVED', amountPaid: 0 });
  const rows = groupExpenseRows(filterExpenses([carryover, make(2, { date: previousDate })], filters, now));
  assert.equal(rows.length, 1); assert.equal(rows[0].expense.date, previousDate);
});

test('sorting uses authoritative group totals rather than the first receipt and leaves unknown totals last', () => {
  const rows = groupExpenseRows([make(1), make(2), make(3, { originFund: undefined, total: 150 })]);
  assert.equal(sortExpenseRows(rows, 'total', 'desc', { 'fund:8:MXN': { total: 232 } })[0].kind, 'fund');
  assert.equal(sortExpenseRows(rows, 'total', 'asc', { 'fund:8:MXN': { total: 232 } })[0].kind, 'expense');
  assert.equal(sortExpenseRows(rows, 'total', 'desc', {})[0].kind, 'expense');
  const payableRows = groupExpenseRows([make(10, { originFund: undefined, total: 100, amountPaid: 90 }),
    make(11, { originFund: undefined, total: 50, amountPaid: 0 })]);
  assert.equal(sortExpenseRows(payableRows, 'balance', 'asc', {})[0].expense.id, '10');
  assert.equal(sortExpenseRows(payableRows, 'balance', 'desc', {})[0].expense.id, '11');
});

test('period labels follow month/year boundaries instead of inventing a receipt date', () => {
  assert.match(expenseGroupPeriodLabel('last_month', new Date(2026, 0, 5), 'es-MX', ''), /diciembre de 2025/);
  assert.equal(expenseGroupPeriodLabel('this_year', now, 'es-MX', ''), '2026');
  assert.equal(expenseGroupPeriodLabel('custom', now, 'es-MX', 'Periodo seleccionado'), 'Periodo seleccionado');
});

const aggregate = (currency, amount) => ({ preferredCurrency: currency, preferredTotal: amount,
  nativeTotals: [{ currency, amount }], partial: false, excludedRecords: 0, excludedCurrencies: [] });
test('fund summaries reuse server native totals, submit only visible IDs, and respect the 100-query batch limit', async () => {
  const groups = groupExpenseRows(Array.from({ length: 21 }, (_, i) => make(i + 1, { originFund: { ...fund, id: String(i + 1) } })));
  const requests = [];
  monetaryApi = async queries => {
    requests.push(queries);
    return Object.fromEntries(queries.map(q => [q.key, aggregate('MXN', 999.25)]));
  };
  const result = await loadExpenseFundTotals(groups);
  assert.deepEqual(requests.map(q => q.length), [100, 5]);
  assert.equal(result['fund:1:MXN'].total, 999.25, 'display uses server total, never client recalculation');
  assert.deepEqual(requests[0][0].ids, ['1']);
  assert.equal(requests[0][0].preferredCurrency, 'MXN');
  assert.equal(requests[0][3].metric, 'EXPENSE_PAID_TO_DATE');
});

test('summary failure, partial data and unexpected currencies fail visibly instead of becoming zero', async () => {
  const groups = groupExpenseRows([make(1)]);
  for (const value of [undefined, { ...aggregate('MXN', 116), partial: true }, aggregate('USD', 116),
    { ...aggregate('MXN', 116), nativeTotals: [] }]) {
    monetaryApi = async queries => Object.fromEntries(queries.map(q => [q.key, value]));
    await assert.rejects(loadExpenseFundTotals(groups));
  }
  monetaryApi = async () => { throw new Error('Network'); };
  await assert.rejects(loadExpenseFundTotals(groups), /Network/);
});

test('cancelled annual fund totals do not continue requesting later batches', async () => {
  const groups = groupExpenseRows(Array.from({ length: 21 }, (_, i) => make(i + 1, { originFund: { ...fund, id: String(i + 1) } })));
  const controller = new AbortController();
  let requests = 0;
  monetaryApi = async queries => {
    requests++;
    controller.abort();
    return Object.fromEntries(queries.map(q => [q.key, aggregate('MXN', 116)]));
  };
  await assert.rejects(loadExpenseFundTotals(groups, controller.signal), { name: 'AbortError' });
  assert.equal(requests, 1);
});

test('summary row preserves table columns and exposes read-only receipt detail and locked classification', () => {
  const { ExpenseFundGroupRow } = load(resolve(root, 'Expenses/components/ExpenseFundGroupRow.tsx'));
  const group = groupExpenseRows([make(1), make(2, { accountingAccount: '21' })])[0];
  const props = { group, money: { total: 232, amount: 200, taxes: 32, amountPaid: 232, balance: 0 }, periodLabel: 'septiembre de 2026',
    filtered: true, expanded: false, onToggle: () => {}, isColumnVisible: () => true, columnWidths: {}, columnCount: 24,
    options: { accountingAccounts: [{ value: '20', label: '6000 - Mantenimiento' }, { value: '21', label: '6010 - Papelería' }],
      businessUnits: [], businesses: [], users: [], providers: [], statuses: [], paymentMethods: [] },
    getAttachments: () => [], onViewExpense: () => {}, onOpenAttachments: () => {} };
  const closed = renderToStaticMarkup(React.createElement(ExpenseFundGroupRow, props));
  assert.match(closed, /2 gastos coincidentes/); assert.match(closed, /Varias cuentas/);
  assert.doesNotMatch(closed, /data-fund-expense-id|role="checkbox"|role="combobox"/);
  const open = renderToStaticMarkup(React.createElement(ExpenseFundGroupRow, { ...props, expanded: true }));
  assert.match(open, /data-fund-expense-id="1"/); assert.match(open, /data-fund-expense-id="2"/);
  assert.match(open, /petty-cash\/control\?fundId=8/);
  assert.match(open, /Expediente del gasto PCX-1/);
});

test('custom columns align the header, editable expense and fund group including separated money columns', () => {
  const { ExpenseTableHeaderRow } = load(resolve(root, 'components/table/ExpenseTableHeaderRow.tsx'));
  const { EditableExpenseRow } = load(resolve(root, 'Expenses/components/EditableExpenseRow.tsx'));
  const { ExpenseFundGroupRow } = load(resolve(root, 'Expenses/components/ExpenseFundGroupRow.tsx'));
  const keys = ['balance', 'concept', 'taxes', 'folio', 'total'];
  const columns = keys.map(key => ({ key, visible: true, label: key }));
  const columnWidths = Object.fromEntries(keys.map((key, index) => [key, 100 + index]));
  const common = { columns, columnWidths, isColumnVisible: key => keys.includes(key) };
  const options = { accountingAccounts: [], businessUnits: [], businesses: [], users: [], providers: [], statuses: [], paymentMethods: [] };
  const header = renderToStaticMarkup(React.createElement(ExpenseTableHeaderRow, { ...common, allVisibleSelected: false,
    getSortIcon: () => null, onResizeStart() {}, onSort() {}, onToggleAllVisible() {}, resizingColumn: null,
    selectionColumnWidth: 56, someVisibleSelected: false }));
  const expense = make(1, { originFund: undefined, total: 999, taxes: 17, amountPaid: 0, concept: 'CUSTOM CONCEPT' });
  const row = renderToStaticMarkup(React.createElement(EditableExpenseRow, { ...common, expense,
    attachmentsCount: 0, isEditing: false, isSelected: false, options, workflow: { authorizer: '', performer: '', auditNotes: '' } }));
  const group = groupExpenseRows([make(2, { concept: 'CUSTOM CONCEPT' })])[0];
  const fundRow = renderToStaticMarkup(React.createElement(ExpenseFundGroupRow, { ...common, group,
    money: { balance: 999, taxes: 17, total: 999 }, periodLabel: 'septiembre', filtered: false, expanded: false,
    columnCount: 7, options, getAttachments: () => [], onToggle() {}, onViewExpense() {}, onOpenAttachments() {} }));
  for (const [name, html] of [['header', header], ['expense', row], ['fund', fundRow]]) {
    const cells = [...html.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map(match => match[1]);
    assert.equal(cells.length, 7, name);
    assert.match(cells[1], name === 'header' ? /Saldo/ : /999/, name);
    assert.match(cells[2], name === 'header' ? /Concepto/ : /CUSTOM CONCEPT|gasto/, name);
    assert.match(cells[3], name === 'header' ? /Impuestos/ : /17/, name);
    assert.match(cells[5], name === 'header' ? /Total/ : /999/, name);
  }
});
