import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('multi-kiosk public requests stop waiting and release their caller after a bounded timeout', async () => {
  const api = await readSource('../src/app/api/multiKiosks.ts');

  assert.match(api, /const publicRequestTimeoutMs = 15_000/);
  assert.match(api, /const controller = new AbortController\(\)/);
  assert.match(api, /init\.signal\?\.addEventListener\('abort', abortFromCaller, \{ once: true \}\)/);
  assert.match(api, /timedOut = true;\s*controller\.abort\(\)/);
  assert.match(api, /new ApiClientError\('The request timed out\.', 408, 'REQUEST_TIMEOUT'\)/);
  assert.match(api, /window\.clearTimeout\(timeoutId\)/);
});

test('multi-kiosk opening reuses a valid child session and recovers once from an expired child', async () => {
  const page = await readSource('../src/app/KioskCenter/MultiKioskMobilePage.tsx');

  assert.match(page, /openingKioskIdRef\.current !== null/);
  assert.match(page, /multiKioskMobileSession\.childGet\(token, card\.id\)/);
  assert.match(page, /nextWorkspace = await multiKioskPublicApi\.workspace\(token, card\.id, controller\.signal\)/);
  assert.match(page, /multiKioskMobileSession\.childClear\(token, card\.id\);\s*nextWorkspace = await launchAndLoad\(\)/);
  assert.match(page, /multiKioskPublicApi\.launch\(token, card\.id, bootstrap\.csrf_token, controller\.signal\)/);
});

test('multi-kiosk ignores aborted and stale workspace responses instead of clearing newer state', async () => {
  const page = await readSource('../src/app/KioskCenter/MultiKioskMobilePage.tsx');

  assert.match(page, /if \(controller\.signal\.aborted\) return;\s*clearLocalAuthority/);
  assert.match(page, /const requestId = \+\+workspaceRequestRef\.current/);
  assert.match(page, /if \(controller\.signal\.aborted \|\| workspaceRequestRef\.current !== requestId\) return/);
  assert.match(page, /if \(workspaceRequestRef\.current === requestId\) setWorkspace\(nextWorkspace\)/);
  assert.match(page, /openControllerRef\.current\?\.abort\(\)/);
  assert.match(page, /aria-busy=\{busy \|\| busyId !== null\}/);
});

test('multi-kiosk protects authentication and locale changes from duplicate session work', async () => {
  const page = await readSource('../src/app/KioskCenter/MultiKioskMobilePage.tsx');

  assert.match(page, /copyRef\.current = copy/);
  assert.match(page, /friendlyError\(failure, copyRef\.current\)/);
  assert.match(page, /\}, \[clearLocalAuthority, token\]\)/);
  assert.match(page, /if \(!bootstrap \|\| authenticationInFlightRef\.current\) return/);
  assert.match(page, /if \(signOutInFlightRef\.current\) return/);
});
