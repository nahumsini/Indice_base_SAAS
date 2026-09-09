import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../src/app');
const locales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const load = createTypeScriptLoader({ '../../components/ui/button': { Button: 'button' } });
const { BillingPaymentSection } = load(resolve(root, 'Billing/components/BillingPaymentSection.tsx'));
const { BillingOverviewBar } = load(resolve(root, 'Billing/components/BillingOverviewBar.tsx'));
const { getBillingCopy } = load(resolve(root, 'Billing/translations/index.ts'));
const { getPaymentMethodCopy } = load(resolve(root, 'Billing/translations/paymentMethod.ts'));
const { paymentMethodPresentation } = load(resolve(root, 'Billing/paymentMethodPresentation.ts'));
const { toBillingPresentation } = load(resolve(root, 'Billing/billingPresentation.adapter.ts'));
const selection = { payment_method_required: false, payment_management_available: true, activation_available: false, activation_block_reason: 'ALREADY_ACTIVE', selected_product_codes: ['module_hr'], current_product_codes: ['module_hr'], extra_seats: 1, included_seats: 5, used_seats: 3, billing_interval: 'MONTH', currency: 'USD', selection_state: 'CURRENT', effective_at: null, trial_ends_at: null, estimated_amount_cents: 9100, status: 'ACTIVE', stripe_enabled: true, stripe_catalog_ready: true };
const summary = status => ({ loading: false, ownerOnly: false, summary: { status, brand: ['SAVED', 'EXPIRED'].includes(status) ? 'visa' : null, last4: ['SAVED', 'EXPIRED'].includes(status) ? '4242' : null, checked_at: status === 'UNAVAILABLE' ? null : '2026-09-08T17:30:00Z' } });
const props = (method, locale = 'en-CA', extra = {}) => ({ copy: getBillingCopy(locale), selection, subscription: { cancel_at_period_end: false }, paymentMethod: method, languageCode: locale, action: '', hasChanges: false, readOnly: false, onSubscriptionAction() {}, ...extra });
function all(element, predicate) {
  if (element == null || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => all(child, predicate));
  return [...(predicate(element) ? [element] : []), ...all(element.props?.children, predicate)];
}
function text(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (Array.isArray(element)) return element.map(text).join(' ');
  return typeof element === 'object' ? text(element.props?.children) : String(element);
}
function button(tree, label) { return all(tree, item => item.type === 'button' && text(item).trim() === label)[0]; }
function createHookHarness(hookFile, exportName, argumentsFor, mocks) {
  let cursor = 0, dirty = true, result;
  const slots = [], effects = [];
  const changed = (old, next) => !old || old.length !== next.length || old.some((value, index) => !Object.is(value, next[index]));
  const react = { ...require('react'),
    useState(initial) { const index = cursor++; if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[index].value, update => { const value = typeof update === 'function' ? update(slots[index].value) : update; if (!Object.is(slots[index].value, value)) { slots[index].value = value; dirty = true; } }]; },
    useMemo(factory, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps }; return slots[index].value; },
    useCallback(callback, deps) { return this.useMemo(() => callback, deps); },
    useEffect(effect, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) { const previous = slots[index]; const next = { deps, cleanup: previous?.cleanup }; slots[index] = next; effects.push(() => { next.cleanup?.(); next.cleanup = effect(); }); } },
  };
  // Imported React hooks are invoked as properties by the transpiler.
  react.useCallback = (callback, deps) => react.useMemo(() => callback, deps);
  const redirects = [];
  const loader = createTypeScriptLoader({ react, 'react-router': { useNavigate: () => () => {} }, '../../lib/apiClient': { ApiClientError: ApiError }, ...mocks }, { window: { location: { assign: url => redirects.push(url) }, setTimeout, clearTimeout, history: { length: 1 } }, setTimeout, clearTimeout });
  const hook = loader(resolve(root, hookFile))[exportName];
  function render() { for (let i = 0; dirty; i++) { assert.ok(i < 30, 'hook effects settle'); dirty = false; cursor = 0; result = hook(...argumentsFor()); while (effects.length) effects.shift()(); } return result; }
  async function flush() { for (let i = 0; i < 10; i++) { await Promise.resolve(); render(); } return result; }
  return { render, flush, redirects, update() { dirty = true; return render(); }, dispose() { slots.forEach(slot => slot?.cleanup?.()); }, get value() { return render(); } };
}

test('saved-card states render independently from subscription activation in all eight locales', () => {
  for (const locale of locales) {
    const cardCopy = getPaymentMethodCopy(locale);
    for (const [status, key] of [['SAVED', 'saved'], ['NO_CARD', 'missing'], ['EXPIRED', 'expired'], ['UNAVAILABLE', 'unavailable']]) {
      const method = summary(status);
      const tree = BillingPaymentSection(props(method, locale));
      assert.equal(text(all(tree, item => item.props.role === 'status')[0]), cardCopy[key], `${locale}/${status}`);
      assert.ok(text(tree).includes(cardCopy.stripeSecurity));
      assert.ok(text(BillingOverviewBar(props(method, locale))).includes(cardCopy[key]));
      assert.equal(all(tree, item => item.type === 'input').length, 0, 'card credentials remain in Stripe');
      assert.equal(text(tree).includes('Visa •••• 4242'), status === 'SAVED' || status === 'EXPIRED');
      if (status === 'SAVED') assert.ok(text(tree).includes(cardCopy.savedDescription), 'saved card must not imply guaranteed future charges');
      assert.equal(toBillingPresentation(selection, null).primaryAction, 'NONE');
    }
    assert.notEqual(cardCopy.saved, cardCopy.unavailable);
    if (!locale.startsWith('en-')) assert.notEqual(cardCopy.savedDescription, getPaymentMethodCopy('en-CA').savedDescription);
  }
  assert.equal(getPaymentMethodCopy('unsupported-locale').saved, getPaymentMethodCopy('en-CA').saved);
});

test('unknown, loading and forbidden states never expose cached card metadata or imply a saved card', () => {
  const copy = getPaymentMethodCopy('en-CA');
  for (const method of [{ ...summary('SAVED'), loading: true }, { ...summary('SAVED'), ownerOnly: true }, summary('UNAVAILABLE'), { loading: false, ownerOnly: false, summary: null }]) {
    const card = paymentMethodPresentation(method, copy);
    assert.equal(card.card, null);
    assert.equal(card.tone, 'neutral');
    assert.notEqual(card.label, copy.saved);
  }
  const malformed = summary('SAVED'); malformed.summary.last4 = '4242424242424242';
  assert.equal(paymentMethodPresentation(malformed, copy).card, null);
  const delegated = BillingPaymentSection(props(summary('SAVED'), 'fr-CA', { readOnly: true }));
  assert.ok(!text(delegated).includes('4242'));
  assert.ok(text(delegated).includes(getPaymentMethodCopy('fr-CA').ownerOnly));
  assert.equal(all(delegated, item => item.type === 'button').length, 0);
});

test('existing subscriptions with no card use the hosted portal and never create another subscription', async () => {
  const calls = [];
  const billingApi = { subscriptionOptional: async () => ({ status: 'ACTIVE', cancel_at_period_end: false }), selection: async () => selection, invoices: async () => ({ invoices: [] }), openPortal: async () => { calls.push('portal'); return { url: 'https://billing.stripe.com/test-session' }; }, activate: async () => { calls.push('activate'); throw new Error('must not create a subscription'); } };
  const copy = getBillingCopy('en-CA');
  const hook = createHookHarness('Billing/hooks/useBillingManagement.ts', 'useBillingManagement', () => [copy], { '../../api/billing': { billingApi }, '../../api/managedCompanies': { managedCompanyApi: { context: async () => ({ active: false, read_only: false }) } } });
  try {
    hook.render(); await hook.flush();
    const state = hook.value;
    const tree = BillingPaymentSection(props(summary('NO_CARD'), 'en-CA', { selection: state.selection, subscription: state.subscription, onSubscriptionAction: state.subscriptionAction }));
    const portal = button(tree, getPaymentMethodCopy('en-CA').manageCards);
    assert.ok(portal); assert.equal(portal.props.disabled, false);
    assert.match(portal.props.className, /whitespace-normal/);
    assert.match(portal.props.className, /h-auto/);
    await portal.props.onClick();
    assert.deepEqual(calls, ['portal']);
    assert.deepEqual(hook.redirects, ['https://billing.stripe.com/test-session']);
    assert.equal(toBillingPresentation(state.selection, state.subscription).primaryAction, 'NONE');
    assert.equal(toBillingPresentation(state.selection, state.subscription, true).primaryAction, 'SCHEDULE');
  } finally { hook.dispose(); }
});

test('activation remains driven by the backend activation discriminator, including a customer with a saved card', () => {
  const draftSelection = { ...selection, payment_method_required: true, activation_available: true, activation_block_reason: 'READY', selection_state: 'DRAFT' };
  for (const status of ['NO_CARD', 'SAVED', 'UNAVAILABLE']) {
    const tree = BillingPaymentSection(props(summary(status), 'en-CA', { selection: draftSelection }));
    assert.equal(button(tree, getPaymentMethodCopy('en-CA').manageCards), undefined);
    assert.equal(toBillingPresentation(draftSelection, null).primaryAction, 'ACTIVATE');
  }
});

test('nonowner card restrictions retain existing cancel and resume actions for billing administrators', () => {
  const calls = [];
  const method = { loading: false, ownerOnly: true, summary: null };
  for (const cancelAtPeriodEnd of [false, true]) {
    const copy = getBillingCopy('es-MX');
    const tree = BillingPaymentSection(props(method, 'es-MX', { subscription: { cancel_at_period_end: cancelAtPeriodEnd }, onSubscriptionAction: name => calls.push(name) }));
    assert.equal(button(tree, getPaymentMethodCopy('es-MX').manageCards), undefined);
    const action = button(tree, cancelAtPeriodEnd ? copy.resume : copy.cancel);
    assert.ok(action); assert.equal(action.props.disabled, false); action.props.onClick();
  }
  assert.deepEqual(calls, ['cancel', 'resume']);
});

test('card summary fetch is owner-safe, retryable and independent of plan loading', async () => {
  let enabled = true, readOnly = true;
  const requests = [];
  const hook = createHookHarness('Billing/hooks/useBillingPaymentMethod.ts', 'useBillingPaymentMethod', () => [enabled, readOnly], { '../../api/billing': { billingApi: { paymentMethod: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) } } });
  try {
    assert.equal(hook.render().ownerOnly, true);
    assert.equal(requests.length, 0, 'delegated read-only views must not call the owner endpoint');
    readOnly = false; hook.update();
    assert.equal(hook.value.loading, true);
    requests[0].reject(new ApiError('private server message', 403)); await hook.flush();
    assert.equal(hook.value.ownerOnly, true); assert.equal(hook.value.summary, null);
    enabled = false; hook.update(); enabled = true; hook.update();
    requests[1].reject(new ApiError('provider outage', 503)); await hook.flush();
    assert.equal(hook.value.ownerOnly, false); assert.equal(hook.value.loading, false); assert.equal(hook.value.summary, null);
    enabled = false; hook.update(); enabled = true; hook.update();
    requests[2].resolve(summary('SAVED').summary); await hook.flush();
    assert.equal(hook.value.summary.status, 'SAVED');
    readOnly = true;
    const delegated = hook.update();
    assert.equal(delegated.ownerOnly, true); assert.equal(delegated.summary, null);
    readOnly = false; hook.update();
    readOnly = true; hook.update();
    requests[3].resolve(summary('SAVED').summary); await hook.flush();
    assert.equal(hook.value.summary, null, 'a late owner response must not leak into the delegated view');
  } finally { hook.dispose(); }
});

test('the payment summary API sends no company or Stripe customer identifiers', async () => {
  const requests = [];
  const apiLoad = createTypeScriptLoader({ '../lib/apiClient': { ApiClientError: ApiError, apiClient: async (url, options) => { requests.push({ url, options }); return summary('NO_CARD').summary; } } });
  const { billingApi } = apiLoad(resolve(root, 'api/billing.ts'));
  await billingApi.paymentMethod();
  assert.deepEqual(requests, [{ url: '/api/v1/billing/subscription/payment-method', options: undefined }]);
});
