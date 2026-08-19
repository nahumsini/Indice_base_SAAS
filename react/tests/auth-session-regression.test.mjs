import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  expireCachedAuthSession,
  getCachedAuthSession,
  getCachedCsrfToken,
  setCachedAuthSession,
  setCachedCsrfToken,
  subscribeToAuthenticationExpired,
} from '../src/app/api/authSessionStore.ts';

test('an expired authenticated session clears all cached credentials and notifies once', () => {
  let expirationNotifications = 0;
  const unsubscribe = subscribeToAuthenticationExpired(() => {
    expirationNotifications += 1;
  });

  setCachedAuthSession({ csrfToken: 'session-csrf' });
  setCachedCsrfToken('fallback-csrf');
  expireCachedAuthSession();
  expireCachedAuthSession();

  assert.equal(getCachedAuthSession(), null);
  assert.equal(getCachedCsrfToken(), null);
  assert.equal(expirationNotifications, 1);
  unsubscribe();
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
