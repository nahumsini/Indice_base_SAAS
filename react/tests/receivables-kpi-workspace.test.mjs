import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';

const root = resolve(import.meta.dirname, '../src/app/BasicModules/Receivables');
const dir = resolve(root, 'KPIs');
const page = resolve(dir, 'ReceivablesKpiWorkspace.tsx');
const ast = ts.createSourceFile(page, readFileSync(page, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'ReceivablesKpiWorkspace');
const names = component.body.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
  .filter(d => ts.isArrayBindingPattern(d.name) && d.initializer?.expression?.getText(ast) === 'useState').map(d => d.name.elements[0].name.getText(ast));
const account = (id, extra = {}) => ({ id: String(id), contactId: id, customerId: `contact-${id}`, unitId: id, businessId: id, saleNumber: `AR-${id}`, customerName: `Customer ${id}`, unit: `Unit ${id}`, business: `Business ${id}`, balance: 100, currency: 'USD', status: 'on_time', dueDate: '2026-12-31', ...extra });
const installment = (id, extra = {}) => ({ id: String(id), receivableId: String(id), balance: 100, currency: 'USD', status: 'on_time', dueDate: '2026-09-01', ...extra });
const payment = (id, extra = {}) => ({ id: String(id), receivableId: String(id), customerName: `Customer ${id}`, saleNumber: `AR-${id}`, amount: 100, currency: 'USD', paymentDate: '2026-09-10', ...extra });
const dataset = (n = 27) => ({ asOfDate: '2026-09-15', timeZone: 'America/Mexico_City', receivables: Array.from({ length: n }, (_, i) => account(i + 1)), installments: Array.from({ length: n }, (_, i) => installment(i + 1)), payments: Array.from({ length: n }, (_, i) => payment(i + 1)) });
const aggregate = (amount = 100) => ({ preferredCurrency: 'USD', preferredTotal: amount, nativeTotals: [{ currency: 'USD', amount }], partial: false, excludedRecords: 0, excludedCurrencies: [], exchangeRate: { mode: 'daily' } });
const plain = value => JSON.parse(JSON.stringify(value));
function setup(initial = {}) {
  const state = { ...initial }, cache = new Map(), prints = [], requests = [];
  const source = { data: dataset(), loading: false, error: false, updatedAt: '2026-09-15T16:00:00Z', refresh: () => { refreshes++; } };
  let cursor = 0, memory, refreshes = 0, transport = async queries => Object.fromEntries(queries.map(q => [q.key, aggregate()]));
  const moneyState = { loading: false, error: null, partial: false };
  const marker = name => Object.assign(() => null, { displayName: name });
  const markers = new Proxy({}, { get: (target, key) => target[key] ??= marker(String(key)) });
  const hooks = { ...React, useMemo: fn => fn(), useEffect: () => {}, useState: initial => { const key = names[cursor++]; if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial; return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }]; } };
  function load(file, realHook = false) {
    const key = `${file}:${realHook}`; if (cache.has(key)) return cache.get(key);
    const module = { exports: {} };
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const require = name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name.endsWith('/useReceivablesKpiSource')) return { useReceivablesKpiSource: () => source };
      if (name.endsWith('/useReceivablesKpiAggregates') && !realHook) return { completeAmount: a => a && !a.partial ? a.preferredTotal : null, useReceivablesKpiAggregates: (queries, revision, enabled) => { requests.push({ queries, revision, enabled }); return { ...moneyState, data: moneyState.error ? {} : Object.fromEntries(queries.map(q => [q.key, { ...aggregate(q.ids.length * 100), partial: moneyState.partial }])) }; } };
      if (name.endsWith('/kpiMonetaryApi')) return { getKpiMonetaryAggregates: queries => transport(queries) };
      if (name.endsWith('/useReceivablesTranslations')) return { useReceivablesTranslations: () => load(resolve(root, 'translations/es-MX.ts')).esMX, useReceivablesResolvedLocale: () => 'es-MX' };
      if (name.endsWith('/BusinessCurrencyContext')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'USD' }) };
      if (name.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: options => { memory = options; return true; } };
      if (name.endsWith('/standardDocumentPdf')) return { printStandardDocumentPdf: report => prints.push(report) };
      if (name.endsWith('/ReceivablesKpiViews')) return markers;
      if (name.endsWith('/receivableDetail.copy')) return { getReceivableDetailCopy: () => ({}) };
      if (name.endsWith('/apiClient')) return { apiClient: () => { throw Error('Unexpected live API'); } };
      if (name === 'lucide-react' || name === 'recharts' || name.includes('/components/') || name.endsWith('/operational') || name.endsWith('/useTablePagination')) return markers;
      if (name.startsWith('.')) {
        const base = resolve(dirname(file), name); const target = existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`;
        const result = load(target);
        return name.endsWith('/ReceivablesKpiTable') ? { ...result, ReceivablesKpiTable: markers.ReceivablesKpiTable } : result;
      }
      return markers;
    };
    vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Intl, Date, Map, Set, Object, URLSearchParams })(require, module, module.exports);
    cache.set(key, module.exports); return module.exports;
  }
  return { state, source, moneyState, prints, requests, load, setTransport: fn => { transport = fn; }, get memory() { return memory; }, get refreshes() { return refreshes; }, render: () => { cursor = 0; requests.length = 0; return load(page).ReceivablesKpiWorkspace(); } };
}
const walk = (node, hidden = false) => Array.isArray(node) ? node.flatMap(n => walk(n, hidden)) : !node?.props || (!hidden && node.props.hidden) ? [] : [node, ...walk(node.props.children, hidden), ...walk(node.props.actions, hidden)];
const named = (tree, name, hidden = false) => walk(tree, hidden).filter(n => (n.type.displayName || n.type.name) === name);
const selectors = () => setup().load(resolve(dir, 'receivablesKpiSelectors.ts'));

test('instalment due dates, partial balances and boundary dates determine arrears instead of final account maturity', () => {
  const s = selectors(), data = dataset(6);
  data.installments = [installment(1, { dueDate: '2026-09-14', balance: 20 }), installment(2, { dueDate: '2026-09-15' }), installment(3, { dueDate: '2026-10-15' }), installment(4, { dueDate: '2026-10-16' }), installment(5, { dueDate: '2026-09-01', balance: 0 }), installment(6, { status: 'cancelled' })];
  data.receivables[4].balance = 0; data.receivables[5].status = 'cancelled';
  const result = s.selectReceivablesKpis(data, s.defaultKpiScope);
  assert.deepEqual(plain(result.overdue.map(r => r.id)), ['1']); assert.equal(result.overdue[0].balance, 20);
  assert.deepEqual(plain(result.dueSoon.map(r => r.id)), ['2', '3']); assert.equal(result.open.length, 4);
  assert.equal(result.missingSchedule.length, 0);
});
test('collection period preserves current debt and paid-account history; invalid and future payments are excluded visibly', () => {
  const s = selectors(), data = dataset(2); data.receivables[1].balance = 0;
  data.payments = [payment(1, { paymentDate: '2026-08-31' }), payment(2), payment(3, { receivableId: '1', paymentDate: '2026-09-16' }), payment(4, { receivableId: '1', paymentDate: '2026-02-31' })];
  const result = s.selectReceivablesKpis(data, s.defaultKpiScope);
  assert.equal(result.open.length, 1); assert.deepEqual(plain(result.payments.map(r => r.id)), ['2']); assert.equal(result.paymentIssues.length, 2);
  assert.deepEqual(plain(s.periodRange('last_month', '2026-01-03')), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(plain(s.periodRange('this_week', '2026-09-13')), { from: '2026-09-07', to: '2026-09-13' });
});
test('organizational IDs distinguish identical labels; customers without contact are never merged by name', () => {
  const s = selectors(), data = dataset(3); data.receivables.forEach(row => { row.unit = 'Shared'; row.customerName = 'Same name'; row.contactId = null; });
  const filtered = s.selectReceivablesKpis(data, { ...s.defaultKpiScope, unit: '2' }); assert.equal(filtered.accounts.length, 1); assert.equal(filtered.payments[0].receivableId, '2');
  const all = s.selectReceivablesKpis(data, s.defaultKpiScope); assert.equal(all.identifiedCustomers.size, 0); assert.equal(all.unlinkedCustomers.length, 3);
  assert.equal(s.groupAccounts(all.open, s.customerKey).length, 3);
});
test('aging boundaries and missing schedules remain explicit; missing money is not zero', () => {
  const s = selectors();
  for (const [days, key] of [[0,'current'],[1,'days1to30'],[30,'days1to30'],[31,'days31to60'],[60,'days31to60'],[61,'days61to90'],[90,'days61to90'],[91,'days91plus']]) assert.equal(s.agingKey(installment(1, { dueDate: s.shiftDays('2026-09-15', -days) }), '2026-09-15'), key);
  const app = setup(); app.source.data.installments = [];
  const tree = app.render(); const cards = named(tree, 'ReceivablesKpiCards')[0].props.cards;
  assert.equal(cards.find(c => c.key === 'overdue').value, 'No disponible'); assert.equal(cards.find(c => c.key === 'upcoming').value, 'No disponible');
  assert.ok(walk(tree).some(n => n.props.role === 'alert'));
  app.moneyState.partial = true; assert.equal(named(app.render(), 'ReceivablesKpiCards')[0].props.cards[0].value, 'No disponible');
});
test('four exclusive views share filters and monetary queries with symmetric spacing and scoped memory', () => {
  const app = setup(); let expected;
  for (const view of ['overview', 'analysis', 'units', 'details']) {
    app.state.activeView = view; const tree = app.render();
    assert.equal(named(tree, 'ReceivablesKpiCards').length, view === 'overview' ? 1 : 0);
    assert.equal(named(tree, 'ReceivablesKpiCharts').length, view === 'analysis' ? 1 : 0);
    assert.match(tree.props.className, /grid.*gap-6/); assert.equal(named(tree, 'IndiceTitleBar')[0].props.className, 'mb-0');
    const query = JSON.stringify(app.requests[0].queries); expected ??= query; assert.equal(query, expected);
  }
  assert.equal(app.memory.urlFields.activeView, 'view'); app.memory.onRestore({ ...app.memory.state, activeView: 'invalid' }); assert.equal(app.state.activeView, 'overview');
});
test('follow-up and unit drilldowns open scoped details without introducing payment actions', () => {
  const app = setup(); let tree = app.render();
  walk(tree).find(n => n.type === 'button' && n.props.children?.includes('Cuentas con cuotas vencidas')).props.onClick();
  assert.equal(app.state.activeView, 'details'); assert.equal(named(app.render(), 'ReceivablesKpiTable').length, 1);
  named(app.render(), 'ReceivablesKpiTable')[0].props.onSelect('1'); assert.equal(named(app.render(), 'ReceivableDetailModal')[0].props.onRegisterPayment, undefined);
  app.state.activeView = 'units'; named(app.render(), 'ReceivablesKpiTable')[0].props.onSelect('2'); assert.equal(app.state.scope.unit, '2'); assert.equal(app.state.focus, 'all');
  assert.equal(named(app.render(), 'ReceivablesKpiTable')[0].props.model.rows.length, 1);
});
test('full report includes every filtered row regardless of view, follow-up focus and page', () => {
  const app = setup();
  for (const activeView of ['overview','analysis','units','details']) {
    app.state.activeView = activeView; app.state.focus = 'missing'; app.state.preferences = { accounts: { currentPage: 3, pageSize: 10, sortKey: '0', sortDirection: 'asc' } };
    const tree = app.render(); walk(tree).find(n => n.type === 'button' && n.props.children?.includes('Imprimir reporte')).props.onClick();
  }
  for (const report of app.prints) { assert.equal(report.metrics.length, 8); assert.equal(report.tables.find(t => t.title === 'Cuentas y cobros').rows.length, 27); assert.equal(report.tables.find(t => t.title === 'Por unidad').rows.length, 27); }
});
test('source failure hides results, refresh retries, and empty samples do not become misleading percentages', () => {
  const app = setup(); app.source.data = dataset(0);
  const cards = named(app.render(), 'ReceivablesKpiCards')[0].props.cards; assert.equal(cards.find(c => c.key === 'evidence').value, 'Sin base para medir');
  app.source.data = null; app.source.error = true; const tree = app.render(); assert.equal(named(tree, 'ReceivablesKpiCards').length, 0);
  walk(tree).find(n => n.type === 'button' && n.props.children?.includes('Actualizar datos')).props.onClick(); assert.equal(app.refreshes, 1);
});
test('batched transport keeps all groups and fails visibly on missing results or conversions', async () => {
  const app = setup(), calls = []; app.setTransport(async queries => { calls.push(queries.length); return Object.fromEntries(queries.map(q => [q.key, aggregate()])); });
  const hook = app.load(resolve(dir, 'useReceivablesKpiAggregates.ts'), true);
  const queries = Array.from({ length: 231 }, (_, i) => ({ key: String(i), metric: 'RECEIVABLE_BALANCE', ids: [i + 1], preferredCurrency: 'USD' }));
  assert.equal(Object.keys(await hook.loadReceivablesKpiAggregates(queries)).length, 231); assert.deepEqual(calls, [100,100,31]);
  assert.equal(hook.completeAmount(undefined), null); assert.equal(hook.completeAmount({ ...aggregate(), partial: true }), null); assert.equal(hook.completeAmount(aggregate(0)), 0);
  app.setTransport(async () => ({})); await assert.rejects(hook.loadReceivablesKpiAggregates(queries), /Incomplete/);
});
test('new source adapter never supplies demo rows, fake dates or incomplete arrays; locales and memory are complete', () => {
  const app = setup(); const adapter = app.load(resolve(root, 'services/receivablesApi.ts')).toReceivablesKpiSource;
  assert.throws(() => adapter({}), /Incomplete/);
  const raw = { asOfDate: '2026-09-15', timeZone: 'UTC', receivables: [{ id: 1, balance: 100, currency: 'USD' }], payments: [], installments: [] };
  assert.equal(adapter(raw).receivables[0].dueDate, ''); assert.equal(adapter(raw).receivables[0].nextPaymentDate, '');
  assert.throws(() => adapter({ ...raw, receivables: [{ id: 1, currency: 'USD' }] }), /Invalid/);
  const { getReceivablesKpiCopy } = app.load(resolve(dir, 'workspaceCopy.ts'));
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) assert.ok(Object.values(getReceivablesKpiCopy(locale)).every(v => typeof v === 'string' && v.length));
});

test('source refresh and authorization changes ignore prior responses and hide stale data immediately', async () => {
  const slots = [], effects = [], pending = []; let cursor = 0, effectCursor = 0, authorization = 1;
  const hooks = { useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect: (fn, deps) => { const i = effectCursor++; const old = effects[i]; if (!old || deps.some((v, k) => v !== old.deps[k])) { old?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; } } };
  const module = { exports: {} }; const js = ts.transpileModule(readFileSync(resolve(dir, 'useReceivablesKpiSource.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Date })(name => name === 'react' ? hooks : name.endsWith('/useAuthorizationRevision') ? { useAuthorizationRevision: () => authorization } : { receivablesApi: { kpiWorkspace: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } }, module, module.exports);
  const render = () => { cursor = 0; effectCursor = 0; return module.exports.useReceivablesKpiSource(); };
  render(); authorization = 2; assert.equal(render().data, null);
  pending[0].resolve(dataset(1)); await new Promise(resolve => setImmediate(resolve)); assert.equal(render().data, null);
  pending[1].reject(Error('offline')); await new Promise(resolve => setImmediate(resolve)); assert.equal(render().error, true);
  render().refresh(); assert.equal(render().data, null); pending[2].resolve(dataset(2)); await new Promise(resolve => setImmediate(resolve)); assert.equal(render().data.receivables.length, 2);
  authorization = 3; assert.equal(render().data, null);
});
