import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
import { getPaymentRequestCopy } from '../src/app/Billing/paymentRequestTranslations.ts';
import { formatBillingMoney } from '../src/app/Billing/billingFormatters.ts';

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(resolve(import.meta.dirname, '../src/app', path), 'utf8');
const loadTypeScript = createTypeScriptLoader();
const customerModule = (path) => loadTypeScript(resolve(import.meta.dirname, '../src/app/PlatformAdmin/Customers', path));
const { getCustomerAccountCopy, customerAccountLocales } = customerModule('customerAccountTranslations.ts');
const { getCustomerTableCopy } = customerModule('customerTableCopy.ts');
const { basicCommercialStatus } = customerModule('customerTableUtils.ts');
const presentationModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(read('Billing/paymentRequestPresentation.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  module: presentationModule, exports: presentationModule.exports,
  require: () => ({ getPaymentRequestCopy, paymentRequestLocale: (value) => getPaymentRequestCopy(value).locale }),
});
const { canSubmitPaymentRequest, isCollectionBlocked, paymentRequestDate, paymentRequestBlocker, paymentRequestProtectionMessage, paymentRequestFailure } = presentationModule.exports;

const request = { id: 'request-a', status: 'OPEN', version: 1, kind: 'INVOICE', requested_at: '2026-09-08T12:00:00Z', deadline_at: '2026-09-15T12:00:00Z', reason: 'Outstanding subscription', amount_cents: 7913, currency: 'USD', billing_interval: 'MONTH', paid_at: null };
const workspace = { company_id: 1, company_name: 'Example', owner: { name: 'Owner', email: 'owner@example.test' }, request: null, eligible: true, blockers: [], deliveries: [], history: [], quote: { kind: 'INVOICE', amount_cents: 7913, currency: 'USD', billing_interval: 'MONTH', paid_through: null, token: 'quote-a', amount_is_estimate: false } };
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
class ApiClientError extends Error { constructor(message, status) { super(message); this.status = status; } }

// Execute the real component event handlers with deterministic React state and API boundaries.
function componentHarness(file, state, dependencies, globals = {}) {
  const states = [...state];
  const refs = [];
  let stateIndex = 0;
  const React = {
    ...require('react'),
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useRef: (current) => { const ref = { current }; refs.push(ref); return ref; },
    useEffect: () => undefined,
    useCallback: (callback) => callback,
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports, Error, crypto: globalThis.crypto, ...globals,
    require: (name) => name === 'react' ? React : name in dependencies ? dependencies[name] : require(name),
  });
  return { exports: module.exports, states, refs };
}

function find(element, predicate) {
  if (element == null || typeof element !== 'object') return null;
  if (Array.isArray(element)) return element.map((child) => find(child, predicate)).find(Boolean) ?? null;
  if (predicate(element)) return element;
  return find(element.props?.children, predicate);
}

function visibleText(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (Array.isArray(element)) return element.map(visibleText).join(' ');
  if (typeof element !== 'object') return String(element);
  return visibleText(element.props?.children);
}

// Resolve the row's actual action buttons while keeping dropdown content closed.
function renderClosedMenu(element) {
  if (element == null || typeof element !== 'object') return element;
  if (Array.isArray(element)) return element.map(renderClosedMenu);
  if (typeof element.type === 'function') return renderClosedMenu(element.type(element.props));
  return { ...element, props: { ...element.props, children: renderClosedMenu(element.props?.children) } };
}

function customerRowHarness(options = {}) {
  const locale = options.locale || 'en-CA';
  const calls = [];
  const company = { id: 41, name: 'Existing customer', user_type: 'SUPER_ADMIN', platform_status: 'ACTIVE', active_members: 1, ...options.company };
  const harness = componentHarness('PlatformAdmin/Customers/CustomerTableRow.tsx', [], {
    './useCustomerAccountCopy': { useCustomerAccountCopy: () => getCustomerAccountCopy(locale) },
    '../CompanyAccount/companyAccountUtils': { humanize: (value) => value },
    './customerTableUtils': { basicCommercialStatus },
    './CustomerTraceabilityCell': { CustomerTraceabilityCell: 'traceability-cell' },
    '../../components/table/IndiceTableEngine': { IndiceTableActionGroup: 'action-group' },
    '../../components/ui/table': { TableCell: 'td', TableRow: 'tr' },
    '../../components/ui/dropdown-menu': {
      DropdownMenu: 'dropdown-menu', DropdownMenuTrigger: 'dropdown-trigger',
      DropdownMenuContent: () => null, DropdownMenuItem: 'menu-item',
    },
  });
  const props = {
    company, english: true, copy: getCustomerTableCopy(locale), columns: [], columnWidths: {}, compact: false,
    canRequestPayment: true, onRequestPayment: (selected) => calls.push(selected),
    canEditTypes: true, onEditType() {}, onOpenCompany() {}, onOpenUsers() {}, ...options.props,
  };
  const element = renderClosedMenu(harness.exports.CustomerTableRow(props));
  return { element, company, calls, copy: getCustomerAccountCopy(locale), tableCopy: props.copy };
}

const modalHarness = (api, options = {}) => componentHarness('PlatformAdmin/Customers/PaymentRequestModal.tsx', [options.workspace ?? workspace, false, '', '', 'success', 'Approved reason', options.action ?? 'request'], {
  '../../Billing/usePaymentRequestCopy': { usePaymentRequestCopy: () => getPaymentRequestCopy(options.locale || 'en-CA') },
  '../../api/platformAdmin': { platformAdminApi: api },
  '../../lib/apiClient': { ApiClientError },
  '../../components/indice-modal': { IndiceModalFrame: 'modal-frame', IndiceModalValidation: 'modal-validation' },
  '../../Billing/billingFormatters': { formatBillingMoney },
  '../../Billing/paymentRequestPresentation': { canSubmitPaymentRequest, paymentRequestDate, paymentRequestBlocker, paymentRequestProtectionMessage, paymentRequestFailure, paymentDeliveryStatus: (status) => status },
});

test('only an eligible current quote and a reason permit a new request; an open request can only be extended', () => {
  assert.equal(canSubmitPaymentRequest(workspace, 'request', 'reason'), true);
  assert.equal(canSubmitPaymentRequest(workspace, 'request', '  '), false);
  assert.equal(canSubmitPaymentRequest({ ...workspace, quote: null }, 'request', 'reason'), false);
  assert.equal(canSubmitPaymentRequest({ ...workspace, eligible: false }, 'request', 'reason'), false);
  assert.equal(canSubmitPaymentRequest({ ...workspace, request }, 'request', 'reason'), false);
  assert.equal(canSubmitPaymentRequest({ ...workspace, request, quote: null, eligible: false }, 'extend', 'reason'), true);
  assert.equal(canSubmitPaymentRequest({ ...workspace, request: { ...request, status: 'PAID' } }, 'extend', 'reason'), false);
});

test('backend collection restriction persists while either snapshot or session reports it; other billing gates are independent', () => {
  assert.equal(isCollectionBlocked(null, 'PAYMENT_REQUEST_OVERDUE'), true);
  assert.equal(isCollectionBlocked({ collection_blocked: true }), true);
  assert.equal(isCollectionBlocked({ collection_blocked: false }, 'PAYMENT_REQUEST_OVERDUE'), true);
  assert.equal(isCollectionBlocked({ collection_blocked: false }, 'OTHER_HOLD'), false);
  assert.equal(isCollectionBlocked(null, 'trial_expired'), false);
});

test('billing readiness blockers explain paid-through and trial protection without leaking codes', () => {
  assert.match(paymentRequestBlocker('PAID_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW', true), /already paid/);
  assert.match(paymentRequestBlocker('TRIAL_EXTENDS_BEYOND_PAYMENT_WINDOW', false), /prueba actual/);
  assert.doesNotMatch(paymentRequestBlocker('UNKNOWN_INTERNAL_REASON', true), /UNKNOWN_INTERNAL_REASON/);
});

test('admin double submit sends one server quote token and reports saved despite list refresh failure', async () => {
  const pending = deferred();
  const calls = [];
  const harness = modalHarness({ requestPayment: (...args) => { calls.push(args); return pending.promise; } });
  const element = harness.exports.PaymentRequestModal({ company: { id: 1, name: 'Example' }, english: true, onClose() {}, onChanged: async () => { throw new Error('list unavailable'); } });
  const submit = find(element, (node) => node.type === 'form').props.onSubmit;
  submit({ preventDefault() {} });
  submit({ preventDefault() {} });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), [1, { reason: 'Approved reason', expected_quote_token: 'quote-a' }]);
  pending.resolve({ ...workspace, request });
  await tick();
  assert.equal(harness.states[0].request.status, 'OPEN');
  assert.equal(harness.states[2], '');
  assert.match(harness.states[3], /^Saved\./);
  assert.equal(harness.states[4], 'warning');
});

test('extension submits the viewed request identity and version; a concurrent change refreshes details without pretending success', async () => {
  let payload;
  const latest = { ...workspace, request: { ...request, id: 'request-b', version: 1 } };
  const harness = modalHarness({ extendPaymentRequest: async (_id, body) => { payload = body; throw new ApiClientError('Deadline changed; review again.', 409); }, getPaymentRequest: async () => latest }, { workspace: { ...workspace, request }, action: 'extend' });
  const element = harness.exports.PaymentRequestModal({ company: { id: 1, name: 'Example' }, english: true, onClose() {}, onChanged: async () => undefined });
  find(element, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(payload.expected_version, 1);
  assert.equal(payload.expected_request_id, 'request-a');
  assert.equal(harness.states[0].request.id, 'request-b');
  assert.match(harness.states[2], /request changed/);
  assert.equal(harness.states[3], '');
});

function recoveryHarness(snapshot, api, onSnapshot = () => undefined, english = true) {
  let redirected = null;
  let authRefreshes = 0;
  const harness = componentHarness('Billing/components/PaymentRequestRecovery.tsx', [null, '', ''], {
    '../usePaymentRequestCopy': { usePaymentRequestCopy: () => getPaymentRequestCopy(english ? 'en-CA' : 'es-MX') },
    '../../api/auth': { authApi: { me: async () => { authRefreshes++; } } },
    '../../api/paymentRequests': { paymentRequestsApi: api },
    '../../lib/apiClient': { ApiClientError },
    '../billingFormatters': { formatBillingMoney },
    '../paymentRequestPresentation': { paymentRequestDate, paymentRequestProtectionMessage, paymentRequestFailure },
  }, { window: { location: { assign: (url) => { redirected = url; } } } });
  const element = harness.exports.PaymentRequestRecovery({ snapshot, blocked: true, loading: false, error: '', english, onReload: async () => undefined, onSnapshot });
  return { ...harness, element, redirected: () => redirected, authRefreshes: () => authRefreshes };
}

test('nonowners cannot see a Pay action and merely refreshing cannot mark the request paid', async () => {
  let writes = 0;
  const harness = recoveryHarness({ request, is_owner: false, can_pay: false, collection_blocked: true, owner_name: 'Owner' }, { pay: async () => { writes++; }, refresh: async () => { writes++; } });
  const buttons = [];
  find(harness.element, (node) => { if (node.type === 'button') buttons.push(node); return false; });
  assert.equal(buttons.length, 1);
  await buttons[0].props.onClick();
  await tick();
  assert.equal(writes, 0);
  assert.equal(harness.authRefreshes(), 1);
});

test('an indefinite benefit pauses the deadline on the banner and modal in both languages', () => {
  const protectedRequest = { ...request, protected_indefinitely: true };
  for (const english of [true, false]) {
    const snapshot = { request: protectedRequest, is_owner: true, can_pay: false, collection_blocked: false, owner_name: 'Owner' };
    const banner = componentHarness('Billing/components/PaymentRequestBanner.tsx', [], {
      '../usePaymentRequestCopy': { usePaymentRequestCopy: () => getPaymentRequestCopy(english ? 'en-CA' : 'es-MX') },
      '../paymentRequestPresentation': { paymentRequestDate, paymentRequestProtectionMessage, paymentRequestFailure },
    }).exports.PaymentRequestBanner({ snapshot, english, onPay() {} });
    const modal = modalHarness({}, { workspace: { ...workspace, request: protectedRequest }, locale: english ? "en-CA" : "es-MX" })
      .exports.PaymentRequestModal({ company: { id: 1, name: 'Example' }, english, onClose() {}, onChanged: async () => undefined });
    for (const element of [banner, modal]) {
      assert.ok(visibleText(element).includes(paymentRequestProtectionMessage(english)));
      assert.ok(!visibleText(element).includes(paymentRequestDate(request.deadline_at, english)));
    }
    assert.doesNotMatch(visibleText(banner), /Review and pay|Revisar y pagar|must complete payment|debe completar el pago/);
  }
});

test('an owner with an indefinite benefit sees no pay action or instruction to contact themselves', async () => {
  let writes = 0;
  for (const english of [true, false]) {
    const snapshot = { request: { ...request, protected_indefinitely: true }, is_owner: true, can_pay: false, collection_blocked: false, owner_name: 'Owner' };
    const harness = recoveryHarness(snapshot, { pay: async () => { writes++; }, refresh: async () => { writes++; } }, () => undefined, english);
    assert.ok(visibleText(harness.element).includes(paymentRequestProtectionMessage(english)));
    assert.doesNotMatch(visibleText(harness.element), /Continue to secure payment|Continuar al pago seguro|Only the account owner|Sólo el propietario/);
    assert.ok(!visibleText(harness.element).includes(paymentRequestDate(request.deadline_at, english)));
    const buttons = [];
    find(harness.element, (node) => { if (node.type === 'button') buttons.push(node); return false; });
    assert.equal(buttons.length, 1);
    await buttons[0].props.onClick();
    await tick();
    assert.equal(harness.authRefreshes(), 1);
  }
  assert.equal(writes, 0);
});

test('pay retries retain their operation key and never change paid state locally', async () => {
  const keys = [];
  const payloads = [];
  let snapshotChanges = 0;
  const harness = recoveryHarness({ request, is_owner: true, can_pay: true, collection_blocked: true, owner_name: 'Owner' }, { pay: async (key, payload) => { keys.push(key); payloads.push(payload); if (keys.length === 1) throw new Error('network interrupted'); return { url: 'https://invoice.stripe.com/test' }; } }, () => { snapshotChanges++; });
  const pay = find(harness.element, (node) => node.type === 'button');
  pay.props.onClick(); await tick();
  pay.props.onClick(); await tick();
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.equal(payloads[0].expected_request_id, 'request-a');
  assert.equal(payloads[0].expected_version, 1);
  assert.equal(harness.redirected(), 'https://invoice.stripe.com/test');
  assert.equal(snapshotChanges, 0);
});

test('pending verification keeps OPEN; only the refresh response controls payment status', async () => {
  let accepted;
  const snapshot = { request, is_owner: true, can_pay: true, collection_blocked: true, owner_name: 'Owner' };
  const harness = recoveryHarness(snapshot, { refresh: async () => snapshot }, (value) => { accepted = value; });
  const buttons = [];
  find(harness.element, (node) => { if (node.type === 'button') buttons.push(node); return false; });
  buttons[1].props.onClick(); await tick();
  assert.equal(accepted.request.status, 'OPEN');
  assert.match(harness.states[2], /not been confirmed/);
  assert.equal(harness.authRefreshes(), 1);
});

test('root action, existing subscription gate, restricted header and 402 revalidation are integrated', () => {
  const app = read('App.tsx');
  const api = read('lib/apiClient.ts');
  const customers = read('PlatformAdmin/Customers/CustomerTableRow.tsx');
  assert.match(read('PlatformAdmin/PlatformAdminPage.tsx'), /canRequestPayment=\{context\?\.role === "PLATFORM_ROOT"\}/);
  assert.match(customers, /onRequestPayment\(company\)/);
  assert.match(app, /collectionBlocked && currentPage && !isBillingPage[\s\S]*navigate\('\/billing', \{ replace: true \}\)/);
  assert.match(app, /collectionBlocked \? \([\s\S]*Sign out[\s\S]*\) : <Header/);
  assert.match(app, /: isSubscriptionBlocked \? \([\s\S]*<SubscriptionRequiredScreen/);
  assert.match(api, /response\.status === 402 && codeFromPayload\(payload\) === 'PAYMENT_REQUEST_OVERDUE'[\s\S]*refreshAuthSession/);
  assert.doesNotMatch(read('Billing/hooks/usePaymentRequest.ts'), /paymentRequestsApi\.(pay|refresh)\(/);
});

test('the localized payment icon is directly visible with its menu closed and opens the selected company', () => {
  for (const locale of customerAccountLocales) {
    const { element, company, calls, copy, tableCopy } = customerRowHarness({ locale });
    const buttons = [];
    find(element, (node) => { if (node.type === 'button') buttons.push(node); return false; });
    const payments = buttons.filter((button) => button.props['aria-label'] === copy.t('requestPayment'));
    assert.equal(payments.length, 1, `${locale}: payment must be visible without opening the menu`);
    const payment = payments[0];
    assert.equal(payment.props.title, copy.t('requestPayment'));
    assert.equal(payment.props.children.type, require('lucide-react').CreditCard);
    assert.equal(buttons[buttons.indexOf(payment) - 1].props['aria-label'], tableCopy.manageUsers);
    assert.equal(buttons[buttons.indexOf(payment) + 1].props['aria-label'], tableCopy.more);
    assert.equal(calls.length, 0, 'rendering the action must not start a payment request');
    payment.props.onClick();
    assert.equal(calls.length, 1);
    assert.equal(calls[0], company, 'the modal callback receives the exact selected company');
  }
  const paymentOnly = customerRowHarness({ props: { canEditTypes: false } });
  assert.ok(find(paymentOnly.element, (node) => node.type === 'button' && node.props['aria-label'] === paymentOnly.copy.t('requestPayment')));
  assert.equal(find(paymentOnly.element, (node) => node.type === 'dropdown-menu'), null, 'payment alone must not create an empty overflow menu');
});

test('the direct payment action preserves permission, callback, deleted-account and Root-account gates', () => {
  for (const options of [
    { props: { canRequestPayment: false } },
    { props: { canRequestPayment: undefined } },
    { props: { onRequestPayment: undefined } },
    { company: { platform_status: 'DELETED' } },
    { company: { user_type: 'ROOT' } },
  ]) {
    const { element, calls, copy } = customerRowHarness(options);
    assert.equal(find(element, (node) => node.type === 'button' && node.props['aria-label'] === copy.t('requestPayment')), null);
    assert.equal(calls.length, 0);
  }
});

test('a stale GET cannot replace a verified payment or a different company context', async () => {
  for (const changeCompany of [false, true]) {
    const pending = deferred();
    const initial = { companyId: 1, snapshot: null, loading: false, error: '' };
    const harness = componentHarness('Billing/hooks/usePaymentRequest.ts', [initial], {
      '../../api/paymentRequests': { paymentRequestsApi: { snapshot: () => pending.promise } },
    });
    const hook = harness.exports.usePaymentRequest(1, 0);
    const loading = hook.reload();
    if (changeCompany) harness.refs[1].current = 2;
    else hook.acceptSnapshot({ request: { ...request, status: 'PAID' }, can_pay: false, collection_blocked: false, owner_name: 'Owner' });
    pending.resolve({ request, can_pay: true, collection_blocked: true, owner_name: 'Owner' });
    await loading;
    assert.equal(harness.states[0].snapshot?.request.status ?? null, changeCompany ? null : 'PAID');
  }
});
