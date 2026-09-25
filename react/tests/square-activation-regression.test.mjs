import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const drawer = read('src/app/PlatformAdmin/CompanyAccountDrawer.tsx');
const panel = read('src/app/PlatformAdmin/CompanyAccount/SquareActivationPanel.tsx');
const api = read('src/app/api/platformAdmin.ts');
const copy = read('src/app/PlatformAdmin/CompanyAccount/squareActivationCopy.ts');

test('Square live activation is versioned and restricted to the Platform Root workspace', () => {
  assert.match(drawer, /context\?\.role === "PLATFORM_ROOT"[\s\S]*<SquareActivationPanel companyId=\{company\.id\}/);
  assert.match(api, /updateSquareActivation:[\s\S]*expectedVersion[\s\S]*JSON\.stringify\(\{ state, reason, expectedVersion \}\)/);
  assert.match(panel, /updateSquareActivation\(companyId, state, reason\.trim\(\), status\.version\)/);
  assert.match(panel, /error\.status === 409/);
});

test('Square activation exposes all states and every supported locale', () => {
  for (const state of ['DISABLED', 'PILOT', 'ACTIVE', 'SUSPENDED']) assert.ok(panel.includes(`'${state}'`));
  for (const locale of ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.ok(copy.includes(`'${locale}'`), `Missing Square activation locale ${locale}`);
  }
});
