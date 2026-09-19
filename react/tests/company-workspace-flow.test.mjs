import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
import { getCustomerAccountCopy, customerAccountLocales } from '../src/app/PlatformAdmin/Customers/customerAccountTranslations.ts';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../src/app');

function hookHost() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  const React = {
    ...require('react'),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (update) => {
        const next = typeof update === 'function' ? update(slots[index]) : update;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo: (create) => create(),
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => !Object.is(value, slots[index].dependencies[i]))) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  return { React, render(component) {
    let result;
    let renders = 0;
    do {
      dirty = false; cursor = 0; effects = [];
      result = component();
      effects.forEach((effect) => effect());
      if (++renders > 20) throw new Error('Render loop');
    } while (dirty);
    return result;
  } };
}

function find(node, type) {
  if (Array.isArray(node)) return node.map((child) => find(child, type)).find(Boolean);
  if (!node || typeof node !== 'object') return null;
  return node.type === type ? node : find(node.props?.children, type);
}

function findWhere(node, predicate) {
  if (Array.isArray(node)) return node.map((child) => findWhere(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return null;
  return predicate(node) ? node : findWhere(node.props?.children, predicate);
}

function drawerHarness(locale = 'es-MX') {
  const host = hookHost();
  const load = createTypeScriptLoader({
    react: host.React,
    './Customers/useCustomerAccountCopy': { useCustomerAccountCopy: () => getCustomerAccountCopy(locale) },
    '../components/frontend-os': { IndiceWorkspaceNavigation: 'navigation' },
    '../components/indice-modal/IndiceModalFrame': { IndiceModalFrame: 'workspace' },
    './BenefitAdjustmentModal': { BenefitAdjustmentModal: 'adjustment' },
    '../components/indice-modal/IndiceConfirmationDialog': { IndiceConfirmationDialog: 'confirmation' },
    './CompanyAccount/CompanyOverviewTab': { CompanyOverviewTab: 'overview' },
    './CompanyAccount/CompanyActivityTab': { CompanyActivityTab: 'users' },
    './CompanyAccount/CompanyModulesTab': { CompanyModulesTab: 'modules' },
    './CompanyAccount/CompanyAccessTab': { CompanyAccessTab: 'access' },
    './CompanyAccount/CompanyBillingTab': { CompanyBillingTab: 'billing' },
    './CompanyAccount/CompanyHistoryTab': { CompanyHistoryTab: 'history' },
  }, { requestAnimationFrame: (callback) => callback() });
  const { CompanyAccountDrawer } = load(resolve(root, 'PlatformAdmin/CompanyAccountDrawer.tsx'));
  const props = {
    company: { id: 41, name: 'Customer A', platform_status: 'ACTIVE', user_type: 'SUPER_ADMIN', products: [], benefits: [], members: [], invitations: [], invoices: [], seat_usage: { active: 1, included: 5, reserved: 0 }, active_benefits: 0 },
    context: { role: 'PLATFORM_ROOT', can_manage_accounts: true, can_manage_benefits: true },
    catalogProducts: [], benefit: { benefit_type: 'PRODUCT', quantity: 1, reason: '', source_type: 'SUPPORT' }, saving: false, feedback: null,
    workspaceApi: { getCompanyInvoices: async () => {}, getCompanyHistory: async () => {} },
    onClose() {}, onBenefit() {}, onSubmitBenefit: async () => {}, onGrantProduct: async () => {}, onPreviewProducts: async () => {}, onUpdateTrialProducts: async () => {}, onRefreshCompany: async () => {}, onRevokeBenefit() {},
  };
  return { props, render: () => host.render(() => CompanyAccountDrawer(props)) };
}

test('customer navigation keeps users, billing, modules and history in one identified workspace', () => {
  const h = drawerHarness();
  let node = h.render();
  assert.equal(node.props.title, 'Customer A');
  const navigation = find(node, 'navigation');
  assert.equal(navigation.props.items.map((item) => item.id).join(','), 'overview,activity,modules,billing,history');
  navigation.props.onValueChange('activity');
  node = h.render();
  assert.equal(find(node, 'users').props.showBilling, false);
  assert.equal(find(node, 'users').props.inlineForms, true);
  assert.equal(find(node, 'users').props.canManageRoles, true);
  find(node, 'navigation').props.onValueChange('billing');
  node = h.render();
  assert.equal(find(node, 'billing').props.company.id, 41);
  find(node, 'navigation').props.onValueChange('history');
  node = h.render();
  assert.equal(find(node, 'history').props.companyId, 41);
});

test('a new adjustment stays open after previous success, retains an error and closes only after its own save', () => {
  const h = drawerHarness();
  h.props.feedback = { type: 'success', message: 'Previous operation' };
  find(h.render(), 'navigation').props.onValueChange('modules');
  find(h.render(), 'modules').props.onGrant('module_hr');
  assert.equal(h.render().type, 'adjustment');
  h.render().props.onSubmit({ preventDefault() {} });
  h.props.saving = true; h.props.feedback = null;
  assert.equal(h.render().type, 'adjustment');
  h.props.saving = false; h.props.feedback = { type: 'error', message: 'Failed' };
  assert.equal(h.render().props.error, 'Failed');
  h.render().props.onSubmit({ preventDefault() {} });
  h.props.saving = true; h.props.feedback = null; h.render();
  h.props.saving = false; h.props.feedback = { type: 'success', message: 'Saved' };
  assert.equal(h.render().type, 'workspace');
});

test('working user operations prevent closing or changing the customer section', () => {
  const h = drawerHarness();
  find(h.render(), 'navigation').props.onValueChange('activity');
  find(h.render(), 'users').props.onBusyChange(true);
  const node = h.render();
  assert.equal(node.props.busy, true);
  find(node, 'navigation').props.onValueChange('billing');
  assert.equal(find(h.render(), 'navigation').props.value, 'activity');
});

test('distributor presentation does not gain platform-only history or invoice APIs', () => {
  const h = drawerHarness();
  h.props.workspaceApi = undefined;
  const node = h.render();
  assert.equal(find(node, 'navigation').props.items.map((item) => item.id).join(','), 'overview,modules,activity,access');
  assert.equal(find(node, 'history'), undefined);
});

test('workspace labels are localized in every supported language', () => {
  for (const locale of customerAccountLocales) {
    const h = drawerHarness(locale);
    const items = find(h.render(), 'navigation').props.items;
    assert.equal(items[3].label, getCustomerAccountCopy(locale).t('workspaceBilling'));
    assert.ok(items.every((item) => item.label && !item.label.startsWith('workspace')));
  }
});

test('pagination ignores stale responses and never displays another company history', async () => {
  const host = hookHost();
  const { useCompanyWorkspacePage } = createTypeScriptLoader({ react: host.React })(resolve(root, 'PlatformAdmin/CompanyAccount/useCompanyWorkspacePage.ts'));
  const requests = [];
  const load = (companyId, page, pageSize) => new Promise((resolve) => requests.push({ companyId, page, pageSize, resolve }));
  let companyId = 41;
  const render = () => host.render(() => useCompanyWorkspacePage(companyId, load));
  let state = render();
  state.setPage(2); render();
  const response = (id, page) => ({ company_id: id, events: [], pagination: { page, page_size: 25, total_items: 90, total_pages: 4 } });
  requests[1].resolve(response(41, 2));
  await new Promise(setImmediate);
  assert.equal(render().data.pagination.page, 2);
  requests[0].resolve(response(41, 1));
  await new Promise(setImmediate);
  assert.equal(render().data.pagination.page, 2);
  companyId = 42;
  assert.equal(render().data, null);
  requests[2].resolve(response(41, 2));
  await new Promise(setImmediate);
  assert.equal(render().data, null);
  assert.equal(render().failed, true);
});

test('company role editing preserves identity and distinguishes a saved role from a failed refresh', async () => {
  const host = hookHost();
  const copy = getCustomerAccountCopy('es-MX');
  const calls = [];
  const load = createTypeScriptLoader({
    react: host.React,
    '../Customers/useCustomerAccountCopy': { useCustomerAccountCopy: () => copy },
    '../Customers/customerAccountErrors': { customerAccountError: (_error, _locale, key) => copy.t(key) },
    '../../api/platformAdmin': { platformAdminApi: {} },
    '../../components/indice-modal/IndiceModalFrame': { IndiceModalFrame: 'modal' },
    '../../components/indice-modal/IndiceConfirmationDialog': { IndiceConfirmationDialog: 'confirmation' },
    './CompanyAccountPrimitives': { WorkspaceSection: 'section', StatusPill: 'status', CompactEmptyState: 'empty' },
  });
  const { CompanyActivityTab } = load(resolve(root, 'PlatformAdmin/CompanyAccount/CompanyActivityTab.tsx'));
  const props = {
    company: { id: 41, members: [{ membership_id: 1, user_id: 10, email: 'member@example.test', role: 'user', status: 'active' }], invitations: [], seat_usage: { active: 1, included: 5 } },
    canManage: true, canManageRoles: true, inlineForms: true, showBilling: false,
    onRefresh: async () => { throw new Error('Offline after save'); }, onManageSeats() {},
    userApi: { updateCompanyUserRole: async (...args) => calls.push(args) },
  };
  const render = () => host.render(() => CompanyActivityTab(props));
  const editButton = (node) => findWhere(node, (item) => item.type === 'button' && item.props.children === copy.t('workspaceChangeRole'));
  editButton(render()).props.onClick();
  find(render(), 'select').props.onChange({ target: { value: 'admin' } });
  find(render(), 'textarea').props.onChange({ target: { value: 'Owner requested change' } });
  find(render(), 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.deepEqual(calls, [[41, 10, 'admin', 'Owner requested change']]);
  assert.ok(findWhere(render(), (node) => node.type === 'span' && node.props.children === copy.t('workspaceSavedRefreshFailed')));
  props.canManageRoles = false;
  assert.ok(!editButton(render()));
  props.canManageRoles = true;
  props.company.members[0].is_owner = true;
  assert.ok(!editButton(render()), 'ownership transfer remains separate from role editing');
});

function findAll(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => findAll(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...findAll(node.props?.children, predicate)];
}

function contentText(node) {
  if (Array.isArray(node)) return node.map(contentText).join(' ');
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? contentText(node.props?.children) : String(node);
}

const productFixture = { id: 10, product_code: 'basic_hr', display_name: 'Recursos Humanos', product_type: 'BASIC', active: true, capabilities: ['human_resources'], version_code: 'v1' };
const grantFixture = { reference: 'grant-one', benefit_type: 'PRODUCT', product_code: 'basic_hr', quantity: 1, source_type: 'COURTESY', status: 'ACTIVE', starts_at: '2020-01-01T00:00:00Z', ends_at: null, reason: 'Approved access' };
const contractFixture = { catalog_product_id: 10, catalog_version_id: 1, catalog_version: 'v1', code: 'basic_hr', name: 'Recursos Humanos', type: 'BASIC', source: 'BENEFIT', capabilities: ['human_resources'] };

function modulesHarness() {
  const host = hookHost();
  const load = createTypeScriptLoader({
    react: host.React,
    '../Customers/useCustomerAccountCopy': { useCustomerAccountCopy: () => getCustomerAccountCopy('es-MX') },
    './CompanyAccountPrimitives': { WorkspaceSection: 'section', StatusPill: 'status', CompactEmptyState: 'empty' },
    './CompanyBenefitDetails': { CompanyBenefitDetails: 'benefit-details' },
  });
  const { CompanyModulesTab } = load(resolve(root, 'PlatformAdmin/CompanyAccount/CompanyModulesTab.tsx'));
  const props = {
    company: { id: 41, products: [contractFixture], benefits: [grantFixture], active_catalog_version_id: 1 },
    products: [productFixture], activeProducts: new Set(['basic_hr']), activeProductBenefits: new Map([['basic_hr', [grantFixture]]]),
    saving: false, canManageProducts: true, canRevokeBenefits: true,
    onGrant: async () => {}, onRevoke() {}, onPreviewProducts: async () => {}, onUpdateTrialProducts: async () => true,
  };
  return { props, render: () => host.render(() => CompanyModulesTab(props)) };
}

test('a product has one row and one courtesy withdrawal even with duplicate grants or contract versions', () => {
  const h = modulesHarness();
  h.props.company.products.push({ ...contractFixture, catalog_product_id: 11, catalog_version: 'v0' });
  h.props.company.benefits.push({ ...grantFixture, reference: 'grant-two', starts_at: '2099-01-01T00:00:00Z' });
  const calls = [];
  h.props.onRevoke = (...args) => calls.push(args);
  const node = h.render();
  assert.equal(findAll(node, item => item.type === 'article').length, 1);
  const actions = findAll(node, item => item.type === 'button');
  assert.equal(actions.length, 1);
  assert.equal(contentText(actions[0]), 'Retirar cortesía');
  actions[0].props.onClick();
  assert.deepEqual(calls, [['grant-one', 'Recursos Humanos', 2]]);
  assert.equal(find(node, 'benefit-details').props.benefits.length, 2);
  assert.ok(!contentText(node).includes('Módulos disponibles'));
});

test('a subscription plus courtesy exposes distinct operations and preserves paid access semantics', () => {
  const h = modulesHarness();
  h.props.company.products = [{ ...contractFixture, source: 'SUBSCRIPTION_ACTIVE' }];
  h.props.company.stripe_subscription_id = 'sub_test';
  const node = h.render();
  const actions = findAll(node, item => item.type === 'button');
  assert.equal(actions.length, 2);
  assert.equal(contentText(actions[0]), 'Retirar de contratación');
  assert.equal(actions[0].props.disabled, true, 'the last subscription product cannot be removed');
  assert.equal(contentText(actions[1]), 'Retirar cortesía');
  assert.equal(actions[1].props.disabled, false);
});

test('read-only module access has no mutations and future grants remain visibly scheduled', () => {
  const h = modulesHarness();
  h.props.company.products = [];
  h.props.company.benefits = [{ ...grantFixture, starts_at: '2099-01-01T00:00:00Z' }];
  h.props.activeProducts = new Set(); h.props.activeProductBenefits = new Map();
  h.props.canManageProducts = false; h.props.canRevokeBenefits = false;
  const node = h.render();
  assert.equal(findAll(node, item => item.type === 'article').length, 1);
  assert.equal(find(node, 'status').props.status, 'scheduled');
  assert.equal(findAll(node, item => item.type === 'button').length, 0);
});

test('modules and capacity occupy different sections with a focused capacity form', () => {
  const h = drawerHarness();
  find(h.render(), 'navigation').props.onValueChange('modules');
  assert.ok(!find(h.render(), 'access'));
  find(h.render(), 'navigation').props.onValueChange('activity');
  assert.equal(find(h.render(), 'access').props.capacityOnly, true);
  find(h.render(), 'users').props.onManageSeats();
  assert.equal(h.render().type, 'adjustment');
  assert.deepEqual(Array.from(h.render().props.allowedTypes), ['SEAT', 'STORAGE']);
});

test('a commercial review survives navigation and canceling a discard prompt', () => {
  const h = drawerHarness();
  let closed = false;
  h.props.onClose = () => { closed = true; };
  find(h.render(), 'navigation').props.onValueChange('modules');
  const change = { productCodes: ['basic_hr'], description: 'Review', preview: { catalog_version: 'v2', estimated_amount_cents: 19900 } };
  find(h.render(), 'modules').props.onPendingChange(change);
  find(h.render(), 'navigation').props.onValueChange('billing');
  find(h.render(), 'navigation').props.onValueChange('modules');
  assert.equal(find(h.render(), 'modules').props.pendingChange, change);
  h.render().props.onOpenChange(false);
  assert.equal(h.render().type, 'confirmation');
  assert.equal(closed, false);
  h.render().props.onCancel();
  assert.equal(find(h.render(), 'modules').props.pendingChange, change);
  h.render().props.onOpenChange(false);
  h.render().props.onConfirm();
  assert.equal(closed, true);
});

test('a pending commercial preview prevents leaving the customer or changing sections', () => {
  const h = drawerHarness();
  let closed = false; h.props.onClose = () => { closed = true; };
  find(h.render(), 'navigation').props.onValueChange('modules');
  find(h.render(), 'modules').props.onBusyChange(true);
  const node = h.render();
  node.props.onOpenChange(false);
  find(node, 'navigation').props.onValueChange('activity');
  assert.equal(closed, false);
  assert.equal(find(h.render(), 'navigation').props.value, 'modules');
});

test('withdrawal descriptions match product-wide scope and distinguish user seats from storage', () => {
  const { benefitRevocationImpact } = createTypeScriptLoader()(resolve(root, 'PlatformAdmin/CompanyAccount/companyBenefitPresentation.ts'));
  const company = { products: [], benefits: [
    grantFixture,
    { ...grantFixture, reference: 'future', starts_at: '2099-01-01T00:00:00Z' },
    { ...grantFixture, reference: 'expired-date', ends_at: '2021-01-01T00:00:00Z' },
    { ...grantFixture, reference: 'revoked', status: 'REVOKED' },
    { ...grantFixture, reference: 'seat', benefit_type: 'SEAT', product_code: null, quantity: 9 },
    { ...grantFixture, reference: 'storage', benefit_type: 'STORAGE', product_code: null, quantity: 2 },
  ] };
  for (const locale of customerAccountLocales) {
    const { t } = getCustomerAccountCopy(locale);
    assert.equal(benefitRevocationImpact(company, 'grant-one', [productFixture], locale).description, t('accessRevokeProductEffect', { count: 3 }));
    assert.equal(benefitRevocationImpact(company, 'seat', [], locale).description, t('accessRevokeSeatsEffect', { count: 9 }));
    assert.equal(benefitRevocationImpact(company, 'storage', [], locale).label, t('accessStorageBlocks', { count: 2 }));
    assert.equal(benefitRevocationImpact(company, 'missing', [], locale), undefined);
  }
});

test('the focused courtesy form retains edits, validates the expiry and disables inputs while saving', () => {
  const host = hookHost();
  const copy = getCustomerAccountCopy('es-MX');
  const load = createTypeScriptLoader({
    react: host.React,
    './Customers/useCustomerAccountCopy': { useCustomerAccountCopy: () => copy },
    '../components/indice-modal': { IndiceModalFrame: 'form-modal', IndiceModalValidation: 'validation' },
    '../components/indice-modal/IndiceConfirmationDialog': { IndiceConfirmationDialog: 'confirmation' },
  });
  const { BenefitAdjustmentModal } = load(resolve(root, 'PlatformAdmin/BenefitAdjustmentModal.tsx'));
  let submitted = 0; let closed = false;
  const props = {
    benefit: { benefit_type: 'PRODUCT', product_code: 'basic_hr', quantity: 1, reason: '', source_type: 'COURTESY', ends_at: '2020-01-01T00:00' },
    products: [productFixture], allowedTypes: ['PRODUCT'], companyName: 'Customer A', saving: false,
    onBenefit: value => { props.benefit = value; }, onClose: () => { closed = true; }, onSubmit: event => { event.preventDefault(); submitted++; },
  };
  const render = () => host.render(() => BenefitAdjustmentModal(props));
  let node = render();
  assert.equal(node.props.title, copy.t('accessGrant'));
  assert.ok(!findWhere(node, item => item.type === 'option' && item.props.value === 'SEAT'));
  find(node, 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(submitted, 0);
  assert.ok(find(render(), 'validation').props.messages.includes(copy.t('accessInvalidEnd')));
  props.benefit = { ...props.benefit, reason: 'Customer approved', ends_at: '2099-01-01T00:00' };
  render().props.onOpenChange(false);
  assert.equal(render().type, 'confirmation');
  render().props.onCancel();
  assert.equal(props.benefit.reason, 'Customer approved');
  find(render(), 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(submitted, 1);
  props.saving = true;
  node = render();
  assert.equal(find(node, 'fieldset').props.disabled, true);
  node.props.onOpenChange(false);
  assert.equal(closed, false);
});

function accountHandler(name, scope) {
  const ts = require('typescript');
  const source = require('node:fs').readFileSync(resolve(root, 'PlatformAdmin/PlatformAdminPage.tsx'), 'utf8');
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) initializer = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(initializer, `Actual ${name} handler must exist`);
  const js = ts.transpileModule(`const handler = ${initializer};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), `${js}; return handler;`)(...Object.values(scope));
}

test('a confirmed grant or commercial change survives refresh failure without reporting a failed save', async () => {
  for (const name of ['submitBenefit', 'updateTrialProducts', 'confirmRevocation']) {
    const events = [];
    const scope = {
      selected: { id: 41 }, saving: false,
      benefit: { benefit_type: 'SEAT', quantity: 3, reason: 'Approved support', source_type: 'SUPPORT' }, initialBenefit: {},
      revocation: { kind: 'benefit', reference: 'seat-reference', label: '3 seats' }, revocationReason: 'End of support',
      currentLanguage: { code: 'es-MX' }, locale: 'es-MX', getCustomerAccountCopy, t: value => value,
      setSaving: value => events.push(['busy', value]), setError: value => events.push(['error', value]),
      setAccountFeedback: value => events.push(['feedback', value]), setBenefit() {}, setRevocation: value => events.push(['revocation', value]), setRevocationError() {}, setRevocationReason() {},
      refreshOverviewAndCompany: async () => { throw new Error('Offline after confirmed mutation'); },
      platformAdminApi: {
        grantBenefit: async (id, payload) => { events.push(['grant', id, payload.quantity]); return {}; },
        updateTrialProducts: async (id, codes, version) => { events.push(['contract', id, codes, version]); return { product_codes: codes }; },
        revokeBenefit: async (id, reference) => { events.push(['revoke', id, reference]); return {}; },
      },
    };
    const handler = accountHandler(name, scope);
    if (name === 'submitBenefit') await handler({ preventDefault() {} });
    else if (name === 'updateTrialProducts') assert.equal(await handler(['basic_hr'], 'v2'), true);
    else { await handler(); assert.ok(events.some(event => event[0] === 'revocation' && event[1] === null)); }
    const feedback = events.filter(event => event[0] === 'feedback').at(-1)[1];
    assert.equal(feedback.type, 'success');
    assert.equal(feedback.message, getCustomerAccountCopy('es-MX').t('workspaceSavedRefreshFailed'));
    assert.equal(events.filter(event => ['grant', 'contract', 'revoke'].includes(event[0])).length, 1);
  }
});
