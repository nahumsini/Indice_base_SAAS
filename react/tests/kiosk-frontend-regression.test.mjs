import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeKioskIdempotentOperation,
  kioskIdempotencyKeyFor,
} from '../src/app/components/kiosk-engine/kioskIdempotency.ts';
import { resolvePreticketProductRequests } from '../src/app/BasicModules/PointOfSale/Sale/utils/preticketQueuePolicy.ts';
import { applyPublicCatalogPriceVisibility } from '../src/app/BasicModules/Sales/Productos/publicCatalog/utils/publicCatalogVisibility.ts';

function memorySessionStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    snapshot() {
      return JSON.stringify([...values.entries()]);
    },
  };
}

test('idempotency retries reuse one opaque key without persisting kiosk PII', () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const operation = 'pos.self-service.preticket.create:public-token-hint';
  const payload = {
    pin: '4819',
    customerName: 'Persona sensible',
    customerEmail: 'private@example.test',
  };

  const firstKey = kioskIdempotencyKeyFor(operation, payload);
  const retryKey = kioskIdempotencyKeyFor(operation, { ...payload, customerName: 'Changed' });
  assert.equal(retryKey, firstKey);
  assert.match(firstKey, /^[0-9a-f-]{32,64}$/i);

  const stored = sessionStorage.snapshot();
  assert.doesNotMatch(stored, /4819|Persona sensible|private@example\.test|public-token-hint/i);

  completeKioskIdempotentOperation(operation);
  const nextOperationKey = kioskIdempotencyKeyFor(operation, payload);
  assert.notEqual(nextOperationKey, firstKey);
});

test('public catalog removes every forbidden price field before rendering', () => {
  const item = {
    id: 'product-1',
    name: 'Producto',
    type: 'product',
    publicPrice: 125,
    wholesalePrice: 90,
    wholesaleMinQuantity: 10,
    publicInventoryStatus: 'inStock',
  };

  const noPrices = applyPublicCatalogPriceVisibility(
    [item],
    { showPrices: false, showWholesalePrices: true },
  )[0];
  assert.equal(noPrices.publicPrice, undefined);
  assert.equal(noPrices.wholesalePrice, undefined);
  assert.equal(noPrices.wholesaleMinQuantity, undefined);

  const retailOnly = applyPublicCatalogPriceVisibility(
    [item],
    { showPrices: true, showWholesalePrices: false },
  )[0];
  assert.equal(retailOnly.publicPrice, 125);
  assert.equal(retailOnly.wholesalePrice, undefined);
  assert.equal(retailOnly.wholesaleMinQuantity, undefined);
});

test('pre-ticket product resolution is all-or-nothing', () => {
  const products = [
    { id: 'local-1', salesProductBackendId: 101, name: 'Uno' },
    { id: 'local-2', salesProductBackendId: 102, name: 'Dos' },
  ];

  const complete = resolvePreticketProductRequests(
    [{ productId: 101, quantity: 2 }, { productId: 102, quantity: '3' }],
    products,
  );
  assert.equal(complete.ok, true);
  assert.deepEqual(complete.requests.map(({ product, quantity }) => [product.name, quantity]), [
    ['Uno', 2],
    ['Dos', 3],
  ]);

  const missingProduct = resolvePreticketProductRequests(
    [{ productId: 101, quantity: 1 }, { productId: 999, quantity: 1 }],
    products,
  );
  assert.deepEqual(missingProduct, { ok: false, requests: [] });

  const invalidQuantity = resolvePreticketProductRequests(
    [{ productId: 101, quantity: 0 }],
    products,
  );
  assert.deepEqual(invalidQuantity, { ok: false, requests: [] });
});
