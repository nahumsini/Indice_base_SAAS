import assert from 'node:assert/strict';
import test from 'node:test';
import { attentionFor, filterCompanies, mergeCompanies, registeredCountry, trialDeadline } from '../src/app/PlatformAdmin/CommercialOperations/model.ts';
import { commercialCopy } from '../src/app/PlatformAdmin/CommercialOperations/copy.ts';
const now = Date.parse('2026-10-05T12:00:00Z');
const account = (id, extra = {}) => ({ id, name: `Customer ${id}`, user_type: 'SUPER_ADMIN', platform_status: 'ACTIVE', country_code: 'CA', lifecycle_state: 'ACTIVE', ...extra });
const filters = (extra = {}) => ({ view: 'pending', attention: 'all', distributor: 'all', deadline: 'all', ...extra });

test('country grouping uses recorded country, never currency or language', () => {
  const accounts = [account(1, { country_code: ' mx ', currency: 'CAD' }), account(2, { currency: 'MXN' }), account(3, { country_code: null, currency: 'CAD' })];
  assert.deepEqual(filterCompanies(accounts, filters({ view: 'MX' }), now).map(c => c.id), [1]);
  assert.deepEqual(filterCompanies(accounts, filters({ view: 'CA' }), now).map(c => c.id), [2]);
  assert.equal(registeredCountry(accounts[2]), null);
  assert.deepEqual(filterCompanies(accounts, filters(), now).map(c => c.id), [3]);
});
test('current trial dates have precise overdue and seven-day boundaries', () => {
  const accounts = [-1, 0, 7, 8].map((days, id) => account(id, { lifecycle_state: 'TRIAL', trial_ends_at: new Date(now + days * 86400000).toISOString() }));
  assert.deepEqual(filterCompanies(accounts, filters({ deadline: 'overdue' }), now).map(c => c.id), [0]);
  assert.deepEqual(filterCompanies(accounts, filters({ deadline: 'week' }), now).map(c => c.id), [1, 2]);
});
test('historical, invalid and permanent trial dates do not invent pending actions', () => {
  for (const extra of [{}, { lifecycle_state: 'TRIAL', trial_permanent: true }, { lifecycle_state: 'TRIAL', trial_ends_at: 'invalid' }]) {
    const c = account(1, { trial_ends_at: '2020-01-01', ...extra });
    assert.equal(trialDeadline(c), null);
    assert.equal(attentionFor(c, now), 'review');
  }
  assert.equal(trialDeadline(account(1, { lifecycle_state: null, billing_status: 'trialing', trial_ends_at: '2026-10-06T12:00:00Z' })), now + 86400000);
});
test('billing and access issues take priority without changing account state', () => {
  const c = Object.freeze(account(1, { lifecycle_state: 'READ_ONLY', country_code: null }));
  assert.equal(attentionFor(c, now), 'billing');
  assert.equal(c.lifecycle_state, 'READ_ONLY');
  assert.equal(attentionFor(account(2, { billing_status: 'past_due' }), now), 'billing');
});
test('pending excludes deleted accounts and operators; distributor is an independent filter', () => {
  const accounts = [account(1, { country_code: null }), account(2, { country_code: null, distributor_company_id: 30 }), account(3, { platform_status: 'DELETED', country_code: null }), account(4, { user_type: 'ROOT', country_code: null }), account(5, { user_type: 'DISTRIBUTOR', country_code: null })];
  assert.deepEqual(filterCompanies(accounts, filters({ distributor: 'assigned' }), now).map(c => c.id), [2]);
  assert.deepEqual(filterCompanies(accounts, filters({ distributor: 'unassigned' }), now).map(c => c.id), [1]);
});
test('overlapping pages update records without duplicates', () => {
  const before = [account(1), account(2)];
  const merged = mergeCompanies(before, [account(2, { name: 'Updated' }), account(3)]);
  assert.deepEqual(merged.map(c => c.id), [1, 2, 3]);
  assert.equal(merged[1].name, 'Updated');
  assert.equal(before[1].name, 'Customer 2');
});
test('every supported locale has complete localized labels', () => {
  for (const locale of ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = commercialCopy(locale);
    assert.ok(Object.values(copy).every(v => typeof v === 'string' && v.length > 0));
    assert.equal(Object.keys(copy).length, Object.keys(commercialCopy('es-MX')).length);
  }
});
