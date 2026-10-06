import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../src/app');
const settle = () => new Promise(setImmediate);
const plain = (value) => JSON.parse(JSON.stringify(value));

function hookHost() {
  const slots = [];
  let cursor = 0, effects = [], dirty = false;
  const React = {
    ...require('react'),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (update) => {
        const next = typeof update === 'function' ? update(slots[index]) : update;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo: (create) => create(),
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => !Object.is(value, slots[index].dependencies[i]))) slots[index] = { dependencies, callback };
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => !Object.is(value, slots[index].dependencies[i]))) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }; });
      }
    },
  };
  return { React, render(component) {
    let node, renders = 0;
    do {
      dirty = false; cursor = 0; effects = [];
      node = component(); effects.forEach((effect) => effect());
      if (++renders > 20) throw new Error('Render loop');
    } while (dirty);
    return node;
  } };
}

// Render pure business children while keeping shared engines as observable boundaries.
function expand(node) {
  return ['Metric', 'BreakdownTable'].includes(node?.type?.name) ? node.type(node.props) : node;
}
function find(node, predicate) {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return null;
  node = expand(node);
  return predicate(node) ? node : find(node.props?.children, predicate) ?? find(node.props?.pagination, predicate);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node !== 'object') return String(node);
  return text(expand(node).props?.children);
}
const byType = (node, type) => find(node, (item) => item.type === type);
const button = (node, label) => find(node, (item) => item.type === 'button' && text(item).includes(label));

function dashboard(overrides = {}) {
  return {
    period: { days: 30, from: '2026-09-07', to: '2026-10-06', market: 'all', measuredAt: '2026-10-06T12:00:00Z' },
    totals: { received: 205, contacted: 100, scheduled: 80, diagnosed: 40, trials: 10, proposals: 20, won: 5, lost: 2, nurture: 3, slaEligible: 180, slaMet: 90, averageContactHours: 6 },
    rates: { contactSla: 50, diagnosis: 19.51, proposalWin: 25 },
    stages: [{ code: 'received', count: 205, cohortRate: 100 }, { code: 'contacted', count: 100, cohortRate: 48.78 }, { code: 'diagnosed', count: 40, cohortRate: 19.51 }, { code: 'proposal', count: 20, cohortRate: 9.76 }, { code: 'won', count: 5, cohortRate: 2.44 }],
    attention: { overdue: 7, unassigned: 3, missingAction: 2, uncontacted: 4, trialsEnding: 2, trialsExpired: 1 },
    sources: [{ source: 'LinkedIn', medium: 'paid social', campaign: 'Controla & Toronto', plan: '', received: 205, diagnosed: 40, proposals: 20, won: 5, diagnosisRate: 19.51, proposalWinRate: 25 }], sourceGroups: 35,
    plans: [{ source: '', medium: '', campaign: '', plan: 'CONTROLA', received: 205, diagnosed: 40, proposals: 20, won: 5, diagnosisRate: 19.51, proposalWinRate: 25 }],
    ...overrides,
  };
}
function detail(view = 'received', page = 1) {
  return { period: dashboard().period, view, currentBacklog: view === 'overdue', items: [{ id: 41, companyName: 'Customer A', status: 'NEW', market: 'MX', assignedName: null, source: 'LinkedIn', medium: 'paid social', campaign: 'Controla & Toronto', plan: 'CONTROLA', createdAt: '2026-01-01T00:00:00Z', nextActionAt: '2026-01-02T00:00:00Z', firstContactAt: null }], total: 205, page, pageSize: 25, totalPages: 9 };
}

function harness(locale = 'es-MX') {
  const host = hookHost(), requests = [], detailRequests = [], opened = [];
  const load = createTypeScriptLoader({
    react: host.React,
    'lucide-react': new Proxy({}, { get: (_target, name) => `icon-${String(name)}` }),
    '../shared/context': { useLanguage: () => ({ currentLanguage: { code: locale } }) },
    '../api/platformLeadAnalytics': { platformLeadAnalyticsApi: {
      dashboard: (days, market) => new Promise((resolve, reject) => requests.push({ days, market, resolve, reject })),
      details: (days, market, selection, page) => new Promise((resolve, reject) => detailRequests.push({ days, market, selection: plain(selection), page, resolve, reject })),
    } },
    '../hooks/usePersistentColumnWidths': { usePersistentColumnWidths: ({ defaults }) => ({ columnWidths: defaults, resizeColumn() {} }) },
    '../components/indice-modal': { IndiceModalFrame: 'modal' },
    '../components/table/DataTablePagination': { DataTablePagination: 'pagination' },
    '../components/table/IndiceTableEngine': { IndiceTableShell: 'table-shell', IndiceOperationalTable: 'table', IndiceTableColGroup: 'columns', IndiceTableHeaderRow: 'headers', getIndiceTableMinimumWidth: ({ columns, actionsWidth }) => columns.reduce((sum, column) => sum + column.width, actionsWidth) },
    '../components/ui/table': { TableBody: 'tbody', TableCell: 'td', TableRow: 'tr' },
  });
  const { LeadCommercialAnalytics } = load(resolve(root, 'PlatformAdmin/LeadCommercialAnalytics.tsx'));
  const props = { days: 30, market: 'all', view: 'overview', refreshKey: 0, onOpenLead: (id) => opened.push(id) };
  return { props, requests, detailRequests, opened, render: () => host.render(() => LeadCommercialAnalytics(props)) };
}

test('actual overview uses server rates, complete counts, stage drilldown and current attention', async () => {
  const h = harness();
  assert.ok(byType(h.render(), 'div').props['aria-busy']);
  h.requests[0].resolve(dashboard()); await settle();
  let node = h.render();
  assert.match(text(button(node, 'Prospectos confirmados')), /205/);
  assert.match(text(button(node, 'Contacto en 24 horas')), /50\s?%/);
  assert.match(text(button(node, 'Propuesta a cierre')), /25\s?%/);
  button(node, 'Contacto en 24 horas').props.onClick(); h.render();
  assert.equal(h.detailRequests[0].selection.view, 'sla_missed');
  byType(h.render(), 'modal').props.onOpenChange(false); node = h.render();
  button(node, 'Próximas acciones vencidas').props.onClick(); h.render();
  assert.equal(h.detailRequests[1].selection.view, 'overdue');
  h.detailRequests[1].resolve(detail('overdue')); await settle();
  node = h.render();
  assert.match(byType(node, 'modal').props.description, /todas las fechas/);
  assert.match(text(node), /Customer A/);
  button(node, 'Abrir seguimiento').props.onClick();
  assert.deepEqual(h.opened, [41]);
  assert.equal(byType(h.render(), 'modal').props.open, false);
});

test('detail totals and pagination exceed 200 and discard stale page responses', async () => {
  const h = harness(); h.render(); h.requests[0].resolve(dashboard()); await settle();
  button(h.render(), 'Prospectos confirmados').props.onClick(); h.render();
  h.detailRequests[0].resolve(detail()); await settle();
  const pagination = byType(h.render(), 'pagination');
  assert.equal(pagination.props.totalCount, 205); assert.equal(pagination.props.totalPages, 9);
  pagination.props.onPageChange(2); h.render();
  assert.equal(byType(h.render(), 'pagination'), null); // Old rows are cleared while a new page loads.
  h.detailRequests[1].resolve(detail('received', 2)); await settle();
  assert.equal(byType(h.render(), 'pagination').props.currentPage, 2);
  byType(h.render(), 'pagination').props.onPageChange(3); h.render();
  byType(h.render(), 'modal').props.onOpenChange(false); h.render();
  h.detailRequests[2].resolve(detail('received', 3)); await settle();
  assert.equal(byType(h.render(), 'modal').props.open, false);
});

test('period and market changes drop previous data and late responses; views preserve fetched scope', async () => {
  const h = harness(); h.render(); h.props.market = 'CA'; h.render();
  h.requests[1].resolve(dashboard({ totals: { ...dashboard().totals, received: 99 } })); await settle();
  assert.match(text(button(h.render(), 'Prospectos confirmados')), /99/);
  h.requests[0].resolve(dashboard()); await settle();
  assert.match(text(button(h.render(), 'Prospectos confirmados')), /99/);
  h.props.view = 'sources'; h.render();
  assert.equal(h.requests.length, 2);
  h.props.view = 'traffic'; assert.equal(h.render(), null);
  h.props.view = 'overview'; h.props.days = 7;
  assert.doesNotMatch(text(h.render()), /205|99/);
  assert.equal(h.requests[2].days, 7); assert.equal(h.requests[2].market, 'CA');
});

test('source and plan details pass exact declared dimensions, not inferred subscriptions', async () => {
  const h = harness(); h.props.view = 'sources'; h.render(); h.requests[0].resolve(dashboard()); await settle();
  let node = h.render();
  assert.match(text(node), /1 de 35/);
  const sourceAction = find(node, (item) => item.type === 'button' && item.props['aria-label']?.includes('Controla & Toronto'));
  sourceAction.props.onClick(); h.render();
  assert.deepEqual(h.detailRequests[0].selection, { view: 'received', source: 'LinkedIn', medium: 'paid social', campaign: 'Controla & Toronto' });
  byType(h.render(), 'modal').props.onOpenChange(false); node = h.render();
  button(node, 'Controla').props.onClick(); h.render();
  assert.deepEqual(h.detailRequests[1].selection, { view: 'received', plan: 'CONTROLA' });
  assert.match(text(h.render()), /no es una contratación activa/);
});

test('a failed protected read is an error, not zero performance; empty rates remain unavailable', async () => {
  const h = harness(); h.render(); h.requests[0].reject(new Error('403')); await settle();
  assert.ok(find(h.render(), (item) => item.props.role === 'alert'));
  assert.equal(button(h.render(), 'Prospectos confirmados'), null);
  button(h.render(), 'Reintentar').props.onClick(); h.render();
  h.requests[1].resolve(dashboard({ totals: { ...dashboard().totals, received: 0 }, rates: { contactSla: null, diagnosis: null, proposalWin: null } })); await settle();
  assert.match(text(button(h.render(), 'Contacto en 24 horas')), /—/);
  assert.doesNotMatch(text(button(h.render(), 'Contacto en 24 horas')), /0\s?%/);
});

test('commercial messages render in every supported locale and preserve interpolation', async () => {
  const load = createTypeScriptLoader();
  const { getLeadAnalyticsCopy } = load(resolve(root, 'PlatformAdmin/leadAnalyticsCopy.ts'));
  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const h = harness(locale); h.render(); h.requests[0].resolve(dashboard()); await settle();
    const copy = getLeadAnalyticsCopy(locale);
    assert.match(text(button(h.render(), copy.t('contactSla'))), /50/);
    assert.equal(copy.t('slaHelper', { met: 123, eligible: 456 }).includes('123'), true);
    assert.equal(copy.t('slaHelper', { met: 123, eligible: 456 }).includes('456'), true);
    assert.doesNotMatch(text(h.render()), /\{(?:met|eligible|count|total|from|to|hours|rate)\}/);
  }
});

test('API serializes source, market and pagination safely and never accepts authority fields', async () => {
  const paths = [];
  const { platformLeadAnalyticsApi } = createTypeScriptLoader({ '../lib/apiClient': { apiClient: async (path) => paths.push(path) } })(resolve(root, 'api/platformLeadAnalytics.ts'));
  await platformLeadAnalyticsApi.details(30, 'CA', { view: 'received', source: 'LinkedIn', medium: 'paid social', campaign: 'Controla & Toronto' }, 9);
  const url = new URL(paths[0], 'http://localhost');
  assert.equal(url.pathname, '/api/v1/platform-admin/leads/analytics/details');
  assert.equal(url.searchParams.get('campaign'), 'Controla & Toronto');
  assert.equal(url.searchParams.get('pageSize'), '25');
  assert.equal(url.searchParams.get('page'), '9');
  assert.equal(url.searchParams.get('market'), 'CA');
  assert.equal(url.searchParams.has('companyId'), false);
});

test('the actual acquisition workspace restores safe filters and keeps traffic independent from lead market', async () => {
  const host = hookHost(), memories = [], calls = [];
  const context = { useLanguage: () => ({ currentLanguage: { code: 'es-MX' } }) };
  const load = createTypeScriptLoader({
    react: host.React,
    'lucide-react': new Proxy({}, { get: (_target, name) => `icon-${String(name)}` }),
    recharts: new Proxy({}, { get: (_target, name) => `chart-${String(name)}` }),
    '../../shared/context': context,
    '../hooks/useWorkspaceNavigationMemory': { useWorkspaceNavigationMemory: (options) => memories.push(options) },
    '../components/frontend-os': { IndiceTitleBar: 'title-bar', IndiceFilterBar: 'filter-bar', IndiceFilterSelect: 'select-filter', IndiceWorkspaceNavigation: 'navigation' },
    './LeadCommercialAnalytics': { LeadCommercialAnalytics: 'commercial' },
    '../api/platformAdmin': { platformAdminApi: { getAnalytics: async (...args) => { calls.push(args); return { company_options: [], trend: [], web_sources: [], web_pages: [], web_connector: { configured: false, receiving_data: false }, web: { sessions: 0, visitors: 0, active_seconds: 0, views: 0, conversions: 0 } }; } } },
  });
  const { UsageAnalyticsWorkspace } = load(resolve(root, 'PlatformAdmin/UsageAnalyticsWorkspace.tsx'));
  const render = () => host.render(() => UsageAnalyticsWorkspace({ english: false, audit: null, websiteOnly: true }));
  render(); await settle();
  let node = render();
  assert.equal(byType(node, 'navigation').props.value, 'overview');
  assert.equal(byType(node, 'commercial').props.days, 30);
  assert.match(text(node), /Medición web pendiente/);
  assert.equal(memories.at(-1).enabled, true);
  assert.equal(memories.at(-1).urlFields.view, 'acquisition-view');
  memories.at(-1).onRestore({ view: 'sources', days: 90, market: 'CA' }); node = render(); await settle();
  assert.equal(byType(node, 'commercial').props.market, 'CA');
  assert.equal(byType(node, 'commercial').props.days, 90);
  assert.equal(byType(node, 'navigation').props.value, 'sources');
  assert.deepEqual(calls.at(-1), [90, undefined]);
  byType(node, 'navigation').props.onValueChange('traffic'); node = render();
  assert.equal(byType(node, 'commercial').props.view, 'traffic');
  const traffic = find(node, (item) => item.type?.name === 'WebsiteUsageView');
  const trafficNode = traffic.type(traffic.props);
  const metrics = [];
  function collect(value) {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== 'object') return;
    if (value.type?.name === 'InsightCard') metrics.push(value.props.value);
    collect(value.props?.children);
  }
  collect(trafficNode);
  assert.deepEqual(metrics, ['—', '—', '—', '—']);
  assert.equal(find(trafficNode, (item) => item.type === 'chart-AreaChart'), null);
  memories.at(-1).onRestore({ view: 'wrong', days: 365, market: 'US' }); node = render();
  assert.equal(byType(node, 'navigation').props.value, 'overview');
  assert.equal(byType(node, 'commercial').props.days, 30);
  assert.equal(byType(node, 'commercial').props.market, 'all');
});

test('opening a KPI follow-up selects its lead and ignores an older in-flight selection', async () => {
  const host = hookHost(), requests = [];
  const load = createTypeScriptLoader({
    react: host.React,
    'lucide-react': new Proxy({}, { get: (_target, name) => `icon-${String(name)}` }),
    '../components/frontend-os': { IndiceTitleBar: 'title-bar', IndiceFilterBar: 'filter-bar', IndiceFilterSearch: 'search', IndiceFilterSelect: 'select-filter' },
    '../api/platformLeads': { platformLeadsApi: { list: async () => ({ items: [], total: 0 }), assignees: async () => [], detail: (id) => new Promise((resolve) => requests.push({ id, resolve })) } },
  });
  const { PlatformLeadsTab } = load(resolve(root, 'PlatformAdmin/PlatformLeadsTab.tsx'));
  const props = { locale: 'es-MX', initialLeadId: 41 };
  const render = () => host.render(() => PlatformLeadsTab(props));
  const response = (id) => ({ lead: { id, companyName: `Selected ${id}`, fullName: 'Synthetic person', email: 'synthetic@example.test', status: 'NEW', createdAt: '2026-10-01T00:00:00Z', assignedAdminId: null, nextActionAt: null }, events: [] });
  render(); await settle();
  assert.equal(requests[0].id, 41);
  props.initialLeadId = 42; render();
  requests[1].resolve(response(42)); await settle();
  assert.match(text(render()), /Selected 42/);
  requests[0].resolve(response(41)); await settle();
  assert.match(text(render()), /Selected 42/);
  assert.doesNotMatch(text(render()), /Selected 41/);
});
