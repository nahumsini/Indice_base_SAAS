import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve('src/app/BasicModules/Expenses');
const stub = new Proxy({}, { get: (_, key) => key });
const load = (path, resolver = () => stub) => loadTypescript(resolve(root, path), resolver);
const t = load('translations/es-MX.ts', () => ({ mergeFinanceTranslations: (_, copy) => copy })).esMX;
const filters = load('utils/expenseFilters.ts');
const reversalCopy = load('utils/expenseReversal.copy.ts');
const printCopy = load('utils/expenseTablePrint.copy.ts');
const print = load('utils/expenseTablePrint.ts', id => id.endsWith('expenseFilters') ? filters : printCopy);
const base = { id: '1', folio: 'EXP-001', version: 4, concept: 'Renta', amount: 100, taxes: 16, total: 116,
  amountPaid: 116, currency: 'MXN', date: new Date(2026, 8, 1), dueDate: new Date(2026, 8, 30),
  paymentDate: new Date(2026, 8, 10), paymentMethod: 'transfer', status: 'paid', backendStatus: 'PAID',
  businessUnit: '101', business: '201', accountingAccount: '501', description: 'Private hidden description', providerName: 'Proveedor' };
const references = { units: [{ value: '101', label: 'Cancún' }], businesses: [{ value: '201', label: 'Brisas' }], accounts: [{ value: '501', label: 'Renta de locales' }], users: [] };
const columns = ['folio', 'date', 'concept', 'total', 'balance', 'businessUnit', 'accountingAccount'].map(key => ({ key, label: key, visible: true }));
const definition = (expenses, overrides = {}) => print.buildExpenseTableDocument({ expenses, columns, companyName: 'Empresa de pruebas', locale: 'es-MX', filters: 'Septiembre · Cancún', scope: 'Filas seleccionadas', t, references, generatedAt: new Date('2026-09-10T12:00:00Z'), ...overrides });
function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes), ...nodes(node.props?.footer)]; }

test('print preserves row order and visible columns, resolves names and excludes duplicate/external fund records', () => {
  const doc = definition([{ ...base, id: '2', folio: 'EXP-002' }, base, base,
    { ...base, id: '3', originFund: { id: '8', name: 'External', type: 'EXTERNAL_MANAGED' } }], {
    columns: [...columns, { key: 'description', label: 'Hidden', visible: false }, { key: 'actions', label: 'Actions', visible: true }],
  });
  assert.equal(doc.contract.category, 'tab-print');
  assert.deepEqual(doc.tables[0].rows.map(row => row[0]), ['EXP-002', 'EXP-001']);
  assert.deepEqual(doc.tables[0].columns, columns.map(column => column.label));
  assert.ok(doc.tables[0].rows[0].includes('Cancún'));
  assert.ok(doc.tables[0].rows[0].includes('Renta de locales'));
  assert.doesNotMatch(JSON.stringify(doc), /Private hidden description|"Actions"/);
  assert.equal(doc.sections[0].paragraphs[0], 'Septiembre · Cancún');
});

test('print does not combine native currencies and uses effective paid and remaining balances', () => {
  const doc = definition([base, { ...base, id: '2', currency: 'USD', amountPaid: 30, status: 'partial' }]);
  const totals = doc.tables.at(-1);
  assert.deepEqual(totals.rows, [['MXN', '116.00 MXN', '116.00 MXN', '0.00 MXN'], ['USD', '116.00 USD', '30.00 USD', '86.00 USD']]);
  assert.deepEqual(totals.numericColumnIndices, [1, 2, 3]);
});

test('wide prints keep every field and every row across sections, including 125 records and long concepts', () => {
  const manyColumns = [...columns, ...['description', 'paymentDate', 'status', 'taxes', 'providerName'].map(key => ({ key, label: key, visible: true }))];
  const records = Array.from({ length: 125 }, (_, index) => ({ ...base, id: String(index), folio: `EXP-${index}`, concept: 'Concepto largo '.repeat(30) }));
  const doc = definition(records, { columns: manyColumns });
  assert.equal(doc.contract.orientation, 'landscape');
  assert.equal(doc.tables.length, 3);
  assert.ok(doc.tables.slice(0, -1).every(table => table.rows.length === 125 && table.columns.length <= 8));
  assert.ok(doc.tables[0].rows[124].includes(records[124].concept));
  for (const column of manyColumns) assert.ok(doc.tables.slice(0, -1).some(table => table.columns.includes(column.label)));
  assert.equal(doc.tables[1].columns[0], 'folio');
});

test('all supported locales provide reversal and print labels and format the report', () => {
  for (const locale of ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.ok(reversalCopy.getExpenseReversalCopy(locale).confirm);
    assert.ok(printCopy.getExpenseTablePrintCopy(locale).download);
    assert.equal(definition([base], { locale }).locale, locale);
  }
});

function reversalHarness(overrides = {}) {
  const runtime = hookRuntime();
  const props = { expense: base, disabled: false, onBusyChange() {}, onHistoryLoaded() {}, async onReverse() {}, ...overrides };
  const records = [{ id: '9', amount: 20, paymentDate: '2026-09-12', reversedAt: new Date() },
    { id: '7', amount: 30, paymentDate: '2026-09-05' }, { id: '8', amount: 86, paymentDate: '2026-09-01' }];
  const component = load('components/modals/ExpensePaymentReversalSection.tsx', id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('useExpensesTranslations')) return { useExpensesResolvedLocale: () => 'es-MX' };
    if (id.endsWith('/services')) return { expensesService: { getExpensePayments: async () => records }, toFinanceApiErrorMessage: error => error.message };
    if (id.endsWith('expenseFilters')) return filters;
    if (id.endsWith('expenseReversal.copy')) return reversalCopy;
    return stub;
  }).ExpensePaymentReversalSection;
  const all = () => nodes(runtime.render(() => component(props)));
  const button = label => all().find(node => node.type === 'button' && React.Children.toArray(node.props.children).includes(label));
  const reason = () => all().find(node => node.type === 'textarea');
  all();
  return { runtime, props, all, button, reason };
}

test('reversal chooses last recorded active payment, requires a reason, prevents double requests and retains failed input', async () => {
  const copy = reversalCopy.getExpenseReversalCopy('es-MX'); const calls = []; let reject;
  const ui = reversalHarness({ onReverse: (...args) => { calls.push(args); return new Promise((_, fail) => { reject = fail; }); } });
  await ui.runtime.flush();
  ui.button(copy.undo).props.onClick();
  assert.equal(ui.button(copy.confirm).props.disabled, true);
  ui.reason().props.onChange({ target: { value: '  Registrado por error  ' } });
  const confirm = ui.button(copy.confirm);
  confirm.props.onClick(); confirm.props.onClick();
  assert.deepEqual(calls, [['8', 'Registrado por error']]);
  reject(new Error('Connection lost')); await ui.runtime.flush();
  assert.equal(ui.reason().props.value, '  Registrado por error  ');
  assert.ok(ui.all().some(node => node.props?.messages?.includes('Connection lost')));
  ui.button(copy.confirm).props.onClick();
  assert.deepEqual(calls[1], calls[0]);
  reject(new Error('Connection lost')); await ui.runtime.flush();
});

test('cancelling an in-modal reversal does not send a mutation', async () => {
  const copy = reversalCopy.getExpenseReversalCopy('es-MX'); let mutations = 0;
  const ui = reversalHarness({ onReverse: async () => { mutations++; } });
  await ui.runtime.flush(); ui.button(copy.undo).props.onClick();
  ui.reason().props.onChange({ target: { value: 'Mistake' } });
  ui.button(copy.cancel).props.onClick();
  assert.equal(mutations, 0); assert.ok(ui.button(copy.undo));
});

test('reversed payments remain in history without inflating paid balance or transferring old evidence to a new payment', () => {
  const { buildPaymentRows } = load('Expenses/components/ExpensePaymentHistory.tsx', id => id === 'react/jsx-runtime' ? jsx : stub);
  const original = { id: '10', expenseId: '1', amount: 116, currency: 'MXN', paymentDate: '2026-09-10', source: 'RECORDED',
    createdAt: new Date('2026-09-10T10:00:00Z'), reversedAt: new Date('2026-09-10T11:00:00Z') };
  const replacement = { ...original, id: '11', createdAt: new Date('2026-09-10T12:00:00Z'), reversedAt: undefined };
  const oldFile = { id: 'old', paymentAmount: 116, paymentDate: '2026-09-10', createdAt: '2026-09-10T10:05:00Z' };
  const newFile = { ...oldFile, id: 'new', createdAt: '2026-09-10T12:05:00Z' };
  const rows = buildPaymentRows([replacement, original], [oldFile, newFile], { amount: 116 }, 'MXN');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.find(row => row.id === '10').files, [oldFile]);
  assert.deepEqual(rows.find(row => row.id === '11').files, [newFile]);
  assert.equal(buildPaymentRows([original], [oldFile], { amount: 0 }, 'MXN').length, 1);
});

test('print preview uses the same scoped definition for PDF and printer, waits for company identity and handles blocked output', () => {
  const runtime = hookRuntime(); let ready = false; const calls = [];
  const component = load('components/modals/ExpenseTablePrintModal.tsx', id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('useExpensesTranslations')) return { useExpensesResolvedLocale: () => 'es-MX', useExpensesTranslations: () => t };
    if (id.endsWith('useCompanyPrintIdentity')) return { useCompanyPrintIdentity: () => ({ identity: { name: 'Empresa' }, isReady: ready }) };
    if (id.endsWith('expenseTablePrint')) return print;
    if (id.endsWith('expenseTablePrint.copy')) return printCopy;
    if (id.endsWith('webPrintCopy')) return { getWebPrintCopy: () => ({ action: 'Imprimir / Guardar PDF' }) };
    if (id.endsWith('documentPrintContract')) return { getDocumentPrintLabels: () => ({ updated: 'Actualizado' }), formatDocumentPrintDateTime: () => 'Hoy' };
    if (id.endsWith('standardDocumentPdf')) return { downloadStandardDocumentPdf: doc => { calls.push(['pdf', doc]); return 'gastos.pdf'; }, printStandardDocumentPdf: doc => { calls.push(['print', doc]); return false; } };
    return stub;
  }).ExpenseTablePrintModal;
  const props = { snapshot: { all: [base, { ...base, id: '2', folio: 'EXP-002' }], selected: [base] }, columns, filters: 'Septiembre', references, onClose() {} };
  const all = () => nodes(runtime.render(() => component(props)));
  const button = label => all().find(node => node.type === 'button' && React.Children.toArray(node.props.children).includes(label));
  assert.equal(button('Imprimir / Guardar PDF').props.disabled, true);
  ready = true; button('Imprimir / Guardar PDF').props.onClick(); button('Imprimir / Guardar PDF').props.onClick();
  assert.strictEqual(calls[0][1], calls[1][1]); assert.equal(calls[0][1].tables[0].rows.length, 1);
  assert.ok(all().some(node => node.props?.messages?.includes(printCopy.getExpenseTablePrintCopy('es-MX').failed)));
  all().find(node => node.type === 'select').props.onChange({ target: { value: 'all' } });
  button('Imprimir / Guardar PDF').props.onClick(); assert.equal(calls[2][1].tables[0].rows.length, 2);
});
