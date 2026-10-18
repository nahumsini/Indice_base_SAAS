import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = new URL('../src/app/BasicModules/Sales/', import.meta.url);
const { isSalesWarehouseReady, hydrateSaleWarehouse, warehouseMatchesSaleScope } = loadTypescript(
  new URL('Sales/utils/salesWarehouseScope.ts', root).pathname, () => { throw new Error('Unexpected runtime import'); },
);
const ready = { id: '1', name: 'Warehouse', status: 'active', businessUnitId: '5', businessUnitName: 'Unit', businessId: '6', businessName: 'Business' };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function setup() {
  const runtime = hookRuntime();
  const requests = [];
  const { useSalesWarehouses } = loadTypescript(new URL('Sales/hooks/useSalesWarehouses.ts', root).pathname, (id) => {
    if (id === 'react') return runtime.hooks;
    if (id.endsWith('/inventoryApi')) return { inventoryApi: { loadWarehouses() { const request = deferred(); requests.push(request); return request.promise; } } };
    throw new Error(id);
  });
  let open = false;
  const render = (value) => { open = value; return runtime.render(() => useSalesWarehouses(open)); };
  return { runtime, requests, render };
}

test('loads on opening, reports failure, and retries against the inventory owner', async () => {
  const { runtime, requests, render } = setup();
  render(false);
  assert.equal(requests.length, 0);
  render(true); await runtime.flush();
  assert.equal(runtime.result.loading, true);
  requests[0].reject(new Error('Unavailable')); await runtime.flush();
  assert.equal(runtime.result.error, true);
  assert.equal(runtime.result.loading, false);
  assert.deepEqual(runtime.result.warehouses, []);
  runtime.result.reload(); await runtime.flush();
  assert.equal(requests.length, 2);
  assert.equal(runtime.result.loading, true);
  requests[1].resolve([ready]); await runtime.flush();
  assert.deepEqual(runtime.result.warehouses, [ready]);
  assert.equal(runtime.result.error, false);
  assert.equal(runtime.result.loading, false);
});

test('refreshes on reopening and ignores an obsolete response', async () => {
  const { runtime, requests, render } = setup();
  render(true);
  render(false);
  render(true);
  requests[1].resolve([ready]); await runtime.flush();
  requests[0].resolve([]); await runtime.flush();
  assert.deepEqual(runtime.result.warehouses, [ready]);
  assert.equal(runtime.result.loading, false);
});

test('keeps unassigned records for diagnosis without making them selectable', async () => {
  const { runtime, requests, render } = setup();
  const unassigned = { ...ready, businessUnitId: null, businessUnitName: null, businessId: null, businessName: null };
  render(true); requests[0].resolve([unassigned]); await runtime.flush();
  assert.equal(runtime.result.warehouses.length, 1);
  assert.equal(isSalesWarehouseReady(unassigned), false);
  assert.equal(isSalesWarehouseReady({ ...ready, status: 'inactive' }), false);
  assert.equal(isSalesWarehouseReady({ ...ready, businessId: 'demo-business' }), false);
  assert.equal(isSalesWarehouseReady(ready), true);
});

test('late warehouse assignment preserves commercial data, payment and line totals', () => {
  const draft = { quoteId: '4', notes: 'Do not erase', paymentMethod: 'cash', warehouseId: '', saleLines: [{ id: 'a', quantity: 100, subtotal: 4408 }], totalAmount: 7192 };
  const hydrated = hydrateSaleWarehouse(draft, [ready]);
  assert.equal(hydrated.quoteId, '4');
  assert.equal(hydrated.notes, draft.notes);
  assert.equal(hydrated.paymentMethod, 'cash');
  assert.equal(hydrated.totalAmount, 7192);
  assert.deepEqual(hydrated.saleLines, [{ ...draft.saleLines[0], warehouseId: '1', businessUnitId: '5', businessId: '6' }]);
  assert.equal(warehouseMatchesSaleScope(ready, hydrated), true);
  assert.equal(draft.warehouseId, '');
});

test('catalog refresh never replaces an explicit warehouse selection', () => {
  const draft = { warehouseId: '99', saleLines: [], notes: 'Keep selection even if no longer available' };
  assert.equal(hydrateSaleWarehouse(draft, [ready]), draft);
  assert.equal(warehouseMatchesSaleScope(ready, draft), false);
  const missing = { warehouseId: '', saleLines: [] };
  assert.equal(hydrateSaleWarehouse(missing, []), missing);
});

test('both sale entry points expose refresh and the summary never invents a warehouse', () => {
  for (const file of ['Prospectos/Prospectos.tsx', 'Sales/Sales.tsx']) {
    const source = readFileSync(new URL(file, root), 'utf8');
    assert.match(source, /useSalesWarehouses\(/);
    assert.match(source, /onReloadWarehouses=\{reloadWarehouses\}/);
  }
  const form = readFileSync(new URL('Sales/components/SalesCreateForm.tsx', root), 'utf8');
  assert.doesNotMatch(form, /form\.warehouseName \|\| operationalContext\.defaultWarehouse/);
  const modal = readFileSync(new URL('Sales/components/SalesDetailModal.tsx', root), 'utf8');
  assert.match(modal, /!warehouseLoading && !warehouseLoadError/);
  assert.match(modal, /hydrateSaleWarehouse\(current, warehouses\)/);
});
