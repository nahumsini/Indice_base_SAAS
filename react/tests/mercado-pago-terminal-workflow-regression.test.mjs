import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
import { cartIdentity, createMercadoPagoPaymentAndWait, dispatchCardTerminalPayment, isMercadoPagoPaymentUnresolved } from '../src/app/BasicModules/PointOfSale/Sale/services/mercadoPagoTerminalWorkflow.ts';
import { mercadoPagoTerminalCopyByLocale } from '../src/app/BasicModules/PointOfSale/CashRegisters/mercadoPagoTerminalCopy.ts';
import { readMercadoPagoOAuthReturn } from '../src/app/BasicModules/PointOfSale/CashRegisters/mercadoPagoOAuthReturn.ts';
import { readSquareOAuthReturn } from '../src/app/BasicModules/PointOfSale/CashRegisters/squareOAuthReturn.ts';
import { isValidMercadoPagoMerchantReview, requiresMercadoPagoMerchantReview } from '../src/app/BasicModules/PointOfSale/Sale/services/mercadoPagoMerchantReview.ts';

const response = (fields = {}) => ({ intentId: 7, status: 'waiting', amount: 70, currencyCode: 'MXN', orderId: 'order-test', paymentId: null, message: null, posTicketId: null, checkout: null, saleState: 'pending', canCancel: true, canRetry: false, version: 1, ...fields });
const request = { idempotencyKey: 'same-original-request', cashRegisterId: 2, currencyCode: 'MXN', items: [] };

test('card dispatcher waits for the authoritative register and preserves Square dispatch', async () => {
  let resolveBinding;
  const pending = new Promise((resolve) => { resolveBinding = resolve; });
  const calls = [];
  const dispatched = dispatchCardTerminalPayment(() => pending, async () => { calls.push('square'); return 'verified square'; }, async () => { calls.push('mp'); return 'verified mp'; });
  assert.deepEqual(calls, []);
  resolveBinding({ providerCode: 'SQUARE' });
  assert.equal(await dispatched, 'verified square');
  assert.deepEqual(calls, ['square']);
  assert.equal(await dispatchCardTerminalPayment(async () => ({ providerCode: 'MERCADO_PAGO' }), async () => 'square', async () => 'mp'), 'mp');
  await assert.rejects(dispatchCardTerminalPayment(async () => ({ providerCode: null }), async () => 'square', async () => 'mp'), /UNASSIGNED/);
});

test('webhook completion before polling recovers the persisted receipt instead of releasing the stale cart', async () => {
  const sequence = [response({ status: 'approved', posTicketId: 12, saleState: 'completed' }), response({ status: 'approved', posTicketId: 12, checkout: { ticket: { id: 12 } }, saleState: 'completed' })];
  const calls = [];
  const payment = await createMercadoPagoPaymentAndWait(request, { createPayment: async (body) => { calls.push(body.idempotencyKey); return sequence[0]; }, recoverPayment: async (id) => { calls.push(id); return sequence[1]; } }, () => {}, async () => {}, 3);
  assert.equal(payment.checkout.ticket.id, 12);
  assert.deepEqual(calls, [request.idempotencyKey, 7]);
  assert.equal(isMercadoPagoPaymentUnresolved(sequence[0]), true);
  assert.equal(isMercadoPagoPaymentUnresolved(sequence[1]), false);
});

test('uncertain delivery retains the original request key and never polls an invented intent', async () => {
  const keys = [];
  const gateway = { createPayment: async (body) => { keys.push(body.idempotencyKey); if (keys.length === 1) throw new Error('lost response'); return response({ status: 'uncertain' }); }, recoverPayment: async () => { throw new Error('must not recover an unknown intent'); } };
  await assert.rejects(createMercadoPagoPaymentAndWait(request, gateway, () => {}, async () => {}), /lost response/);
  const recovered = await createMercadoPagoPaymentAndWait(request, gateway, () => {}, async () => {});
  assert.equal(isMercadoPagoPaymentUnresolved(recovered), true);
  assert.deepEqual(keys, [request.idempotencyKey, request.idempotencyKey]);
  assert.equal(isMercadoPagoPaymentUnresolved(response({ status: 'future-provider-state' })), true);
  for (const status of ['declined', 'cancelled', 'expired']) {
    assert.equal(isMercadoPagoPaymentUnresolved(response({ status, canRetry: true })), false);
    assert.equal(isMercadoPagoPaymentUnresolved(response({ status, canRetry: false })), true);
  }
  assert.equal(isMercadoPagoPaymentUnresolved(response({ status: 'refunded', saleState: 'recovery_required' })), true);
  assert.equal(isMercadoPagoPaymentUnresolved(response({ status: 'refunded', saleState: 'pending', canRetry: true })), false);
  assert.equal(isMercadoPagoPaymentUnresolved(response({ status: 'partially_refunded', canRetry: false })), true);
});

test('matching a completed cart includes draft line identity and changed quantities', () => {
  const item = { id: 'original-line', quantity: 1, price: 70, discount: 0, total: 70 };
  assert.equal(cartIdentity([item]), cartIdentity([{ ...item }]));
  assert.notEqual(cartIdentity([item]), cartIdentity([{ ...item, id: 'new-cart-line' }]));
  assert.notEqual(cartIdentity([item]), cartIdentity([{ ...item, quantity: 2, total: 140 }]));
});

test('OAuth return removes transient authorization values while preserving unrelated navigation', () => {
  const returned = readMercadoPagoOAuthReturn(new URL('https://example.invalid/point-of-sale/cajas?mp_oauth_code=test-code&mp_oauth_state=test-state&view=active#register'));
  assert.equal(returned.code, 'test-code');
  assert.equal(returned.state, 'test-state');
  assert.equal(returned.cleanUrl, '/point-of-sale/cajas?view=active#register');
  assert.equal(readMercadoPagoOAuthReturn(new URL('https://example.invalid/point-of-sale/cajas')), null);
});

test('Mercado Pago setup and recovery copy covers all eight supported POS locales', () => {
  assert.deepEqual(Object.keys(mercadoPagoTerminalCopyByLocale).sort(), ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'].sort());
  const keys = Object.keys(mercadoPagoTerminalCopyByLocale['en-CA']).sort();
  for (const [locale, copy] of Object.entries(mercadoPagoTerminalCopyByLocale)) {
    assert.deepEqual(Object.keys(copy).sort(), keys, locale);
    for (const [key, value] of Object.entries(copy)) assert.ok(typeof value === 'string' && value.trim(), `${locale}/${key}`);
    assert.match(copy.description, /MXN/);
  }
});

test('merchant review is exposed only for a missing-order review state and validates audited inputs', () => {
  const eligible = response({ status: 'reconciliation_required', saleState: 'review_required', orderId: null, version: 4 });
  assert.equal(requiresMercadoPagoMerchantReview(eligible), true);
  assert.equal(requiresMercadoPagoMerchantReview({ ...eligible, status: 'uncertain' }), false);
  assert.equal(requiresMercadoPagoMerchantReview({ ...eligible, saleState: 'pending' }), false);
  assert.equal(requiresMercadoPagoMerchantReview({ ...eligible, orderId: 'ORDknown' }), false);
  assert.equal(isValidMercadoPagoMerchantReview('ORDprovider_123', 'located in merchant account'), true);
  assert.equal(isValidMercadoPagoMerchantReview('payment-123', 'located in merchant account'), false);
  assert.equal(isValidMercadoPagoMerchantReview('ORDprovider_123', 'short'), false);
});

test('merchant review client posts the optimistic version to the authenticated mutation route', async () => {
  const calls = [];
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/PointOfSale/Sale/services/mercadoPagoTerminalApi.ts');
  const { mercadoPagoTerminalApi } = loadTypescript(path, (specifier) => {
    if (specifier.endsWith('/lib/apiClient')) return { apiClient: async (url, init = {}) => { calls.push({ url, init }); return response(); } };
    throw new Error(`Unexpected API dependency ${specifier}`);
  });
  await mercadoPagoTerminalApi.merchantReview(17, { providerOrderId: 'ORDprovider_123', reason: 'located in merchant account', expectedVersion: 4 });
  assert.equal(calls[0].url, '/api/v1/pos/mercado-pago/terminal-payments/17/merchant-review');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { providerOrderId: 'ORDprovider_123', reason: 'located in merchant account', expectedVersion: 4 });
});

test('merchant review form keeps labels, help text, and eligibility at the recovery boundary', () => {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/PointOfSale/Sale/components');
  const panel = readFileSync(resolve(directory, 'MercadoPagoTerminalRecoveryPanel.tsx'), 'utf8');
  const form = readFileSync(resolve(directory, 'MercadoPagoMerchantReviewForm.tsx'), 'utf8');
  assert.match(panel, /requiresMercadoPagoMerchantReview\(item\)[\s\S]*MercadoPagoMerchantReviewForm/);
  assert.match(form, /aria-labelledby/);
  assert.match(form, /aria-describedby/);
  assert.match(form, /maxLength=\{500\}/);
});

test('Square OAuth values are bounded, removed immediately, and cannot reintroduce Mercado Pago values', () => {
  const state = 'a'.repeat(64);
  const url = new URL(`https://example.invalid/point-of-sale/cajas?square_oauth_code=synthetic-code&square_oauth_state=${state}&mp_oauth_code=synthetic-mp&mp_oauth_state=synthetic-state&view=active#register`);
  readMercadoPagoOAuthReturn(url);
  const returned = readSquareOAuthReturn(url);
  assert.equal(returned.code, 'synthetic-code');
  assert.equal(returned.state, state);
  assert.equal(returned.cleanUrl, '/point-of-sale/cajas?view=active#register');
  for (const query of [`square_oauth_code=${'x'.repeat(192)}&square_oauth_state=${state}`, 'square_oauth_code=code&square_oauth_state=invalid', 'square_oauth_code=&square_oauth_state=', 'square_oauth_error=access_denied']) {
    const invalid = readSquareOAuthReturn(new URL(`https://example.invalid/point-of-sale/cajas?${query}`));
    assert.ok(invalid.error);
    assert.equal(invalid.cleanUrl, '/point-of-sale/cajas');
  }
});

function squareOAuthHarness(completeSquareOAuth) {
  const runtime = hookRuntime();
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/PointOfSale/CashRegisters/useSquareOAuthCompletion.ts');
  const { useSquareOAuthCompletion } = loadTypescript(path, (specifier) => {
    if (specifier === 'react') return runtime.hooks;
    if (specifier.endsWith('/posBackendApi')) return { posBackendApi: { completeSquareOAuth } };
    throw new Error(`Unexpected OAuth dependency ${specifier}`);
  });
  return { runtime, render: (options) => runtime.render(() => useSquareOAuthCompletion(options)) };
}

test('Square OAuth completion waits for authorized context and runs its CSRF client once across rerenders', async () => {
  const calls = [], busy = [], errors = []; let done, completed = 0;
  const h = squareOAuthHarness((code, state) => { calls.push({ code, state }); return new Promise((resolve) => { done = resolve; }); });
  const options = { oauthReturn: { code: 'synthetic-code', state: 'a'.repeat(64), error: null }, ready: false, canManage: true, errorMessage: 'localized error', onError: (error) => errors.push(error), onBusy: (value) => busy.push(value), onCompleted: () => { completed += 1; } };
  h.render(options); assert.equal(calls.length, 0);
  h.render({ ...options, ready: true });
  h.render({ ...options, ready: true, onCompleted: () => { completed += 1; } });
  assert.deepEqual(calls, [{ code: 'synthetic-code', state: 'a'.repeat(64) }]);
  done({ connected: true, merchantId: 'synthetic-merchant' }); await h.runtime.flush();
  assert.equal(completed, 1); assert.deepEqual(busy, [true, false]); assert.deepEqual(errors, []);
});

test('Square OAuth denies unauthorized or invalid returns and never announces an unconfirmed connection', async () => {
  for (const scenario of [{ canManage: false }, { oauthReturn: { code: null, state: null, error: 'invalid_response' } }, { confirmed: false }]) {
    let calls = 0, completed = 0; const errors = [];
    const h = squareOAuthHarness(async () => { calls += 1; return { connected: false }; });
    h.render({ oauthReturn: { code: 'synthetic-code', state: 'a'.repeat(64), error: null }, ready: true, canManage: true, errorMessage: 'localized error', onError: (error) => errors.push(error), onBusy: () => {}, onCompleted: () => { completed += 1; }, ...scenario });
    await h.runtime.flush();
    assert.equal(calls, scenario.confirmed === false ? 1 : 0); assert.equal(completed, 0); assert.deepEqual(errors, ['localized error']);
    h.runtime.unmount();
  }
});
