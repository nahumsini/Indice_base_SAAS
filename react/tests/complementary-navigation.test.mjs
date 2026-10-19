import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const pure = path => loadTypescript(resolve(path), id => { throw Error(id); });
const access = pure('src/app/access/tabScopeCatalog.ts');
const { boardTabs, legacyBoardDestination } = pure('src/app/ComplementaryModules/SalesBoard/boardNavigation.ts');
const { moduleTabArtwork } = pure('src/app/components/icons/moduleTabArtwork.ts');
const modules = {
  'sales-board': { tabs: boardTabs, file: 'SalesBoard/SalesBoard.tsx' },
  scheduling: { tabs: ['calendar', 'clients', 'events', 'indicators'], file: 'Scheduling/Scheduling.tsx' },
  maintenance: { tabs: ['requests', 'orders', 'assets', 'preventive', 'indicators', 'configuration'], file: 'Maintenance/Mantenimiento.tsx' },
  'minutes-control': { tabs: ['meetings', 'agreements', 'indicators'], file: 'MinutesControl/MinutesControl.tsx' },
  email: { tabs: ['mail', 'accounts'], file: 'Email/CorreoEmpresarial.tsx' },
};
const session = { company: { id: 2 }, user: { id: 1, role: 'admin', tab_permissions_configured: true,
  tab_permission_keys: [...new Set(Object.values(access.MODULE_TAB_SCOPE_CATALOG).flatMap(entry => Object.values(entry.tabs).map(id => `${entry.moduleSlug}.${id}`)))] } };

async function route(page, { requested = modules[page].tabs[0], remembered = '', search = '' } = {}) {
  const runtime = hookRuntime(), storage = new Map(), navigations = [];
  const history = [`/${page}/${requested}${search}`];
  let index = 0, current = requested;
  global.window = { location: { search }, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }, setTimeout: () => 1, clearTimeout: () => {} };
  const navigate = (path, options) => {
    navigations.push(path);
    if (options?.replace) history[index] = path;
    else { history.splice(index + 1); history.push(path); index++; }
    update(path);
  };
  function update(path) {
    const url = new URL(path, 'http://local'); current = url.pathname.split('/')[2] ?? ''; window.location.search = url.search;
  }
  const { useRoutedModuleTab } = loadTypescript(resolve('src/app/hooks/useRoutedModuleTab.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react-router') return { useNavigate: () => navigate, useParams: () => ({ pageId: page, '*': current }) };
    if (id.endsWith('/auth')) return { authApi: { getSessionOrNull: async () => session } };
    if (id.endsWith('/workspaceState')) return { workspaceStateApi: { get: async () => ({ state: { activeTab: remembered } }), save: async () => {} } };
    if (id.endsWith('/useDeferredTabChange')) return { useDeferredTabChange: (_, changeTab) => ({ changeTab, isTabLoading: false }) };
    throw Error(id);
  });
  const render = () => runtime.render(() => useRoutedModuleTab(modules[page].tabs[0], modules[page].tabs, access.MODULE_TAB_ROUTE_ALIASES[page], { preserveSearch: page === 'sales-board' }));
  render(); await runtime.flush(); render(); await runtime.flush();
  return { runtime, navigations, history, storage,
    async select(tab) { runtime.result.setActiveTab(tab); render(); await runtime.flush(); },
    async back() { update(history[--index]); render(); await runtime.flush(); },
    async forward() { update(history[++index]); render(); await runtime.flush(); },
  };
}

test('all five complementary owners use the canonical workbar and complete 3D tab identities', () => {
  for (const [page, { tabs, file }] of Object.entries(modules)) {
    const source = readFileSync(resolve(`src/app/ComplementaryModules/${file}`), 'utf8');
    assert.match(source, /<IndiceModuleShell/);
    assert.match(source, /onTabChange=\{/);
    assert.match(source, /useRoutedModuleTab\(/);
    for (const tab of tabs) {
      assert.ok(moduleTabArtwork[page][tab], `${page}/${tab}: artwork`);
      assert.ok(access.tabPermissionKey(page, tab), `${page}/${tab}: permission`);
      assert.equal(access.canAccessModuleTab(page, tab, session), true);
    }
  }
});

test('each complementary primary tab opens its own canonical path and supports Back/Forward', async () => {
  for (const [page, { tabs }] of Object.entries(modules)) {
    const state = await route(page);
    for (const tab of tabs.slice(1)) {
      await state.select(tab);
      assert.equal(state.runtime.result.activeTab, tab);
      assert.equal(state.navigations.at(-1), `/${page}/${tab}`);
    }
    await state.back(); assert.equal(state.runtime.result.activeTab, tabs.at(-2));
    await state.forward(); assert.equal(state.runtime.result.activeTab, tabs.at(-1));
    state.runtime.unmount();
  }
});

test('direct tab links override remembered navigation; module entry restores the last valid tab', async () => {
  for (const [page, { tabs }] of Object.entries(modules)) {
    const direct = await route(page, { requested: tabs.at(-1), remembered: tabs[0] });
    assert.equal(direct.runtime.result.activeTab, tabs.at(-1)); direct.runtime.unmount();
    const restored = await route(page, { requested: '', remembered: tabs.at(-1) });
    assert.equal(restored.runtime.result.activeTab, tabs.at(-1));
    assert.equal(restored.navigations.at(-1), `/${page}/${tabs.at(-1)}`); restored.runtime.unmount();
  }
});

test('Sales Board switches and history preserve the shared date and channel filters', async () => {
  const search = '?from=2026-10-01&to=2026-10-18&origin=POS&channel=COUNTER';
  const state = await route('sales-board', { search });
  await state.select('channels'); await state.select('sales');
  assert.equal(state.navigations.at(-1), `/sales-board/sales${search}`);
  await state.back(); assert.equal(state.runtime.result.activeTab, 'channels'); assert.equal(window.location.search, search);
  await state.forward(); assert.equal(state.runtime.result.activeTab, 'sales'); assert.equal(window.location.search, search);
  state.runtime.unmount();
});

test('old Sales Board view bookmarks migrate without losing filters or overriding an explicit new section', () => {
  for (const tab of boardTabs) {
    assert.equal(legacyBoardDestination('overview', `?view=${tab}&origin=POS&from=2026-10-01`), `/sales-board/${tab}?origin=POS&from=2026-10-01`);
  }
  assert.equal(legacyBoardDestination(undefined, '?view=sales'), '/sales-board/sales');
  assert.equal(legacyBoardDestination('trends', '?view=sales&origin=POS'), '/sales-board/trends?origin=POS');
  assert.equal(legacyBoardDestination('overview', '?view=garbage'), '/sales-board/overview');
  assert.equal(legacyBoardDestination('sales', '?origin=POS'), null);
});

test('all four Sales Board views retain the one existing owner grant and management role boundary', () => {
  for (const tab of boardTabs) {
    assert.equal(access.tabPermissionKey('sales-board', tab), 'sales_board.overview');
    for (const role of ['user', 'admin']) {
      const user = { ...session.user, role, tab_permission_keys: ['sales_board.overview'] };
      assert.equal(access.canAccessModuleTab('sales-board', tab, { user }), role === 'admin');
    }
    assert.equal(access.canAccessModuleTab('sales-board', tab, { user: { ...session.user, tab_permission_keys: [] } }), false);
  }
});

test('historical meeting and maintenance URLs resolve before permissions, including protected management aliases', async () => {
  for (const [page, aliases] of Object.entries(access.MODULE_TAB_ROUTE_ALIASES)) {
    for (const [old, tab] of Object.entries(aliases)) {
      assert.equal(access.resolveModuleTabId(page, old), tab);
      assert.equal(access.tabPermissionKey(page, old), access.tabPermissionKey(page, tab));
      const state = await route(page, { requested: old });
      assert.equal(state.runtime.result.activeTab, tab);
      assert.equal(state.navigations.at(-1), `/${page}/${tab}`); state.runtime.unmount();
    }
  }
  const restricted = { user: { role: 'user', tab_permissions_configured: true, tab_permission_keys: ['maintenance.preventive', 'maintenance.indicators'] } };
  assert.equal(access.canAccessModuleTab('maintenance', 'preventivos', restricted), false);
  assert.equal(access.canAccessModuleTab('maintenance', 'kpis', restricted), false);
  assert.equal(access.resolveModuleTabId('scheduling', 'reservations'), 'reservations');
  assert.notEqual(access.tabPermissionKey('scheduling', 'reservations'), access.tabPermissionKey('scheduling', 'calendar'));
  const app = readFileSync(resolve('src/app/App.tsx'), 'utf8');
  assert.match(app, /const requestedTabId = currentPage && rawRequestedTabId \? resolveModuleTabId\(currentPage, rawRequestedTabId\)/);
});

const element = (type, props) => ({ type, props });
function nodes(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  return [value, ...nodes(value.props?.children)];
}
test('Sales Board promotes real sections to the workbar and preserves filter state through trend/channel drilldowns', async () => {
  const runtime = hookRuntime(); let memory, active = 'trends';
  const copy = new Proxy({}, { get: (_, key) => String(key) });
  const money = { partial: false, nativeTotals: [], exchangeRate: {} };
  const data = { total: 1, page: 1, pageSize: 25, context: { from: '2026-10-01', to: '2026-10-18', timeZone: 'UTC' },
    options: { channels: [], units: [], businesses: [] }, summary: { total: money }, analytics: { comparison: { total: money } } };
  const tokens = new Proxy({}, { get: (_, key) => String(key) });
  global.window = { setTimeout: () => 1, clearTimeout: () => {} };
  const board = loadTypescript(resolve('src/app/ComplementaryModules/SalesBoard/SalesBoard.tsx'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (id === 'react-router') return { useLocation: () => ({ search: '' }), useParams: () => ({ '*': active }) };
    if (id.endsWith('/useRoutedModuleTab')) return { useRoutedModuleTab: () => ({ activeTab: active, setActiveTab: tab => { active = tab; } }) };
    if (id.endsWith('/useAuthorizationRevision')) return { useAuthorizationRevision: () => 0 };
    if (id.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: options => { memory = options; } };
    if (id.endsWith('/BusinessCurrencyContext')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'MXN' }) };
    if (id.endsWith('/apiClient')) return { apiClient: async () => data };
    if (id === './boardCopy') return { useBoardCopy: () => ({ copy, locale: 'es-MX' }), originLabel: value => value, channelLabel: value => value };
    if (id === './boardModel') return pure('src/app/ComplementaryModules/SalesBoard/boardModel.ts');
    if (id === './boardNavigation') return { boardTabs, legacyBoardDestination };
    if (id.endsWith('/IndiceFilterDisclosure')) return { ...tokens, useIndiceFilterDisclosureCopy: () => copy };
    if (id.endsWith('/IndiceFilterBar')) return { ...tokens, IndiceFilterBar: 'IndiceFilterBar', IndiceFilterField: 'IndiceFilterField', IndiceFilterSearch: 'IndiceFilterSearch', IndiceFilterSelect: 'IndiceFilterSelect', getIndiceFilterControlClassName: () => '' };
    return tokens;
  });
  // Unwrap the outer legacy migration boundary and the routed shell without rendering unrelated children.
  const routed = board.default({}); const shell = routed.type(routed.props);
  assert.deepEqual(shell.props.tabs.map(tab => tab.id), boardTabs);
  assert.equal(shell.type, 'IndiceModuleShell');
  const workspace = shell.props.children;
  runtime.render(() => workspace.type({ ...workspace.props, view: active })); await runtime.flush();
  assert.equal(memory.urlFields.view, undefined);
  assert.equal(nodes(runtime.result).some(node => node.type === 'IndiceWorkspaceNavigation'), false);
  // Old saved view cannot override the selected route; saved filters still restore.
  memory.onRestore({ view: 'overview', origin: 'POS', unitId: '7', businessId: '9' }); await runtime.flush();
  assert.ok(nodes(runtime.result).find(node => node.type === 'BoardTrends'));
  nodes(runtime.result).find(node => node.type === 'BoardTrends').props.onInterval('2026-10-05', '2026-10-07');
  await runtime.flush();
  assert.equal(active, 'sales'); assert.equal(memory.state.from, '2026-10-05'); assert.equal(memory.state.to, '2026-10-07');
  assert.equal(memory.state.unitId, '7'); assert.equal(memory.state.businessId, '9');
  active = 'channels'; runtime.render(); await runtime.flush();
  nodes(runtime.result).find(node => node.type === 'BoardChannels').props.onChannel('POS', 'COUNTER'); await runtime.flush();
  assert.equal(active, 'sales'); assert.equal(memory.state.channel, 'COUNTER'); assert.equal(memory.state.from, '2026-10-05');
  assert.ok(nodes(runtime.result).find(node => node.type === 'BoardSales'));
  runtime.unmount();
});
