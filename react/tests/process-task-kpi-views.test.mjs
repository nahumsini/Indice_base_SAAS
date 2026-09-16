import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, 'src/app/BasicModules/ProcessesTasks/KPIs');
const kpiPath = resolve(directory, 'KPIs.tsx');
const source = readFileSync(kpiPath, 'utf8');
const ast = ts.createSourceFile(kpiPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'KPIs');
const stateNames = component.body.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
  .filter(d => ts.isArrayBindingPattern(d.name) && d.initializer?.expression?.getText(ast) === 'useState')
  .map(d => d.name.elements[0].name.getText(ast));
const counts = 'tasks closedInPeriod openTasks lateOpenTasks highPriorityOpenTasks highPriorityLateTasks late1To3Days late4To7Days late8PlusDays eligibleDeliveries onTimeDeliveries closuresWithoutDeadline pendingAuditTasks auditDurationSamples auditedTasks ratedTasks requiredEvidenceTasks missingRequiredEvidence openMissingEvidence closedMissingEvidence elapsedSamples upcomingTasks observedRuns runsWithLateTasks fullyObservedCompletedRuns'.split(' ');
const metrics = { ...Object.fromEntries(counts.map(key => [key, 0])), onTimeRate: null, medianAuditWaitDays: null, medianAuditDurationDays: null, averageRating: null, medianElapsedDays: null, ratingDistribution: [0,0,0,0,0,0] };
const dashboard = { range: { from: '2026-09-01', to: '2026-09-15', includeOverdueBacklog: true, overdueOnly: false }, summary: {}, comparison: { available: false }, cards: [], collaborators: [], processes: [], projects: [], units: [], trend: [], generatedAt: '2026-09-15T12:00:00', measurements: { definitionVersion: 1, cutoffDate: '2026-09-15', upcomingThrough: '2026-09-15', summary: metrics, activity: [] } };
function setup(initial = {}, locale = 'es-MX') {
  const state = { dashboard, isLoading: false, ...initial };
  let cursor = 0, workspace;
  const printed = [], navigations = [], effects = [], cache = new Map();
  const marker = name => Object.assign(() => null, { displayName: name });
  const markers = new Proxy({}, { get: (target, name) => target[name] ??= marker(String(name)) });
  const hooks = { ...React, useMemo: fn => fn(), useCallback: fn => fn, useDeferredValue: value => value,
    useEffect: (fn, deps) => effects.push(deps),
    useState: initialValue => {
      const name = stateNames[cursor++];
      if (!(name in state)) state[name] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [state[name], value => { state[name] = typeof value === 'function' ? value(state[name]) : value; }];
    },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }; cache.set(file, module.exports);
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'react-router') return { useNavigate: () => target => navigations.push(target), useParams: () => ({ pageId: 'processes-tasks' }) };
      if (name === 'lucide-react' || name === 'recharts') return markers;
      if (name.endsWith('/useAgendaFilters')) return { agendaFocusFilterValues: ['mine', 'delegated', 'team'], agendaStatusFilterValues: ['pending', 'in_progress', 'paused', 'completed', 'audited', 'overdue'] };
      if (name.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: locale } }) };
      if (name.endsWith('/translations') || name.includes('/translations/') || /[\\/]translations[\\/]/.test(file)) {
        const base = resolve(dirname(file), name); return load(existsSync(base + '.ts') ? base + '.ts' : resolve(base, 'index.ts'));
      }
      if (name.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: options => { workspace = options; } };
      if (name.endsWith('/useCompanyPrintIdentity')) return { useCompanyPrintIdentity: () => ({ identity: { name: 'Synthetic company' }, isReady: true }) };
      if (name.endsWith('/measurementPresentation')) return load(resolve(directory, 'measurementPresentation.ts'));
      if (name.endsWith('/kpiHtmlPrintEngine')) return { escapeKpiPrintHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'), printKpiHtmlReport: report => printed.push(report) };
      if (name.endsWith('/kpisPdf')) return { printKpisDashboardPdf: report => printed.push(report) };
      if (name.endsWith('/ui/utils')) return { cn: (...args) => args.filter(Boolean).join(' ') };
      if (name.endsWith('/frontend-os')) return { ...Object.fromEntries(['IndiceTitleBar','IndiceFilterAdvancedSection', 'IndiceFilterBar', 'IndiceFilterDisclosureActions', 'IndiceFilterSearch', 'IndiceFilterSelect', 'IndiceWorkspaceNavigation'].map(n => [n, markers[n]])), useIndiceFilterDisclosureCopy: () => ({}) };
      return markers;
    };
    vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Intl, Date, Map, Set, URLSearchParams, console })(require, module, module.exports);
    return module.exports;
  }
  const KPIs = load(kpiPath).default;
  return { state, printed, navigations, effects, load, render: () => { cursor = 0; effects.length = 0; return KPIs({}); }, get workspace() { return workspace; } };
}
function walk(node, hidden = false) {
  if (Array.isArray(node)) return node.flatMap(n => walk(n, hidden));
  if (!node || typeof node !== 'object' || !node.props || (!hidden && node.props.hidden)) return [];
  return [node, ...walk(node.props.children, hidden), ...walk(node.props.actions, hidden)];
}
const named = (tree, name) => walk(tree).filter(n => (n.type.displayName || n.type.name) === name);
const views = ['overview', 'analysis', 'units', 'performance'];

test('four yellow views isolate content and retain table instances', () => {
  const app = setup();
  for (const view of views) {
    const navigation = named(app.render(), 'IndiceWorkspaceNavigation')[0];
    assert.equal(navigation.props.tone, 'yellow'); assert.equal(navigation.props.variant, 'views');
    navigation.props.onValueChange(view);
    const tree = app.render();
    assert.equal(walk(tree).filter(n => n.props.role === 'tabpanel').length, 1);
    assert.equal(named(tree, 'IndiceFilterBar').length, 1);
    assert.equal(named(tree, 'KpiMeasurementCards').length, view === 'overview' ? 1 : 0);
    assert.equal(named(tree, 'KpiPerformanceWorkspace').length, view === 'performance' ? 1 : 0);
    assert.equal(walk(tree, true).filter(n => n.type.displayName === 'KpiPerformanceWorkspace').length, 1);
    assert.match(tree.props.className, /grid.*gap-6/);
  }
});

test('view and entity navigation retain filters and do not change data-loading dependencies', () => {
  const app = setup({ searchQuery: 'alpha', period: 'month', focusFilter: 'team' });
  app.render(); const before = JSON.stringify(app.effects);
  app.state.activeView = 'performance'; app.state.activeEntity = 'projects'; app.render();
  assert.equal(JSON.stringify(app.effects), before);
  assert.equal(app.workspace.state.searchQuery, 'alpha'); assert.equal(app.workspace.state.period, 'month');
  assert.equal(app.workspace.urlFields.activeView, 'view'); assert.equal(app.workspace.urlFields.activeEntity, 'entity');
  app.workspace.onRestore({ ...app.workspace.state, activeView: 'unknown', activeEntity: 'unknown' }); app.render();
  assert.equal(app.state.activeView, 'overview'); assert.equal(app.state.activeEntity, 'collaborators');
});

test('printing every view uses the same complete data and is disabled during refresh', async () => {
  const app = setup();
  for (const view of views) {
    app.state.activeView = view;
    const print = walk(app.render()).find(n => typeof n.props.onClick === 'function' && n.props.title);
    assert.ok(print); await print.props.onClick();
  }
  assert.equal(app.printed.length, 4);
  for (const report of app.printed) assert.equal(report.dashboard, dashboard);
  app.state.isLoading = true;
  assert.equal(walk(app.render()).find(n => n.props.title && n.props.onClick).props.disabled, true);
  assert.equal(named(app.render(), 'KpiPerformanceWorkspace').length, 0);
});

test('drilldowns carry the shared search and scope instead of silently widening it', () => {
  const app = setup({ activeView: 'performance', searchQuery: 'alpha beta', focusFilter: 'team', period: 'month' });
  named(app.render(), 'KpiPerformanceWorkspace')[0].props.onOpenAgenda({ project: 'project:12' });
  const url = new URL(app.navigations[0], 'http://localhost');
  assert.equal(url.searchParams.get('search'), 'alpha beta');
  assert.equal(url.searchParams.get('focus'), 'team');
  assert.equal(url.searchParams.get('project'), 'project:12');
});

test('missing measurements stay unavailable, while zero ratings and all six buckets remain valid', () => {
  const app = setup(); const api = app.load(resolve(directory, 'measurements.ts'));
  assert.equal(api.normalizeKpiMeasurements(undefined), null);
  assert.equal(api.normalizeTaskMeasurements({}), null);
  assert.equal(api.normalizeTaskMeasurements({ ...metrics, tasks: undefined }), null);
  assert.equal(api.normalizeTaskMeasurements({ ...metrics, averageRating: 0 }).averageRating, 0);
  assert.equal(api.normalizeTaskMeasurements(metrics).averageRating, null);
  assert.equal(api.normalizeKpiMeasurements({ ...dashboard.measurements, definitionVersion: 9 }), null);
});

test('all supported languages have localized views and eight meaningful cards, with N/A instead of false zero', () => {
  const app = setup(); const { getTaskKpiWorkspaceCopy } = app.load(resolve(directory, 'translations/workspaceCopy.ts'));
  const { measurementCards } = app.load(resolve(directory, 'measurementPresentation.ts'));
  const labels = new Set();
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) {
    const c = getTaskKpiWorkspaceCopy(locale); const cards = measurementCards(metrics, c, locale);
    assert.equal(cards.length, 8); assert.equal(cards.find(card => card.id === 'onTime').value, c.noSample);
    assert.equal(cards.find(card => card.id === 'evidence').value, c.notApplicable);
    assert.equal(cards.find(card => card.id === 'quality').value, c.noSample);
    labels.add(c.overview);
  }
  assert.equal(labels.size, 6);
});


test('entity tables stay mounted with one visible instance and receive the global pagination reset key', () => {
  const app = setup();
  const { KpiPerformanceWorkspace } = app.load(resolve(directory, 'components/KpiPerformanceWorkspace.tsx'));
  const copy = app.load(resolve(directory, 'translations/index.ts')).getKpisTranslations('es-MX');
  const agendaCopy = app.load(resolve(root, 'src/app/BasicModules/ProcessesTasks/Agenda/translations/index.ts')).getAgendaTranslations('es-MX');
  for (const [activeTab, visibleName] of [['collaborators', 'CollaboratorsTable'], ['processes', 'ProcessesTable'], ['projects', 'ProjectsTable']]) {
    const tree = KpiPerformanceWorkspace({ activeTab, scopeKey: 'company:1:month', agendaCopy, collaborators: [], processes: [], projects: [], copy, onOpenAgenda: () => {} });
    const tables = walk(tree, true).filter(n => ['CollaboratorsTable', 'ProcessesTable', 'ProjectsTable'].includes(n.type.name));
    assert.equal(tables.length, 3);
    assert.equal(walk(tree).filter(n => n.type.name === visibleName).length, 1);
    for (const table of tables) assert.equal(table.props.scopeKey, 'company:1:month');
  }
});

test('single status composition uses a deterministic visible donut', () => {
  const oneStatus = {
    ...dashboard,
    summary: {
      ...dashboard.summary,
      pendingTasks: 3,
      inProgressTasks: 0,
      pausedTasks: 0,
      completedTasks: 0,
      auditedTasks: 0,
      overdueTasks: 0,
    },
  };
  const tree = setup({ activeView: 'analysis', dashboard: oneStatus }).render();
  const donut = walk(tree).find(node => node.props['data-process-task-kpi-single-segment'] === 'composition');
  assert.ok(donut);
  assert.equal(donut.props.role, 'img');
  assert.match(donut.props['aria-label'], /3/);
});

test('source failures use localized safe copy and highlighted rankings avoid legacy composite scores', () => {
  assert.doesNotMatch(source, /error\.message/);
  assert.doesNotMatch(source, /progress:\s*100\s*-\s*row\.(?:productivityScore|healthScore)/);
  assert.doesNotMatch(source, /lateOpenTasks[^\n]+(?:productivityScore|healthScore)/);
  assert.match(source, /row\.openTasks > 0/);
});

test('generated report includes measured cards and all units beyond the visible page, escaping names', () => {
  const app = setup();
  const { printKpisDashboardPdf } = app.load(resolve(directory, 'kpisPdf.ts'));
  const copy = app.load(resolve(directory, 'translations/index.ts')).getKpisTranslations('es-MX');
  const units = Array.from({ length: 25 }, (_, i) => ({ unitId: i + 1, unitName: `Unit <${i + 1}>`, measurements: metrics }));
  printKpisDashboardPdf({ companyIdentity: {}, dashboard: { ...dashboard, units }, copy, periodLabel: 'Period', rangeLabel: 'Range', filterLines: [], unitLabel: '', businessLabel: '', projectLabel: '', focusLabel: '', statusLabel: '', collaboratorLabel: '' });
  const report = app.printed[0], html = report.pageBodies.join('');
  assert.match(html, /Entregadas a tiempo/);
  assert.match(html, /Sin muestra evaluable/);
  assert.match(html, /Unit &lt;25&gt;/);
  assert.doesNotMatch(html, /Unit <25>/);
  assert.equal((html.match(/class="metric-value"/g) ?? []).length, 8);
});
