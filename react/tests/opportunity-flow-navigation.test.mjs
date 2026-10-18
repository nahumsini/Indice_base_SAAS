import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const load = (file, require) => loadTypescript(resolve(file), require);
const { resolveOpportunityWorkspaceFlowId } = load(
  'src/app/BasicModules/Sales/Prospectos/utils/prospectosFlowWorkspace.ts', () => ({}),
);
const { esMX } = load('src/app/BasicModules/Sales/Prospectos/translations/prospectosTranslations.ts', () => ({}));
const catalogue = [
  { id: 1, name: 'Factory flow', defaultFlow: true, factory: true, stages: [] },
  { id: 2, name: 'Venta de servicios médicos y seguimiento a empresas', defaultFlow: false, factory: false, stages: [] },
];

function navigation() {
  const cache = new Map(), timers = new Map(); let url = new URL('http://localhost/sales/leads'), nextTimer = 0;
  global.window = {
    localStorage: { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) },
    get location() { return { href: url.href, search: url.search }; },
    history: { state: null, replaceState: (_, __, value) => { url = new URL(value, url); } },
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
  };
  const env = {
    session: { company: { id: 1 }, user: { id: 2 } }, saved: [], cache,
    navigate: target => { url = new URL(target, url); },
    advance: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
  };
  env.open = (available = catalogue) => {
    const runtime = hookRuntime(); let select;
    const { useWorkspaceNavigationMemory } = load('src/app/hooks/useWorkspaceNavigationMemory.ts', id => {
      if (id === 'react') return runtime.hooks;
      if (id.endsWith('/auth')) return { authApi: { getSessionOrNull: async () => env.session } };
      if (id.endsWith('/workspaceState')) return { workspaceStateApi: {
        get: async () => ({ state: { flowId: 1 }, updatedAt: '2026-01-01' }),
        save: async (...args) => { env.saved.push(args); },
      } };
      return { useAuthorizationRevision: () => 0 };
    });
    runtime.render(() => {
      const [flowId, setFlowId] = runtime.hooks.useState(null); select = setFlowId;
      const ready = useWorkspaceNavigationMemory({
        moduleKey: 'sales', tabKey: 'prospects', state: { flowId: flowId ?? 0 }, defaults: { flowId: 0 },
        urlFields: { flowId: 'flow' }, rememberScroll: false,
        onRestore: state => setFlowId(resolveOpportunityWorkspaceFlowId(state.flowId, available, 1)),
      });
      return { flowId, ready };
    });
    return { runtime, select: id => { select(id); runtime.render(); } };
  };
  return env;
}

test('a non-default active flow survives leaving Sales before the remote save, returning, and reload', async () => {
  const env = navigation(); const initial = env.open(); await initial.runtime.flush();
  initial.select(2); initial.runtime.unmount();
  assert.equal(env.saved.length, 0);
  env.navigate('/human-resources/employees');
  env.navigate('/sales/leads'); const returned = env.open(); await returned.runtime.flush();
  assert.deepEqual(returned.runtime.result, { flowId: 2, ready: true });
  env.advance(); assert.deepEqual(env.saved.at(-1), ['sales', 'prospects', { flowId: 2 }]);
  returned.runtime.unmount(); env.navigate('/sales/leads');
  const reloaded = env.open(); await reloaded.runtime.flush();
  assert.equal(reloaded.runtime.result.flowId, 2); reloaded.runtime.unmount();
});

test('a direct flow link wins, and unavailable flows safely fall back without changing catalogue data', async () => {
  const env = navigation(); const initial = env.open(); await initial.runtime.flush(); initial.select(2); initial.runtime.unmount();
  env.navigate('/sales/leads?flow=1'); const direct = env.open(); await direct.runtime.flush();
  assert.equal(direct.runtime.result.flowId, 1); direct.select(2); direct.runtime.unmount();
  env.navigate('/sales/leads'); const removed = env.open([catalogue[0]]); await removed.runtime.flush();
  assert.equal(removed.runtime.result.flowId, 1); removed.runtime.unmount();
  assert.equal(catalogue[0].defaultFlow, true); assert.equal(catalogue[1].defaultFlow, false);
});

test('active-flow memory is isolated across companies and users', async () => {
  const env = navigation(); const initial = env.open(); await initial.runtime.flush(); initial.select(2); initial.runtime.unmount();
  for (const session of [{ company: { id: 9 }, user: { id: 2 } }, { company: { id: 1 }, user: { id: 8 } }]) {
    env.session = session; env.navigate('/sales/leads'); const other = env.open(); await other.runtime.flush();
    assert.equal(other.runtime.result.flowId, 1); other.runtime.unmount();
  }
});

function flowBar(overrides = {}) {
  let nextId = 0; const calls = [];
  const jsx = (type, props) => ({ type, props });
  const { OpportunityFlowBar } = load('src/app/BasicModules/Sales/Prospectos/components/OpportunityFlowBar.tsx', id => {
    if (id === 'react') return { useId: () => `label-${++nextId}` };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.endsWith('/SalesTitleBar')) return { salesTitleBarSecondaryActionClassName: '' };
    return new Proxy({}, { get: (_, name) => name });
  });
  const tree = OpportunityFlowBar({ copy: esMX.flow, flows: catalogue, selectedFlowId: 2, counts: new Map([[1, 1], [2, 0]]),
    ready: true, managementLabel: esMX.header.manageFlow,
    onSelectFlow: async id => { calls.push(['select', id]); }, onManageFlow: () => calls.push(['manage']), ...overrides });
  const nodes = [];
  const visit = node => { if (!node || typeof node !== 'object') return; nodes.push(node); [node.props?.children].flat(Infinity).forEach(visit); };
  visit(tree);
  const text = node => typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join('');
  return { tree, nodes, text, calls };
}

test('flow context exposes the full name, a readable count, accessible labels and the existing callbacks', async () => {
  const bar = flowBar(); const trigger = bar.nodes.find(n => n.type === 'SelectTrigger');
  assert.match(bar.text(trigger), /Venta de servicios médicos y seguimiento a empresas/);
  assert.equal(bar.nodes.find(n => n.props?.id === trigger.props['aria-labelledby']).props.children[1], 'Flujo activo');
  const count = bar.nodes.find(n => n.props?.id === trigger.props['aria-describedby']);
  assert.equal(bar.text(count), '0 oportunidades');
  await bar.nodes.find(n => n.type === 'Select').props.onValueChange('1');
  bar.nodes.find(n => n.type === 'Button').props.onClick();
  assert.deepEqual(bar.calls, [['select', 1], ['manage']]);
});

test('loading does not masquerade as zero, and read-only catalogue access stays available', () => {
  const bar = flowBar({ counts: null, ready: false, managementLabel: esMX.flow.catalogTitle });
  assert.equal(bar.nodes.find(n => n.type === 'Select').props.disabled, true);
  assert.equal(bar.text(bar.nodes.find(n => n.props?.role === 'status')), '…');
  assert.equal(bar.text(bar.nodes.find(n => n.type === 'Button')), esMX.flow.catalogTitle);
  const single = flowBar({ selectedFlowId: 1 });
  assert.equal(single.text(single.nodes.find(n => n.props?.role === 'status')), '1 oportunidad');
});
