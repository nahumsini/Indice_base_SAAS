import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  completeKioskIdempotentOperation,
  executeKioskMutationWithMismatchRecovery as executeSharedKioskMutationWithMismatchRecovery,
  kioskIdempotencyKeyFor,
} from '../src/app/components/kiosk-engine/kioskIdempotency.ts';
import {
  executeKioskMutationWithMismatchRecovery,
  kioskIdempotencyKeyFor as taskKioskIdempotencyKeyFor,
} from '../src/app/BasicModules/ProcessesTasks/Kiosk/kioskIdempotency.ts';
import { runTaskCompletionWithBestEffortEvidence } from '../src/app/BasicModules/ProcessesTasks/Kiosk/publicTaskKioskEvidence.ts';
import { resolvePreticketProductRequests } from '../src/app/BasicModules/PointOfSale/Sale/utils/preticketQueuePolicy.ts';
import { applyPublicCatalogPriceVisibility } from '../src/app/BasicModules/Sales/Productos/publicCatalog/utils/publicCatalogVisibility.ts';

function memorySessionStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    snapshot() {
      return JSON.stringify([...values.entries()]);
    },
  };
}

test('idempotency retries reuse one opaque key without persisting kiosk PII', () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const operation = 'pos.self-service.preticket.create:public-token-hint';
  const payload = {
    pin: '4819',
    customerName: 'Persona sensible',
    customerEmail: 'private@example.test',
  };

  const firstKey = kioskIdempotencyKeyFor(operation, payload);
  const retryKey = kioskIdempotencyKeyFor(operation, { ...payload, customerName: 'Changed' });
  assert.equal(retryKey, firstKey);
  assert.match(firstKey, /^[0-9a-f-]{32,64}$/i);

  const stored = sessionStorage.snapshot();
  assert.doesNotMatch(stored, /4819|Persona sensible|private@example\.test|public-token-hint/i);

  completeKioskIdempotentOperation(operation);
  const nextOperationKey = kioskIdempotencyKeyFor(operation, payload);
  assert.notEqual(nextOperationKey, firstKey);
});

test('task kiosk rotates a stale idempotency key once after a request mismatch', async () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const operation = 'process-tasks:create';
  const staleKey = taskKioskIdempotencyKeyFor(operation, { title: 'previous task' });
  const usedKeys = [];

  const result = await executeKioskMutationWithMismatchRecovery({
    operation,
    payload: { title: 'current task' },
    request: async (idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      if (usedKeys.length === 1) {
        throw new Error('Idempotency-Key was already used with another request.');
      }
      return 'created';
    },
  });

  assert.equal(result, 'created');
  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], staleKey);
  assert.notEqual(usedKeys[1], staleKey);
});

test('shared finance kiosk mutations rotate a stale idempotency key once', async () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const operation = 'petty-cash:receipt:create';
  const staleKey = kioskIdempotencyKeyFor(operation, { concept: 'previous' });
  const usedKeys = [];

  const result = await executeSharedKioskMutationWithMismatchRecovery({
    operation,
    payload: { concept: 'current' },
    request: async (idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      if (usedKeys.length === 1) {
        throw new Error('Idempotency-Key was already used with another request.');
      }
      return 'created';
    },
  });

  assert.equal(result, 'created');
  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[0], staleKey);
  assert.notEqual(usedKeys[1], staleKey);
});

test('task kiosk completion is not blocked by an evidence transport failure', async () => {
  const calls = [];

  const result = await runTaskCompletionWithBestEffortEvidence({
    uploadEvidence: async () => {
      calls.push('evidence');
      throw new Error('TASK_EVIDENCE_UPLOAD_FAILED');
    },
    completeTask: async () => {
      calls.push('complete');
      return { status: 'completed' };
    },
  });

  assert.deepEqual(calls, ['evidence', 'complete']);
  assert.deepEqual(result.response, { status: 'completed' });
  assert.equal(result.evidenceFailure, 'TASK_EVIDENCE_UPLOAD_FAILED');
});

test('public catalog removes every forbidden price field before rendering', () => {
  const item = {
    id: 'product-1',
    name: 'Producto',
    type: 'product',
    publicPrice: 125,
    wholesalePrice: 90,
    wholesaleMinQuantity: 10,
    publicInventoryStatus: 'inStock',
  };

  const noPrices = applyPublicCatalogPriceVisibility(
    [item],
    { showPrices: false, showWholesalePrices: true },
  )[0];
  assert.equal(noPrices.publicPrice, undefined);
  assert.equal(noPrices.wholesalePrice, undefined);
  assert.equal(noPrices.wholesaleMinQuantity, undefined);

  const retailOnly = applyPublicCatalogPriceVisibility(
    [item],
    { showPrices: true, showWholesalePrices: false },
  )[0];
  assert.equal(retailOnly.publicPrice, 125);
  assert.equal(retailOnly.wholesalePrice, undefined);
  assert.equal(retailOnly.wholesaleMinQuantity, undefined);
});

test('pre-ticket product resolution is all-or-nothing', () => {
  const products = [
    { id: 'local-1', salesProductBackendId: 101, name: 'Uno' },
    { id: 'local-2', salesProductBackendId: 102, name: 'Dos' },
  ];

  const complete = resolvePreticketProductRequests(
    [{ productId: 101, quantity: 2 }, { productId: 102, quantity: '3' }],
    products,
  );
  assert.equal(complete.ok, true);
  assert.deepEqual(complete.requests.map(({ product, quantity }) => [product.name, quantity]), [
    ['Uno', 2],
    ['Dos', 3],
  ]);

  const missingProduct = resolvePreticketProductRequests(
    [{ productId: 101, quantity: 1 }, { productId: 999, quantity: 1 }],
    products,
  );
  assert.deepEqual(missingProduct, { ok: false, requests: [] });

  const invalidQuantity = resolvePreticketProductRequests(
    [{ productId: 101, quantity: 0 }],
    products,
  );
  assert.deepEqual(invalidQuantity, { ok: false, requests: [] });
});

test('task kiosk manager keeps compact actions inside replacement modal views', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/TaskKioskManagementModal.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /DropdownMenu/);
  assert.match(source, /label="Abrir kiosko"/);
  assert.match(source, /label="Compartir y administrar liga"/);
  assert.match(source, /title="Liga del kiosko"/);
  assert.match(source, /title="Opciones del kiosko"/);
  assert.match(source, /Reemplazar y emitir liga/);
});

test('administrative kiosk managers share replacement views without portaled action menus', async () => {
  const [hrSource, hrCardSource, pettyCashSource, expensesSource] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/HumanResources/Control/components/kiosks/KioskManagementModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/HumanResources/Control/components/kiosks/KioskCard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PettyCash/components/PettyCashFundsWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/components/modals/PayablesKioskManagementModal.tsx', import.meta.url), 'utf8'),
  ]);

  for (const source of [`${hrSource}\n${hrCardSource}`, pettyCashSource, expensesSource]) {
    assert.doesNotMatch(source, /DropdownMenu/);
    assert.match(source, /KioskModalFrame/);
    assert.match(source, /KioskAdminActionButton/);
    assert.match(source, /KioskAdminPanelAction/);
    assert.match(source, /Liga del kiosko|copy\.kiosk\.card\.openAttendanceScreen/);
    assert.match(source, /Opciones del kiosko|copy\.kiosk\.actions\.openActions/);
  }

  assert.match(hrSource, /Compartir y administrar liga|copyAccessLink/);
  assert.match(pettyCashSource, /Compartir y administrar liga/);
  assert.match(expensesSource, /Compartir y administrar liga/);
});

test('kiosk center is an administrative multi-kiosk builder and never an in-app employee workspace', async () => {
  const [appSource, navigationSource, centerSource, mobileSource] = await Promise.all([
    readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/config/navigation.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskCenterPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(appSource, /KioskCenter\/MultiKioskCenterPage/);
  assert.match(appSource, /currentPage === 'kiosk-center'/);
  assert.match(appSource, /currentPage === 'kiosk-management'/);
  assert.match(navigationSource, /'kiosk-management'/);
  assert.match(centerSource, /Crear Multikiosco/);
  assert.match(centerSource, /multiKioskAdminApi\.create/);
  assert.match(centerSource, /kiosk_definition_ids/);
  assert.match(centerSource, /employee_ids/);
  assert.doesNotMatch(centerSource, /employeeKiosksApi|AUTHENTICATED_WEB/);
  assert.match(mobileSource, /useDesktopViewport/);
  assert.match(mobileSource, /Abre este Multikiosco en tu celular/);
});

test('multi-kiosk mobile client binds parent and child sessions without exposing child public links', async () => {
  const source = await readFile(new URL('../src/app/api/multiKiosks.ts', import.meta.url), 'utf8');
  assert.match(source, /\/api\/v2\/multi-kiosks\/public/);
  assert.match(source, /sessionStorage/);
  assert.match(source, /X-Multi-Kiosk-Session-Token/);
  assert.match(source, /X-Kiosk-Session-Token/);
  assert.match(source, /X-CSRF-Token/);
  assert.match(source, /Idempotency-Key/);
  assert.doesNotMatch(source, /public_token.*child|child.*public_token/i);
});
