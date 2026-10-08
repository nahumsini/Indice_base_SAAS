import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getTrialEntryCopy } from '../src/app/Auth/translations/trialEntry.ts';

test('all eight ERP languages cover the complete trial entry contract', () => {
  const baseline = getTrialEntryCopy('en-CA');
  for (const locale of ['es-MX', 'es-CO', 'en-CA', 'en-US', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = getTrialEntryCopy(locale);
    assert.deepEqual(Object.keys(copy), Object.keys(baseline));
    assert.ok(Object.values(copy).every(value => typeof value === 'string' && value.trim()));
  }
  assert.notEqual(getTrialEntryCopy('fr-CA').title, baseline.title);
  assert.notEqual(getTrialEntryCopy('es-MX').title, baseline.title);
});

test('entry does not replace legacy signup, mount tenant providers or persist credentials', async () => {
  const routes = await readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8');
  const root = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/app/Auth/TrialStartPage.tsx', import.meta.url), 'utf8');
  assert.match(routes, /id: 'public-trial-entry',[\s\S]*?path: '\/start'/);
  assert.match(routes, /path: '\/signup',[\s\S]*?element: <SignupPage/);
  assert.match(root, /publicPresentationRouteIds = new Set\(\[[^\]]*'public-trial-entry'/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|location\.href\s*=|console\./);
  assert.match(page, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(page, /!config\?\.enabled/);
  assert.match(page, /setPassword\(''\)/);
  assert.match(page, /new TextEncoder\(\)\.encode\(password\)\.length > 72/);
});
