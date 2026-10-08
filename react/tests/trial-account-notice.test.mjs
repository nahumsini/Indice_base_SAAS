import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { trialAccountPresentation } from '../src/app/Billing/trialAccountPresentation.ts';
import { getTrialAccountCopy } from '../src/app/Billing/translations/trialAccount.ts';

const deadline = '2026-10-23T22:00:00Z';
const end = Date.parse(deadline);
const day = 86_400_000;
const workspace = { cohort: true, converted: false, paymentReady: true, countryCode: 'CA',
  trialEndsAt: deadline, setupStatus: 'NONE', checkoutUrl: null, offers: [] };

test('original absolute deadline countdown handles creation, last day and exact cutoff', () => {
  assert.equal(trialAccountPresentation(workspace, end - 15 * day).days, 15);
  assert.equal(trialAccountPresentation(workspace, end - 14 * day - 1).days, 15);
  assert.equal(trialAccountPresentation(workspace, end - day).days, 1);
  assert.equal(trialAccountPresentation(workspace, end - day).lastDay, false);
  assert.equal(trialAccountPresentation(workspace, end - day + 1).lastDay, true);
  assert.equal(trialAccountPresentation(workspace, end - 1).expired, false);
  for (const now of [end, end + 1, end + 30 * day]) {
    const view = trialAccountPresentation(workspace, now);
    assert.equal(view.expired, true); assert.equal(view.days, 0); assert.equal(view.deadline, end);
  }
});

test('native trial access denial wins over a slow browser clock without mutating access', () => {
  const view = trialAccountPresentation(workspace, end - 5 * day, true);
  assert.equal(view.expired, true); assert.equal(view.days, 0);
  assert.equal(workspace.trialEndsAt, deadline); assert.equal(workspace.converted, false);
  assert.equal('access_allowed' in view, false);
});

test('legacy, converted, malformed or ambiguous dates never produce a new-cohort prompt', () => {
  assert.equal(trialAccountPresentation(null, end), null);
  assert.equal(trialAccountPresentation({ ...workspace, cohort: false }, end), null);
  assert.equal(trialAccountPresentation({ ...workspace, converted: true }, end), null);
  for (const value of [null, '', 'invalid', '2026-10-23T22:00:00', 'NaNZ']) {
    assert.equal(trialAccountPresentation({ ...workspace, trialEndsAt: value }, end), null);
  }
  assert.equal(trialAccountPresentation(workspace, NaN), null);
});

test('saved card, pending setup and unknown statuses are review-only, never paid access', () => {
  for (const status of ['METHOD_REGISTERED', 'SETUP_PENDING', 'UNKNOWN']) {
    const view = trialAccountPresentation({ ...workspace, setupStatus: status }, end - day);
    assert.equal(view.canChoosePlan, false); assert.equal(view.expired, false);
  }
  const registered = trialAccountPresentation({ ...workspace, setupStatus: 'METHOD_REGISTERED' }, end);
  assert.equal(registered.registered, true); assert.equal(registered.expired, true);
  assert.equal(trialAccountPresentation({ ...workspace, paymentReady: false }, end).canChoosePlan, false);
});

test('account notice covers eight locales, including unavailable expired recovery', () => {
  const keys = Object.keys(getTrialAccountCopy('en-CA'));
  for (const locale of ['es-MX', 'es-CO', 'en-CA', 'en-US', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = getTrialAccountCopy(locale);
    assert.deepEqual(Object.keys(copy), keys);
    assert.ok(Object.values(copy).every(value => typeof value === 'string' && value.trim()));
    assert.match(copy.days, /\{days\}/);
  }
  assert.notEqual(getTrialAccountCopy('fr-CA').active, getTrialAccountCopy('en-CA').active);
});

test('notice is Billing-owned, context-scoped, read-only, and outside dashboard operational sections', () => {
  const read = path => readFileSync(new URL(`../src/app/${path}`, import.meta.url), 'utf8');
  const notice = read('Billing/components/TrialAccountNotice.tsx');
  const app = read('App.tsx');
  const dashboard = read('Dashboard/MainDashboard.tsx');
  assert.match(notice, /trialPaymentApi\.workspace\(\)/);
  assert.match(notice, /state\?\.scope === scope/);
  assert.match(notice, /request === sequence/);
  assert.match(notice, /active = false/);
  assert.match(notice, /authorizationRevision/);
  assert.match(notice, /setState\(\{ scope, data: null \}\)/);
  assert.match(notice, /navigate\('\/billing'\)/);
  assert.doesNotMatch(notice, /trialPaymentApi\.activate|localStorage|sessionStorage|fetch\(|POST|checkoutUrl/);
  assert.match(notice, /access_allowed === false[\s\S]*lock_reason === 'trial_expired'/);
  assert.match(app, /accountNotice=\{!isEmbeddedWorkspacePane \? <TrialAccountNotice/);
  assert.match(app, /isSubscriptionBlocked \? \([\s\S]*<TrialAccountNotice[\s\S]*fallback=\{<SubscriptionRequiredScreen/);
  assert.match(app, /const showDualWorkspace[\s\S]*&& !isSubscriptionBlocked/);
  assert.match(dashboard, /\{accountNotice\}[\s\S]*<LearningJourneyProgress/);
  assert.doesNotMatch(dashboard, /trialPaymentApi|trialAccountPresentation/);
});
