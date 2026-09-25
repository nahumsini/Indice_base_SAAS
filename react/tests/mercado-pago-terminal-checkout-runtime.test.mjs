import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
import { mercadoPagoTerminalCopyByLocale } from '../src/app/BasicModules/PointOfSale/CashRegisters/mercadoPagoTerminalCopy.ts';

const posRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/PointOfSale');
const item = (id = 'original-cart-line') => ({ id, productId: '5', name: 'Product', price: 70, quantity: 1, discount: 0, discountType: 'fixed', subtotal: 70, tax: 0, total: 70, taxRate: 0, currency: 'MXN' });
const shift = () => ({ id: '11', companyId: 'tenant-test', cashRegisterId: '2', cashRegisterCode: 'REG-2', cashierName: 'Cashier', currencyCode: 'MXN', sales: 0, subtotalSales: 0, taxSales: 0, totalSales: 0, expectedCash: 0, cashSales: 0, cardSales: 0, transferSales: 0 });
const checkout = () => ({ ticket: { id: 81, ticketNumber: 'POS-81', cashRegisterId: 2, shiftId: 11, currencyCode: 'MXN' }, items: [{ id: 1, productId: 5, productNameSnapshot: 'Product', quantity: 1, unitPrice: 70, discountAmount: 0, taxAmount: 0, lineTotalAmount: 70, currencyCode: 'MXN' }], payments: [], printableSummary: { ticketNumber: 'POS-81', subtotalAmount: 70, taxAmount: 0, totalAmount: 70, paidAmount: 70 } });
const payment = (fields = {}) => ({ intentId: 9, status: 'approved', amount: 70, currencyCode: 'MXN', orderId: 'order-test', paymentId: 'payment-test', message: null, posTicketId: 81, checkout: checkout(), saleState: 'completed', canCancel: false, canRetry: false, version: 1, ...fields });
function deferred() { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
const rejection = (requestKey) => Object.assign(new Error('Preflight rejected'), { status: 409, payload: { code: 'PAYMENT_NOT_SUBMITTED', submissionState: 'not_submitted', requestKey, message: 'Missing terminal setup' } });

function harness({ mp = {}, square = {}, initialCart = [item()], storage = new Map(), provider = 'MERCADO_PAGO', currency = 'MXN', refresh } = {}) {
  globalThis.window = { sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, setTimeout: (callback) => { queueMicrotask(callback); return 1; } };
  const runtime = hookRuntime();
  const calls = { mp: [], square: [], resets: 0, completed: 0, manual: 0 };
  let cart = initialCart, currentShift = { ...shift(), currencyCode: currency };
  const mpApi = { status: async () => ({ enabled: true, connected: true, liveChargeAllowed: true }), binding: async () => ({ providerCode: provider }), recoverable: async () => ({ items: [] }), createPayment: async (body) => { calls.mp.push(body); return payment(); }, recoverPayment: async () => payment(), cancelPayment: async () => payment({ status: 'cancelled', checkout: null, posTicketId: null, canRetry: true }), byRequest: async () => payment(), ...mp };
  const posApi = { createSquareTerminalPayment: async (body) => { calls.square.push(body); return { ...payment(), squarePaymentId: 'square-test' }; }, recoverSquareTerminalPayment: async () => ({ ...payment(), squarePaymentId: 'square-test' }), checkout: async () => { calls.manual += 1; return checkout(); }, ...square };
  const cache = new Map();
  const load = (file) => {
    const full = [file, `${file}.ts`, `${file}.tsx`].find((candidate) => existsSync(candidate));
    if (!full) throw new Error(`Missing runtime module ${file}`);
    if (cache.has(full)) return cache.get(full);
    const exports = loadTypescript(full, (specifier) => {
      if (specifier === 'react') return runtime.hooks;
      if (specifier.endsWith('/posBackendApi')) return { posBackendApi: posApi };
      if (specifier.endsWith('/mercadoPagoTerminalApi')) return { mercadoPagoTerminalApi: mpApi };
      if (specifier.endsWith('/useMercadoPagoTerminalCopy')) return { useMercadoPagoTerminalCopy: () => ({ copy: mercadoPagoTerminalCopyByLocale['en-CA'], locale: 'en-CA' }) };
      if (specifier.startsWith('.')) return load(resolve(dirname(full), specifier));
      throw new Error(`Unexpected runtime dependency ${specifier}`);
    });
    cache.set(full, exports); return exports;
  };
  const { useSaleCheckout } = load(resolve(posRoot, 'Sale/hooks/useSaleCheckout.ts'));
  const render = () => runtime.render(() => useSaleCheckout({ cart, products: [{ id: '5', useInventory: false }], currentShift, setCurrentShift: (next) => { currentShift = typeof next === 'function' ? next(currentShift) : next; }, resetCart: () => { calls.resets += 1; cart = []; }, pushActivity: () => {}, formatCurrency: (amount) => String(amount), currency, onCheckoutCompleted: () => { calls.completed += 1; }, refreshRegisterContext: refresh }));
  render();
  const flush = async () => { for (let turn = 0; turn < 20; turn += 1) { await new Promise((done) => setTimeout(done, 1)); await runtime.flush(); } return runtime.result; };
  return { runtime, render, flush, calls, storage, mpApi, get cart() { return cart; }, setCart: (next) => { cart = next; render(); }, setShift: (next) => { currentShift = next; render(); }, get shift() { return currentShift; } };
}

test('active card checkout reaches unchanged Square client after asynchronous provider lookup', async () => {
  const binding = deferred();
  const h = harness({ provider: 'SQUARE', mp: { binding: () => binding.promise } });
  await h.flush();
  h.runtime.result.confirmWorkspacePayment('card', 70);
  await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  assert.equal(h.calls.square.length, 0);
  binding.resolve({ providerCode: 'SQUARE' });
  await h.flush();
  assert.equal(h.calls.square.length, 1);
  assert.equal(h.calls.mp.length, 0);
  assert.equal(h.calls.resets, 1);
  assert.equal(h.runtime.result.lastSale.saleNumber, 'POS-81');
});

test('active Mercado Pago approval produces persisted receipt, clears matching cart, and cannot charge it twice', async () => {
  const h = harness(); await h.flush();
  h.runtime.result.confirmWorkspacePayment('card', 70);
  await h.flush();
  assert.equal(h.calls.mp.length, 1);
  assert.equal(h.calls.resets, 1);
  assert.equal(h.calls.completed, 1);
  assert.equal(h.cart.length, 0);
  assert.equal(h.runtime.result.lastSale.saleNumber, 'POS-81');
  assert.equal(h.runtime.result.lastSale.payments[0].method, 'card');
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.calls.mp.length, 1);
  assert.equal(h.storage.size, 0);
});

test('an identical later sale is allowed after the completed cart clears', async () => {
  const requests = []; let intentId = 9;
  const h = harness({ mp: { createPayment: async (body) => {
    requests.push(body); return payment({ intentId: intentId++ });
  } } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  h.setCart([]); await h.flush(); h.setCart([item()]); await h.flush();
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].idempotencyKey, requests[1].idempotencyKey);
  assert.equal(h.calls.resets, 2);
});

test('completion from an old shift cannot clear the new shift recovery key', async () => {
  const sync = deferred(), storage = new Map();
  const h = harness({ storage, refresh: () => sync.promise }); await h.flush();
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  const oldScope = 'indice:pos:mp-attempt:tenant-test:2:11';
  const newScope = 'indice:pos:mp-attempt:tenant-test:3:12';
  assert.equal(storage.has(oldScope), true);
  storage.set(newScope, JSON.stringify({ key: 'new-shift-key', intentId: 10, cartHash: 'new-hash' }));
  h.setShift({ ...shift(), id: '12', cashRegisterId: '3' }); await h.flush();
  sync.resolve(); await h.flush();
  assert.equal(storage.has(oldScope), false);
  assert.equal(JSON.parse(storage.get(newScope)).key, 'new-shift-key');
  assert.equal(h.runtime.result.mercadoPago.canRecoverRequest, true);
});

test('linked partially refunded and refunded Mercado Pago results recover the receipt and release the stored attempt', async () => {
  for (const status of ['partially_refunded', 'refunded']) {
    const storage = new Map();
    const first = harness({ storage, mp: { createPayment: async () => { throw new Error('lost response'); } } });
    await first.flush(); first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush(); first.runtime.unmount();
    const next = harness({ storage, initialCart: [item(`different-${status}`)], mp: { byRequest: async () => payment({ status }) } });
    await next.flush(); await next.runtime.result.mercadoPago.recoverRequest(); await next.flush();
    assert.equal(next.runtime.result.lastSale.saleNumber, 'POS-81');
    assert.equal(next.cart[0].id, `different-${status}`);
    assert.equal(next.calls.resets, 0);
    assert.equal(storage.size, 0);
    assert.equal(next.runtime.result.mercadoPago.items.length, 0);
    assert.equal(next.runtime.result.isCompletingSale, false);
    next.runtime.unmount();
  }
});

test('recovery-list receipts with refund status unblock after explicit receipt recovery', async () => {
  for (const status of ['partially_refunded', 'refunded']) {
    const result = payment({ status });
    const h = harness({ initialCart: [item(`current-${status}`)], mp: {
      recoverable: async () => ({ items: [result] }), recoverPayment: async () => result,
    } });
    await h.flush();
    assert.equal(h.runtime.result.isCompletingSale, true);
    await h.runtime.result.mercadoPago.recover(9); await h.flush();
    assert.equal(h.runtime.result.mercadoPago.items.length, 0);
    assert.equal(h.runtime.result.isCompletingSale, false);
    assert.equal(h.cart[0].id, `current-${status}`);
    h.runtime.unmount();
  }
});

test('webhook-finalized approval without first-response receipt stays guarded until persisted checkout recovery', async () => {
  const receipt = deferred();
  const h = harness({ mp: { createPayment: async (body) => { h.calls.mp.push(body); return payment({ checkout: null }); }, recoverPayment: () => receipt.promise } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  assert.equal(h.cart.length, 1);
  h.runtime.result.confirmWorkspacePayment('cash', 70);
  assert.equal(h.runtime.result.payments.length, 0);
  receipt.resolve(payment()); await h.flush();
  assert.equal(h.calls.resets, 1);
  assert.equal(h.cart.length, 0);
  assert.equal(h.calls.mp.length, 1);
});

test('lost creation response blocks every tender and replays only the exact original request key', async () => {
  const keys = [];
  const h = harness({ mp: { createPayment: async (body) => { keys.push(body.idempotencyKey); if (keys.length === 1) throw new Error('lost creation response'); return payment(); } } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  h.runtime.result.confirmWorkspacePayment('cash', 70);
  h.runtime.result.handleExactPayment();
  await h.runtime.result.completeSale([{ id: 'cash', method: 'cash', amount: 70 }], { total: 70, paid: 70, isPaid: true });
  await h.flush();
  assert.equal(h.runtime.result.payments.length, 0);
  assert.equal(h.calls.manual, 0);
  const stored = JSON.parse([...h.storage.values()][0]);
  assert.deepEqual(Object.keys(stored).sort(), ['cartHash', 'intentId', 'key']);
  assert.equal(stored.cartHash.length, 64);
  await h.runtime.result.mercadoPago.recoverRequest(); await h.flush();
  assert.deepEqual(keys, [stored.key, stored.key]);
  assert.equal(h.calls.resets, 1);
});

test('refresh recovers an unknown request by scoped key and preserves an unrelated current cart', async () => {
  const storage = new Map();
  const first = harness({ storage, mp: { createPayment: async () => { throw new Error('lost response'); } } });
  await first.flush(); first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush();
  const saved = JSON.parse([...storage.values()][0]); first.runtime.unmount();
  const calls = [];
  const next = harness({ storage, initialCart: [item('different-current-cart')], mp: { byRequest: async (key, registerId) => { calls.push({ key, registerId }); return payment(); } } });
  await next.flush();
  assert.equal(next.runtime.result.isCompletingSale, true);
  await next.runtime.result.mercadoPago.recoverRequest(); await next.flush();
  assert.deepEqual(calls, [{ key: saved.key, registerId: 2 }]);
  assert.equal(next.cart[0].id, 'different-current-cart');
  assert.equal(next.calls.resets, 0);
  assert.equal(next.calls.completed, 0);
  assert.equal(next.shift.sales, 0);
  assert.equal(next.runtime.result.lastSale.saleNumber, 'POS-81');
});

test('refresh can clear a restored matching draft using its hash without persisting product or customer details', async () => {
  const storage = new Map();
  const first = harness({ storage, mp: { createPayment: async () => { throw new Error('lost response'); } } });
  await first.flush(); first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush(); first.runtime.unmount();
  const next = harness({ storage }); await next.flush();
  await next.runtime.result.mercadoPago.recoverRequest(); await next.flush();
  assert.equal(next.calls.resets, 1);
  assert.equal(next.cart.length, 0);
  assert.equal(storage.size, 0);
});

test('cart changes during provider lookup stop the charge and terminal cancellation eligibility stays authoritative', async () => {
  const binding = deferred();
  const h = harness({ mp: { binding: () => binding.promise } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  h.setCart([item('new-cart')]); binding.resolve({ providerCode: 'MERCADO_PAGO' }); await h.flush();
  assert.equal(h.calls.mp.length, 0);
  const pending = payment({ status: 'waiting', checkout: null, posTicketId: null, canCancel: false });
  let cancellations = 0;
  const next = harness({ mp: { recoverable: async () => ({ items: [pending] }), cancelPayment: async () => { cancellations += 1; return pending; } } });
  await next.flush(); await next.runtime.result.mercadoPago.cancel(pending.intentId); await next.flush();
  assert.equal(cancellations, 0);
  assert.equal(next.runtime.result.isCompletingSale, true);
});

test('Mercado Pago rejects non-MXN and initial recovery verification prevents charging before lookup completes', async () => {
  const pending = deferred();
  const h = harness({ currency: 'CAD', mp: { recoverable: () => pending.promise } });
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.calls.mp.length, 0);
  pending.resolve({ items: [] }); await h.flush();
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.calls.mp.length, 0);
  assert.match(h.runtime.result.checkoutNotice, /MXN/);
});

test('an already completed receipt in the recovery list requires explicit recovery and preserves an unrelated cart', async () => {
  const h = harness({ mp: { recoverable: async () => ({ items: [payment()] }) } });
  await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  h.runtime.result.confirmWorkspacePayment('cash', 70); await h.flush();
  assert.equal(h.runtime.result.payments.length, 0);
  await h.runtime.result.mercadoPago.recover(9); await h.flush();
  assert.equal(h.calls.resets, 0);
  assert.equal(h.cart.length, 1);
  assert.equal(h.runtime.result.lastSale.saleNumber, 'POS-81');
  assert.equal(h.runtime.result.isCompletingSale, false);
});

test('unknown request lookup 404 cannot release the original key or permit another tender', async () => {
  const storage = new Map();
  const first = harness({ storage, mp: { createPayment: async () => { throw new Error('lost response'); } } });
  await first.flush(); first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush(); first.runtime.unmount();
  const saved = [...storage.values()][0];
  const next = harness({ storage, mp: { byRequest: async () => { throw new Error('404 not found yet'); } } });
  await next.flush(); await next.runtime.result.mercadoPago.recoverRequest(); await next.flush();
  next.runtime.result.confirmWorkspacePayment('cash', 70);
  next.runtime.result.confirmWorkspacePayment('card', 70); await next.flush();
  assert.equal(next.runtime.result.isCompletingSale, true);
  assert.equal(next.runtime.result.payments.length, 0);
  assert.equal(next.calls.mp.length, 0);
  assert.equal([...storage.values()][0], saved);
});

test('only definitive server retry permission releases a failed attempt and allows a new request key', async () => {
  const keys = [];
  const h = harness({ mp: { createPayment: async (body) => { keys.push(body.idempotencyKey); return keys.length === 1 ? payment({ status: 'declined', checkout: null, posTicketId: null, canRetry: true }) : payment(); } } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.storage.size, 0);
  assert.equal(h.runtime.result.isCompletingSale, false);
  assert.equal(h.cart.length, 1);
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
  assert.equal(h.calls.resets, 1);
});

test('durable matching-key rejection releases a never-submitted attempt and permits a fresh key', async () => {
  const keys = [];
  const h = harness({ mp: { createPayment: async (body) => { keys.push(body.idempotencyKey); if (keys.length === 1) throw rejection(body.idempotencyKey); return payment(); } } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.storage.size, 0);
  assert.equal(h.runtime.result.isCompletingSale, false);
  assert.equal(h.cart.length, 1);
  assert.match(h.runtime.result.checkoutNotice, /not submitted/);
  h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
  assert.equal(h.calls.resets, 1);
});

test('generic preflight error and a rejection for another key cannot release an uncertain attempt', async () => {
  for (const error of [Object.assign(new Error('Bad request'), { status: 400 }), rejection('another-request-key')]) {
    const h = harness({ mp: { createPayment: async () => { throw error; } } });
    await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
    assert.equal(h.storage.size, 1);
    assert.equal(h.runtime.result.isCompletingSale, true);
    h.runtime.result.confirmWorkspacePayment('cash', 70); await h.flush();
    assert.equal(h.runtime.result.payments.length, 0);
    h.runtime.unmount();
  }
});

test('refresh releases only the persisted rejection returned for its original unknown key', async () => {
  const storage = new Map();
  const first = harness({ storage, mp: { createPayment: async () => { throw new Error('Lost rejection response'); } } });
  await first.flush(); first.runtime.result.confirmWorkspacePayment('card', 70); await first.flush(); first.runtime.unmount();
  const next = harness({ storage, mp: { byRequest: async (key) => { throw rejection(key); } } });
  await next.flush(); await next.runtime.result.mercadoPago.recoverRequest(); await next.flush();
  assert.equal(storage.size, 0);
  assert.equal(next.runtime.result.isCompletingSale, false);
  assert.equal(next.cart.length, 1);
  assert.equal(next.calls.resets, 0);
  assert.match(next.runtime.result.checkoutNotice, /not submitted/);
});

test('production approval status blocks before request-key admission and preserves other tender choices', async () => {
  const h = harness({ mp: { status: async () => ({ enabled: true, connected: true, liveChargeAllowed: false }) } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.calls.mp.length, 0);
  assert.equal(h.storage.size, 0);
  assert.equal(h.runtime.result.isCompletingSale, false);
  assert.match(h.runtime.result.checkoutNotice, /production approval/);
  h.runtime.result.confirmWorkspacePayment('cash', 70); await h.flush();
  assert.equal(h.runtime.result.payments[0].method, 'cash');
});

test('explicit close of an unknown key keeps every tender guarded until its matching non-submission receipt', async () => {
  const closed = deferred(), keys = [];
  const h = harness({ mp: { createPayment: async () => { throw new Error('Unknown delivery'); }, closeRequest: (key, registerId) => { keys.push({ key, registerId }); return closed.promise; } } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  const saved = JSON.parse([...h.storage.values()][0]);
  const action = h.runtime.result.mercadoPago.closeRequest(); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  assert.equal(h.storage.size, 1);
  h.runtime.result.confirmWorkspacePayment('cash', 70);
  assert.equal(h.runtime.result.payments.length, 0);
  closed.resolve(rejection(saved.key).payload); await action; await h.flush();
  assert.deepEqual(keys, [{ key: saved.key, registerId: 2 }]);
  assert.equal(h.runtime.result.isCompletingSale, false);
  assert.equal(h.storage.size, 0);
  assert.equal(h.cart.length, 1);
  assert.equal(h.calls.resets, 0);
  assert.equal(h.calls.mp.length, 0);
});

test('explicit close returning an existing pending intent cannot release its original sale', async () => {
  const h = harness({ mp: { createPayment: async () => { throw new Error('Lost response'); }, closeRequest: async () => payment({ status: 'waiting', checkout: null, posTicketId: null, canCancel: false }) } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  await h.runtime.result.mercadoPago.closeRequest(); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  assert.equal(h.runtime.result.mercadoPago.items[0].intentId, 9);
  assert.equal(JSON.parse([...h.storage.values()][0]).intentId, 9);
  assert.equal(h.cart.length, 1);
});

test('explicit close cannot clear a key on another-key proof or lost closure response', async () => {
  for (const closeRequest of [async () => rejection('other-key').payload, async () => { throw new Error('Lost closure response'); }]) {
    const h = harness({ mp: { createPayment: async () => { throw new Error('Lost response'); }, closeRequest } });
    await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
    const saved = [...h.storage.values()][0];
    await h.runtime.result.mercadoPago.closeRequest(); await h.flush();
    assert.equal(h.runtime.result.isCompletingSale, true);
    assert.equal([...h.storage.values()][0], saved);
    h.runtime.unmount();
  }
});

test('simultaneous terminal cancellation and polling approval finalize the matching sale once', async () => {
  const recovered = deferred();
  let cancellations = 0;
  const h = harness({ mp: { createPayment: async () => payment({ status: 'waiting', checkout: null, posTicketId: null, canCancel: true }), recoverPayment: () => recovered.promise, cancelPayment: async () => { cancellations += 1; return payment(); } } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  const firstCancel = h.runtime.result.mercadoPago.cancel(9);
  const duplicateCancel = h.runtime.result.mercadoPago.cancel(9);
  recovered.resolve(payment());
  await Promise.all([firstCancel, duplicateCancel]); await h.flush();
  assert.equal(cancellations, 1);
  assert.equal(h.calls.resets, 1);
  assert.equal(h.calls.completed, 1);
  assert.equal(h.shift.sales, 1);
});

test('a failed cancellation from an old scope cannot block the new register', async () => {
  const cancellation = deferred();
  const pending = payment({ status: 'waiting', checkout: null, posTicketId: null, canCancel: true });
  const h = harness({ mp: {
    recoverable: async (registerId) => ({ items: Number(registerId) === 2 ? [pending] : [] }),
    cancelPayment: () => cancellation.promise,
  } });
  await h.flush(); const oldCancel = h.runtime.result.mercadoPago.cancel(9); await h.runtime.flush();
  h.setShift({ ...shift(), id: '12', cashRegisterId: '3' }); await h.flush();
  cancellation.reject(new Error('old scope failed')); await oldCancel; await h.flush();
  assert.equal(h.runtime.result.mercadoPago.error, '');
  assert.equal(h.runtime.result.isCompletingSale, false);
});

test('authoritative full refund releases the original request without clearing or finalizing its cart', async () => {
  const h = harness({ mp: { createPayment: async () => payment({ status: 'refunded', checkout: null, posTicketId: null, canRetry: true, saleState: 'pending' }) } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, false);
  assert.equal(h.storage.size, 0);
  assert.equal(h.cart.length, 1);
  assert.equal(h.calls.resets, 0);
  assert.equal(h.calls.completed, 0);
  assert.equal(h.runtime.result.lastSale, null);
});

test('partial refund keeps the payment guarded until backend independently verifies a full refund', async () => {
  const h = harness({ mp: { createPayment: async () => payment({ status: 'partially_refunded', checkout: null, posTicketId: null, canRetry: false, saleState: 'recovery_required' }), recoverPayment: async () => payment({ status: 'refunded', checkout: null, posTicketId: null, canRetry: true, saleState: 'pending' }) } });
  await h.flush(); h.runtime.result.confirmWorkspacePayment('card', 70); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, true);
  assert.equal(h.storage.size, 1);
  h.runtime.result.confirmWorkspacePayment('cash', 70); await h.flush();
  assert.equal(h.runtime.result.payments.length, 0);
  await h.runtime.result.mercadoPago.recover(9); await h.flush();
  assert.equal(h.runtime.result.isCompletingSale, false);
  assert.equal(h.storage.size, 0);
  assert.equal(h.cart.length, 1);
  assert.equal(h.calls.resets, 0);
});

test('authenticated merchant review submits the displayed version and reloads provider state', async () => {
  const review = payment({ status: 'reconciliation_required', orderId: null, paymentId: null, posTicketId: null, checkout: null, saleState: 'review_required', version: 4 });
  const updated = payment({ status: 'waiting', orderId: 'ORDprovider_123', paymentId: null, posTicketId: null, checkout: null, saleState: 'pending', version: 5 });
  const calls = []; let reads = 0;
  const h = harness({ mp: {
    recoverable: async () => ({ items: [reads++ === 0 ? review : updated] }),
    merchantReview: async (intentId, body) => { calls.push({ intentId, body }); return updated; },
  } });
  await h.flush();
  await h.runtime.result.mercadoPago.merchantReview(9, ' ORDprovider_123 ', ' provider order located '); await h.flush();
  assert.deepEqual(calls, [{ intentId: 9, body: { providerOrderId: 'ORDprovider_123', reason: 'provider order located', expectedVersion: 4 } }]);
  assert.ok(reads >= 2);
  assert.equal(h.runtime.result.mercadoPago.items[0].version, 5);
});

test('stale merchant review reloads the current payment after a 409', async () => {
  const review = payment({ status: 'reconciliation_required', orderId: null, paymentId: null, posTicketId: null, checkout: null, saleState: 'review_required', version: 4 });
  const current = { ...review, version: 6 };
  let reads = 0;
  const h = harness({ mp: {
    recoverable: async () => ({ items: [reads++ === 0 ? review : current] }),
    merchantReview: async () => { throw Object.assign(new Error('stale'), { status: 409 }); },
  } });
  await h.flush();
  await h.runtime.result.mercadoPago.merchantReview(9, 'ORDprovider_123', 'provider order located'); await h.flush();
  assert.ok(reads >= 2);
  assert.equal(h.runtime.result.mercadoPago.items[0].version, 6);
  assert.equal(h.runtime.result.mercadoPago.error, mercadoPagoTerminalCopyByLocale['en-CA'].reviewConflict);
});
