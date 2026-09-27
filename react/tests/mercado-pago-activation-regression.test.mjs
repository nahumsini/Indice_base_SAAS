import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const drawer = read('src/app/PlatformAdmin/CompanyAccountDrawer.tsx');
const panel = read('src/app/PlatformAdmin/CompanyAccount/MercadoPagoActivationPanel.tsx');
const api = read('src/app/api/platformAdmin.ts');
const copy = read('src/app/PlatformAdmin/CompanyAccount/mercadoPagoActivationCopy.ts');

test('Mercado Pago live activation remains a Platform Root company control', () => {
  assert.match(drawer, /context\?\.role === "PLATFORM_ROOT"[\s\S]*<MercadoPagoActivationPanel companyId=\{company\.id\}/);
  assert.match(api, /getMercadoPagoActivation:[\s\S]*companyPath\(companyId\)[\s\S]*mercado-pago\/activation/);
  assert.match(api, /updateMercadoPagoActivation:[\s\S]*expectedVersion[\s\S]*method: 'PUT'[\s\S]*JSON\.stringify\(\{ state, reason, expectedVersion \}\)/);
});

test('activation exposes every rollout state and trusts the effective server gate', () => {
  for (const state of ['DISABLED', 'PILOT', 'ACTIVE', 'SUSPENDED']) {
    assert.ok(panel.includes(`'${state}'`), `Missing activation state ${state}`);
  }
  assert.match(panel, /status\.liveChargeAllowed \? copy\.allowed : copy\.blocked/);
  assert.match(panel, /error instanceof ApiClientError && error\.status === 404/);
  assert.match(panel, /reason\.trim\(\)\.length < 8/);
  assert.match(panel, /disabled=\{busy \|\| !dirty \|\| reason\.trim\(\)\.length < 8\}/);
  assert.match(panel, /state, reason\.trim\(\), status\.version/);
  assert.match(panel, /error\.status === 409/);
});

test('activation guidance preserves recovery and refunds during suspension in every locale', () => {
  assert.equal((copy.match(/description:/g) ?? []).length, 6);
  for (const phrase of ['Recovery, cancellation, webhooks, and refunds', 'recuperación, cancelación, webhooks y reembolsos']) {
    assert.ok(copy.includes(phrase), `Missing activation safety guidance: ${phrase}`);
  }
  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.ok(copy.includes(`'${locale}'`), `Missing activation locale ${locale}`);
  }
});
