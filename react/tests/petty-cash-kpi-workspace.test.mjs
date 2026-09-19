import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';

const root = resolve(import.meta.dirname, '../src/app/BasicModules/PettyCash');
const dir = resolve(root, 'KPIs');
const page = resolve(root, 'components/PettyCashFinancialViewWorkspace.tsx');
const ast = ts.createSourceFile(page, readFileSync(page, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'PettyCashFinancialViewWorkspace');
const names = component.body.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
  .filter(d => ts.isArrayBindingPattern(d.name) && d.initializer?.expression?.getText(ast) === 'useState').map(d => d.name.elements[0].name.getText(ast));
const fund = (id, extra = {}) => ({ id: String(id), fundType: 'INTERNAL_COMPANY', unitId: String(id), unitName: `Unit ${id}`, businessId: String(id), businessName: `Business ${id}`, name: `Fund ${id}`, responsibleName: `Person ${id}`, currencyCode: 'MXN', currentBalanceAmount: -10, status: 'OPEN', ...extra });
const statement = (id, extra = {}) => ({ id: String(id), pettyCashFundId: String(id), fundTypeSnapshot: 'INTERNAL_COMPANY', folio: `CUT-${id}`, periodKey: '2026-09', periodStart: '2026-09-01', periodEnd: '2026-09-30', responsibleUserId: String(id), responsibleName: `Person ${id}`, currencyCode: 'MXN', estimatedUsageAmount: 100, verifiedExpenseAmount: 100, declaredClosingBalanceAmount: -10, shortageAmount: 0, status: 'SETTLED', ...extra });
const receipt = (id, extra = {}) => ({ id: String(id), pettyCashFundId: String(id), pettyCashStatementId: String(id), description: `Purchase ${id}`, expenseDate: '2026-09-05', totalAmount: 100, currencyCode: 'MXN', attachmentCount: 1, status: 'EXPENSE_CREATED', ...extra });
const aggregate = (amount = 100) => ({ preferredCurrency: 'MXN', preferredTotal: amount, nativeTotals: [{ amount, currency: 'MXN' }], partial: false, excludedRecords: 0, excludedCurrencies: [], exchangeRate: { mode: 'daily', effectiveDate: '2026-09-15' } });
const plain = value => JSON.parse(JSON.stringify(value));
function setup(initial = {}) {
  const state = { ...initial }, cache = new Map(), requests = [], prints = [];
  let cursor = 0, workspace, refreshes = 0;
  const props = { dataReady: true, sourceError: false, funds: Array.from({ length: 27 }, (_, i) => fund(i + 1)), statements: Array.from({ length: 27 }, (_, i) => statement(i + 1)), settlementLines: Array.from({ length: 27 }, (_, i) => receipt(i + 1)), movements: [], onRefresh: () => { refreshes++; } };
  const marker = n => Object.assign(() => null, { displayName: n });
  const markers = new Proxy({}, { get: (target, n) => target[n] ??= marker(String(n)) });
  const hooks = { ...React, useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {}, useState: init => { const name = names[cursor++]; if (!(name in state)) state[name] = typeof init === 'function' ? init() : init; return [state[name], value => { state[name] = typeof value === 'function' ? value(state[name]) : value; }]; } };
  const requestState = { partial: false, error: null, loading: false };
  let transport = async queries => Object.fromEntries(queries.map(q => [q.key, aggregate()]));
  function load(file, realHook = false) {
    const cacheKey = `${file}:${realHook}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const module = { exports: {} };
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name.endsWith('/usePettyCashKpiAggregates') && !realHook) return { completeAmount: a => a && !a.partial ? a.preferredTotal : null, usePettyCashKpiAggregates: (queries, revision, enabled) => { requests.push({ queries, revision, enabled }); return { ...requestState, data: requestState.error ? {} : Object.fromEntries(queries.map(q => [q.key, { ...aggregate(q.key === 'balance' ? -270 : (q.ids?.length ?? 0) * 100), partial: requestState.partial }])) }; } };
      if (name.endsWith('/kpiMonetaryApi')) return { getKpiMonetaryAggregates: queries => transport(queries) };
      if (name.endsWith('/usePettyCashTranslations')) return { usePettyCashTranslations: () => load(resolve(root, 'translations/es-MX.ts')).esMX };
      if (name.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
      if (name.endsWith('/BusinessCurrencyContext')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'MXN' }) };
      if (name.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: options => { workspace = options; return true; } };
      if (name.endsWith('/standardDocumentPdf')) return { printStandardDocumentPdf: report => prints.push(report) };
      if (name.endsWith('/operational')) return { OperationalKpiCurrencyStrip: markers.OperationalKpiCurrencyStrip };
      if (name === 'lucide-react' || name === 'recharts' || name.endsWith('/frontend-os') || name.endsWith('/PettyCashShared') || name.endsWith('/useTablePagination')) return markers;
      if (name.startsWith('.')) {
        const base = resolve(dirname(file), name);
        const target = existsSync(`${base}.ts`) ? `${base}.ts` : existsSync(`${base}.tsx`) ? `${base}.tsx` : resolve(base, 'index.ts');
        const result = load(target);
        if (name.endsWith('/PettyCashKpiViews')) return { ...result, PettyCashKpiOverview: markers.PettyCashKpiOverview, PettyCashKpiAnalysis: markers.PettyCashKpiAnalysis };
        if (name.endsWith('/PettyCashKpiTable')) return { ...result, PettyCashKpiTable: markers.PettyCashKpiTable };
        return result;
      }
      return markers;
    };
    vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Intl, Date, Map, Set, Object, URLSearchParams, console })(require, module, module.exports);
    cache.set(cacheKey, module.exports); return module.exports;
  }
  return { state, props, requests, prints, requestState, load, setTransport: fn => { transport = fn; }, get workspace() { return workspace; }, get refreshes() { return refreshes; }, render: () => { cursor = 0; requests.length = 0; return load(page).PettyCashFinancialViewWorkspace(props); } };
}
const walk = (node, hidden = false) => Array.isArray(node) ? node.flatMap(n => walk(n, hidden)) : !node?.props || (!hidden && node.props.hidden) ? [] : [node, ...walk(node.props.children, hidden), ...walk(node.props.actions, hidden)];
const named = (tree, name, hidden = false) => walk(tree, hidden).filter(n => (n.type.displayName || n.type.name) === name);
const selectors = () => setup().load(resolve(dir, 'pettyCashKpiSelectors.ts'));

test('snapshot classification preserves history after a fund changes ownership; current balance uses current active ownership', () => {
  const s = selectors(); const f = [fund(1, { fundType: 'EXTERNAL_MANAGED' }), fund(2), fund(3, { status: 'CLOSED' })];
  const result = s.selectPettyCashKpiScope(f, [statement(1), statement(2), statement(3)], [receipt(1), receipt(2)], [], s.defaultKpiScope);
  assert.equal(result.statements.length, 3); assert.equal(result.currentFunds.length, 1); assert.equal(result.currentFunds[0].id, '2'); assert.equal(result.negativeFunds.length, 1);
});
test('external VALIDATED is authorized without company expense; rejected/reversed receipts do not inflate evidence or amounts', () => {
  const s = selectors(); const lines = [receipt(1, { status: 'VALIDATED', attachmentCount: 0 }), receipt(2, { pettyCashFundId: '1', pettyCashStatementId: '1', status: 'RECEIPT_ATTACHED' }), receipt(3, { pettyCashFundId: '1', pettyCashStatementId: '1', status: 'REVERSED' }), receipt(4, { pettyCashFundId: '1', pettyCashStatementId: '1', status: 'REJECTED' })];
  const result = s.selectPettyCashKpiScope([fund(1, { fundType: 'EXTERNAL_MANAGED' })], [statement(1, { fundTypeSnapshot: 'EXTERNAL_MANAGED' })], lines, [], { ...s.defaultKpiScope, classification: 'EXTERNAL_MANAGED' });
  assert.equal(result.lines.length, 4); assert.equal(result.validLines.length, 2); assert.equal(result.authorizedLines.length, 1); assert.equal(result.pendingLines.length, 1); assert.equal(result.evidencePercent, 50);
  assert.equal(s.isAuthorizedReceipt(lines[0], statement(1)), false);
});
test('empty samples are unavailable, settled cuts remain open, terminal cuts are excluded, no-period funds remain visible', () => {
  const s = selectors();
  for (const status of ['OPEN','SETTLED','CUT_PENDING','SHORTAGE']) assert.equal(s.isOpenStatement(statement(1, { status })), true);
  for (const status of ['CLOSED','TRANSFERRED_TO_NEXT_CUT','FORGIVEN_SHORTAGE','CHARGED_TO_EMPLOYEE']) assert.equal(s.isOpenStatement(statement(1, { status })), false);
  const all = s.selectPettyCashKpiScope([fund(1)], [], [], [], s.defaultKpiScope);
  assert.equal(all.currentFunds.length, 1); assert.equal(all.evidencePercent, null); assert.equal(all.authorizationPercent, null);
  assert.equal(s.selectPettyCashKpiScope([fund(1)], [], [], [], { ...s.defaultKpiScope, period: '2026-09' }).currentFunds.length, 0);
});
test('period, search and organization consistently filter data; unlinked movements cannot leak into historical cuts', () => {
  const s = selectors(); const movement = { id: '1', pettyCashFundId: '1', pettyCashStatementId: '1' };
  const result = s.selectPettyCashKpiScope([fund(1), fund(2)], [statement(1), statement(2, { periodKey: '2026-08' })], [receipt(1), receipt(2)], [movement, { ...movement, id: '2', pettyCashStatementId: undefined }, { ...movement, id: '3', pettyCashStatementId: '2' }], { ...s.defaultKpiScope, period: '2026-09', unit: '1', search: 'cut-1' });
  assert.equal(result.statements.length, 1); assert.equal(result.validLines.length, 1); assert.equal(result.movements.length, 1); assert.equal(result.unlinkedMovements, 1);
});
test('four green views preserve filter/query scope and mounted table instances with equal bar spacing', () => {
  const app = setup(); let expected;
  for (const view of ['overview','analysis','units','details']) {
    const nav = named(app.render(), 'IndiceWorkspaceNavigation')[0]; nav.props.onValueChange(view); const tree = app.render();
    assert.equal(nav.props.variant, 'views'); assert.equal(nav.props.tone, 'green'); assert.equal(named(tree, 'PettyCashFilterShell').length, 1);
    assert.equal(named(tree, 'PettyCashKpiOverview').length, view === 'overview' ? 1 : 0); assert.equal(named(tree, 'PettyCashKpiAnalysis', true).length, view === 'analysis' ? 1 : 0);
    assert.equal(named(tree, 'PettyCashKpiTable', true).length, 7); assert.match(tree.props.className, /grid.*gap-6/); assert.equal(named(tree, 'IndiceTitleBar')[0].props.className, 'mb-0');
    const query = JSON.stringify(app.requests[0].queries); expected ??= query; assert.equal(query, expected);
  }
  assert.equal(app.workspace.urlFields.activeView, 'view'); app.workspace.onRestore({ ...app.workspace.state, activeView: 'invalid' }); assert.equal(app.state.activeView, 'overview');
});
test('cards drill into concrete pending evidence and current balances; refresh reloads workspace and unavailable is not zero', () => {
  const app = setup(); const view = named(app.render(), 'PettyCashKpiOverview')[0];
  assert.equal(view.props.cards.length, 8); assert.match(view.props.cards.find(row => row.key === 'balance').value, /-/); assert.ok(!view.props.cards.some(row => /health|salud/i.test(row.title)));
  view.props.onFocus('pending'); const details = app.render(); assert.equal(app.state.activeView, 'details'); assert.equal(named(details, 'PettyCashKpiTable').length, 1); assert.equal(named(details, 'PettyCashKpiTable')[0].props.model.id, 'receipts');
  const refresh = walk(app.render()).find(n => n.type === 'button' && n.props.children?.includes('Actualizar datos')); refresh.props.onClick(); assert.equal(app.refreshes, 1);
  app.requestState.partial = true; app.state.activeView = 'overview'; assert.equal(named(app.render(), 'PettyCashKpiOverview')[0].props.cards.find(row => row.key === 'balance').value, 'No disponible');
  app.props.dataReady = false; app.props.sourceError = true; assert.equal(named(app.render(), 'PettyCashKpiOverview').length, 0); assert.ok(walk(app.render()).some(n => n.props.role === 'alert'));
});
test('all units/responsibles and every selected period contribute beyond old top-six caps; print is independent of active view/page', () => {
  const app = setup(); app.props.statements.forEach((row, index) => { row.periodKey = `2026-${String(index % 12 + 1).padStart(2,'0')}`; });
  for (const activeView of ['overview','analysis','units','details']) {
    app.state.activeView = activeView; app.state.preferences = { receipts: { currentPage: 3, pageSize: 10, sortKey: '0', sortDirection: 'asc' } };
    const tree = app.render(); const print = walk(tree).find(n => n.type === 'button' && n.props.children?.includes('Imprimir reporte')); print.props.onClick();
    assert.equal(named(tree, 'PettyCashKpiTable', true).find(n => n.props.model.id === 'units').props.model.rows.length, 27);
  }
  for (const report of app.prints) { assert.equal(report.tables.find(t => t.title === 'Evolución por corte').rows.length, 12); assert.equal(report.tables.find(t => t.title === 'Compra / comprobante').rows.length, 27); assert.equal(report.tables.find(t => t.title === 'Seguimiento por responsable').rows.length, 27); }
});
test('batch transport preserves every group, rejects incomplete batches and does not coerce missing/partial totals to zero', async () => {
  const app = setup(); const calls = []; app.setTransport(async queries => { calls.push(queries.length); return Object.fromEntries(queries.map(q => [q.key, aggregate()])); });
  const api = app.load(resolve(dir, 'usePettyCashKpiAggregates.ts'), true);
  const queries = Array.from({ length: 241 }, (_, index) => ({ key: String(index), metric: 'PETTY_CASH_CUSTODY_SETTLEMENT_AMOUNT', ids: [index + 1], preferredCurrency: 'MXN' }));
  assert.equal(Object.keys(await api.loadPettyCashKpiAggregates(queries)).length, 241); assert.deepEqual(calls, [100,100,41]);
  assert.equal(api.completeAmount(undefined), null); assert.equal(api.completeAmount({ ...aggregate(), partial: true }), null); assert.equal(api.completeAmount(aggregate(0)), 0); assert.equal(api.completeAmount(aggregate(-10)), -10);
  app.setTransport(async () => ({})); await assert.rejects(api.loadPettyCashKpiAggregates(queries), /Incomplete/);
});
test('all required locales have complete explanatory copy and safe table memory', () => {
  const app = setup(); const { getPettyCashKpiCopy } = app.load(resolve(dir, 'workspaceCopy.ts'));
  for (const locale of ['es-MX','es-CO','en-CA','en-US','fr-CA','pt-BR','ko-CA','zh-CA']) { const copy = getPettyCashKpiCopy(locale); assert.ok(Object.values(copy).every(value => typeof value === 'string' && value.length)); if (!locale.startsWith('es')) assert.notEqual(copy.context, getPettyCashKpiCopy('es-MX').context); }
  const { normalizeTablePreferences } = app.load(resolve(dir, 'components/PettyCashKpiTable.tsx'));
  const restored = normalizeTablePreferences({ receipts: { currentPage: -1, pageSize: 900, sortKey: '9;drop', sortDirection: 'invalid' }, invalid: {} });
  assert.deepEqual(plain(restored), { receipts: { currentPage: 1, pageSize: 10, sortKey: '0', sortDirection: 'asc' } });
});

test('workspace refresh recovers from failure and ignores responses from the previous authorization scope', async () => {
  const file = resolve(root, 'context/PettyCashContext.tsx');
  const slots = [], effects = [], pending = [];
  let cursor = 0, effectCursor = 0, authorization = 1;
  const hooks = { ...React, useMemo: fn => fn(), useCallback: fn => fn,
    useState: initial => { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useEffect: (fn, deps) => { const index = effectCursor++; const previous = effects[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) { previous?.cleanup?.(); effects[index] = { deps, cleanup: fn() }; } },
  };
  const module = { exports: {} };
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Date })(name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name.endsWith('/useAuthorizationRevision')) return { useAuthorizationRevision: () => authorization };
    if (name.endsWith('/pettyCash.mock')) return { mockCashFunds: [], mockPettyCashExpenses: [] };
    if (name.endsWith('/services')) return { pettyCashService: { getWorkspace: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } };
    throw Error(name);
  }, module, module.exports);
  const render = () => { cursor = 0; effectCursor = 0; return module.exports.PettyCashProvider({ children: null }).props.value; };
  const workspace = id => ({ funds: [fund(id)], statements: [statement(id)], settlementLines: [receipt(id)], movements: [] });
  render(); authorization = 2; render();
  pending[1].resolve(workspace(2)); await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().pettyCashFunds[0].id, '2');
  pending[0].resolve(workspace(1)); await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().pettyCashFunds[0].id, '2');
  render().refreshWorkspace(); render();
  pending[2].reject(Error('temporary failure')); await new Promise(resolve => setImmediate(resolve));
  const failed = render(); assert.equal(failed.workspaceError, true); assert.equal(failed.workspaceLoaded, false); assert.equal(failed.pettyCashFunds.length, 0);
  failed.refreshWorkspace(); render(); pending[3].resolve(workspace(3)); await new Promise(resolve => setImmediate(resolve));
  const recovered = render(); assert.equal(recovered.workspaceError, false); assert.equal(recovered.workspaceLoaded, true); assert.equal(recovered.pettyCashFunds[0].id, '3'); assert.ok(recovered.workspaceUpdatedAt);
});
