import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';

const root = resolve(import.meta.dirname, '..');
const dir = resolve(root, 'src/app/BasicModules/Expenses/KPIs');
const page = resolve(dir, 'GastosKPIPage.tsx');
const viewsSource = readFileSync(resolve(dir, 'components/ExpenseKpiViews.tsx'), 'utf8');
const ast = ts.createSourceFile(page, readFileSync(page, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'GastosKPIPage');
const names = component.body.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
  .filter(d => ts.isArrayBindingPattern(d.name) && d.initializer?.expression?.getText(ast) === 'useState')
  .map(d => d.name.elements[0].name.getText(ast));
const fixture = (id, extra = {}) => ({ id: String(id), companyId: '1', description: `Expense ${id}`, folio: `EXP-${id}`, currency: 'MXN',
  total: 100, subtotal: 90, tax: 10, paidAmount: 0, balance: 100, expenseDate: '2026-09-05', dueDate: '2026-09-10',
  status: 'APPROVED', paymentStatus: 'UNPAID', attachments: [], unitId: String(id), providerId: String(id), requestedByUserId: String(id), ...extra });
const aggregate = (amount = 100) => ({ preferredCurrency: 'MXN', preferredTotal: amount, nativeTotals: [{ amount, currency: 'MXN' }], partial: false, excludedRecords: 0, excludedCurrencies: [], exchangeRate: { mode: 'daily', source: 'Fixture', effectiveDate: '2026-09-15' } });

function setup(initial = {}) {
  const state = { ...initial }, cache = new Map(), requests = [], sourceArgs = [], prints = [], effects = [];
  let cursor = 0, workspace;
  const rows = Array.from({ length: 27 }, (_, i) => fixture(i + 1));
  const overview = { filteredExpenses: rows, comparisonExpenses: [], paymentExpenses: rows, filteredBudgetLines: Array.from({ length: 27 }, (_, i) => ({ id: String(i + 1), name: `Budget ${i}`, budgetId: '1', healthStatus: 'WARNING' })),
    periodRange: { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) }, comparisonRange: { start: new Date(2026, 7, 1), end: new Date(2026, 7, 31) }, asOfDate: '2026-09-15', timeZone: 'America/Toronto',
    sources: { referenceData: { users: rows.map(r => ({ id: r.id, name: `Person ${r.id}` })), units: rows.map(r => ({ id: r.id, name: `Unit ${r.id}` })), businesses: [] }, providers: rows.map(r => ({ id: r.id, name: `Provider ${r.id}` })), accountingAccounts: [], paymentAccounts: [] },
    metrics: {}, currencies: ['MXN'], fallbackWarnings: [], isLoading: false, errorMessage: '', ...initial.overview };
  const marker = n => Object.assign(() => null, { displayName: n });
  const markers = new Proxy({}, { get: (target, n) => target[n] ??= marker(String(n)) });
  const hooks = { ...React, useEffect: (fn, deps) => effects.push(deps), useMemo: fn => fn(), useCallback: fn => fn,
    useState: initialValue => { const name = names[cursor++]; if (!(name in state)) state[name] = typeof initialValue === 'function' ? initialValue() : initialValue; return [state[name], value => { state[name] = typeof value === 'function' ? value(state[name]) : value; }]; } };
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
      if (name.endsWith('/useFinancialOverview')) return { useFinancialOverview: args => { sourceArgs.push(args); return overview; } };
      if (name.endsWith('/useExpenseKpiAggregates') && !realHook) return { completeAmount: a => a && !a.partial ? a.preferredTotal : null, useExpenseKpiAggregates: (queries, revision, enabled) => { requests.push({ queries, revision, enabled }); return { ...requestState, data: Object.fromEntries(queries.map(q => [q.key, { ...aggregate((q.ids?.length ?? 0) * 100), partial: requestState.partial }])) }; } };
      if (name.endsWith('/kpiMonetaryApi')) return { getKpiMonetaryAggregates: queries => transport(queries) };
      if (name.endsWith('/useKpisTranslations')) return { useKpisResolvedLocale: () => 'es-MX', useKpisTranslations: () => load(resolve(dir, '../translations/es-MX.ts')).esMX };
      if (name.endsWith('/BusinessCurrencyContext')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'MXN' }) };
      if (name.endsWith('/useCompanyPrintIdentity')) return { useCompanyPrintIdentity: () => ({ identity: { name: 'Test Company' }, isReady: true }) };
      if (name.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: opts => { workspace = opts; } };
      if (name.endsWith('/financialOverviewPdf')) return { downloadFinancialOverviewPdf: report => prints.push(report) };
      if (name.endsWith('/operational')) return { getOperationalKpiCurrencyCopy: () => ({}), OperationalKpiCurrencyStrip: markers.OperationalKpiCurrencyStrip };
      if (name === 'lucide-react' || name === 'recharts' || name.includes('/components/')) return markers;
      if (name.startsWith('.')) { const candidate = resolve(dirname(file), name); return load(existsSync(`${candidate}.ts`) ? `${candidate}.ts` : resolve(candidate, 'index.ts')); }
      return markers;
    };
    vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Intl, Date, Map, Set, URLSearchParams, console })(require, module, module.exports);
    cache.set(cacheKey, module.exports); return module.exports;
  }
  return { state, overview, requests, sourceArgs, prints, effects, requestState, load, setTransport: fn => { transport = fn; }, get workspace() { return workspace; }, render: () => { cursor = 0; requests.length = 0; sourceArgs.length = 0; effects.length = 0; return load(page).default({ expenses: [], providers: [] }); } };
}
const walk = (node, includeHidden = false) => Array.isArray(node) ? node.flatMap(n => walk(n, includeHidden)) : !node?.props || (!includeHidden && node.props.hidden) ? [] : [node, ...walk(node.props.children, includeHidden), ...walk(node.props.actions, includeHidden)];
const named = (tree, name, includeHidden = false) => walk(tree, includeHidden).filter(n => (n.type.displayName || n.type.name) === name);

test('four green views share filters, evenly spaced bars and retain detailed table instances', () => {
  const app = setup();
  for (const view of ['overview', 'analysis', 'units', 'control']) {
    const nav = named(app.render(), 'IndiceWorkspaceNavigation')[0];
    assert.equal(nav.props.variant, 'views'); assert.equal(nav.props.tone, 'green');
    nav.props.onValueChange(view); const tree = app.render();
    assert.equal(named(tree, 'IndiceFilterBar').length, 1);
    assert.equal(named(tree, 'MetricCard').length, view === 'overview' ? 8 : 0);
    for (const [id, component] of [['analysis','ExpenseKpiAnalysis'],['units','ExpenseKpiUnits'],['control','ExpenseKpiControl']]) {
      assert.equal(named(tree, component).length, view === id ? 1 : 0);
      assert.equal(named(tree, component, true).length, 1);
      if (id !== 'control') assert.equal(named(tree, component, true)[0].props.active, id === view);
    }
    assert.match(tree.props.className, /grid.*gap-6/);
    assert.equal(named(tree, 'IndiceTitleBar')[0].props.className, 'mb-0');
  }
});

test('switching views preserves shared filters and monetary query identity; refresh also reloads same-ID source data', () => {
  const app = setup({ search: 'rent', providerId: '4', rankingCurrentPage: 2 }); app.render();
  const before = JSON.stringify(app.requests.map(r => r.queries)), beforeSource = app.sourceArgs[0];
  app.state.activeView = 'control'; app.render();
  assert.equal(JSON.stringify(app.requests.map(r => r.queries)), before);
  assert.equal(app.sourceArgs[0].search, 'rent'); assert.equal(app.sourceArgs[0].providerId, '4');
  assert.equal(app.state.rankingCurrentPage, 2); assert.equal(app.workspace.urlFields.activeView, 'view');
  const refresh = walk(app.render()).find(n => n.type === 'button' && !n.props.title && n.props.onClick);
  refresh.props.onClick(); app.render(); assert.equal(app.sourceArgs[0].refreshKey, beforeSource.refreshKey + 1);
  app.workspace.onRestore({ ...app.workspace.state, activeView: 'invalid' }); app.render(); assert.equal(app.state.activeView, 'overview');
});

test('all units, people and budget lines contribute beyond the old 8/20/25 limits; trend covers a full month', () => {
  const app = setup(); const tree = app.render();
  assert.equal(named(tree, 'ExpenseKpiUnits', true)[0].props.rows.length, 27);
  assert.equal(named(tree, 'ExpenseKpiControl', true)[0].props.responsibleRows.length, 27);
  assert.equal(named(tree, 'ExpenseKpiAnalysis', true)[0].props.budgetRows.length, 27);
  assert.equal(named(tree, 'ExpenseKpiAnalysis', true)[0].props.trend.length, 30);
  assert.equal(named(tree, 'ExpenseKpiAnalysis', true)[0].props.drivers[0].rows.length, 27);
  assert.ok(app.requests.flatMap(r => r.queries).some(q => q.key === 'user-total-27'));
});

test('report scope is complete and invariant across views; partial conversion and source failures block export', () => {
  const app = setup();
  for (const activeView of ['overview', 'analysis', 'units', 'control']) {
    app.state.activeView = activeView;
    const print = walk(app.render()).find(n => n.type === 'button' && n.props.title);
    assert.equal(print.props.disabled, false); print.props.onClick();
  }
  for (const report of app.prints) { assert.equal(report.overview.metrics.expenseCount, 27); assert.equal(report.overview.budgetHealthRows.length, 27); assert.equal(report.workspaceTables.at(-1).rows.length, 27); }
  app.requestState.partial = true;
  assert.equal(walk(app.render()).find(n => n.type === 'button' && n.props.title)?.props.disabled, true);
  assert.equal(named(app.render(), 'ExpenseKpiAnalysis', true)[0].props.groupReady, false);
  app.requestState.partial = false; app.overview.fallbackWarnings = ['expenses'];
  assert.equal(walk(app.render()).find(n => n.type === 'button' && n.props.title)?.props.disabled, true);
});

test('primary cards distinguish recognition, payments, current debt and real budget availability; no empty punctuality zero', () => {
  const app = setup(); const tree = app.render(); const cards = named(tree, 'MetricCard').map(n => n.props);
  assert.ok(cards.some(c => c.title === 'Gasto reconocido'));
  assert.ok(cards.some(c => c.title === 'Pagos del periodo'));
  assert.ok(cards.some(c => c.title === 'Presupuesto disponible'));
  assert.equal(cards.find(c => c.title === 'Puntualidad de liquidación').value, 'Sin muestra comparable');
  assert.ok(!cards.some(c => c.title === 'Salud financiera'));
  const budgetRows = named(tree, 'ExpenseKpiAnalysis', true)[0].props.budgetRows;
  assert.equal(budgetRows[0].usagePercent, 0);
  assert.equal(budgetRows[0].healthStatus, 'WARNING');
  cards.find(c => c.title === 'Saldo vencido actual').onAction(); app.render();
  assert.equal(app.state.activeView, 'control'); assert.equal(app.state.paymentStatus, 'OVERDUE');
});

test('empty or unavailable owner data never becomes a healthy or zero-valued financial result', () => {
  const empty = setup({ overview: { filteredExpenses: [], comparisonExpenses: [], paymentExpenses: [], filteredBudgetLines: [] } });
  const print = walk(empty.render()).find(n => n.type === 'button' && n.props.title);
  print.props.onClick();
  assert.equal(empty.prints[0].overview.alerts.length, 0);

  const failed = setup({ overview: { fallbackWarnings: ['expenses'] } });
  const tree = failed.render();
  const cards = named(tree, 'MetricCard').map(n => n.props);
  assert.equal(cards.find(c => c.title === 'Gasto capturado').value, '—');
  assert.equal(cards.find(c => c.title === 'Puntualidad de liquidación').value, '—');
  assert.equal(named(tree, 'ExpenseKpiAnalysis', true)[0].props.groupReady, false);
});

test('payment composition keeps a deterministic visible donut for one non-zero status', () => {
  assert.match(viewsSource, /paymentMix\.length === 1/);
  assert.match(viewsSource, /data-expense-kpi-single-segment="payment-mix"/);
});

test('calendar buckets cover all selected days without overlap, including DST, monthly and annual ranges', () => {
  const { expenseTrendWindows, daysAfter } = setup().load(resolve(dir, 'expenseKpiSelectors.ts'));
  for (const [start, end, count] of [[new Date(2026,2,1),new Date(2026,2,31),31],[new Date(2026,0,15),new Date(2026,11,20),12],[new Date(2020,3,2),new Date(2026,8,15),7]]) {
    const windows = expenseTrendWindows(start, end); assert.equal(windows.length, count);
    for (let i = 1; i < windows.length; i++) assert.equal(daysAfter(windows[i].from, windows[i-1].to), 1);
  }
  assert.equal(expenseTrendWindows(new Date(2026,8,2), new Date(2026,8,1)).length, 0);
});

test('counts exclude void records, include partially paid overdue balances and require comparable settlement dates', () => {
  const s = setup().load(resolve(dir, 'expenseKpiSelectors.ts'));
  assert.equal(s.isIncludedExpense(fixture(1, { status: 'CANCELLED' })), false);
  assert.equal(s.isOpenExpense(fixture(1, { balance: 0 })), false);
  assert.equal(s.isOverdueExpense(fixture(1, { paymentStatus: 'PARTIALLY_PAID', paidAmount: 50, balance: 50 }), '2026-09-15'), true);
  assert.equal(s.isOverdueExpense(fixture(1), undefined), false);
  const onTime = fixture(1, { paymentStatus: 'PAID', balance: 0, paidAmount: 100, paidDate: '2026-09-10' });
  const late = fixture(2, { ...onTime, id: '2', paidDate: '2026-09-11' });
  const result = s.paymentPunctuality([onTime, late, fixture(3), fixture(4, { ...onTime, dueDate: undefined }), fixture(5, { ...onTime, status: 'CANCELLED' })]);
  assert.equal(result.count, 2); assert.equal(result.onTime, 1); assert.equal(result.percent, 50);
  assert.equal(s.paymentPunctuality([]).percent, null);
  assert.equal(s.matchesExpenseIssue(onTime, 'pendingAudit'), true);
  assert.equal(s.matchesExpenseIssue({ ...onTime, auditStatus: 'AUDITED' }, 'pendingAudit'), false);
});

test('monetary batches honor server limits without dropping groups and reject incomplete results', async () => {
  const app = setup(); const calls = [];
  app.setTransport(async queries => { calls.push(queries.length); return Object.fromEntries(queries.map(q => [q.key, aggregate()])); });
  const api = app.load(resolve(dir, 'useExpenseKpiAggregates.ts'), true);
  const queries = Array.from({ length: 237 }, (_, i) => ({ key: String(i), metric: 'EXPENSE_TOTAL', preferredCurrency: 'MXN', ids: [i+1] }));
  const result = await api.loadExpenseKpiAggregates(queries);
  assert.equal(calls.join(','), '100,100,37'); assert.equal(Object.keys(result).length, 237);
  assert.equal(api.completeAmount({ ...aggregate(), partial: true }), null); assert.equal(api.completeAmount(aggregate(0)), 0);
  app.setTransport(async () => ({})); await assert.rejects(api.loadExpenseKpiAggregates(queries), /Incomplete/);
});

test('all supported locales translate the new workspace labels and explanations', () => {
  const { getExpenseWorkspaceCopy } = setup().load(resolve(dir, 'translations/workspaceCopy.ts'));
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) {
    const copy = getExpenseWorkspaceCopy(locale);
    assert.ok(Object.values(copy).every(value => typeof value === 'string' && value.length > 0));
    if (!locale.startsWith('es')) assert.notEqual(copy.context, getExpenseWorkspaceCopy('es-MX').context);
  }
});
