import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sale = (fields = {}) => ({ ticketId: 8, ticketNumber: 'POS-TEST', ticketStatus: 'COMPLETED', completedAt: '2026-09-22T12:00:00Z', saleAmount: 70, currencyCode: 'MXN', providerCode: 'MERCADO_PAGO', providerStatus: 'APPROVED', paymentAmount: 70, refundedAmount: 0, refundableAmount: 70, refundAvailable: true, latestRefund: null, ...fields });
const unresolved = (fields = {}) => sale({ refundAvailable: false, latestRefund: { refundId: 5, requestKey: 'existing_key', amount: 20, status: 'UNCERTAIN', reason: 'customer request', updatedAt: '2026-09-22T12:01:00Z', version: 3, ...fields } });

test('return API encodes the authoritative receipt route and uses CSRF-owned mutations', async () => {
  const calls = [];
  const { posReturnsApi } = loadTypescript(resolve(root, 'src/app/BasicModules/PointOfSale/Sale/services/posReturnsApi.ts'), (specifier) => {
    if (specifier.endsWith('/lib/apiClient')) return { apiClient: async (path, init = {}) => { calls.push({ path, init }); return sale(); } };
    throw new Error(`Unexpected dependency ${specifier}`);
  });
  await posReturnsApi.lookup(' POS/A ');
  await posReturnsApi.submit('POS/A', { idempotencyKey: 'same_key', amount: 20, reason: 'customer request' });
  await posReturnsApi.refresh('POS/A');
  await posReturnsApi.recheck('POS/A', { reason: 'provider evidence', expectedVersion: 3 });
  assert.equal(calls[0].path, '/api/v1/pos/returns/POS%2FA');
  assert.deepEqual(calls.slice(1).map(({ path, init }) => [path, init.method]), [
    ['/api/v1/pos/returns/POS%2FA/refunds', 'POST'], ['/api/v1/pos/returns/POS%2FA/refresh', 'POST'],
    ['/api/v1/pos/returns/POS%2FA/refunds/recheck', 'POST'],
  ]);
  assert.equal(JSON.parse(calls[1].init.body).idempotencyKey, 'same_key');
  assert.deepEqual(JSON.parse(calls[3].init.body), { reason: 'provider evidence', expectedVersion: 3 });
});

function harness(api) {
  const runtime = hookRuntime();
  const path = resolve(root, 'src/app/BasicModules/PointOfSale/Sale/hooks/usePosReturnRefund.ts');
  const module = loadTypescript(path, (specifier) => {
    if (specifier === 'react') return runtime.hooks;
    if (specifier.endsWith('/services/posReturnsApi')) return { posReturnsApi: api };
    throw new Error(`Unexpected dependency ${specifier}`);
  });
  runtime.render(() => module.usePosReturnRefund());
  return { runtime, module };
}

test('an uncertain browser result retries the exact refund key and payload before showing confirmation', async () => {
  const requests = [];
  const api = { lookup: async () => sale(), refresh: async () => sale(), submit: async (_reference, request) => {
    requests.push(structuredClone(request));
    if (requests.length === 1) throw new Error('connection lost');
    return sale({ refundedAmount: 20, refundableAmount: 50, latestRefund: { refundId: 5, requestKey: request.idempotencyKey, amount: 20, status: 'CONFIRMED', reason: request.reason, updatedAt: '2026-09-22T12:01:00Z' } });
  } };
  const h = harness(api);
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush();
  await h.runtime.result.lookup(); await h.runtime.flush();
  h.runtime.result.setKind('partial'); h.runtime.result.setAmount('20.00'); h.runtime.result.setReason('customer request'); await h.runtime.flush();
  await h.runtime.result.submit(); await h.runtime.flush();
  assert.equal(h.runtime.result.error, 'submit');
  await h.runtime.result.submit(); await h.runtime.flush();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1], requests[0]);
  assert.equal(h.runtime.result.summary.latestRefund.status, 'CONFIRMED');
});

test('loaded pending refunds use provider refresh and partial validation blocks excess amounts', async () => {
  let refreshes = 0;
  const pending = sale({ refundAvailable: false, latestRefund: { refundId: 5, requestKey: 'existing_key', amount: 20, status: 'PENDING', reason: 'customer request', updatedAt: '2026-09-22T12:01:00Z' } });
  const h = harness({ lookup: async () => pending, submit: async () => { throw new Error('must not submit'); }, refresh: async () => { refreshes += 1; return sale({ refundedAmount: 20, refundableAmount: 50, latestRefund: { ...pending.latestRefund, status: 'CONFIRMED' } }); } });
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush(); await h.runtime.result.lookup(); await h.runtime.flush();
  assert.equal(h.module.isActiveRefund(h.runtime.result.summary), true);
  await h.runtime.result.refresh(); await h.runtime.flush();
  assert.equal(refreshes, 1);
  assert.equal(h.module.validatePosRefund(sale(), 'partial', '70.01', 'valid reason'), 'amount_exceeds');
  assert.equal(h.module.validatePosRefund(sale(), 'partial', '20.001', 'valid reason'), 'amount');
});

test('Square labels and reason limits follow its provider contract before submission', () => {
  const h = harness({});
  const square = sale({ providerCode: 'SQUARE' });
  assert.equal(h.module.posReturnProviderLabel('SQUARE'), 'Square');
  assert.equal(h.module.posReturnReasonLimit('SQUARE'), 192);
  assert.equal(h.module.validatePosRefund(square, 'full', '', 'x'.repeat(192)), null);
  assert.equal(h.module.validatePosRefund(square, 'full', '', 'x'.repeat(193)), 'reason');
  assert.equal(h.module.validatePosRefund(sale(), 'full', '', 'x'.repeat(500)), null);
});

test('authoritative Square FAILED is retryable and localized in every POS language', async () => {
  const status = loadTypescript(resolve(root, 'src/app/BasicModules/PointOfSale/Sale/components/posReturnStatus.ts'), () => {
    throw new Error('The status catalog must not have runtime dependencies');
  });
  for (const locale of ['en-CA', 'es-MX', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'])
    assert.notEqual(status.posReturnStatusText(locale, 'FAILED'), 'FAILED');
  assert.equal(status.posReturnStatusText('en-CA', 'NEW_STATE'), 'NEW STATE');
  const h = harness({ lookup: async () => sale(), refresh: async () => sale(), submit: async (_r, request) =>
    sale({ latestRefund: { refundId: 9, requestKey: request.idempotencyKey, amount: 70, status: 'FAILED', reason: request.reason, updatedAt: '2026-09-22T12:01:00Z' } }) });
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush(); await h.runtime.result.lookup(); await h.runtime.flush();
  h.runtime.result.setReason('provider rejected refund'); await h.runtime.flush(); await h.runtime.result.submit(); await h.runtime.flush();
  assert.equal(h.runtime.result.operation, null);
});

test('a definite non-submission releases the draft for a new idempotency key while reconciliation remains blocked', async () => {
  const keys = [];
  const h = harness({ lookup: async () => sale(), refresh: async () => sale(), submit: async (_reference, request) => {
    keys.push(request.idempotencyKey);
    return sale({ latestRefund: { refundId: keys.length, requestKey: request.idempotencyKey, amount: 70, status: 'NOT_SUBMITTED', reason: request.reason, updatedAt: '2026-09-22T12:01:00Z' } });
  } });
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush(); await h.runtime.result.lookup(); await h.runtime.flush();
  h.runtime.result.setReason('provider rejected locally'); await h.runtime.flush();
  await h.runtime.result.submit(); await h.runtime.flush();
  assert.equal(h.runtime.result.operation, null);
  await h.runtime.result.submit(); await h.runtime.flush();
  assert.notEqual(keys[0], keys[1]);
  assert.equal(h.module.isActiveRefund(sale({ latestRefund: { refundId: 7, requestKey: 'manual', amount: 20, status: 'RECONCILIATION_REQUIRED', reason: 'manual', updatedAt: '2026-09-22T12:01:00Z' } })), true);
});

test('rapid duplicate clicks cannot replace the in-flight idempotency key', async () => {
  let finish;
  const requests = [];
  const h = harness({ lookup: async () => sale(), refresh: async () => sale(), submit: async (_reference, request) => {
    requests.push(request);
    return new Promise((resolve) => { finish = resolve; });
  } });
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush(); await h.runtime.result.lookup(); await h.runtime.flush();
  h.runtime.result.setReason('duplicate click guard'); await h.runtime.flush();
  const first = h.runtime.result.submit();
  const second = h.runtime.result.submit();
  assert.equal(await second, null);
  assert.equal(requests.length, 1);
  finish(sale({ latestRefund: { refundId: 5, requestKey: requests[0].idempotencyKey, amount: 70, status: 'CONFIRMED', reason: requests[0].reason, updatedAt: '2026-09-22T12:01:00Z' } }));
  await first; await h.runtime.flush();
  assert.equal(h.runtime.result.operation.idempotencyKey, requests[0].idempotencyKey);
});

test('manual recheck uses the versioned review API instead of a new refund request', async () => {
  const requests = []; let submits = 0;
  const h = harness({ lookup: async () => unresolved(), refresh: async () => unresolved(), submit: async () => { submits += 1; }, recheck: async (_reference, request) => { requests.push(request); return unresolved({ status: 'RECONCILIATION_REQUIRED', version: 4 }); } });
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush(); await h.runtime.result.lookup(); await h.runtime.flush();
  h.runtime.result.setReviewReason(' provider evidence located '); await h.runtime.flush();
  await h.runtime.result.review(); await h.runtime.flush();
  assert.deepEqual(requests, [{ reason: 'provider evidence located', expectedVersion: 3 }]);
  assert.equal(submits, 0);
  assert.equal(h.runtime.result.summary.latestRefund.version, 4);
});

test('stale refund review reloads the authoritative version after a 409', async () => {
  let lookups = 0;
  const h = harness({ lookup: async () => { lookups += 1; return unresolved({ version: lookups === 1 ? 3 : 5 }); }, refresh: async () => unresolved(), submit: async () => {}, recheck: async () => { throw Object.assign(new Error('stale version'), { status: 409 }); } });
  h.runtime.result.setReference('POS-TEST'); await h.runtime.flush(); await h.runtime.result.lookup(); await h.runtime.flush();
  h.runtime.result.setReviewReason('provider evidence located'); await h.runtime.flush();
  await h.runtime.result.review(); await h.runtime.flush();
  assert.equal(lookups, 2);
  assert.equal(h.runtime.result.summary.latestRefund.version, 5);
  assert.equal(h.runtime.result.error, 'conflict');
});

test('return workflow copy is complete in every supported POS locale', () => {
  const { getPosReturnCopy } = loadTypescript(resolve(root, 'src/app/BasicModules/PointOfSale/Sale/components/posReturnCopy.ts'), () => {
    throw new Error('The copy catalog must not have runtime dependencies');
  });
  const locales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
  const keys = Object.keys(getPosReturnCopy('en-CA')).sort();
  for (const locale of locales) {
    const copy = getPosReturnCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), keys, locale);
    for (const [key, value] of Object.entries(copy)) assert.ok(value.trim(), `${locale}/${key}`);
  }
});
