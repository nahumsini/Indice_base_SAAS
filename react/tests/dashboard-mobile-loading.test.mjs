import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = resolve(import.meta.dirname, '../src/app');
const stub = new Proxy({}, { get: (_, key) => key });

test('dashboard catalog distinguishes loading, error and confirmed empty; retry stays fail-closed', async () => {
  const runtime = hookRuntime(), pending = [];
  let revision = 1;
  const { useAccessibleModuleCatalogState } = loadTypescript(resolve(root, 'hooks/useAccessibleModuleCatalog.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/dashboard')) return { dashboardApi: { listModules: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } };
    if (id.endsWith('/useAuthorizationRevision')) return { useAuthorizationRevision: () => revision };
    if (id.endsWith('/moduleCatalog')) return { buildDefaultModuleCatalog: () => [], mapBackendModuleToCard: value => value, mergeDashboardModules: (modules, _, options) => { assert.equal(options.includeMissingFallbacks, false); return modules; } };
    return stub;
  });
  const translator = {};
  const render = () => runtime.render(() => useAccessibleModuleCatalogState(translator));
  render(); await runtime.flush();
  assert.equal(render().status, 'loading');
  assert.deepEqual(render().modules, []);
  pending.shift().resolve([{ route: 'sales' }]); await runtime.flush();
  assert.equal(render().status, 'ready'); assert.equal(render().modules.length, 1);
  revision++; render(); await runtime.flush();
  assert.deepEqual(render().modules, []);
  pending.shift().reject(new Error('offline')); await runtime.flush();
  assert.equal(render().status, 'error'); assert.deepEqual(render().modules, []);
  render().retry(); render(); await runtime.flush();
  assert.equal(render().status, 'loading');
  pending.shift().resolve([]); await runtime.flush();
  assert.equal(render().status, 'ready'); assert.deepEqual(render().modules, []);
});

test('authorization changes ignore an old module response and never restore stale access', async () => {
  const runtime = hookRuntime(), pending = []; let revision = 1;
  const { useAccessibleModuleCatalogState } = loadTypescript(resolve(root, 'hooks/useAccessibleModuleCatalog.ts'), id => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/dashboard')) return { dashboardApi: { listModules: () => new Promise(resolve => pending.push(resolve)) } };
    if (id.endsWith('/useAuthorizationRevision')) return { useAuthorizationRevision: () => revision };
    if (id.endsWith('/moduleCatalog')) return { buildDefaultModuleCatalog: () => [], mapBackendModuleToCard: value => value, mergeDashboardModules: value => value };
    return stub;
  });
  const t = {}, render = () => runtime.render(() => useAccessibleModuleCatalogState(t));
  render(); revision++; render();
  pending[0]([{ route: 'disabled-module' }]); await runtime.flush();
  assert.equal(render().status, 'loading'); assert.deepEqual(render().modules, []);
  pending[1]([]); await runtime.flush();
  assert.equal(render().status, 'ready'); assert.deepEqual(render().modules, []);
});

function elements(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(value => elements(value, type));
  return [...(node.type === type ? [node] : []), ...Object.values(node.props ?? {}).flatMap(value => elements(value, type))];
}
test('KPI loading preserves the slider, disables configuration and never says the selection is empty', () => {
  const { KpiSection } = loadTypescript(resolve(root, 'Dashboard/components/KpiSection.tsx'), id => id === 'react/jsx-runtime' ? jsx : stub);
  const props = { title: 'KPIs', kpis: [], availableKPIs: [], selectedKPIIds: ['monthlyRevenue'], copy: { kpiEmptyState: { title: 'No KPIs configured', description: '', action: '' }, kpiConfiguration: {} }, statusCopy: { loading: 'Loading', failed: 'Try again', retry: 'Retry' } };
  const loading = KpiSection({ ...props, status: 'loading' });
  assert.equal(elements(loading, 'KPICarousel').length, 1);
  assert.equal(elements(loading, 'fieldset')[0].props.disabled, true);
  assert.equal(elements(loading, 'h3').length, 0);
  const failed = KpiSection({ ...props, status: 'error' });
  assert.equal(elements(failed, 'div').filter(node => node.props.role === 'alert').length, 1);
  assert.equal(elements(failed, 'h3').length, 0);
  const empty = KpiSection({ ...props, status: 'ready' });
  assert.equal(elements(empty, 'h3')[0].props.children, 'No KPIs configured');
  assert.equal(elements(empty, 'fieldset')[0].props.disabled, false);
});
