import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  clearBrowserLocalStorage,
  expireCachedAuthSession,
  getAuthorizationRevision,
  getCachedAuthSession,
  getCachedCsrfToken,
  setCachedAuthSession,
  setCachedCsrfToken,
  subscribeToAuthorizationChanged,
  subscribeToAuthenticationExpired,
} from '../src/app/api/authSessionStore.ts';
import { canAccessKioskCenter, canManageMultiKiosks } from '../src/app/access/tabScopeCatalog.ts';
import {
  buildPublicPlanSearch,
  parsePublicPlanSearch,
} from '../src/app/Auth/PublicPlans/publicPlansSelection.ts';
import {
  calculatePublicPlanPricing,
  formatPublicPlanMoney,
  publishedTierAmount,
  selectAllCompatibleProductCodes,
  toggleCompatibleProductCode,
} from '../src/app/Auth/PublicPlans/publicPlansPricing.ts';

const sessionWithAccess = ({ role, modules, tabs }) => ({
  user: {
    id: 7,
    name: 'Access User',
    role,
    module_slugs: modules,
    tab_permission_keys: tabs,
    tab_permissions_configured: true,
  },
  company: {
    id: 3,
    name: 'Indice Test',
    commercial_account_type: 'SUPER_ADMIN',
    user_company_id: 11,
    role,
    scope: { type: 'corporate_office', unit_id: null, business_id: null },
    active: true,
  },
  companies: [],
  csrfToken: 'csrf-token',
});

test('an expired authenticated session clears all cached credentials and notifies once', () => {
  let expirationNotifications = 0;
  let localStorageClears = 0;
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        clear: () => {
          localStorageClears += 1;
        },
      },
    },
  });
  const unsubscribe = subscribeToAuthenticationExpired(() => {
    expirationNotifications += 1;
  });

  try {
    setCachedAuthSession({ csrfToken: 'session-csrf' });
    setCachedCsrfToken('fallback-csrf');
    expireCachedAuthSession();
    expireCachedAuthSession();

    assert.equal(getCachedAuthSession(), null);
    assert.equal(getCachedCsrfToken(), null);
    assert.equal(expirationNotifications, 1);
    assert.equal(localStorageClears, 2);
  } finally {
    unsubscribe();
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
      });
    }
  }
});

test('session cleanup preserves the global language preference while removing tenant data', () => {
  const previousWindow = globalThis.window;
  const values = new Map([
    ['frontend-indice-language', 'es-MX'],
    ['tenant-sensitive-cache', 'private'],
  ]);
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        clear: () => values.clear(),
      },
    },
  });

  try {
    clearBrowserLocalStorage();
    assert.equal(values.get('frontend-indice-language'), 'es-MX');
    assert.equal(values.has('tenant-sensitive-cache'), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
  }
});

test('a new collection hold refreshes authorization even when access was already restricted', () => {
  const session = sessionWithAccess({ role: 'superadmin', modules: [], tabs: [] });
  session.company.subscription = { status: 'payment_required', access_allowed: false, lock_reason: 'OTHER_HOLD' };
  setCachedAuthSession(session);
  const baseline = getAuthorizationRevision();
  setCachedAuthSession({ ...session, company: { ...session.company, subscription: { ...session.company.subscription, lock_reason: 'PAYMENT_REQUEST_OVERDUE' } } });
  assert.equal(getAuthorizationRevision(), baseline + 1);
});

test('a role or grant revocation publishes one authorization revision without reacting to reordered grants', () => {
  setCachedAuthSession(sessionWithAccess({
    role: 'superadmin',
    modules: ['crm', 'human_resources'],
    tabs: ['crm.sales', 'human_resources.payroll'],
  }));
  const baselineRevision = getAuthorizationRevision();
  let changeNotifications = 0;
  const unsubscribe = subscribeToAuthorizationChanged(() => {
    changeNotifications += 1;
  });

  setCachedAuthSession(sessionWithAccess({
    role: 'superadmin',
    modules: ['human_resources', 'crm'],
    tabs: ['human_resources.payroll', 'crm.sales'],
  }));
  assert.equal(changeNotifications, 0);

  setCachedAuthSession(sessionWithAccess({
    role: 'user',
    modules: ['crm'],
    tabs: ['crm.sales'],
  }));

  assert.equal(changeNotifications, 1);
  assert.equal(getAuthorizationRevision(), baselineRevision + 1);
  assert.equal(getCachedAuthSession()?.user.role, 'user');
  unsubscribe();
});

test('kiosk inventory follows owner permissions while global composition stays restricted', () => {
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'root',
    modules: [],
    tabs: [],
  })), true);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'superadmin',
    modules: [],
    tabs: [],
  })), true);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'admin',
    modules: ['pos'],
    tabs: ['pos.kiosks'],
  })), true);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'user',
    modules: ['pos'],
    tabs: ['pos.kiosks'],
  })), false);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'user',
    modules: ['expenses'],
    tabs: ['expenses.expenses'],
  })), true);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'user',
    modules: ['petty_cash'],
    tabs: ['petty_cash.cash'],
  })), true);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'manager',
    modules: ['human_resources'],
    tabs: ['human_resources.control'],
  })), true);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'user',
    modules: ['human_resources'],
    tabs: ['human_resources.control'],
  })), false);
  assert.equal(canAccessKioskCenter(sessionWithAccess({
    role: 'admin',
    modules: ['processes'],
    tabs: ['processes.calendar'],
  })), true);
  assert.equal(canManageMultiKiosks(sessionWithAccess({
    role: 'admin',
    modules: ['processes'],
    tabs: ['processes.calendar'],
  })), false);
});

test('payable creation never inserts a local phantom record after a failed request', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url),
    'utf8',
  );
  const payableHandler = source.slice(
    source.indexOf('const handlePayableAccountSubmit'),
    source.indexOf('const handleQuickProviderCreate'),
  );

  assert.doesNotMatch(
    payableHandler,
    /catch\s*\([^)]*\)\s*\{[\s\S]*?setExpenses\s*\(\s*currentExpenses\s*=>\s*\[payableExpense/,
  );
});

test('signup and login share the exact delivered credential contract', async () => {
  const [loginPage, signupPage, signupApi, signupCompletePage, routes] = await Promise.all([
    readFile(new URL('../src/app/Auth/LoginPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/SignupPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/billingSignup.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/SignupCompletePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(loginPage, /navigate\('\/signup'\)/);
  assert.match(routes, /path:\s*'\/signup'/);
  assert.match(routes, /path:\s*'\/signup\/complete'/);
  assert.match(signupPage, /isValidAccountPassword\(form\.password\)/);
  assert.match(signupPage, /form\.confirmEmail/);
  assert.match(signupPage, /startEmailVerification/);
  assert.match(signupPage, /verifyEmailCode/);
  assert.match(signupPage, /emailVerificationReference:\s*form\.emailVerificationReference/);
  assert.match(signupPage, /normalizeSignupPhoneInput/);
  assert.match(signupPage, /validatePhoneForCountry\(form\.phone,\s*form\.countryCode\)/);
  assert.match(signupPage, /phone:\s*normalizedSignupPhoneForRequest\(form\)/);
  const signupPhoneField = signupPage.slice(
    signupPage.indexOf('{copy.phoneLabel}'),
    signupPage.indexOf('{copy.industryLabel}'),
  );
  assert.doesNotMatch(signupPage, /phoneDigitsOnly/);
  assert.match(signupPhoneField, /inputMode="tel"/);
  assert.doesNotMatch(signupPhoneField, /pattern="\[0-9\]\*"/);
  assert.match(signupApi, /confirmEmail:\s*string/);
  assert.match(signupApi, /emailVerificationReference:\s*string/);
  assert.match(signupApi, /startEmailVerification/);
  assert.match(signupApi, /resendEmailVerification/);
  assert.match(signupApi, /verifyEmail/);
  assert.match(signupCompletePage, /companyName:\s*loginPrefill\.companyName/);
  assert.match(signupCompletePage, /email:\s*loginPrefill\.email/);
  assert.match(loginPage, /password,\s*\n\s*\}\)/);
  assert.doesNotMatch(loginPage, /password:\s*password\.trim\(\)/);
});

test('public demos use an isolated credential route without changing secure login', async () => {
  const [demoPage, authApiSource, routes, endpoints] = await Promise.all([
    readFile(new URL('../src/app/Auth/PublicDemoPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/auth.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/endpoints.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(routes, /path:\s*'\/demo'/);
  assert.match(demoPage, /authApi\.getPublicDemos\(\)/);
  assert.match(demoPage, /authApi\.demoLogin/);
  assert.match(demoPage, /Sesión temporal/);
  assert.match(authApiSource, /async demoLogin/);
  assert.match(endpoints, /demoLogin:\s*'\/api\/v1\/auth\/demo-login'/);
  assert.match(endpoints, /login:\s*'\/api\/v1\/auth\/login'/);
});

test('public plan handoff only preserves products and commercial values allowed by the published config', () => {
  const search = buildPublicPlanSearch({
    selectedProductCodes: ['basic_hr', 'basic_receivables'],
    billingInterval: 'YEAR',
    extraSeats: 12,
    countryCode: 'CA',
    locale: 'fr-CA',
  });
  const tamperedParams = new URLSearchParams(search);
  tamperedParams.set('products', 'basic_hr,forged_product,basic_hr,basic_receivables');
  tamperedParams.set('extraSeats', '9999');
  const parsed = parsePublicPlanSearch(
    tamperedParams.toString(),
    ['basic_hr', 'basic_receivables'],
    ['MX', 'CA'],
  );

  assert.deepEqual(parsed, {
    selectedProductCodes: ['basic_hr', 'basic_receivables'],
    billingInterval: 'YEAR',
    extraSeats: 500,
    countryCode: 'CA',
  });
  assert.equal(parsePublicPlanSearch('?source=campaign', ['basic_hr'], ['MX']), null);
});

test('public plan estimates are derived from active catalog prices instead of visual constants', () => {
  const config = {
    currency: 'USD',
    products: [
      { id: 1, code: 'basic_hr', displayName: 'HR', productType: 'BASIC', capabilities: ['shared'], unitAmountCents: null },
      { id: 2, code: 'basic_receivables', displayName: 'Receivables', productType: 'BASIC', capabilities: ['shared'], unitAmountCents: null },
    ],
    prices: [
      { billableCode: 'basic_1', priceType: 'BASE', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 7300, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'basic_2', priceType: 'BASE', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 11700, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'extra_seat', priceType: 'ADDON', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 900, includedQuantity: 1, status: 'ACTIVE' },
    ],
  };

  const pricing = calculatePublicPlanPricing(config, ['basic_hr', 'basic_receivables'], 3, 'MONTH');
  assert.equal(pricing.baseAmountCents, 11700);
  assert.equal(pricing.validSelection, true);
  assert.equal(pricing.extraSeatsAmountCents, 2700);
  assert.equal(pricing.estimatedAmountCents, 14400);
  assert.equal(publishedTierAmount(config, 1, 'MONTH'), 7300);
});

test('published module prices flow exactly into public and signup estimates', () => {
  const config = {
    currency: 'USD',
    products: [
      { id: 1, code: 'module_people', displayName: 'People', productType: 'BASIC', commercialKind: 'MODULE', capabilities: ['human_resources'], unitAmountCents: 10000 },
      { id: 2, code: 'module_process', displayName: 'Processes', productType: 'BASIC', commercialKind: 'MODULE', capabilities: ['processes'], unitAmountCents: 8000 },
      { id: 3, code: 'package_control', displayName: 'Control', productType: 'ADDON', commercialKind: 'PACKAGE', capabilities: ['human_resources', 'processes'], includedProductCodes: ['module_people', 'module_process'], unitAmountCents: 15000 },
    ],
    prices: [
      { billableCode: 'module_people', priceType: 'PRODUCT', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 10000, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'module_people', priceType: 'PRODUCT', billingInterval: 'YEAR', currency: 'USD', unitAmountCents: 96000, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'module_process', priceType: 'PRODUCT', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 8000, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'module_process', priceType: 'PRODUCT', billingInterval: 'YEAR', currency: 'USD', unitAmountCents: 76800, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'package_control', priceType: 'PACKAGE', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 15000, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'package_control', priceType: 'PACKAGE', billingInterval: 'YEAR', currency: 'USD', unitAmountCents: 144000, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'module_additional_unit', priceType: 'PRODUCT', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 4900, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'module_additional_unit', priceType: 'PRODUCT', billingInterval: 'YEAR', currency: 'USD', unitAmountCents: 47040, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'extra_user', priceType: 'SEAT', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 1000, includedQuantity: 1, status: 'ACTIVE' },
      { billableCode: 'extra_user', priceType: 'SEAT', billingInterval: 'YEAR', currency: 'USD', unitAmountCents: 9600, includedQuantity: 1, status: 'ACTIVE' },
    ],
  };

  const modules = calculatePublicPlanPricing(config, ['module_people', 'module_process'], 2, 'MONTH');
  assert.equal(modules.pricingMode, 'DIRECT_PRODUCTS');
  assert.equal(modules.offerCode, 'custom_offer');
  assert.equal(modules.baseAmountCents, 9800);
  assert.equal(modules.extraSeatsAmountCents, 2000);
  assert.equal(modules.estimatedAmountCents, 11800);

  const singleModule = calculatePublicPlanPricing(config, ['module_people'], 0, 'MONTH');
  assert.equal(singleModule.offerCode, 'module_people');
  assert.equal(singleModule.estimatedAmountCents, 10000);

  const changedPriceConfig = {
    ...config,
    prices: config.prices.map((price) => price.billableCode === 'module_people'
      ? { ...price, unitAmountCents: 11500 }
      : price),
  };
  assert.equal(
    calculatePublicPlanPricing(changedPriceConfig, ['module_people', 'module_process'], 2, 'MONTH').estimatedAmountCents,
    11800,
  );

  const packageOnly = calculatePublicPlanPricing(config, ['package_control'], 2, 'MONTH');
  assert.equal(packageOnly.offerCode, 'package_control');
  assert.equal(packageOnly.estimatedAmountCents, 17000);
  assert.equal(
    calculatePublicPlanPricing(config, ['package_control'], 2, 'YEAR').estimatedAmountCents,
    163200,
  );
  assert.deepEqual(
    toggleCompatibleProductCode(config, ['module_people', 'module_process'], 'package_control'),
    ['package_control'],
  );
  assert.deepEqual(selectAllCompatibleProductCodes(config), ['module_people', 'module_process']);
});

test('draft or ready module prices never leak into a public estimate', () => {
  const config = {
    currency: 'USD',
    products: [
      { id: 1, code: 'module_people', displayName: 'People', productType: 'BASIC', commercialKind: 'MODULE', capabilities: ['human_resources'], unitAmountCents: 10000 },
    ],
    prices: [
      { billableCode: 'module_people', priceType: 'PRODUCT', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 10000, includedQuantity: 1, status: 'READY' },
      { billableCode: 'extra_user', priceType: 'SEAT', billingInterval: 'MONTH', currency: 'USD', unitAmountCents: 1000, includedQuantity: 1, status: 'ACTIVE' },
    ],
  };

  const pricing = calculatePublicPlanPricing(config, ['module_people'], 0, 'MONTH');
  assert.equal(pricing.validSelection, true);
  assert.equal(pricing.baseAmountCents, null);
  assert.equal(pricing.estimatedAmountCents, null);
});

test('public money preserves the published cents and distinguishes a missing amount from zero', () => {
  assert.equal(formatPublicPlanMoney(null, 'USD', 'en-US'), '—');
  assert.equal(formatPublicPlanMoney(0, 'USD', 'en-US'), '$0');
  assert.equal(formatPublicPlanMoney(7900, 'USD', 'en-US'), '$79');
  assert.equal(formatPublicPlanMoney(75840, 'USD', 'en-US'), '$758.40');
  assert.equal(formatPublicPlanMoney(191041, 'USD', 'en-US'), '$1,910.41');
});

test('signup summaries retain unpublished totals and public storage fallback follows the five GiB contract', async () => {
  const [signupPage, builder] = await Promise.all([
    readFile(new URL('../src/app/Auth/SignupPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/PublicPlans/PublicPlansBuilder.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(signupPage, /const selectedPrice = selectedCount === 0 \? 0 : estimatedAmount;/);
  assert.match(signupPage, /if \(amountCents == null\) return copy\.pendingCompletePrice;/);
  assert.equal(signupPage.match(/currency\(selectedPrice, form\.billingInterval, copy\)/g)?.length, 2);
  assert.match(signupPage, /formatPublicPlanMoney\(amountCents, 'USD', copy\.locale\)/);
  assert.doesNotMatch(signupPage, /estimatedAmount \?\? 0/);
  assert.match(builder, /config\.includedStorageGiB \?\? 5/);
  assert.match(builder, /config\.storageBlockGiB \?\? 5/);
});

test('public plans route remains a read-only configurator and hands validated choices to signup', async () => {
  const [page, pricing, signupPage, routes, builder, productCard, hero] = await Promise.all([
    readFile(new URL('../src/app/Auth/PublicPlans/PublicPlansPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/PublicPlans/publicPlansPricing.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/SignupPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/PublicPlans/PublicPlansBuilder.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/PublicPlans/PublicPlansProductCard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/Auth/PublicPlans/PublicPlansHero.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(routes, /path:\s*'\/planes'/);
  assert.match(routes, /path:\s*'\/plans'/);
  assert.match(page, /billingSignupApi\.config\(\)/);
  assert.match(page, /navigate\(`\/signup\?\$\{buildPublicPlanSearch/);
  assert.doesNotMatch(page, /billingSignupApi\.checkout/);
  assert.match(signupPage, /parsePublicPlanSearch/);
  assert.match(signupPage, /calculatePublicPlanPricing/);
  assert.match(signupPage, /billingInterval:\s*plansHandoff\?\.billingInterval/);
  assert.match(pricing, /config\.prices\.find/);
  assert.match(hero, /href="#configura-tu-plan"/);
  assert.match(builder, /role="progressbar"/);
  assert.match(builder, /aria-live="polite"/);
  assert.match(builder, /type="number"/);
  assert.match(productCard, /aria-pressed=\{selected\}/);
  assert.match(productCard, /motion-reduce:transition-none/);
  assert.doesNotMatch(`${page}\n${pricing}\n${signupPage}`, /\b(6900|10900|14900|19900)\b/);
});
