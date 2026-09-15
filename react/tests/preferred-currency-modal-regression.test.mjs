import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('preferred currency uses a staged standard-form modal with attributed sources', async () => {
  const control = await read('../src/app/BasicModules/shared/PreferredCurrencyControl.tsx');

  assert.match(control, /aria-haspopup="dialog"/);
  assert.match(control, /<IndiceModalFrame/);
  assert.match(control, /modalType="standard-form"/);
  assert.match(control, /tone="blue"/);
  assert.match(control, /draftPreferredCurrency/);
  assert.match(control, /setPreferredCurrency\(draftPreferredCurrency\)/);
  assert.match(control, /<details/);
  assert.match(control, /href=\{source\.sourceUrl\}/);
  assert.match(control, /target="_blank"/);
  assert.match(control, /rel="noreferrer"/);
  assert.doesNotMatch(control, /absolute right-0 top-12/);
});

test('daily refresh remains staged and explicitly bypasses the current-day cache', async () => {
  const [control, context, api] = await Promise.all([
    read('../src/app/BasicModules/shared/PreferredCurrencyControl.tsx'),
    read('../src/app/BasicModules/shared/BusinessCurrencyContext.tsx'),
    read('../src/app/BasicModules/shared/businessExchangeRatesApi.ts'),
  ]);

  assert.match(control, /await refreshDailyExchangeRateSettings\(\)/);
  assert.match(control, /setDraftSettings\(refreshedSettings\)/);
  assert.match(context, /fetchBusinessDailyExchangeRateSettings\(\{ forceRefresh: true \}\)/);
  assert.match(api, /options\.forceRefresh \? '\?refresh=true' : ''/);
});

test('MXN provider chain is fixed, attributed, refreshable and same-day replaceable', async () => {
  const [service, controller, repository] = await Promise.all([
    read('../../src/main/java/com/indice/erp/exchange/BusinessExchangeRateService.java'),
    read('../../src/main/java/com/indice/erp/exchange/BusinessExchangeRatesController.java'),
    read('../../src/main/java/com/indice/erp/exchange/BusinessExchangeRateSnapshotRepository.java'),
  ]);

  assert.match(service, /fetchMxnFromBanxico\(\)/);
  assert.match(service, /https:\/\/api\.frankfurter\.dev\/v2\/providers\/ecb\/rate\/usd\/mxn/);
  assert.match(service, /Banco Central Europeo via Frankfurter/);
  assert.match(controller, /@RequestParam\(defaultValue = "false"\) boolean refresh/);
  assert.match(controller, /loadDailyRates\(refresh\)/);
  assert.match(repository, /ON DUPLICATE KEY UPDATE response_payload = VALUES\(response_payload\)/);
});
