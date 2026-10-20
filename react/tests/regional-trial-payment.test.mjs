import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { getTrialPaymentCopy } from '../src/app/Billing/translations/trialPayment.ts';
const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const api = read('src/app/api/trialPayment.ts');
const sandbox = { exports: {}, URL, crypto: globalThis.crypto, require: () => ({ apiClient: () => { throw new Error('No network in navigation tests'); } }) };
vm.runInNewContext(ts.transpileModule(api, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);

test('regional billing has complete copy in all eight ERP languages', () => {
  const keys = Object.keys(getTrialPaymentCopy('en-CA'));
  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = getTrialPaymentCopy(locale);
    assert.deepEqual(Object.keys(copy), keys);
    for (const key of keys) assert.ok(copy[key], `${locale}: ${key}`);
  }
});
test('hosted payment redirects reject non-HTTPS, credentials, deceptive hosts and custom ports', () => {
  const validate = sandbox.exports.hostedPaymentUrl;
  assert.equal(validate('https://checkout.stripe.com/c/pay/test'), 'https://checkout.stripe.com/c/pay/test');
  assert.equal(validate('https://billing.stripe.com/p/session', true), 'https://billing.stripe.com/p/session');
  for (const value of ['http://checkout.stripe.com/pay', 'https://checkout.stripe.com.evil.example/pay',
    'https://user@checkout.stripe.com/pay', 'javascript:alert(1)', 'https://checkout.stripe.com:8443/pay', 'https://billing.stripe.com/pay']) {
    assert.throws(() => validate(value));
  }
  assert.throws(() => validate('https://checkout.stripe.com/pay', true));
  const first = sandbox.exports.trialPaymentKey(), second = sandbox.exports.trialPaymentKey();
  assert.match(first, /^[a-f0-9]{64}$/); assert.notEqual(first, second);
});
test('payment mandate is separate, quoted, unchecked and never inferred from callback', () => {
  const page = read('src/app/Billing/TrialPaymentWorkspace.tsx');
  assert.match(page, /useState\(false\)/);
  assert.match(page, /quote\?\.quoteHash/);
  assert.match(page, /if \(!quote \|\| !accepted \|\| !data.paymentReady/);
  assert.match(api, /termsVersion: quote.termsVersion, acceptedAutomaticPayment/);
  assert.match(page, /quote.chargeTiming === 'IMMEDIATE'/);
  assert.doesNotMatch(page + api, /localStorage|sessionStorage|stripe\.confirm|setup=success.*converted/);
  assert.match(page, /data.converted \? copy.paid/);
});
test('old and delegated billing keep their native workspace and errors fail closed', () => {
  const wrapper = read('src/app/Billing/SubscriptionManagementPage.tsx');
  assert.match(wrapper, /context.active/);
  assert.match(wrapper, /setLegacy\(!workspace.cohort\)/);
  assert.match(wrapper, /if \(data\?\.cohort\) return <TrialPaymentWorkspace/);
  assert.match(wrapper, /catch\(\(\) => \{ if \(active\) setError\(true\)/);
});
