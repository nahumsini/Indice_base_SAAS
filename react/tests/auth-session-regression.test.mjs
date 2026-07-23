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
