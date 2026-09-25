import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
import { squareTerminalRecoveryCopyByLocale } from '../src/app/BasicModules/PointOfSale/Sale/services/squareTerminalRecoveryCopy.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/PointOfSale/Sale/services');
const scope = { companyId: 7, cashRegisterId: 31, shiftId: 41 };
const payload = { cashRegisterId: 31, customerId: 999, currencyCode: 'CAD', items: [{ productId: 88, name: 'Private product', quantity: 1 }] };
const response = (status, checkout = null) => ({ intentId: 91, status, amount: 10, currencyCode: 'CAD', squareCheckoutId: null, squarePaymentId: null, posTicketId: checkout ? 100 : null, checkout });

function harness(createPayment) {
  const storage = new Map();
  globalThis.window = { sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, setTimeout: (callback) => { queueMicrotask(callback); return 1; } };
  const api = { createSquareTerminalPayment: createPayment, recoverSquareTerminalPayment: async () => response('uncertain') };
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file);
    const exports = loadTypescript(file, (specifier) => {
      if (specifier.endsWith('/posBackendApi')) return { posBackendApi: api };
      if (specifier.startsWith('.')) return load(resolve(dirname(file), `${specifier}.ts`));
      throw new Error(`Unexpected dependency ${specifier}`);
    });
    cache.set(file, exports); return exports;
  };
  return { client: load(resolve(root, 'squareTerminalPaymentClient.ts')), store: load(resolve(root, 'squareTerminalAttemptStore.ts')), storage };
}

const recovery = (copy = squareTerminalRecoveryCopyByLocale['en-CA']) => ({ scope, draftIdentity: 'cart-A|customer-999', copy });

const item = (id = 'original') => ({ id, productId: '5', name: 'Product', price: 70, quantity: 1, discount: 0, discountType: 'fixed', subtotal: 70, tax: 0, total: 70, taxRate: 0, currency: 'CAD' });
const shift = () => ({ id: '41', companyId: '7', cashRegisterId: '31', cashRegisterCode: 'REG-31', cashierName: 'Cashier', currencyCode: 'CAD', sales: 0, subtotalSales: 0, taxSales: 0, totalSales: 0, expectedCash: 0, cashSales: 0, cardSales: 0, transferSales: 0 });
const receipt = () => ({ ticket: { id: 100, ticketNumber: 'POS-100' }, items: [{ id: 1, productId: 5, productNameSnapshot: 'Product', quantity: 1, unitPrice: 70, discountAmount: 0, taxAmount: 0, lineTotalAmount: 70, currencyCode: 'CAD' }], payments: [], printableSummary: { ticketNumber: 'POS-100', subtotalAmount: 70, taxAmount: 0, totalAmount: 70, paidAmount: 70 } });

function hookHarness({ storage = new Map(), initialCart = [item()], squareRecoveryBlocked = false, createPayment, binding } = {}) {
  globalThis.window = { sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, setTimeout: (callback) => { queueMicrotask(callback); return 1; } };
  const runtime = hookRuntime(); const calls = []; let cart = initialCart, currentShift = shift();
  const posApi = { createSquareTerminalPayment: async (body) => { calls.push(body); return createPayment ? createPayment(body) : response('approved', receipt()); }, recoverSquareTerminalPayment: async () => response('approved', receipt()) };
  const mpApi = { binding: binding ?? (async () => ({ providerCode: 'SQUARE' })) }; const cache = new Map();
  const load = (file) => {
    const full = [file, `${file}.ts`, `${file}.tsx`].find((candidate) => existsSync(candidate));
    if (!full) throw new Error(`Missing module ${file}`); if (cache.has(full)) return cache.get(full);
    const exports = loadTypescript(full, (specifier) => {
      if (specifier === 'react') return runtime.hooks;
      if (specifier.endsWith('/posBackendApi')) return { posBackendApi: posApi };
      if (specifier.endsWith('/mercadoPagoTerminalApi')) return { mercadoPagoTerminalApi: mpApi };
      if (specifier.endsWith('/useMercadoPagoTerminalCheckout')) return { useMercadoPagoTerminalCheckout: () => ({ blocked: false, isCompletedDraft: () => false, start: async () => {} }) };
      if (specifier.endsWith('/useMercadoPagoTerminalCopy')) return { useMercadoPagoTerminalCopy: () => ({ copy: { recoveryHelp: 'blocked', noProvider: 'missing', mxnOnly: 'mxn' } }) };
      if (specifier.startsWith('.')) return load(resolve(dirname(full), specifier));
      throw new Error(`Unexpected dependency ${specifier}`);
    });
    cache.set(full, exports); return exports;
  };
  const { useSaleCheckout } = load(resolve(root, '../hooks/useSaleCheckout.ts'));
  const render = () => runtime.render(() => useSaleCheckout({ cart, products: [{ id: '5', useInventory: false }], currentShift, setCurrentShift: (next) => { currentShift = typeof next === 'function' ? next(currentShift) : next; }, resetCart: () => { cart = []; }, pushActivity: () => {}, formatCurrency: String, currency: 'CAD', squareRecoveryBlocked }));
  render(); const flush = async () => { for (let turn = 0; turn < 20; turn += 1) { await new Promise((done) => setTimeout(done, 1)); await runtime.flush(); } return runtime.result; };
  return { runtime, render, flush, calls, storage, store: load(resolve(root, 'squareTerminalAttemptStore.ts')), get cart() { return cart; }, get shift() { return currentShift; }, setCart: (next) => { cart = next; render(); }, setShift: (next) => { currentShift = next; render(); } };
}

test('Square persists a PII-free key before delivery and reuses it after a lost response', async () => {
  const calls = []; let h;
  h = harness(async (body) => { calls.push(body); assert.equal(h.storage.size, 1); if (calls.length === 1) throw new Error('lost response'); return response('declined'); });
  await assert.rejects(h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {}));
  const saved = JSON.parse([...h.storage.values()][0]);
  assert.deepEqual(Object.keys(saved).sort(), ['draftHash', 'requestKey']);
  assert.equal(saved.draftHash.length, 64);
  assert.doesNotMatch(JSON.stringify(saved), /Private product|customer-999/);
  await h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {});
  assert.deepEqual(calls.map(({ idempotencyKey }) => idempotencyKey), [saved.requestKey, saved.requestKey]);
  assert.equal(h.storage.size, 0);
});

test('Square preserves the original request and blocks a different draft before POST', async () => {
  let calls = 0;
  const h = harness(async () => { calls += 1; throw new Error('lost response'); });
  await assert.rejects(h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {}));
  const before = [...h.storage.values()][0];
  await assert.rejects(h.client.createSquareTerminalPaymentAndWait(payload, { ...recovery(), draftIdentity: 'cart-B' }, () => {}), /SQUARE_DIFFERENT_DRAFT_PENDING/);
  assert.equal(calls, 1);
  assert.equal([...h.storage.values()][0], before);
});

test('uncertain results and reload keep the key; only an authoritative close releases it', async () => {
  let status = 'uncertain'; const keys = [];
  const h = harness(async (body) => { keys.push(body.idempotencyKey); return response(status); });
  await h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {});
  const restored = h.store.readSquareTerminalAttempt(scope);
  assert.ok(restored);
  status = 'cancelled';
  await h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {});
  assert.deepEqual(keys, [restored.requestKey, restored.requestKey]);
  assert.equal(h.store.readSquareTerminalAttempt(scope), null);
});

test('a fully refunded attempt without a POS ticket authoritatively releases the stored key', async () => {
  const h = harness(async () => response('refunded'));
  await h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {});
  assert.equal(h.store.readSquareTerminalAttempt(scope), null);
});

test('a partially refunded attempt without a POS ticket remains blocked', async () => {
  const h = harness(async () => response('partially_refunded'));
  await h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {});
  assert.ok(h.store.readSquareTerminalAttempt(scope));
});

test('an approved persisted receipt remains held until the receipt consumer succeeds', async () => {
  const receipt = { ticket: { id: 100 }, items: [], payments: [], printableSummary: {} };
  const h = harness(async () => response('approved', receipt));
  const result = await h.client.createSquareTerminalPaymentAndWait(payload, recovery(), () => {});
  assert.ok(h.store.readSquareTerminalAttempt(scope));
  assert.equal(h.store.clearSquareTerminalAttempt(scope, result.attempt.requestKey), true);
  assert.equal(h.storage.size, 0);
});

test('linked partially refunded and refunded receipts are authoritative after reload', async () => {
  for (const status of ['partially_refunded', 'refunded']) {
    const storage = new Map(); const h = hookHarness({ storage, squareRecoveryBlocked: true });
    const attempt = await h.store.prepareSquareTerminalAttempt(scope, `stored-${status}`);
    const consumed = await h.runtime.result.consumeSquareTerminalRequestResult(response(status, receipt()), attempt);
    await h.flush();
    assert.equal(consumed, true); assert.equal(storage.size, 0);
    h.runtime.unmount();
  }
});

test('reload reconstructs a linked receipt and preserves a different current cart', async () => {
  const storage = new Map();
  const first = hookHarness({ storage, createPayment: async () => { throw new Error('lost'); } });
  first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush();
  const attempt = first.store.readSquareTerminalAttempt({ companyId: '7', cashRegisterId: '31', shiftId: '41' });
  assert.ok(attempt); first.runtime.unmount();
  const next = hookHarness({ storage, initialCart: [item('different')], squareRecoveryBlocked: true });
  next.runtime.result.confirmWorkspacePayment('cash', 70); await next.flush();
  assert.equal(next.runtime.result.payments.length, 0);
  await next.runtime.result.consumeSquareTerminalRequestResult(response('approved', receipt()), attempt); await next.flush();
  assert.equal(next.cart[0].id, 'different');
  assert.equal(next.shift.sales, 0);
  assert.equal(next.runtime.result.lastSale.saleNumber, 'POS-100');
  assert.equal(storage.size, 0);
});

test('reload clears the matching draft and a changed draft cannot retry the provider POST', async () => {
  const storage = new Map(); let createCalls = 0;
  const first = hookHarness({ storage, createPayment: async () => { createCalls += 1; throw new Error('lost'); } });
  first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush();
  const attempt = first.store.readSquareTerminalAttempt({ companyId: '7', cashRegisterId: '31', shiftId: '41' });
  first.setCart([item('changed')]); await first.runtime.result.retrySquareTerminalRequest(); await first.flush();
  assert.equal(createCalls, 1);
  first.runtime.unmount();
  const next = hookHarness({ storage, squareRecoveryBlocked: true });
  await next.runtime.result.consumeSquareTerminalRequestResult(response('approved', receipt()), attempt); await next.flush();
  assert.equal(next.cart.length, 0);
  assert.equal(next.shift.sales, 1);
  assert.equal(storage.size, 0);
});

test('provider lookup cannot dispatch after company/register scope changes', async () => {
  let release; const binding = () => new Promise((resolveBinding) => { release = resolveBinding; });
  const h = hookHarness({ binding });
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.runtime.flush();
  h.setShift({ ...h.shift, companyId: '8', cashRegisterId: '32' });
  release({ providerCode: 'SQUARE' }); await h.flush();
  assert.equal(h.calls.length, 0);
  h.runtime.unmount();
});

test('delayed recovery from an old scope cannot consume or overwrite the new scope', async () => {
  let releaseOld; const keyed = new Promise((resolveKeyed) => { releaseOld = resolveKeyed; });
  const runtime = hookRuntime(); const clears = [], consumed = [];
  globalThis.window = { setInterval: () => 1, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  const attemptStore = { SQUARE_TERMINAL_ATTEMPT_CHANGED: 'square-change',
    readSquareTerminalAttempt: ({ companyId }) => String(companyId) === '7' ? { requestKey: 'old-key', draftHash: 'hash' } : null,
    clearSquareTerminalAttempt: (...args) => { clears.push(args); },
  };
  const api = { listRecoverableSquareTerminalPayments: async ({ cashRegisterId }) => ({ items: String(cashRegisterId) === '32' ? [{ ...response('uncertain'), intentId: 202 }] : [] }),
    getSquareTerminalPaymentByRequestKey: () => keyed, cancelSquareTerminalPayment: async () => response('cancelled') };
  const jsx = { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }), Fragment: 'fragment' };
  const componentPath = resolve(root, '../components/SquareTerminalRecoveryPanel.tsx');
  const { SquareTerminalRecoveryPanel } = loadTypescript(componentPath, (specifier) => {
    if (specifier === 'react') return runtime.hooks;
    if (specifier === 'react/jsx-runtime') return jsx;
    if (specifier === 'lucide-react') return { AlertTriangle: 'alert', RefreshCw: 'refresh', RotateCcw: 'retry', XCircle: 'cancel' };
    if (specifier.endsWith('/posBackendApi')) return { posBackendApi: api };
    if (specifier.endsWith('/squareTerminalAttemptStore')) return attemptStore;
    throw new Error(`Unexpected dependency ${specifier}`);
  });
  const copy = Object.fromEntries(['title','help','retry','refresh','loading','loadError','lookupError','refundedReleased','cancelError','intent','recover','cancel','notSent','waiting','approved','finalizing','declined','cancelled','uncertain'].map((key) => [key,key]));
  let props = { companyId: 7, cashRegisterId: 31, shiftId: 41, formatCurrency: String, copy,
    onRecover: async () => null, onRequestResult: async () => { consumed.push(true); return true; }, onRetryRequest: async () => {} };
  runtime.render(() => SquareTerminalRecoveryPanel(props)); await runtime.flush();
  props = { ...props, companyId: 8, cashRegisterId: 32 }; runtime.render(); await runtime.flush();
  releaseOld(response('approved', receipt())); await runtime.flush();
  assert.equal(consumed.length, 0); assert.equal(clears.length, 0);
  const rendered = JSON.stringify(runtime.result);
  assert.match(rendered, /202/); assert.doesNotMatch(rendered, /POS-100/); runtime.unmount();
});

test('a failed Square cancellation from an old scope cannot block the new register', async () => {
  let rejectCancel; const cancellation = new Promise((_, reject) => { rejectCancel = reject; });
  const runtime = hookRuntime(); const blocked = [];
  globalThis.window = { setInterval: () => 1, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  const attemptStore = { SQUARE_TERMINAL_ATTEMPT_CHANGED: 'square-change', readSquareTerminalAttempt: () => null, clearSquareTerminalAttempt: () => {} };
  const waiting = { ...response('waiting'), intentId: 303 };
  const api = { listRecoverableSquareTerminalPayments: async ({ cashRegisterId }) => ({ items: Number(cashRegisterId) === 31 ? [waiting] : [] }), cancelSquareTerminalPayment: () => cancellation };
  const jsx = { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }), Fragment: 'fragment' };
  const { SquareTerminalRecoveryPanel } = loadTypescript(resolve(root, '../components/SquareTerminalRecoveryPanel.tsx'), (specifier) => {
    if (specifier === 'react') return runtime.hooks;
    if (specifier === 'react/jsx-runtime') return jsx;
    if (specifier === 'lucide-react') return { AlertTriangle: 'alert', RefreshCw: 'refresh', RotateCcw: 'retry', XCircle: 'cancel' };
    if (specifier.endsWith('/posBackendApi')) return { posBackendApi: api };
    if (specifier.endsWith('/squareTerminalAttemptStore')) return attemptStore;
    throw new Error(`Unexpected dependency ${specifier}`);
  });
  const copy = Object.fromEntries(['title','help','retry','refresh','loading','loadError','lookupError','refundedReleased','cancelError','intent','recover','cancel','notSent','waiting','approved','finalizing','declined','cancelled','uncertain'].map((key) => [key,key]));
  let props = { companyId: 7, cashRegisterId: 31, shiftId: 41, formatCurrency: String, copy, onRecover: async () => null, onRequestResult: async () => true, onRetryRequest: async () => {}, onUnresolvedChange: (value) => blocked.push(value) };
  runtime.render(() => SquareTerminalRecoveryPanel(props)); await runtime.flush();
  const visit = (node) => !node ? null : Array.isArray(node) ? node.map(visit).find(Boolean) : typeof node !== 'object' ? null : node.type === 'button' && JSON.stringify(node.props.children).includes('cancel') ? node : visit(Object.values(node.props ?? {}));
  visit(runtime.result).props.onClick(); await runtime.flush();
  props = { ...props, companyId: 8, cashRegisterId: 32 }; runtime.render(); await runtime.flush();
  rejectCancel(new Error('old scope failed')); await runtime.flush();
  assert.equal(runtime.result, null); assert.equal(blocked.at(-1), false); runtime.unmount();
});

test('scope switch during snapshot hash preserves the new cart', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const native = globalThis.crypto; const nativeDigest = native.subtle.digest.bind(native.subtle);
  let digestCalls = 0, releaseThird, signalThird;
  const thirdStarted = new Promise((resolveThird) => { signalThird = resolveThird; });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    randomUUID: native.randomUUID.bind(native), getRandomValues: native.getRandomValues.bind(native),
    subtle: { digest: async (...args) => {
      const value = await nativeDigest(...args); digestCalls += 1;
      if (digestCalls === 3) { signalThird(); await new Promise((resolveDigest) => { releaseThird = resolveDigest; }); }
      return value;
    } },
  } });
  try {
    const h = hookHarness();
    h.runtime.result.confirmWorkspacePayment('card', 70); await thirdStarted;
    h.setCart([item('new-scope')]); h.setShift({ ...h.shift, companyId: '8', cashRegisterId: '32' });
    releaseThird(); await h.flush();
    assert.equal(h.cart[0].id, 'new-scope'); assert.equal(h.shift.sales, 0);
    assert.equal(h.runtime.result.lastSale.saleNumber, 'POS-100'); h.runtime.unmount();
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});
