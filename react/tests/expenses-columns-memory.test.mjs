import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../src/app');
const defaults = loadTypescript(resolve(root, 'BasicModules/Expenses/constants/expenseColumns.ts'), require).DEFAULT_EXPENSE_COLUMNS;
const custom = [...defaults].reverse().map(column => ({ ...column, visible: ['concept', 'total', 'actions'].includes(column.key) }));
const compact = columns => columns.map(({ key, visible }) => ({ key, visible }));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function environment() {
  const local = new Map(), remote = new Map(), saves = [];
  let session = { company: { id: 1 }, user: { id: 2 } }, revision = 0, nextGet, nextSave;
  const scope = () => `${session.company.id}:${session.user.id}`;
  global.window = { localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) } };
  const api = {
    get: () => nextGet ? nextGet.promise : Promise.resolve({ state: remote.get(scope()) ?? {} }),
    save: async (module, tab, state) => { const actor = scope(); saves.push({ scope: actor, module, tab, state }); if (nextSave) await nextSave.promise; remote.set(actor, state); return { state }; },
  };
  const mount = () => {
    const runtime = hookRuntime();
    const { useExpenseColumns } = loadTypescript(resolve(root, 'BasicModules/Expenses/hooks/useExpenseColumns.ts'), name => {
      if (name === 'react') return runtime.hooks;
      if (name.includes('constants/expenseColumns')) return { DEFAULT_EXPENSE_COLUMNS: defaults };
      if (name.endsWith('/authSessionStore')) return { getCachedAuthSession: () => session };
      if (name.endsWith('/useAuthorizationRevision')) return { useAuthorizationRevision: () => revision };
      if (name.endsWith('/workspaceState')) return { workspaceStateApi: api };
      throw new Error(name);
    });
    runtime.render(useExpenseColumns);
    return runtime;
  };
  return { local, remote, saves, mount, switchUser(id) { session = { ...session, user: { id } }; revision++; }, switchCompany(id) { session = { ...session, company: { id } }; revision++; }, pendingGet(value) { nextGet = value; }, pendingSave(value) { nextSave = value; } };
}

test('applied columns survive logout storage cleanup and do not leak to another user', async () => {
  const env = environment();
  const first = env.mount(); await first.flush();
  await first.result.applyColumns(custom); await first.flush(); first.unmount();
  assert.equal(env.saves.at(-1)?.tab, 'expenses-columns');
  env.local.clear();
  const login = env.mount(); await login.flush();
  assert.deepEqual(compact(login.result.columns), compact(custom));
  env.switchUser(3); login.render(); await login.flush();
  assert.deepEqual(compact(login.result.columns), compact(defaults));
  assert.equal(env.saves.length, 1, 'restoring defaults must never overwrite saved preferences');
  login.unmount();
});

test('a late restore cannot replace a newer applied configuration', async () => {
  const env = environment(), pending = deferred(); env.pendingGet(pending);
  const hook = env.mount(); await hook.flush();
  await hook.result.applyColumns(custom); await hook.flush();
  pending.resolve({ state: { columns: compact(defaults) } }); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(custom));
  hook.unmount();
});

test('failed saving preserves the last applied choice and allows retry', async () => {
  const env = environment(), pending = deferred();
  const hook = env.mount(); await hook.flush(); env.pendingSave(pending);
  const saving = hook.result.applyColumns(custom);
  pending.reject(new Error('Connection unavailable'));
  await assert.rejects(saving, /Connection unavailable/); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(defaults));
  env.pendingSave(null); await hook.result.applyColumns(custom); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(custom)); hook.unmount();
});

test('restores legacy browser choices without writing factory defaults to the server', async () => {
  const env = environment(); env.local.set('indice.expenses.expenses.columns.v1', JSON.stringify(custom));
  const hook = env.mount(); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(custom));
  assert.deepEqual(env.remote.get('1:2')?.columns, compact(custom));
  hook.unmount();
});

test('restoring saved columns validates unknown keys, duplicates and locked visibility', async () => {
  const env = environment(); env.remote.set('1:2', { columns: [{ key: 'concept', visible: false }, { key: 'actions', visible: false }, { key: 'concept', visible: true }, { key: 'unknown', visible: true }, null] });
  const hook = env.mount(); await hook.flush();
  assert.equal(hook.result.columns[0].key, 'concept');
  assert.equal(hook.result.columns[0].visible, false);
  assert.equal(hook.result.columns.find(c => c.key === 'actions').visible, true);
  assert.equal(hook.result.columns.length, defaults.length);
  assert.equal(hook.result.columns.find(c => c.key === 'total').visible, false, 'new optional columns stay hidden in a custom layout'); hook.unmount();
});

const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
function modalHarness() {
  const runtime = hookRuntime();
  const { ColumnasConfigModal } = loadTypescript(resolve(root, 'components/rh/ColumnasConfigModal.tsx'), name => {
    if (name === 'react') return runtime.hooks;
    if (name === 'react/jsx-runtime') return require(name);
    if (name.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: 'es' } }) };
    if (name.endsWith('/utils')) return { cn: (...values) => values.join(' ') };
    return new Proxy({}, { get: (_, key) => String(key) });
  });
  return { runtime, render: props => runtime.render(() => ColumnasConfigModal(props)), nodes: () => nodes(runtime.result) };
}

test('modal keeps draft and search during background parent refresh; cancel and reopen restores applied columns', async () => {
  const modal = modalHarness();
  const columns = [{ id: 'concept', label: 'Concepto', visible: true }, { id: 'actions', label: 'Acciones', visible: true, locked: true }];
  let props = { isOpen: true, columns, onSave() {}, onClose() {} };
  modal.render(props); await modal.runtime.flush();
  modal.nodes().find(n => n.props?.column?.id === 'concept').props.toggleColumn('concept');
  modal.nodes().find(n => n.type === 'Input').props.onChange({ target: { value: 'Concepto' } }); await modal.runtime.flush();
  props = { ...props, columns: columns.map(c => ({ ...c })) };
  modal.render(props); await modal.runtime.flush();
  assert.equal(modal.nodes().find(n => n.props?.column?.id === 'concept').props.column.visible, false);
  assert.equal(modal.nodes().find(n => n.type === 'Input').props.value, 'Concepto');
  modal.render({ ...props, isOpen: false }); await modal.runtime.flush();
  modal.render(props); await modal.runtime.flush();
  assert.equal(modal.nodes().find(n => n.props?.column?.id === 'concept').props.column.visible, true);
  modal.runtime.unmount();
});

test('modal waits for confirmed save, blocks duplicate submissions and preserves the draft on failure', async () => {
  const modal = modalHarness(), pending = deferred(); let calls = 0, closed = 0;
  let save = () => pending.promise;
  const props = { isOpen: true, columns: [{ id: 'concept', label: 'Concepto', visible: true }], onSave: () => { calls++; return save(); }, onClose: () => { closed++; } };
  modal.render(props); await modal.runtime.flush();
  modal.nodes().find(n => n.props?.column).props.toggleColumn('concept'); await modal.runtime.flush();
  const apply = modal.nodes().find(n => n.type === 'Button' && n.props.children === 'Aplicar cambios').props.onClick;
  const request = apply(); await apply(); await modal.runtime.flush();
  assert.equal(calls, 1); assert.equal(closed, 0);
  assert.equal(modal.nodes().find(n => n.props?.['aria-busy']).props.disabled, true);
  pending.reject(new Error('offline')); await request; await modal.runtime.flush();
  assert.equal(closed, 0);
  assert.match(modal.nodes().find(n => n.props?.role === 'alert').props.children, /No se pudo guardar/);
  assert.equal(modal.nodes().find(n => n.props?.column).props.column.visible, false);
  save = () => Promise.resolve(); await apply(); await modal.runtime.flush();
  assert.equal(closed, 1); modal.runtime.unmount();
});

test('pending legacy migration survives remount and never replaces a more recent explicit save', async () => {
  const env = environment(), get = deferred(); env.pendingGet(get);
  env.local.set('indice.expenses.expenses.columns.v1', JSON.stringify(custom));
  const first = env.mount(); await first.flush(); first.unmount();
  const second = env.mount(); await second.flush();
  get.resolve({ state: {} }); await second.flush();
  assert.deepEqual(env.remote.get('1:2')?.columns, compact(custom));
  const latest = custom.map(column => ({ ...column, visible: true }));
  await second.result.applyColumns(latest); await second.flush();
  assert.deepEqual(env.remote.get('1:2')?.columns, compact(latest)); second.unmount();
});

test('an old session response cannot restore columns into a different user or company', async () => {
  const env = environment(), get = deferred(); env.pendingGet(get);
  const hook = env.mount(); await hook.flush();
  env.switchUser(3); env.pendingGet(null); hook.render(); await hook.flush();
  get.resolve({ state: { columns: compact(custom) } }); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(defaults));
  assert.equal(env.saves.length, 0); hook.unmount();
});

test('blocked browser storage does not prevent authenticated server persistence', async () => {
  const env = environment();
  window.localStorage.getItem = () => { throw new Error('blocked'); };
  window.localStorage.setItem = () => { throw new Error('blocked'); };
  const hook = env.mount(); await hook.flush();
  await hook.result.applyColumns(custom); await hook.flush(); hook.unmount();
  const next = env.mount(); await next.flush();
  assert.deepEqual(compact(next.result.columns), compact(custom)); next.unmount();
});

test('the same user keeps independent applied choices in each company', async () => {
  const env = environment(); const hook = env.mount(); await hook.flush();
  await hook.result.applyColumns(custom); await hook.flush();
  env.switchCompany(4); hook.render(); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(defaults));
  const other = defaults.map(column => ({ ...column, visible: true }));
  await hook.result.applyColumns(other); await hook.flush();
  env.switchCompany(1); hook.render(); await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(custom));
  assert.deepEqual(env.remote.get('4:2').columns, compact(other)); hook.unmount();
});

test('save completion after switching users cannot change the new user preference or cache', async () => {
  const env = environment(), pending = deferred(); const hook = env.mount(); await hook.flush();
  env.pendingSave(pending); const save = hook.result.applyColumns(custom); await hook.flush();
  env.switchUser(3); hook.render(); await hook.flush();
  pending.resolve(); await save; await hook.flush();
  assert.deepEqual(compact(hook.result.columns), compact(defaults));
  assert.deepEqual(env.remote.get('1:2').columns, compact(custom));
  assert.equal(env.remote.has('1:3'), false); hook.unmount();
});

test('rapid drag hovers follow the column identity instead of stale positions', async () => {
  const modal = modalHarness();
  const columns = ['folio', 'date', 'concept', 'taxes', 'actions'].map(id => ({ id, label: id, visible: true, locked: id === 'actions' }));
  modal.render({ isOpen: true, columns, onSave() {}, onClose() {} }); await modal.runtime.flush();
  const move = modal.nodes().find(n => n.props?.column?.id === 'taxes').props.moveColumn;
  move('taxes', 'date'); move('taxes', 'folio'); await modal.runtime.flush();
  assert.deepEqual(modal.nodes().filter(n => n.props?.column).map(n => n.props.column.id), ['taxes', 'folio', 'date', 'concept', 'actions']);
  move('actions', 'taxes'); await modal.runtime.flush();
  assert.equal(modal.nodes().filter(n => n.props?.column).at(-1).props.column.id, 'actions');
  modal.runtime.unmount();
});
