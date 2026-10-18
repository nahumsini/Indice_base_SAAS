import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const load = path => loadTypescript(resolve(path), id => { throw Error(`Unexpected import: ${id}`); });
const { resolveModuleNavigation } = load('src/app/components/frontend-os/moduleNavigation.ts');
const { canAccessModuleTab } = load('src/app/access/tabScopeCatalog.ts');
const tab = id => ({ id, label: id, icon: '' });
const primary = ['contacts', 'leads', 'quotes', 'sales', 'after-sales', 'kpis'].map(tab);
const menus = [
  { id: 'tools', label: 'Tools', icon: '', beforeTabId: 'kpis', tabs: ['funneling', 'mailing', 'whatsapping'].map(tab) },
  { id: 'management', label: 'Management', icon: '', tabs: ['commissions', 'payment-accounts', 'contracts'].map(tab) },
];
const ids = entries => entries.map(entry => entry.kind === 'tab' ? entry.tab.id : entry.menu.id);
const destinations = entries => entries.flatMap(entry => entry.kind === 'tab' ? [entry.tab.id] : entry.menu.tabs.map(tab => tab.id));

test('business flow stays visible, followed by tools, indicators and management, with each destination once', () => {
  const entries = resolveModuleNavigation(primary, menus, () => true);
  assert.deepEqual(ids(entries), ['contacts', 'leads', 'quotes', 'sales', 'after-sales', 'tools', 'kpis', 'management']);
  assert.equal(new Set(destinations(entries)).size, 12);
  assert.equal(destinations(entries).length, 12);
});

test('denied children disappear and menus with no authorized destinations are omitted', () => {
  const allowed = new Set(['leads', 'mailing', 'contracts']);
  const entries = resolveModuleNavigation(primary, menus, tab => allowed.has(tab.id));
  assert.deepEqual(ids(entries), ['leads', 'tools', 'management']);
  assert.deepEqual(destinations(entries), ['leads', 'mailing', 'contracts']);
  assert.deepEqual(ids(resolveModuleNavigation(primary, menus, tab => tab.id === 'leads')), ['leads']);
  assert.deepEqual(resolveModuleNavigation(primary, menus, () => false), []);
});

test('tools stay reachable without Indicators permission and preserve child metadata for the breadcrumb', () => {
  const entries = resolveModuleNavigation(primary, menus, tab => tab.id !== 'kpis');
  assert.deepEqual(ids(entries).slice(-2), ['tools', 'management']);
  const mailing = entries.flatMap(entry => entry.kind === 'tab' ? [entry.tab] : entry.menu.tabs).find(tab => tab.id === 'mailing');
  assert.deepEqual(mailing, tab('mailing'));
});

test('grouped destinations retain their actual CRM scopes for a restricted user', () => {
  const session = { user: { role: 'user', tab_permissions_configured: true, tab_permission_keys: ['crm.mailing', 'crm.contracts'] } };
  const entries = resolveModuleNavigation(primary, menus, tab => canAccessModuleTab('sales', tab.id, session));
  assert.deepEqual(destinations(entries), ['after-sales', 'mailing', 'contracts']);
  assert.deepEqual(resolveModuleNavigation(primary, menus, tab => canAccessModuleTab('sales', tab.id, null)), []);
});

test('existing modules retain primary tabs and their final More menu; missing anchors cannot hide a menu', () => {
  const existing = [tab('calendar'), tab('indicators')];
  const more = { id: 'more', label: 'More', icon: '', tabs: [tab('configuration')] };
  assert.deepEqual(ids(resolveModuleNavigation(existing, [more], () => true)), ['calendar', 'indicators', 'more']);
  assert.deepEqual(ids(resolveModuleNavigation(existing, [{ ...more, beforeTabId: 'absent' }], () => true)), ['calendar', 'indicators', 'more']);
});

test('all supported locales describe tool purpose and retain the existing KPI route label key', () => {
  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = Object.values(load(`src/app/BasicModules/Sales/translations/${locale}.ts`))[0];
    for (const key of ['tools', 'management', 'funnelingDescription', 'mailingDescription', 'whatsappingDescription']) {
      assert.ok(copy.navigation[key]?.trim(), `${locale}: ${key}`);
    }
    assert.ok(copy.tabs.kpis);
  }
});

async function route({ requested = '', remembered = '', local = '' } = {}) {
  const runtime = hookRuntime();
  const navigations = [], saved = [], storage = new Map();
  const storageKey = 'indice:module-tab:2:1:sales';
  if (local) storage.set(storageKey, local);
  global.window = { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }, setTimeout: () => 1, clearTimeout: () => {} };
  const navigate = (path, options) => navigations.push({ path, options });
  const { useRoutedModuleTab } = loadTypescript(resolve('src/app/hooks/useRoutedModuleTab.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react-router') return { useNavigate: () => navigate, useParams: () => ({ pageId: 'sales', '*': requested }) };
    if (id.endsWith('/auth')) return { authApi: { getSessionOrNull: async () => ({ company: { id: 2 }, user: { id: 1 } }) } };
    if (id.endsWith('/workspaceState')) return { workspaceStateApi: { get: async () => ({ state: { activeTab: remembered } }), save: async (...args) => saved.push(args) } };
    if (id.endsWith('/useDeferredTabChange')) return { useDeferredTabChange: (_, changeTab) => ({ changeTab, isTabLoading: false }) };
    throw Error(id);
  });
  runtime.render(() => useRoutedModuleTab('leads', destinations(resolveModuleNavigation(primary, menus, () => true)), { contrato: 'contracts' }));
  await runtime.flush();
  const result = { active: runtime.result.activeTab, navigations, storage };
  runtime.unmount();
  return result;
}

test('first use enters Opportunities; remembered tools and management routes take precedence over the new default', async () => {
  const first = await route();
  assert.equal(first.active, 'leads');
  assert.equal(first.navigations.at(-1).path, '/sales/leads');
  for (const remembered of ['contacts', 'funneling', 'mailing', 'whatsapping', 'contracts']) {
    assert.equal((await route({ remembered })).active, remembered);
  }
  assert.equal((await route({ local: 'mailing' })).active, 'mailing');
});

test('direct links and legacy Contracts links still override memory', async () => {
  assert.equal((await route({ requested: 'mailing', remembered: 'sales' })).active, 'mailing');
  const legacy = await route({ requested: 'contrato', remembered: 'leads' });
  assert.equal(legacy.active, 'contracts');
  assert.equal(legacy.navigations.at(-1).path, '/sales/contracts');
});

test('Sales entry can restore memory, but denied explicit tabs and all-denied users remain blocked by App', () => {
  const appSource = readFileSync(resolve('src/app/App.tsx'), 'utf8');
  const guard = appSource.match(/const isDeniedTabPage = (Boolean\([\s\S]*?\n  \));/)[1];
  const evaluateGuard = new Function('currentPage', 'requestedTabId', 'allowedCurrentTabIds', `
    const collectionBlocked = false, isModuleAccessLoaded = true, sessionTabAccess = {};
    const currentTabScopeDefinition = { tabs: { leads: 'leads', mailing: 'mailing', contracts: 'contracts' } };
    return ${guard};
  `);
  assert.equal(evaluateGuard('sales', undefined, ['mailing']), false);
  assert.equal(evaluateGuard('sales', 'mailing', ['mailing']), false);
  assert.equal(evaluateGuard('sales', 'contracts', ['mailing']), true);
  assert.equal(evaluateGuard('sales', 'unknown', ['mailing']), true);
  assert.equal(evaluateGuard('sales', undefined, []), true);
  assert.equal(evaluateGuard('sales', 'leads', []), true);
  assert.equal(evaluateGuard('inventory', undefined, ['leads']), true);
  const salesSource = readFileSync(resolve('src/app/BasicModules/Sales/Ventas.tsx'), 'utf8');
  assert.match(salesSource, /if \(!params\['\*'\]\?\.split\('\/'\)\.filter\(Boolean\)\[0\]\) \{\s*return <SalesLoadingState[\s\S]*?\n  \}\n  const ActiveComponent/);
});
