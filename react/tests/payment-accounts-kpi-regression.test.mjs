import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = resolve('src/app/BasicModules/Expenses');
const stub = new Proxy({}, { get: (_, name) => name });
const load = (path, resolver = () => stub) => loadTypescript(resolve(root, path), resolver);
const es = load('translations/es-MX.ts', () => ({ mergeFinanceTranslations: (_, copy) => copy })).esMX;
const utils = load('PaymentAccounts/paymentAccounts.utils.tsx');
const aggregate = (currency = 'MXN', total = 321) => ({ preferredCurrency: currency, preferredTotal: total, nativeTotals: [{ currency, amount: total }], exchangeRate: { mode: 'daily', effectiveDate: '2026-09-10', source: 'test' }, partial: false, excludedRecords: 0, excludedCurrencies: [] });
const rows = [
  { id: '1', name: 'Banco norte', type: 'bank', currency: 'MXN', balance: 100, isActive: true, source: 'expenses' },
  { id: '2', name: 'Banco sur', type: 'bank', currency: 'USD', balance: 20, isActive: false, source: 'expenses' },
  { id: '3', name: 'Efectivo', type: 'cash', currency: 'USD', balance: -10, isActive: true, source: 'expenses' },
  { id: 'petty-cash-4', name: 'Fondo', type: 'cash', currency: 'MXN', balance: 900, isActive: true, source: 'petty_cash', linkedFundId: '4' },
];
function mountHook(request) {
  const runtime = hookRuntime();
  const { usePaymentAccountsBalance } = load('PaymentAccounts/hooks/usePaymentAccountsBalance.ts', id => id === 'react' ? runtime.hooks : { getKpiMonetaryAggregate: request });
  let accounts = rows, currency = 'MXN', enabled = true;
  const render = () => runtime.render(() => usePaymentAccountsBalance(accounts, currency, enabled));
  return { runtime, render, setAccounts: value => { accounts = value; return render(); }, setCurrency: value => { currency = value; return render(); }, setEnabled: value => { enabled = value; return render(); } };
}
function summary(accounts = rows, statusFilter = 'all', result = { data: aggregate(), loading: false, error: false, refresh() {} }, overrides = {}) {
  const selected = [], scopes = [];
  const { PaymentAccountsSummary } = load('PaymentAccounts/components/PaymentAccountsSummary.tsx', id => {
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('usePaymentAccountsTranslations')) return { usePaymentAccountsTranslations: () => es, usePaymentAccountsResolvedLocale: () => 'es-MX' };
    if (id.endsWith('BusinessCurrencyContext')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'MXN' }) };
    if (id.endsWith('usePaymentAccountsBalance')) return { usePaymentAccountsBalance: (scope, currency, enabled) => { scopes.push({ scope, currency, enabled }); return result; } };
    if (id.endsWith('paymentAccounts.utils')) return utils;
    if (id.endsWith('operational')) return { OperationalKpiArea: 'OperationalKpiArea', getOperationalKpiCurrencyCopy: () => ({}) };
    return stub;
  });
  const tree = PaymentAccountsSummary({ accounts, statusFilter, onStatusChange: value => selected.push(value), ...overrides });
  const area = tree.props.children[0].props;
  return { tree, area, selected, scopes, metric: id => area.metrics.find(item => item.id === id) };
}

test('search/type scope retains sibling status counts; repeated state activation clears the facet', () => {
  const scoped = utils.filterPaymentAccounts(rows, 'Banco', 'bank', 'all');
  const ui = summary(scoped, 'active');
  assert.equal(ui.metric('total').value, 2);
  assert.equal(ui.metric('active').value, 1);
  assert.equal(ui.metric('inactive').value, 1);
  assert.equal(ui.metric('active').active, true);
  ui.metric('active').onClick(); ui.metric('inactive').onClick(); ui.metric('total').onClick();
  assert.deepEqual(ui.selected, ['all', 'inactive', 'all']);
  assert.deepEqual(ui.scopes[0].scope.map(row => row.id), ['1']);
  assert.match(ui.area.insight, /Mostrando 1 de 2/);
});

test('monetary query uses only active real account IDs, preserves backend totals and excludes fund virtual rows', async () => {
  const queries = [];
  const hook = mountHook(async query => { queries.push(query); return aggregate('MXN', 725); });
  hook.render(); await hook.runtime.flush();
  assert.deepEqual(queries[0], { metric: 'PAYMENT_ACCOUNT_BALANCE', preferredCurrency: 'MXN', ids: [1, 3] });
  assert.equal(hook.runtime.result.data.preferredTotal, 725);
  const ui = summary(rows, 'all', { ...hook.runtime.result });
  assert.match(ui.metric('balance').value, /725/);
  assert.match(ui.metric('balance').value, /MXN/);
  assert.equal(ui.metric('balance').onClick, undefined);
  assert.equal(ui.metric('petty-cash').value, 1);
});

test('currency changes and same-ID balance updates refetch and reject stale in-flight results', async () => {
  const requests = [];
  const hook = mountHook(query => new Promise(resolve => requests.push({ query, resolve })));
  hook.render(); hook.setCurrency('USD');
  assert.equal(hook.runtime.result.data, null);
  requests[0].resolve(aggregate('MXN', 999)); await hook.runtime.flush();
  assert.equal(hook.runtime.result.data, null);
  requests[1].resolve(aggregate('USD', 50)); await hook.runtime.flush();
  assert.equal(hook.runtime.result.data.preferredTotal, 50);
  hook.setAccounts(rows.map(row => row.id === '1' ? { ...row, balance: 200 } : row));
  assert.equal(hook.runtime.result.data, null); assert.equal(requests.length, 3);
  requests[2].resolve(aggregate('USD', 70)); await hook.runtime.flush();
  assert.equal(hook.runtime.result.data.preferredTotal, 70);
});

test('aggregate failures are unavailable, retryable and never a zero balance; partial conversion stays explicit', async () => {
  let fail = true, requests = 0;
  const hook = mountHook(async () => { requests++; if (fail) throw new Error('offline'); return { ...aggregate(), partial: true, excludedRecords: 1, excludedCurrencies: ['USD'] }; });
  hook.render(); await hook.runtime.flush();
  assert.equal(hook.runtime.result.error, true); assert.equal(hook.runtime.result.data, null);
  assert.equal(summary(rows, 'all', hook.runtime.result).metric('balance').value, '—');
  fail = false; hook.runtime.result.refresh(); hook.render(); await hook.runtime.flush();
  assert.equal(requests, 2);
  const ui = summary(rows, 'all', hook.runtime.result);
  assert.equal(ui.metric('balance').label, es.paymentAccounts.summary.partialBalance);
  assert.equal(ui.area.currencyContext.isPartial, true);
  assert.equal(ui.area.currencyContext.excludedCount, 1);
});

test('empty active scope does not issue an unbounded request; invalid IDs fail closed and source loading hides counts', async () => {
  let requests = 0;
  const hook = mountHook(async () => { requests++; return aggregate(); });
  hook.setAccounts(rows.filter(row => !row.isActive || row.source === 'petty_cash')); await hook.runtime.flush();
  assert.equal(requests, 0); assert.equal(hook.runtime.result.data.preferredTotal, 0);
  hook.setAccounts([{ ...rows[0], id: 'local-draft' }]); await hook.runtime.flush();
  assert.equal(requests, 0); assert.equal(hook.runtime.result.error, true);
  const ui = summary([], 'all', hook.runtime.result, { loading: true });
  assert.equal(ui.metric('total').value, '—'); assert.equal(ui.scopes[0].enabled, false);
  assert.equal(ui.area.insight, es.paymentAccounts.summary.loading);
  assert.equal(summary([], 'all').area.insight, es.paymentAccounts.summary.empty);
});

test('changing a KPI filter resets pagination while restoring remembered state preserves its page', async () => {
  const runtime = hookRuntime(); let memory;
  const { PaymentAccountsTable } = load('PaymentAccounts/components/PaymentAccountsTable.tsx', id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('usePaymentAccountsTranslations')) return { usePaymentAccountsTranslations: () => es, usePaymentAccountsResolvedLocale: () => 'es-MX' };
    if (id.endsWith('paymentAccounts.utils')) return utils;
    if (id.endsWith('paymentAccountsTableConfig')) return { defaultPaymentColumnWidths: {} };
    if (id.endsWith('usePersistentColumnWidths')) return { usePersistentColumnWidths: ({ defaults }) => ({ columnWidths: defaults, resizeColumn() {} }) };
    if (id.endsWith('useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: props => { memory = props; } };
    return stub;
  });
  let reset = 0;
  const accounts = Array.from({ length: 40 }, (_, i) => ({ ...rows[0], id: String(i + 1) }));
  const render = () => runtime.render(() => PaymentAccountsTable({ accounts, columns: [], businessOptions: [], unitOptions: [], sortDirection: null, sortField: null, paginationResetKey: reset }));
  render(); memory.onRestore({ currentPage: 3, pageSize: 10 }); await runtime.flush();
  assert.equal(runtime.result.props.pagination.props.currentPage, 3);
  render(); await runtime.flush(); assert.equal(runtime.result.props.pagination.props.currentPage, 3);
  reset++; render(); await runtime.flush();
  assert.equal(runtime.result.props.pagination.props.currentPage, 1);
});
