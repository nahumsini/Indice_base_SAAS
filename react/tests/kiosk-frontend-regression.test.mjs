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
import { cartLinesFromPreticket, resolvePreticketProductRequests } from '../src/app/BasicModules/PointOfSale/Sale/utils/preticketQueuePolicy.ts';
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

test('POS preserves and distributes the kiosk order discount when loading a claimed pre-ticket', () => {
  const products = [
    { id: 'local-1', salesProductBackendId: 101, name: 'Uno' },
    { id: 'local-2', salesProductBackendId: 102, name: 'Dos' },
  ];
  const lines = cartLinesFromPreticket({
    id: 41,
    kioskId: 8,
    cashRegisterId: 5,
    cashRegisterName: 'Caja 01',
    preticketNumber: 'SS-1',
    claimCode: '1234',
    status: 'CLAIMED',
    currencyCode: 'MXN',
    itemCount: 2,
    subtotalAmount: 30,
    discountAmount: 3,
    discountRuleId: 9,
    totalAmount: 27,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    items: [
      { productId: 101, productName: 'Uno', quantity: 1, unitPrice: 10, discountAmount: 0, lineTotal: 10 },
      { productId: 102, productName: 'Dos', quantity: 1, unitPrice: 20, discountAmount: 0, lineTotal: 20 },
    ],
  }, [
    { product: products[0], quantity: 1 },
    { product: products[1], quantity: 1 },
  ]);

  assert.deepEqual(lines.map(({ unitPrice, discountAmount, discountRuleId }) => (
    [unitPrice, discountAmount, discountRuleId]
  )), [
    [10, 1, 9],
    [20, 2, 9],
  ]);
});

test('task kiosk manager keeps compact actions inside replacement modal views', async () => {
  const [source, translations] = await Promise.all([
    readFile(
      new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/TaskKioskManagementModal.tsx', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/translations/es-MX.ts', import.meta.url),
      'utf8',
    ),
  ]);

  assert.doesNotMatch(source, /DropdownMenu/);
  assert.match(source, /label=\{copy\.admin\.share\.open\}/);
  assert.match(source, /label=\{copy\.admin\.center\.share\}/);
  assert.match(source, /title=\{copy\.admin\.share\.title\}/);
  assert.match(source, /title=\{copy\.admin\.options\.title\}/);
  assert.match(translations, /open: 'Abrir kiosko'/);
  assert.match(translations, /share: 'Compartir y administrar liga'/);
  assert.match(translations, /replaceAndIssue: 'Reemplazar y emitir liga'/);
});

test('task kiosk dialog keeps mobile text fields focused while typing', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/PublicTaskKioskPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /const closeTaskCompletionModal = useCallback\(\(\) => \{/);
  assert.match(source, /const closeResponsibleModal = useCallback\(\(\) => \{/);
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

test('POS kiosk administration keeps one canonical table with direct actions and printable QR posters', async () => {
  const [workspace, api, translations, qrPoster] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/KioskCenterWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/posKioskAdminApi.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/kioskTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/kioskQrPosterPdf.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(workspace, /posKioskAdminApi\.list\(\)/);
  assert.doesNotMatch(workspace, /MoreHorizontal|onMore=/);
  for (const action of ['onEdit', 'onAccess', 'onCopy', 'onDownloadQrPdf', 'onRotate', 'onToggle', 'onDelete']) {
    assert.match(workspace, new RegExp(`${action}=`));
  }
  assert.match(api, /\/api\/v2\/point-of-sale\/kiosks/);
  assert.match(api, /rotate-public-access-token/);
  assert.match(api, /NEVER_CONNECTED/);
  assert.match(api, /sourceRegisterOpen/);
  assert.match(workspace, /shift: center\.shiftStatus/);
  assert.match(workspace, /resolveKioskShiftState/);
  assert.match(workspace, /readyCount/);
  assert.match(workspace, /setInterval\(refreshOperationalState, 20_000\)/);
  assert.match(translations, /scope: 'Asignación'/);
  assert.match(translations, /shiftStatus: 'Turno de caja'/);
  assert.match(translations, /shiftOpen: 'Turno abierto'/);
  assert.match(translations, /shiftClosed: 'Caja cerrada'/);
  assert.match(translations, /shiftChecking: 'Verificando turno'/);
  assert.match(translations, /enabledStatus: 'Habilitado'/);
  assert.match(translations, /disponibles ahora/);
  assert.match(translations, /link: 'Acceso'/);
  assert.match(translations, /copied: 'Enlace copiado'/);
  assert.match(workspace, /downloadKioskQrPosterPdf/);
  assert.match(workspace, /row\.kioskType === 'self_service' \|\| row\.kioskType === 'self_checkout'/);
  assert.match(workspace, /kioskType: row\.kioskType === 'self_checkout' \? 'self_checkout' : 'self_service'/);
  assert.match(qrPoster, /AUTOCOBRO MÓVIL/);
  assert.match(qrPoster, /kioskType: 'self_service' \| 'self_checkout'/);
  assert.match(translations, /downloadQrPdf: 'Descargar QR en PDF'/);
  assert.match(translations, /rotateAccess: 'Regenerar acceso'/);
  assert.match(translations, /deleteKiosk: 'Eliminar kiosco'/);
});

test('self-checkout creation opens the six-step configuration flow with real POS scope inputs', async () => {
  const creationFlow = await readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/SelfCheckoutCreationFlow.tsx', import.meta.url), 'utf8');
  const wizard = await readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/SelfCheckoutSetupWizard.tsx', import.meta.url), 'utf8');
  const router = await readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/KiosksWorkspace.tsx', import.meta.url), 'utf8');
  const center = await readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/KioskCenterWorkspace.tsx', import.meta.url), 'utf8');
  const api = await readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/posKioskAdminApi.ts', import.meta.url), 'utf8');

  assert.match(router, /<SelfCheckoutCreationFlow/);
  assert.match(router, /<StandardKioskCreationFlow/);
  assert.doesNotMatch(router, /<SelfCheckoutWorkspace/);
  assert.doesNotMatch(router, /SelfServiceKioskManager|CustomerDisplayManager/);
  assert.match(router, /setCenterRefreshKey\(\(current\) => current \+ 1\)/);
  assert.match(router, /finishCreation\(kiosk\.name\)/);
  assert.match(center, /setNotice\(copy\.center\.createdFeedback\(createdKioskName\)\)/);
  assert.match(center, /setTypeFilter\('all'\)[\s\S]*void reload\(\)/);
  assert.match(creationFlow, /posBackendApi\.context\(\)/);
  assert.match(creationFlow, /usePointOfSaleCatalogProducts\(\)/);
  assert.match(creationFlow, /listPublishedDiscountRules\(\{/);
  assert.doesNotMatch(creationFlow, /readStoredDiscountRules|localStorage/);
  assert.match(creationFlow, /posKioskAdminApi\.createSelfCheckout\(draft\)/);
  assert.match(api, /\?type=self_checkout/);
  assert.match(wizard, /experience: 'self-checkout'/);
  assert.match(wizard, /steps\.experience[\s\S]*steps\.general[\s\S]*steps\.assignment[\s\S]*steps\.catalog[\s\S]*steps\.access[\s\S]*steps\.summary/);
  assert.match(wizard, /selectedWarehouse\.unitName[\s\S]*selectedWarehouse\.businessName/);
  assert.match(wizard, /catalogMode === 'selected'[\s\S]*selectedProductIds/);
  assert.match(wizard, /sessionTimeoutMinutes[\s\S]*supervisorExitRequired/);
});

test('all operational kiosk types create with steps and return to the canonical table', async () => {
  const [router, center, standardCreation, editModal] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/KiosksWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/KioskCenterWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/StandardKioskCreationFlow.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/KioskEditModal.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(router, /creationType === 'customer-display' \|\| creationType === 'self-service'/);
  assert.match(router, /<StandardKioskCreationFlow/);
  assert.match(router, /<SelfCheckoutCreationFlow/);
  assert.doesNotMatch(router, /SelfServiceKioskManager|SelfCheckoutWorkspace|CustomerDisplayManager/);
  assert.match(standardCreation, /const steps = \['Experiencia', 'Información', 'Asignación', 'Catálogo', 'Acceso', 'Resumen'\]/);
  assert.match(standardCreation, /Después regresarás a la tabla/);
  assert.match(center, /<KioskEditModal/);
  assert.doesNotMatch(center, /onOpenView|EditCustomerDisplayModal/);
  assert.match(editModal, /title="Editar kiosco"/);
  assert.match(editModal, /El acceso y el estado operativo se administran desde la tabla/);
});

test('self-checkout public links render the dedicated catalog and migrate legacy routes', async () => {
  const [routes, legacyExperience, checkoutExperience, previewExperience, translations, api] = await Promise.all([
    readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/SelfServiceKiosk/SelfServiceKiosk.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/SelfCheckoutKiosk/SelfCheckoutKiosk.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/SelfCheckoutWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/kioskTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/SelfServiceKiosk/selfServiceKioskApi.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(routes, /path: '\/pos-self-checkout\/:publicAccessToken'[\s\S]*SelfCheckoutKioskRoute/);
  assert.match(legacyExperience, /response\.kioskType === 'self_checkout'/);
  assert.match(legacyExperience, /navigate\(`\/pos-self-checkout\/\$\{encodeURIComponent\(publicAccessToken\)\}`/);
  assert.match(api, /kioskType: 'self_service' \| 'self_checkout'/);
  assert.match(checkoutExperience, /selfServiceKioskApi\.bootstrap\(publicAccessToken\)/);
  assert.match(checkoutExperience, /bootstrap\?\.items/);
  assert.match(checkoutExperience, /changeQuantity/);
  assert.match(checkoutExperience, /import \{ KioskPublicShell \}/);
  assert.match(checkoutExperience, /<KioskPublicShell[\s\S]*moduleScope="point-of-sale-self-checkout"/);
  assert.match(checkoutExperience, /selfServiceKioskApi\.createPreticket/);
  assert.match(checkoutExperience, /receipt\.claimCode/);
  assert.match(checkoutExperience, /setTimeout\(\(\) => \{[\s\S]*5000\)/);
  assert.doesNotMatch(checkoutExperience, /key: 'transfer'/);
  assert.doesNotMatch(previewExperience, /copy\.transferPayment/);
  assert.doesNotMatch(translations, /cardTerminalBadge: 'Mercado Pago Point'/);
  assert.match(translations, /cardTerminalBadge: 'Terminal de pago'/);
});

test('every public POS kiosk blocks its experience when the source register is closed', async () => {
  const [checkout, selfService, customerDisplay, closedState, translations] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/PointOfSale/SelfCheckoutKiosk/SelfCheckoutKiosk.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/SelfServiceKiosk/SelfServiceKiosk.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/CustomerDisplay/CustomerDisplay.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/SelfServiceKiosk/SourceRegisterClosedState.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/kioskTranslations.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(checkout, /!bootstrap\.sourceRegisterOpen/);
  assert.match(selfService, /!bootstrap\.sourceRegisterOpen/);
  assert.match(customerDisplay, /state\.status === 'CLOSED'/);
  assert.match(closedState, /sourceRegisterClosed/);
  assert.match(translations, /La caja origen está cerrada\./);
});

test('customer display mirrors cash received and change while the cashier captures payment', async () => {
  const [display, publisher, paymentPanel, api, translations] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/PointOfSale/CustomerDisplay/CustomerDisplay.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Sale/hooks/useCustomerDisplayPublisher.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Sale/components/SalePaymentPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/shared/customerDisplay/customerDisplayApi.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/kioskTranslations.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(paymentPanel, /onPaymentPreviewChange/);
  assert.match(paymentPanel, /cashReceived: workspaceMethod === 'cash'/);
  assert.match(publisher, /return paymentPreview \? 'READY_TO_PAY' : 'ACTIVE'/);
  assert.match(publisher, /pending: true/);
  assert.match(api, /cashReceived\?: number \| null/);
  assert.match(display, /pendingCashPayment/);
  assert.match(display, /cashStillDue/);
  assert.match(display, /changeToDeliver/);
  assert.match(display, /lockDesktopViewport/);
  assert.match(display, /minimalContent/);
  assert.match(display, /requestFullscreen/);
  assert.match(translations, /Efectivo recibido/);
  assert.match(translations, /Tu cambio/);
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
