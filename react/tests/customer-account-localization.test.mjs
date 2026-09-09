import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, relative } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { customerAccountLocales, getCustomerAccountCopy } from '../src/app/PlatformAdmin/Customers/customerAccountTranslations.ts';
import { getPaymentRequestCopy } from '../src/app/Billing/paymentRequestTranslations.ts';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../src/app');
const catalogue = { getCustomerAccountCopy };
function load(file, locale = 'en-CA', initial = [], api = {}) {
  let cursor = 0;
  const states = [...initial];
  const React = { ...require('react'), useState(value) { const i = cursor++; if (!(i in states)) states[i] = value; return [states[i], (v) => { states[i] = v; }]; }, useEffect() {}, useMemo: (f) => f(), useRef: (current) => ({ current }) };
  const module = { exports: {} };
  const dependencies = (name) => {
    if (name === 'react') return React;
    if (name.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: locale } }) };
    if (name.startsWith('.') && !name.includes('companyAccountUtils') && !name.includes('customerAccount') && !name.includes('useCustomerAccount') && !name.includes('/CompanyActivityTab') && !name.includes('/CompanyAccountPrimitives') && !name.includes('/api/') && !name.includes('/indice-modal')) {
      const candidate = resolve(root, dirname(file), name + '.ts');
      if (existsSync(candidate)) return load(relative(root, candidate), locale).exports;
    }
    if (name.endsWith('/useCustomerAccountCopy')) return { useCustomerAccountCopy: () => getCustomerAccountCopy(locale) };
    if (name.endsWith('/customerAccountTranslations')) return catalogue;
    if (name.endsWith('/customerAccountErrors')) return { customerAccountError: (_error, _locale, key) => getCustomerAccountCopy(locale).t(key) };
    if (name.endsWith('/companyAccountUtils')) return load('PlatformAdmin/CompanyAccount/companyAccountUtils.ts', locale).exports;
    if (name.endsWith('/api/platformAdmin')) return { platformAdminApi: api };
    if (name.endsWith('/CompanyActivityTab')) return { CompanyActivityTab: 'activity-tab' };
    if (name.endsWith('/CompanyAccountPrimitives')) return { WorkspaceSection: 'section', StatusPill: 'status', CompactEmptyState: 'empty' };
    if (name.includes('/indice-modal')) return { IndiceModalFrame: 'modal', IndiceConfirmationDialog: 'confirmation' };
    return require(name);
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, require: dependencies, Intl, Error, window: {} });
  return { exports: module.exports, states };
}
function find(element, predicate) {
  if (element == null || typeof element !== 'object') return null;
  if (Array.isArray(element)) return element.map((child) => find(child, predicate)).find(Boolean) ?? null;
  return predicate(element) ? element : find(element.props?.children, predicate);
}
function text(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (Array.isArray(element)) return element.map(text).join(' ');
  return typeof element === 'object' ? text(element.props?.children) : String(element);
}
const company = { id: 41, name: 'Órbita 客户 Ltd.', owner_email: 'owner@example.test', members: [{ membership_id: 1, user_id: 1, name: 'Owner Name', email: 'owner@example.test', role: 'owner', status: 'active', is_owner: true }], invitations: [], invoices: [], active_members: 1, included_seats: 5, seat_usage: { included: 5, active: 1, available: 4, reserved: 0, purchased_extra: 0, courtesy_extra: 0, enforced: true, limit: 5 } };

test('all eight locales render customer-user titles and actions from current language, preserving customer names', () => {
  const titles = { 'en-CA': 'Account users', 'en-US': 'Account users', 'es-MX': 'Usuarios de la cuenta', 'es-CO': 'Usuarios de la cuenta', 'fr-CA': 'Utilisateurs du compte', 'pt-BR': 'Usuários da conta', 'ko-CA': '계정 사용자', 'zh-CA': '账户用户' };
  for (const locale of customerAccountLocales) {
    const { t } = getCustomerAccountCopy(locale);
    const modal = load('PlatformAdmin/Customers/CustomerUsersModal.tsx', locale).exports.CustomerUsersModal({ company, canManage: true, onClose() {}, onRefresh: async () => {}, onManageSeats() {} });
    assert.equal(modal.props.eyebrow, titles[locale]);
    assert.equal(modal.props.title, company.name);
    assert.ok(modal.props.description.includes(company.owner_email));
    assert.ok(text(modal).includes(t('usersManagement')));
    assert.ok(!modal.props.footerSummary.includes('(s)'));
    const activity = load('PlatformAdmin/CompanyAccount/CompanyActivityTab.tsx', locale).exports.CompanyActivityTab({ company, canManage: true, onRefresh: async () => {}, onManageSeats() {} });
    assert.ok(text(activity).includes(t('inviteUser')));
    assert.ok(text(activity).includes(t('owner')));
    assert.ok(text(activity).includes('Owner Name'));
  }
});

test('localized invitation form submits canonical role and unchanged user-entered data', async () => {
  for (const locale of ['fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const calls = [];
    const api = { inviteCompanyUser: async (...args) => { calls.push(args); return { invite_link: '', email_sent: true }; } };
    const initial = ['active', true, 'Alex User', 'alex@example.test', 'user', 'Approved by owner', '', null, null, '', '', '', null, '', false];
    const harness = load('PlatformAdmin/CompanyAccount/CompanyActivityTab.tsx', locale, initial, api);
    const activity = harness.exports.CompanyActivityTab({ company, canManage: true, onRefresh: async () => {}, onManageSeats() {} });
    find(activity, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await new Promise(setImmediate);
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[41, { name: 'Alex User', email: 'alex@example.test', role: 'user', reason: 'Approved by owner' }]]);
    assert.equal(harness.states[12].message, getCustomerAccountCopy(locale).t('inviteSent'));
  }
});

test('customer table copy, counts and contract money use the selected region with English fallback', () => {
  for (const locale of customerAccountLocales) {
    const table = load('PlatformAdmin/Customers/customerTableCopy.ts', locale).exports.getCustomerTableCopy(locale);
    assert.equal(table.users, getCustomerAccountCopy(locale).t('users'));
    assert.ok(!table.daysRemaining(1).includes('(s)'));
    assert.ok(!table.daysRemaining(12).includes('{count}'));
    const utilities = load('PlatformAdmin/CompanyAccount/companyAccountUtils.ts', locale).exports;
    assert.equal(utilities.formatMoney(7913, 'USD', locale), new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(79.13));
    assert.equal(utilities.humanize('active', locale), getCustomerAccountCopy(locale).t('active'));
    assert.equal(utilities.humanize('Custom Name', locale), 'Custom Name');
  }
  assert.equal(getCustomerAccountCopy('unknown').locale, 'en-CA');
  assert.equal(getCustomerAccountCopy('unknown').t('accountUsers'), 'Account users');
});

test('payment-request operational and protected-access messages cover all locales without internal codes', () => {
  for (const locale of customerAccountLocales) {
    const { t } = getPaymentRequestCopy(locale);
    for (const key of ['protection', 'requestPayment', 'STRIPE_NOT_CONFIGURED', 'BILLING_OWNER_REQUIRED', 'windowHelp']) {
      assert.ok(t(key).length > 2);
      assert.notEqual(t(key), key);
      if (!locale.startsWith('en')) assert.notEqual(t(key), getPaymentRequestCopy('en-CA').t(key));
    }
    assert.ok(t('ownerMustPay', { name: 'Órbita Owner' }).includes('Órbita Owner'));
  }
});


test('account creation, quick scenarios and module work orders have complete regional copy', () => {
  for (const locale of customerAccountLocales) {
    const creation = load('PlatformAdmin/AccountCreation/translations/index.ts', locale).exports.getAccountCreationCopy(locale);
    const quick = load('PlatformAdmin/QuickTestAccount/translations/index.ts', locale).exports.getQuickTestAccountCopy(locale);
    const workOrders = load('PlatformAdmin/ModuleWorkOrders/translations/index.ts', locale).exports.useModuleWorkOrderCopy();
    assert.ok(creation.modal.title.length > 2);
    assert.ok(quick.scenario.options.commerce.description.length > 2);
    assert.ok(workOrders.loadError.length > 2);
    assert.doesNotMatch(creation.progress.step(1, 3, 1), /module\(s\)|módulo\(s\)/);
    assert.ok(creation.success.created(41).includes('41'));
    if (['fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'].includes(locale)) {
      const english = load('PlatformAdmin/AccountCreation/translations/index.ts', 'en-CA').exports.getAccountCreationCopy('en-CA');
      assert.notEqual(creation.modal.title, english.modal.title);
      assert.notEqual(creation.success.securityShare, english.success.securityShare);
      assert.notEqual(creation.errors.modulesNotApplied, english.errors.modulesNotApplied);
      assert.notEqual(quick.modal.title, 'Create a test account');
      assert.notEqual(workOrders.createError, 'The module request could not be created. Try again.');
    }
  }
});
