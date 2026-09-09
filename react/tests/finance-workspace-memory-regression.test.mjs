import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const path = resolve('src/app/hooks/useWorkspaceNavigationMemory.ts');
function environment() {
  const cache = new Map(), timers = new Map(); let nextTimer = 0;
  let url = new URL('http://localhost/petty-cash/control');
  const storage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) };
  global.window = { localStorage: storage, sessionStorage: { getItem: () => null, setItem: () => {} },
    get location() { return { href: url.href, search: url.search }; },
    history: { state: null, replaceState: (_, __, target) => { url = new URL(target, url); } },
    setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id; }, clearTimeout: id => timers.delete(id),
    addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: callback => { callback(); return 1; }, cancelAnimationFrame: () => {}, scrollTo: () => {}, scrollY: 0 };
  const env = { cache, navigate: target => { url = new URL(target, url); }, session: { company: { id: 1 }, user: { id: 2 } },
    remote: { state: {}, updatedAt: '' }, get: null, revision: 0, saved: [], advance: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); } };
  env.create = (tab = 'control', enabled = true) => {
    const runtime = hookRuntime();
    const { useWorkspaceNavigationMemory } = loadTypescript(path, id => {
      if (id === 'react') return runtime.hooks;
      if (id.endsWith('/auth')) return { authApi: { getSessionOrNull: async () => env.session } };
      if (id.endsWith('/workspaceState')) return { workspaceStateApi: { get: () => env.get ? env.get() : Promise.resolve(env.remote), save: async (...args) => env.saved.push(args) } };
      return { useAuthorizationRevision: () => env.revision };
    });
    let set, current, ready = enabled;
    const defaults = { search: '', fund: '', page: 1, pageSize: 10 };
    runtime.render(() => {
      [current, set] = runtime.hooks.useState(defaults);
      useWorkspaceNavigationMemory({ moduleKey: 'petty-cash', tabKey: tab, state: current, defaults, rememberScroll: false,
        enabled: ready, urlFields: { search: 'q', fund: 'fund' }, onRestore: set });
      return current;
    });
    return { runtime, change: patch => { set(previous => ({ ...previous, ...patch })); runtime.render(); },
      enable: () => { ready = true; runtime.render(); }, state: () => current };
  };
  return env;
}

test('tab A → B → A and reload retain filters and pagination even before the remote debounce', async () => {
  const env = environment(); const first = env.create(); await first.runtime.flush();
  first.change({ search: 'Agosto', fund: '51', page: 3, pageSize: 25 }); first.runtime.unmount();
  env.navigate('/petty-cash/statements'); const other = env.create('statements'); await other.runtime.flush(); assert.equal(other.state().search, ''); other.runtime.unmount();
  env.navigate('/petty-cash/control'); const returned = env.create(); await returned.runtime.flush();
  assert.deepEqual(returned.state(), { search: 'Agosto', fund: '51', page: 3, pageSize: 25 });
  returned.runtime.unmount(); env.navigate('/petty-cash/control'); const reload = env.create(); await reload.runtime.flush(); assert.equal(reload.state().page, 3);
});

test('explicit URL overrides memory; only fields declared by the workspace are restored and saved', async () => {
  const env = environment(); env.remote = { state: { fund: 'old', search: 'old', selectedIds: ['secret'], modalOpen: true }, updatedAt: '2026-01-01' };
  env.navigate('/petty-cash/control?fund=99&q=Nuevo'); const tab = env.create(); await tab.runtime.flush();
  assert.deepEqual(tab.state(), { search: 'Nuevo', fund: '99', page: 1, pageSize: 10 }); env.advance();
  assert.deepEqual(env.saved[0][2], tab.state());
});

test('an empty restored workspace still becomes ready and persists subsequent work', async () => {
  const env = environment(); const tab = env.create(); await tab.runtime.flush(); tab.change({ search: 'Test' }); env.advance();
  assert.equal(env.saved.at(-1)[2].search, 'Test');
});

test('clear filters replaces the remembered values and removes mapped query parameters', async () => {
  const env = environment(); const tab = env.create(); await tab.runtime.flush(); tab.change({ search: 'old', fund: '8' });
  tab.change({ search: '', fund: '', page: 1 }); tab.runtime.unmount();
  assert.equal(window.location.search, ''); const returned = env.create(); await returned.runtime.flush(); assert.equal(returned.state().fund, '');
});

test('company and user changes never restore another scope’s cache', async () => {
  const env = environment(); const first = env.create(); await first.runtime.flush(); first.change({ search: 'Private' }); first.runtime.unmount();
  env.navigate('/petty-cash/control'); env.session = { company: { id: 9 }, user: { id: 2 } }; const second = env.create(); await second.runtime.flush(); assert.equal(second.state().search, ''); second.runtime.unmount();
  env.session = { company: { id: 1 }, user: { id: 7 } }; const third = env.create(); await third.runtime.flush(); assert.equal(third.state().search, '');
});

test('a slow restore does not overwrite changes the user already made', async () => {
  const env = environment(); let finish; env.get = () => new Promise(resolve => { finish = resolve; });
  const tab = env.create(); await tab.runtime.flush(); tab.change({ search: 'Working' });
  finish({ state: { search: 'Old', pageSize: 50 }, updatedAt: '2026-01-01' }); await tab.runtime.flush();
  assert.equal(tab.state().search, 'Working'); assert.equal(tab.state().pageSize, 50);
});

test('restoration waits for the current company’s accessible catalogues', async () => {
  const env = environment(); env.remote.state = { fund: '51' }; const tab = env.create('control', false);
  await tab.runtime.flush(); assert.equal(tab.state().fund, ''); tab.enable(); await tab.runtime.flush(); assert.equal(tab.state().fund, '51');
});

test('leaving during a slow restore preserves edits and merges the remaining remote preferences on return', async () => {
  const env = environment(); env.get = () => new Promise(() => {});
  const first = env.create(); await first.runtime.flush(); first.change({ search: 'Working' }); first.runtime.unmount();
  env.navigate('/petty-cash/control'); env.get = null; env.remote = { state: { search: 'Old', pageSize: 50 }, updatedAt: '2026-01-01' };
  const returned = env.create(); await returned.runtime.flush();
  assert.equal(returned.state().search, 'Working'); assert.equal(returned.state().pageSize, 50);
});

test('an authorization change cancels the old scope’s pending remote save', async () => {
  const env = environment(); const first = env.create(); await first.runtime.flush(); first.change({ search: 'Private' });
  env.get = () => new Promise(() => {}); env.revision++; env.session = { company: { id: 9 }, user: { id: 2 } };
  first.runtime.render(); env.advance(); assert.equal(env.saved.length, 0); first.runtime.unmount();
});

test('blocked local storage does not break navigation or remote persistence', async () => {
  const env = environment(); window.localStorage.getItem = () => { throw Error('blocked'); }; window.localStorage.setItem = () => { throw Error('blocked'); };
  const tab = env.create(); await tab.runtime.flush(); tab.change({ search: 'Remote' }); env.advance(); assert.equal(env.saved.at(-1)[2].search, 'Remote');
});

test('table memory waits for catalogues and restored filters before recovering its page', async () => {
  const env = environment(); const runtime = hookRuntime(); const loads = []; let cataloguesReady = false, currentFilters;
  const { useWorkspaceNavigationMemory } = loadTypescript(path, id => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/auth')) return { authApi: { getSessionOrNull: async () => env.session } };
    if (id.endsWith('/workspaceState')) return { workspaceStateApi: {
      get: async (_, tab) => { loads.push([tab, currentFilters.period]); return { state: tab === 'filters' ? { period: 'last_month' } : { page: 3 }, updatedAt: '2026-01-01' }; },
      save: async () => {},
    } };
    return { useAuthorizationRevision: () => 0 };
  });
  runtime.render(() => {
    const [filters, setFilters] = runtime.hooks.useState({ period: 'this_month' }); currentFilters = filters;
    const [table, setTable] = runtime.hooks.useState({ page: 1 });
    const filtersReady = useWorkspaceNavigationMemory({ moduleKey: 'expenses', tabKey: 'filters', state: filters,
      defaults: { period: 'this_month' }, onRestore: setFilters, rememberScroll: false, enabled: cataloguesReady });
    useWorkspaceNavigationMemory({ moduleKey: 'expenses', tabKey: 'table', state: table,
      defaults: { page: 1 }, onRestore: setTable, rememberScroll: false, enabled: filtersReady && cataloguesReady });
    return { filters, table };
  });
  await runtime.flush(); assert.equal(loads.length, 0);
  cataloguesReady = true; runtime.render(); await runtime.flush(); await runtime.flush();
  assert.deepEqual(loads, [['filters', 'this_month'], ['table', 'last_month']]);
  assert.equal(runtime.result.table.page, 3);
});
