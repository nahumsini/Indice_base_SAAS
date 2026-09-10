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
const copy = load('Expenses/components/expenseDetail.copy.ts').getExpenseDetailCopy('es-MX');
const filters = load('utils/expenseFilters.ts');
const dates = load('utils/expenseDates.ts');
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer)] : [];
const base = { id: '45', version: 3, folio: 'EXP-2026-045', concept: 'Servicio de agosto', amount: 100.25, total: 100.25, amountPaid: 30.15, currency: 'MXN', date: new Date(2026, 7, 15), dueDate: new Date(2026, 7, 30), status: 'partial', backendStatus: 'PARTIALLY_PAID', type: 'real', category: { name: 'Gastos' }, business: '', businessUnit: '', paymentAccountId: '8' };
const bank = { id: '8', name: 'Banco', currency: 'MXN', isActive: true, balance: 5000 };
function harness(path, props, additions = () => null) {
  const runtime = hookRuntime();
  const module = load(path, id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('useExpensesTranslations')) return { useExpensesTranslations: () => t, useExpensesResolvedLocale: () => 'es-MX' };
    if (id.endsWith('expenseDetail.copy')) return { getExpenseDetailCopy: () => copy };
    if (id.endsWith('expenses.utils')) return { formatCurrency: (amount, currency) => `${amount.toFixed(2)} ${currency}` };
    if (id.endsWith('adapter.utils')) return { isBackendId: id => /^\d+$/.test(id) };
    if (id.endsWith('expenseDates')) return dates;
    if (id.endsWith('expenseFilters')) return filters;
    return additions(id) ?? stub;
  });
  const Component = Object.values(module).find(item => typeof item === 'function');
  const render = () => runtime.render(() => Component(props));
  return { props, runtime, render, all: () => nodes(render()) };
}
const modal = (overrides = {}) => harness('components/modals/ExpensePaymentModal.tsx', { expense: base, paymentAccounts: [bank], onClose() {}, async onSubmit() {}, ...overrides });
const button = (ui, text) => ui.all().find(node => node.type === 'button' && React.Children.toArray(node.props.children).includes(text));
const input = (ui, name) => ui.all().find(node => node.type === 'input' && node.props['aria-label'] === name);

test('Liquidar sends exact remaining balance with selected date, existing account, and no required attachment', async () => {
  const calls = []; const ui = modal({ onSubmit: async (...args) => calls.push(args) });
  input(ui, t.expenses.payment.date).props.onChange({ target: { value: '2026-09-10' } });
  assert.equal(input(ui, t.expenses.payment.amount).props.value, '');
  assert.equal(button(ui, t.expenses.payment.save).props.disabled, true);
  assert.equal(button(ui, t.expenses.payment.settle).props.disabled, false);
  button(ui, t.expenses.payment.settle).props.onClick(); await ui.runtime.flush();
  assert.equal(calls.length, 1); const [id, amount, account, date, evidence, key] = calls[0];
  assert.equal(id, base.id); assert.equal(amount, 70.10); assert.equal(account, bank.id);
  assert.equal(dates.formatExpenseDate(date), '2026-09-10'); assert.deepEqual(evidence, []); assert.ok(key);
  assert.equal(base.amountPaid, 30.15); assert.equal(base.date.getMonth(), 7);
});
test('Liquidar replaces typed partial amount with remaining balance and retains optional evidence', async () => {
  const calls = []; const ui = modal({ onSubmit: async (...args) => calls.push(args) });
  input(ui, t.expenses.payment.amount).props.onChange({ target: { value: '12.50' } });
  const file = { name: 'comprobante.pdf', size: 12 };
  input(ui, copy.paymentEvidence).props.onChange({ target: { files: [file] } });
  button(ui, t.expenses.payment.settle).props.onClick(); await ui.runtime.flush();
  assert.equal(calls[0][1], 70.10); assert.deepEqual(calls[0][4], [file]);
});
test('Guardar abono preserves a partial amount and cannot overpay', async () => {
  const calls = []; const ui = modal({ onSubmit: async (...args) => calls.push(args) });
  input(ui, t.expenses.payment.amount).props.onChange({ target: { value: '12.50' } });
  ui.all().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await ui.runtime.flush();
  assert.equal(calls[0][1], 12.50);
  input(ui, t.expenses.payment.amount).props.onChange({ target: { value: '70.11' } });
  assert.equal(button(ui, t.expenses.payment.save).props.disabled, true);
  assert.equal(button(ui, t.expenses.payment.settle).props.disabled, false);
});
test('both submit actions share an in-flight guard, retain fields on failure and safely retry', async () => {
  let reject; const calls = []; const ui = modal({ onSubmit: (...args) => { calls.push(args); return new Promise((_, r) => { reject = r; }); } });
  input(ui, t.expenses.payment.amount).props.onChange({ target: { value: '70.10' } });
  const settle = button(ui, t.expenses.payment.settle); const form = ui.all().find(node => node.type === 'form');
  settle.props.onClick(); form.props.onSubmit({ preventDefault() {} }); settle.props.onClick();
  assert.equal(calls.length, 1); assert.equal(button(ui, t.expenses.payment.save).props.disabled, true);
  reject(new Error('No se pudo confirmar el pago')); await ui.runtime.flush();
  assert.equal(input(ui, t.expenses.payment.amount).props.value, '70.10');
  assert.ok(ui.all().some(node => node.type === 'IndiceModalValidation' && node.props.messages[0] === 'No se pudo confirmar el pago'));
  button(ui, t.expenses.payment.settle).props.onClick(); assert.equal(calls[0][5], calls[1][5]);
  reject(new Error('No se pudo confirmar el pago')); await ui.runtime.flush();
});
test('payment never defaults to an arbitrary bank; date, zero balance and eligibility are enforced', () => {
  const ui = modal({ expense: { ...base, paymentAccountId: undefined }, paymentAccounts: [bank, { ...bank, id: '9', currency: 'USD' }, { ...bank, id: '10', isActive: false }, { ...bank, id: '11', backendType: 'PETTY_CASH' }] });
  const selector = ui.all().find(node => node.type === 'ExpenseAccountSelect');
  assert.equal(selector.props.value, ''); assert.deepEqual(selector.props.options.map(item => item.value), ['8']);
  assert.equal(button(ui, t.expenses.payment.settle).props.disabled, true);
  selector.props.onChange('8'); assert.equal(button(ui, t.expenses.payment.settle).props.disabled, false);
  input(ui, t.expenses.payment.date).props.onChange({ target: { value: '' } });
  assert.equal(button(ui, t.expenses.payment.settle).props.disabled, true);
  ui.props.expense = { ...base, amountPaid: base.total };
  assert.equal(button(ui, t.expenses.payment.settle).props.disabled, true);
});
test('Abonar and Pagar are separate protected actions for pending, partial and overdue rows', () => {
  for (const status of ['pending', 'partial', 'overdue']) assert.equal(filters.canPayExpense({ ...base, status }), true);
  for (const patch of [{ amountPaid: 100.25 }, { status: 'audited' }, { auditStatus: 'AUDITED' }, { originFund: { id: '1' } }, { type: 'budget' }, { backendStatus: 'CLOSED' }, { backendStatus: 'REJECTED' }, { backendStatus: 'CANCELLED' }]) assert.equal(filters.canPayExpense({ ...base, ...patch }), false);
  const calls = []; const ui = harness('components/table/ExpenseRowActions.tsx', { expenseId: '45', onRecordPayment: id => calls.push(`partial:${id}`), onMarkPaid: id => calls.push(`pay:${id}`), showAudit: false, showEdit: false, showDelete: false, showView: false });
  const actions = ui.all().filter(node => node.type.name === 'ActionButton');
  assert.deepEqual(actions.map(node => node.props.label), ['Abonar', 'Pagar']);
  actions.forEach(node => node.props.onClick()); assert.deepEqual(calls, ['partial:45', 'pay:45']);
  ui.props.isPaymentPending = true; assert.ok(ui.all().filter(node => node.type.name === 'ActionButton').every(node => node.props.disabled));
});
function table(overrides = {}) {
  const selection = { selectedCount: 0, selectedIds: new Set(), selectedIdList: [], isSelected: () => false, visibleSelectionState: () => ({}), pruneSelection() {} };
  return harness('Expenses/components/ExpenseTable.tsx', { expenses: [base], columns: [], providers: [], getAttachments: () => [], onViewExpense() {}, onOpenAttachments() {}, onExpensesChange() {}, ...overrides }, id => {
    if (id.endsWith('useExpenseRowSelection')) return { useExpenseRowSelection: () => selection };
    if (id.endsWith('useExpenseFundTotals')) return { useExpenseFundTotals: () => ({ data: {}, loading: false }) };
    if (id.endsWith('useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory() {} };
    if (id.endsWith('expenseFundGroups')) return { groupExpenseRows: rows => rows.map(expense => ({ kind: 'expense', expense })), sortExpenseRows: rows => rows };
    if (id.endsWith('expenseFundGroup.copy')) return { getExpenseFundGroupCopy: () => ({}) };
    if (id.endsWith('financeBulkActions.copy')) return { getFinanceBulkCopy: () => ({}) };
    if (id.endsWith('expenseTableConfig')) return { DEFAULT_EXPENSE_COLUMN_WIDTHS: {}, EXPENSE_USER_OPTIONS: [] };
    if (id.endsWith('expenseTableUtils')) return { getDefaultExpenseWorkflow: () => ({}) };
    if (id.endsWith('services')) return { toFinanceApiErrorMessage: error => error.message };
    return null;
  });
}
test('table Pagar settles once, waits for saved result and preserves retry identity', async () => {
  let finish; const calls = []; let rows = [base];
  const ui = table({ onExpensesChange: update => { rows = update(rows); }, onMarkExpensePaid: (...args) => { calls.push(args); return new Promise(resolve => { finish = resolve; }); } });
  const row = () => ui.all().find(node => node.type === 'EditableExpenseRow');
  const action = row().props.onMarkPaid; const first = action(base.id); action(base.id);
  assert.equal(calls.length, 1); assert.equal(row().props.isPaymentPending, true); assert.equal(rows[0].status, 'partial');
  assert.equal(ui.all().some(node => node.type === 'ExpensePaymentModal'), false);
  finish(null); await first; await ui.runtime.flush();
  const retry = row().props.onMarkPaid(base.id); assert.equal(calls[0][1], calls[1][1]);
  finish({ ...base, amountPaid: base.total, status: 'paid', backendStatus: 'PAID' }); await retry; await ui.runtime.flush();
  assert.equal(rows[0].status, 'paid'); assert.equal(rows[0].amountPaid, 100.25);
});
test('table Abonar opens the form without settling', () => {
  const ui = table({ onMarkExpensePaid: () => { throw new Error('must not settle'); } });
  ui.all().find(node => node.type === 'EditableExpenseRow').props.onRecordPayment(base.id);
  assert.ok(ui.all().some(node => node.type === 'ExpensePaymentModal'));
});
test('settlement API delegates amount and business date to server and preserves assigned or unassigned bank', async () => {
  const calls = [];
  const { expensesService } = load('services/expenses.service.ts', id => {
    if (id.endsWith('apiClient')) return { apiClient: async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return {}; } };
    if (id.endsWith('expense.adapter')) return { toExpense: value => value }; return stub;
  });
  await expensesService.settleExpensePayment('45', '', 'same-key'); await expensesService.settleExpensePayment('45', '8', 'another-key');
  assert.equal(calls[0].url, '/api/v1/finance/expenses/45/settle-payment');
  assert.deepEqual(calls[0].body, { paymentAccountId: null, idempotencyKey: 'same-key' });
  assert.deepEqual(calls[1].body, { paymentAccountId: 8, idempotencyKey: 'another-key' });
});
