import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const { getStripeSetupStatus } = createTypeScriptLoader()(resolve(import.meta.dirname, '../src/app/PlatformAdmin/BillingWorkspace/stripeSetupStatus.ts'));
import { canUseLocalStripeDemo } from '../src/app/PlatformAdmin/BillingWorkspace/localStripeDemo.ts';

test('missing server status remains unknown instead of implying TEST or a connection', () => {
  assert.deepEqual({ ...getStripeSetupStatus(undefined) }, {
    mode: null, integration: 'UNKNOWN', liveSynchronization: 'UNKNOWN',
  });
});

test('local Stripe demo is available to Root on loopback development servers', () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1', '[::1]']) {
    assert.equal(canUseLocalStripeDemo(true, hostname, 'PLATFORM_ROOT'), true);
  }
});

test('production builds and public hosts never expose the local Stripe demo', () => {
  assert.equal(canUseLocalStripeDemo(false, 'localhost', 'PLATFORM_ROOT'), false);
  for (const hostname of ['app.indiceapp.com', 'localhost.example.com', '192.168.1.20']) {
    assert.equal(canUseLocalStripeDemo(true, hostname, 'PLATFORM_ROOT'), false);
  }
});

test('local demo controls do not grant ordinary users platform administration', () => {
  for (const role of [undefined, null, 'ADMIN', 'SUPPORT', 'SUPER_ADMIN', '']) {
    assert.equal(canUseLocalStripeDemo(true, 'localhost', role), false);
  }
});

test('enabled Stripe settings always remain unverified', () => {
  for (const mode of ['TEST', 'LIVE']) {
    assert.equal(getStripeSetupStatus({ enabled: true, mode, catalog_live_sync_enabled: true }).integration, 'ENABLED_UNVERIFIED');
  }
});

test('LIVE synchronization requires the correct mode and both server gates', () => {
  const configured = { enabled: true, mode: 'LIVE', catalog_live_sync_enabled: true };
  assert.equal(getStripeSetupStatus(configured).liveSynchronization, 'ENABLED');
  assert.equal(getStripeSetupStatus({ ...configured, mode: 'TEST' }).liveSynchronization, 'LOCKED_IN_TEST');
  assert.equal(getStripeSetupStatus({ ...configured, enabled: false }).liveSynchronization, 'LOCKED_INTEGRATION');
  assert.equal(getStripeSetupStatus({ ...configured, catalog_live_sync_enabled: false }).liveSynchronization, 'LOCKED_CONFIGURATION');
});

test('disabled integration is reported even when LIVE maintenance is permitted', () => {
  assert.deepEqual({ ...getStripeSetupStatus({ enabled: false, mode: 'LIVE', catalog_live_sync_enabled: true }) }, {
    mode: 'LIVE', integration: 'DISABLED', liveSynchronization: 'LOCKED_INTEGRATION',
  });
});

test('partial or unfamiliar server responses cannot enable LIVE synchronization', () => {
  assert.equal(getStripeSetupStatus({ enabled: true, mode: 'LIVE' }).liveSynchronization, 'UNKNOWN');
  assert.equal(getStripeSetupStatus({ enabled: true, mode: 'PREVIEW', catalog_live_sync_enabled: true }).liveSynchronization, 'UNKNOWN');
  assert.equal(getStripeSetupStatus({ mode: 'LIVE', catalog_live_sync_enabled: true }).integration, 'UNKNOWN');
});
