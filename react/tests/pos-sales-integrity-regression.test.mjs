import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { CheckoutRetry, CheckoutRetryConflict } from '../src/app/BasicModules/PointOfSale/Sale/utils/checkoutRetry.ts';
import { returnCopy } from '../src/app/BasicModules/PointOfSale/Sale/components/returnCopy.ts';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, 'src/app', path), 'utf8');
const storage = new Map();
test('return workspace localizes original methods and all lifecycle states', () => {
  for (const locale of ['es-MX', 'es-CO', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = returnCopy(locale);
    for (const status of ['PREPARED', 'PROCESSING', 'COMPLETED', 'CANCELLED']) assert.ok(copy.statuses[status]);
    for (const method of ['CASH', 'CARD', 'TRANSFER']) assert.ok(copy.methods[method]);
    if (!locale.startsWith('en')) assert.notEqual(copy.title, returnCopy('en-CA').title);
  }
});
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
} });

test('checkout retry survives remounts and stores no raw customer/payment payload', async () => {
  const payload = { customer: 'Synthetic private customer', payment: 'private reference', amount: 15 };
  const key = await new CheckoutRetry().key('retry', payload);
  assert.equal(await new CheckoutRetry().key('retry', payload), key);
  const saved = storage.get('indice:pos:checkout:retry');
  assert.ok(!saved.includes('private'));
  assert.equal(JSON.parse(saved).fingerprint.length, 64);
});

test('changed ambiguous charge is blocked and exposes only its recovery key', async () => {
  const retry = new CheckoutRetry();
  const key = await retry.key('changed', { amount: 10 });
  await assert.rejects(() => retry.key('changed', { amount: 20 }), (error) =>
    error instanceof CheckoutRetryConflict && error.requestKey === key);
  assert.equal(await retry.key('changed', { amount: 10 }), key);
});

test('confirmed charge can start a distinct identical sale; shifts remain isolated', async () => {
  const retry = new CheckoutRetry();
  const first = await retry.key('new-sale', { amount: 10 });
  assert.notEqual(await retry.key('other-shift', { amount: 10 }), first);
  retry.clear('new-sale');
  assert.notEqual(await retry.key('new-sale', { amount: 10 }), first);
});

test('same-frame preparation shares one retry identity', async () => {
  const retry = new CheckoutRetry();
  const results = await Promise.all([retry.key('double', { amount: 10 }), retry.key('double', { amount: 10 })]);
  assert.equal(results[0], results[1]);
});

test('sales UI keeps POS summaries read-only and Cartera respects server eligibility', () => {
  const table = read('BasicModules/Sales/Sales/components/SalesTableRow.tsx');
  const detail = read('BasicModules/Sales/Sales/components/SalesRecordDetailView.tsx');
  const adapter = read('BasicModules/Sales/adapters/salesApiAdapters.ts');
  const candidates = read('BasicModules/Receivables/hooks/useCandidateSales.ts');
  assert.match(table, /disabled=\{isPosOwned \|\| isCancelled\}/);
  assert.match(detail, /record\.sourceType === 'POS'/);
  assert.match(detail, /saleSourceOwnershipMessage/);
  assert.match(adapter, /sourceType: row\.sourceType === 'POS'/);
  assert.match(candidates, /\? apiCandidateSales/);
  assert.doesNotMatch(candidates, /startsWith\('pos'\)/);
});

test('checkout forwards retry key, locks same-frame submission and preserves edited cart on recovery', () => {
  const api = read('BasicModules/PointOfSale/Sale/services/posBackendApi.ts');
  const hook = read('BasicModules/PointOfSale/Sale/hooks/useSaleCheckout.ts');
  assert.match(api, /'Idempotency-Key': requestKey/);
  assert.match(hook, /isCompletingSale \|\| checkoutInFlight.current/);
  assert.match(hook, /posBackendApi.recoverCheckout\(error.requestKey\)/);
  const recovery = hook.slice(hook.indexOf('if (error instanceof CheckoutRetryConflict)'));
  assert.doesNotMatch(recovery, /resetCart\(\)/);
});

test('returns report completion only from backend and preserve original payment methods', () => {
  const sale = read('BasicModules/PointOfSale/Sale/Sale.tsx');
  const returns = read('BasicModules/PointOfSale/Sale/components/ReturnModal.tsx');
  const api = read('BasicModules/PointOfSale/Sale/services/posReturnsApi.ts');
  assert.doesNotMatch(sale, /Devolucion procesada|onConfirm=\{handleReturn\}/);
  assert.match(returns, /saved.status === 'COMPLETED'/);
  assert.match(returns, /posReturnsApi.confirm\(result.id, cash, references\)/);
  assert.match(returns, /payment.paymentMethod === 'TRANSFER'/);
  assert.match(returns, /p.paymentMethod === 'CASH'/);
  assert.doesNotMatch(api, /JSON.stringify\(\{[^}]*amount/);
  assert.match(api, /goodsReceived, requestKey/);
});

test('pending Square returns cannot be silently cancelled or replaced by cash', () => {
  const returns = read('BasicModules/PointOfSale/Sale/components/ReturnModal.tsx');
  assert.match(returns, /result.status === 'PREPARED' \|\| rejected/);
  assert.match(returns, /card && result.status === 'PROCESSING' \? t.refresh/);
  assert.match(returns, /posReturnsApi.active\(id\)/);
  assert.match(returns, /inFlight.current = true/);
});
