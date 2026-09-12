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
import {
  publicCatalogCoverImage,
  publicCatalogDescriptionCanExpand,
  publicCatalogImages,
} from '../src/app/BasicModules/Sales/Productos/publicCatalog/utils/publicCatalogPresentation.ts';
import { deriveProductSalesReadiness } from '../src/app/BasicModules/Sales/utils/productSalesReadiness.ts';
import {
  PUBLIC_CATALOG_EXPERIENCE_PRESETS,
  getPublicCatalogExperienceStyle,
} from '../src/app/BasicModules/Sales/Productos/publicCatalog/utils/publicCatalogExperience.ts';
import {
  getProductImageTargetDimensions,
} from '../src/app/BasicModules/Sales/Productos/utils/productImageOptimization.ts';
import {
  employeeHasRequiredKioskTabScopes,
  employeeMatchesKioskOrganizationScope,
  evaluateEmployeeKioskAccess,
} from '../src/app/KioskCenter/multiKioskEmployeeAccess.ts';
import { uploadPresignedKioskFile } from '../src/app/KioskCenter/multiKioskWorkspaceUploads.ts';

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

test('multi-kiosk evidence upload aborts a stalled storage request', async () => {
  const originalFetch = globalThis.fetch;
  let observedSignal;
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    observedSignal = options.signal;
    observedSignal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });

  try {
    await assert.rejects(
      uploadPresignedKioskFile(
        { object_key: 'private/evidence.jpg', upload_url: 'https://storage.invalid/upload' },
        new Blob(['evidence'], { type: 'image/jpeg' }),
        'image/jpeg',
        { timeoutMs: 5 },
      ),
      (error) => error instanceof Error && error.message === 'KIOSK_EVIDENCE_UPLOAD_TIMEOUT',
    );
    assert.equal(observedSignal.aborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

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
        throw Object.assign(new Error('La clave de reintento pertenece a otra operación.'), {
          status: 409,
          code: 'KIOSK_IDEMPOTENCY_MISMATCH',
        });
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

test('multi-kiosk action reuses one key after a transport timeout and completes it only on success', async () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const usedKeys = [];
  const payload = { pin: '61942', employeeName: 'Sensitive collaborator', total_amount: 42 };
  const operation = 'multi-kiosk:child:27:action:petty-cash.receipt.create@1';

  await assert.rejects(
    executeSharedKioskMutationWithMismatchRecovery({
      operation,
      payload,
      request: async (idempotencyKey) => {
        usedKeys.push(idempotencyKey);
        throw new Error('Network timeout');
      },
    }),
    /Network timeout/,
  );

  const recovered = await executeSharedKioskMutationWithMismatchRecovery({
    operation,
    payload,
    request: async (idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      return 'created';
    },
  });
  assert.equal(recovered, 'created');
  assert.equal(usedKeys[1], usedKeys[0]);
  completeKioskIdempotentOperation(operation);

  await executeSharedKioskMutationWithMismatchRecovery({
    operation,
    payload,
    request: async (idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      return 'next-operation';
    },
  });
  completeKioskIdempotentOperation(operation);
  assert.notEqual(usedKeys[2], usedKeys[1]);
  assert.doesNotMatch(sessionStorage.snapshot(), /61942|Sensitive collaborator|total_amount/i);
});

test('multi-kiosk action replaces a stale mismatched key once without changing the payload', async () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const usedKeys = [];
  const payload = { task_id: 91, progress_percentage: 100 };

  const operation = 'multi-kiosk:child:14:action:process-tasks.task.complete@1';
  const result = await executeSharedKioskMutationWithMismatchRecovery({
    operation,
    payload,
    request: async (idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      if (usedKeys.length === 1) {
        throw Object.assign(new Error('La clave de reintento pertenece a otra operación.'), {
          status: 409,
          code: 'KIOSK_IDEMPOTENCY_MISMATCH',
        });
      }
      return 'completed';
    },
  });

  assert.equal(result, 'completed');
  assert.equal(usedKeys.length, 2);
  assert.notEqual(usedKeys[1], usedKeys[0]);
  completeKioskIdempotentOperation(operation);
});

test('multi-kiosk keeps the same key while an idempotent action is still processing', async () => {
  const sessionStorage = memorySessionStorage();
  globalThis.window = { sessionStorage };
  const usedKeys = [];
  const operation = 'multi-kiosk:child:14:action:process-tasks.task.complete@1';
  const payload = { task_id: 91, progress_percentage: 100 };

  await assert.rejects(
    executeSharedKioskMutationWithMismatchRecovery({
      operation,
      payload,
      request: async (idempotencyKey) => {
        usedKeys.push(idempotencyKey);
        throw Object.assign(new Error('La operación sigue en proceso.'), {
          status: 409,
          code: 'KIOSK_IDEMPOTENCY_IN_PROGRESS',
        });
      },
    }),
    error => error?.code === 'KIOSK_IDEMPOTENCY_IN_PROGRESS',
  );

  await executeSharedKioskMutationWithMismatchRecovery({
    operation,
    payload,
    request: async (idempotencyKey) => {
      usedKeys.push(idempotencyKey);
      return 'completed';
    },
  });

  assert.equal(usedKeys.length, 2);
  assert.equal(usedKeys[1], usedKeys[0]);
  completeKioskIdempotentOperation(operation);
});

test('multi-kiosk employee eligibility applies any alias per kiosk and all selected kiosks', () => {
  const attendance = {
    required_tab_scopes: ['human_resources.attendance', 'human_resources.control'],
  };

  assert.equal(employeeHasRequiredKioskTabScopes(
    [attendance], ['human_resources.attendance'], false), true);
  assert.equal(employeeHasRequiredKioskTabScopes(
    [attendance], ['human_resources.control'], false), true);
  assert.equal(employeeHasRequiredKioskTabScopes(
    [attendance], ['human_resources.people'], false), false);
  assert.equal(employeeHasRequiredKioskTabScopes(
    [attendance, { required_tab_scopes: ['petty_cash.funds'] }],
    ['human_resources.attendance'], false), false);
  assert.equal(employeeHasRequiredKioskTabScopes(
    [attendance], undefined, false), false);
  assert.equal(employeeHasRequiredKioskTabScopes(
    [{}], ['human_resources.attendance'], true), false);
});

test('multi-kiosk employee eligibility matches backend organizational scope semantics', () => {
  assert.equal(employeeMatchesKioskOrganizationScope(
    { unit_id: null, business_id: null }, { unit_id: 8, business_id: 19 }), true);
  assert.equal(employeeMatchesKioskOrganizationScope(
    { unit_id: null, business_id: 19 }, { unit_id: 8, business_id: 19 }), false);
  assert.equal(employeeMatchesKioskOrganizationScope(
    { unit_id: 8, business_id: null }, { unit_id: 8, business_id: 19 }), true);
  assert.equal(employeeMatchesKioskOrganizationScope(
    { unit_id: 8, business_id: 21 }, { unit_id: 8, business_id: 19 }), false);
  assert.equal(employeeMatchesKioskOrganizationScope(
    { unit_id: 7, business_id: null }, { unit_id: null, business_id: null }), true);
});

test('multi-kiosk launcher filters each kiosk independently for a company collaborator', () => {
  const employee = {
    module_slugs: ['human_resources'],
    tab_scopes: ['human_resources.attendance'],
    unit_id: 6,
    business_id: 8,
  };
  const kiosks = [
    {
      module_slug: 'processes',
      required_tab_scopes: ['processes.calendar'],
      unit_id: 24,
      business_id: 29,
    },
    {
      module_slug: 'human_resources',
      required_tab_scopes: ['human_resources.attendance', 'human_resources.control'],
      unit_id: null,
      business_id: null,
    },
  ];

  const access = kiosks.map(kiosk => evaluateEmployeeKioskAccess(employee, kiosk, false));

  assert.equal(access.filter(item => (
    item.moduleAllowed && item.scopeAllowed && item.organizationAllowed
  )).length, 1);
  assert.equal(access[0].moduleAllowed, false);
  assert.deepEqual(access[1], {
    moduleAllowed: true,
    organizationAllowed: true,
    scopeAllowed: true,
  });
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

test('public catalog visual profiles remain editable, accessible and persisted end to end', async () => {
  assert.deepEqual(Object.keys(PUBLIC_CATALOG_EXPERIENCE_PRESETS), [
    'general', 'retail', 'hospitality', 'services', 'foodBeverage', 'wholesale',
  ]);
  const style = getPublicCatalogExperienceStyle({ accentColor: '#F8C842' });
  assert.equal(style['--catalog-accent'], '#F8C842');
  assert.equal(style['--catalog-accent-contrast'], '#0F172A');

  const root = new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/', import.meta.url);
  const [api, editor, modal, header, grid, card] = await Promise.all([
    readFile(new URL('publicCatalogApi.ts', root), 'utf8'),
    readFile(new URL('PublicCatalogExperienceSettings.tsx', root), 'utf8'),
    readFile(new URL('PublicCatalogEditorModal.tsx', root), 'utf8'),
    readFile(new URL('PublicCatalogHeader.tsx', root), 'utf8'),
    readFile(new URL('PublicCatalogGrid.tsx', root), 'utf8'),
    readFile(new URL('PublicCatalogCard.tsx', root), 'utf8'),
  ]);
  for (const field of ['experienceProfile', 'accentColor', 'heroStyle', 'layoutStyle', 'cardStyle', 'imageRatio']) {
    assert.match(api, new RegExp(`${field}:`));
  }
  assert.match(editor, /type="color"/);
  assert.match(editor, /aria-pressed=/);
  assert.match(modal, /modalType="wizard"/);
  assert.match(modal, /IndiceModalWizardStepper/);
  assert.match(header, /publicCatalogHeroStyle\(config\.heroStyle/);
  assert.match(grid, /publicCatalogLayoutClass\[config\.layoutStyle\]/);
  assert.match(card, /publicCatalogImageRatioClass\[config\.imageRatio\]/);
});

test('explicit commercial visibility publishes legacy operational items without exposing internal ones', () => {
  assert.deepEqual(deriveProductSalesReadiness({
    status: 'Active',
    visibility: 'Commercial',
    type: 'Operational item',
    price: 1500,
  }), {
    readyForSales: true,
    status: 'READY',
    reasons: [],
  });

  assert.deepEqual(deriveProductSalesReadiness({
    status: 'Active',
    visibility: 'Internal',
    type: 'Operational item',
    price: 1500,
  }), {
    readyForSales: false,
    status: 'NOT_READY',
    reasons: ['INTERNAL'],
  });
});

test('public catalog cards preserve custom category labels on desktop and mobile', async () => {
  const root = new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/', import.meta.url);
  const [card, mobileCard] = await Promise.all([
    readFile(new URL('PublicCatalogCard.tsx', root), 'utf8'),
    readFile(new URL('PublicCatalogMobileCard.tsx', root), 'utf8'),
  ]);

  for (const source of [card, mobileCard]) {
    assert.match(source, /getCategoryLabel\(item\.category, t\)/);
    assert.doesNotMatch(source, /t\.categoryLabels\[item\.category\]/);
  }
});

test('reservable public catalog items keep purchase actions and expose a private-source-safe calendar', async () => {
  const root = new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/', import.meta.url);
  const card = await readFile(new URL('PublicCatalogCard.tsx', root), 'utf8');
  const workspace = await readFile(new URL('PublicCatalogWorkspace.tsx', root), 'utf8');
  const modal = await readFile(new URL('PublicCatalogAvailabilityModal.tsx', root), 'utf8');
  const api = await readFile(new URL('publicCatalogApi.ts', root), 'utf8');

  assert.match(card, /item\.reservable/);
  assert.match(card, /onCheckAvailability/);
  assert.match(card, /onAddToCart/);
  assert.match(workspace, /PublicCatalogAvailabilityModal/);
  assert.match(api, /sales\.catalog\.availability\.read@1/);
  assert.doesNotMatch(modal, /iCal|\.ics|availabilityIcalUrl/);
});

test('public catalog centers the company logo and keeps the store mark as a resilient fallback', async () => {
  const root = new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/', import.meta.url);
  const [header, page, api] = await Promise.all([
    readFile(new URL('PublicCatalogHeader.tsx', root), 'utf8'),
    readFile(new URL('PublicCatalogPage.tsx', root), 'utf8'),
    readFile(new URL('publicCatalogApi.ts', root), 'utf8'),
  ]);

  assert.match(header, /config\.companyLogoUrl/);
  assert.match(header, /items-center justify-center overflow-hidden/);
  assert.match(header, /object-contain p-2/);
  assert.match(header, /onError=\{\(\) => setFailedLogoUrl\(logoUrl\)\}/);
  assert.match(header, /<Store aria-hidden="true"/);
  assert.match(page, /companyLogoUrl: resolveSalesStorageUrl\(bootstrap\.companyLogoUrl\)/);
  assert.match(api, /companyLogoUrl: resolveSalesStorageUrl\(catalog\.companyLogoUrl\)/);
});

test('public catalog presents a deduplicated image gallery with a thumbnail fallback', () => {
  const item = {
    id: 'product-1',
    name: 'Habitación Bellamar',
    type: 'service',
    images: [
      { url: ' https://cdn.example.test/front.jpg ', alt: 'Frente' },
      { url: 'https://cdn.example.test/front.jpg', alt: 'Duplicada' },
      { url: 'https://cdn.example.test/interior.jpg' },
    ],
    thumbnailUrl: 'https://cdn.example.test/legacy.jpg',
  };

  assert.deepEqual(publicCatalogImages(item), [
    { url: 'https://cdn.example.test/front.jpg', alt: 'Frente' },
    { url: 'https://cdn.example.test/interior.jpg', alt: 'Habitación Bellamar' },
  ]);
  assert.deepEqual(publicCatalogImages({
    ...item,
    images: [],
  }), [{ url: 'https://cdn.example.test/legacy.jpg', alt: 'Habitación Bellamar' }]);
  assert.deepEqual(publicCatalogCoverImage(item), {
    url: 'https://cdn.example.test/legacy.jpg',
    alt: 'Habitación Bellamar',
  });
});

test('product image preparation preserves small media and caps oversized dimensions', () => {
  assert.deepEqual(getProductImageTargetDimensions(1200, 800), { width: 1200, height: 800 });
  assert.deepEqual(getProductImageTargetDimensions(4000, 3000), { width: 1920, height: 1440 });
  assert.deepEqual(getProductImageTargetDimensions(3000, 4000), { width: 1440, height: 1920 });
});

test('public catalog opens a lazy, resilient cover in an accessible large gallery', async () => {
  const [page, workspace, cover, gallery, media, optimization] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogImageCover.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogGalleryModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/components/product-modal/ProductMediaSection.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/utils/productImageOptimization.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(workspace, /<PublicCatalogGalleryModal/);
  assert.match(workspace, /onOpenGallery=\{setGalleryItem\}/);
  assert.match(cover, /loading="lazy"/);
  assert.match(cover, /decoding="async"/);
  assert.match(cover, /onError=\{\(\) => setLoadState\('error'\)\}/);
  assert.match(gallery, /modalType="large-workspace"/);
  assert.match(gallery, /event\.key === 'ArrowLeft'/);
  assert.match(gallery, /onTouchEnd/);
  assert.match(gallery, /object-contain/);
  assert.match(page, /PUBLIC_CATALOG_MEDIA_REFRESH_MS/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /onRefreshCatalogItem=\{refreshCatalogItem\}/);
  assert.match(workspace, /onRefreshItem=\{onRefreshCatalogItem\}/);
  assert.match(gallery, /onRefreshItem\(item\.id\)/);
  assert.match(gallery, /replacement\.url === failedImageUrl/);
  assert.match(media, /isPreparingImages/);
  assert.match(media, /accept=\{productImageFileAccept\}/);
  assert.match(optimization, /canvas\.toBlob\(resolve, 'image\/webp'/);
  assert.match(optimization, /productImageMaximumEdge = 1920/);
});

test('public catalog prepares reference images only on demand and shares a direct WhatsApp product link', async () => {
  const [workspace, card, mobileCard, downloads, sharing, api, visibility] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogCard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogMobileCard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/utils/publicCatalogImageDownloads.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/utils/publicCatalogSharing.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/publicCatalogApi.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogVisibilitySettings.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(workspace, /onRefreshCatalogItem\(item\.id\)/);
  assert.match(workspace, /downloadReferenceProductImages\(currentItem\)/);
  assert.match(workspace, /config\.showPrices[\s\S]*formatProductCurrency/);
  assert.match(workspace, /window\.open\(shareUrl, '_blank'\)/);
  assert.match(card, /config\.allowImageDownloads && hasImages/);
  assert.match(card, /MessageCircle/);
  assert.match(mobileCard, /config\.allowImageDownloads && hasImages/);
  assert.match(mobileCard, /MessageCircle/);
  assert.match(downloads, /referenceImageMaximumEdge = 1200/);
  assert.match(downloads, /referenceImageWebpQuality = 0\.65/);
  assert.match(downloads, /await import\('fflate'\)/);
  assert.match(sharing, /https:\/\/wa\.me\/\?text=/);
  assert.match(sharing, /searchParams\.set\('product', itemId\)/);
  assert.match(api, /allowImageDownloads: config\.allowImageDownloads/);
  assert.match(visibility, /'allowImageDownloads'/);
});

test('public catalog only offers read more for descriptions that exceed the card limit', () => {
  assert.equal(publicCatalogDescriptionCanExpand('Descripción breve.'), false);
  assert.equal(publicCatalogDescriptionCanExpand('x'.repeat(111)), true);
  assert.equal(publicCatalogDescriptionCanExpand('x'.repeat(86), true), true);
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

test('kiosk center composes native and scoped operational tools while the public multi-kiosk works across browser sizes', async () => {
  const [appSource, navigationSource, centerSource, editorSource, lifecycleSource, accessSource, activitySource, mobileSource, launcherSource, hostSource, payablesWorkspaceSource, posWorkspaceSource, taskWorkspaceSource, legacyTaskWorkspaceSource, mobileTranslations, apiSource, workspaceCopySource, adminTranslations] = await Promise.all([
    readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/config/navigation.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskCenterPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskEditorModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskLifecycleModals.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/KioskAccessView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/KioskActivityView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskLauncherDashboard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolHost.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PayablesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PointOfSaleMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/EmployeeTaskMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/LegacyTaskMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskMobileTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/multiKiosks.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/kioskCenterWorkspaceTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskAdminTranslations.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(appSource, /KioskCenter\/MultiKioskCenterPage/);
  assert.match(appSource, /currentPage === 'kiosk-center'/);
  assert.match(appSource, /currentPage === 'kiosk-management'/);
  assert.match(navigationSource, /'kiosk-management'/);
  assert.match(centerSource, /getMultiKioskAdminCopy/);
  assert.match(centerSource, /tools: \[\], providerTools: \[\], kiosks: \[\], employees: \[\]/);
  assert.match(centerSource, /IndiceWorkspaceNavigation/);
  for (const view of ['multi-kiosks', 'inventory', 'people', 'activity']) {
    assert.match(centerSource, new RegExp(`['"]${view}['"]`));
  }
  assert.match(editorSource, /multiKioskAdminApi\.create/);
  assert.match(editorSource, /tool_keys: editor\.toolKeys/);
  assert.match(editorSource, /legacy_kiosk_definition_ids/);
  assert.match(editorSource, /toolKeys: string\[\]/);
  assert.match(editorSource, /legacyKioskDefinitionIds: number\[\]/);
  assert.doesNotMatch(editorSource, /\bkiosk_definition_ids:/);
  assert.doesNotMatch(editorSource, /employee_ids|employeeIds|toggleEmployee|Buscar empleado/);
  assert.doesNotMatch(apiSource, /employee_ids/);
  assert.match(editorSource, /copy\.editor\.footerSummary/);
  assert.match(editorSource, /copy\.editor\.stepTools/);
  assert.match(editorSource, /copy\.editor\.companyAccessDescription/);
  assert.match(editorSource, /copy\.editor\.catalogTitle/);
  assert.match(editorSource, /copy\.editor\.catalogDescription/);
  assert.match(editorSource, /copy\.editor\.operationalCatalogTitle/);
  assert.match(editorSource, /catalog\.kiosks/);
  assert.match(editorSource, /kioskScope/);
  assert.match(editorSource, /getMultiKioskToolPresentation/);
  assert.match(editorSource, /MultiKioskToolGlyph/);
  assert.match(editorSource, /copy\.editor\.previewTitle/);
  assert.match(editorSource, /aria-pressed=\{selected\}/);
  assert.match(adminTranslations, /Herramientas de la compañía/);
  assert.match(adminTranslations, /Después del PIN, cada colaborador verá solo/);
  assert.match(adminTranslations, /Así lo verá el colaborador/);
  for (const locale of ['en-CA', 'en-US', 'fr-CA', 'es-MX', 'es-CO', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.match(adminTranslations, new RegExp(`['"]${locale}['"]`));
  }
  assert.match(editorSource, /unit_id: null,\s*business_id: null/);
  assert.doesNotMatch(editorSource, /matchesScope|unitOptions|businessOptions/);
  assert.doesNotMatch(editorSource, /Unidad de negocio|Todos los negocios/);
  assert.match(editorSource, /default_locale/);
  assert.match(editorSource, /languages\.map/);
  assert.doesNotMatch(centerSource, /Empleados asignados|employee_count\} empleados|asígnalo a los colaboradores/);
  assert.match(centerSource, /KioskStatusNavigator/);
  assert.match(centerSource, /IndiceFilterBar/);
  assert.match(centerSource, /item\.tool_count/);
  assert.match(centerSource, /catalog/);
  assert.doesNotMatch(centerSource, /item\.kiosk_count/);
  assert.match(apiSource, /interface MultiKioskCatalogTool/);
  assert.match(apiSource, /tool_key\?: string/);
  assert.match(apiSource, /tool_keys\?: string\[\]/);
  assert.match(apiSource, /legacy_kiosk_definition_ids\?: number\[\]/);
  assert.match(accessSource, /copy\.access\.readinessNote/);
  assert.match(accessSource, /MultiKioskCatalogTool/);
  assert.doesNotMatch(accessSource, /MultiKioskCatalogKiosk|employeeMatchesKioskOrganizationScope/);
  assert.match(workspaceCopySource, /Los permisos se administran desde Usuarios/);
  assert.doesNotMatch(workspaceCopySource, /colaboradores asignados|Assigned collaborators/);
  assert.match(lifecycleSource, /KioskModalFrame/);
  assert.doesNotMatch(`${centerSource}\n${lifecycleSource}`, /window\.confirm/);
  assert.match(accessSource, /tab_scopes/);
  assert.match(accessSource, /effective_access/);
  assert.match(activitySource, /kioskCenterApi\.audit/);
  assert.doesNotMatch(`${centerSource}\n${editorSource}\n${accessSource}`, /employeeKiosksApi|AUTHENTICATED_WEB/);
  assert.match(mobileSource, /if \(multiKioskMobileSession\.get\(token\)\)/);
  assert.match(mobileSource, /bootstrap && !session/);
  assert.doesNotMatch(mobileSource, /useDesktopViewport|bootstrap && desktop|copy\.desktop/);
  assert.doesNotMatch(mobileTranslations, /mobileOnly|únicamente en móvil|only on mobile/);
  assert.match(mobileSource, /EmployeeKioskHome/);
  assert.match(mobileSource, /const posWorkspace = workspace\?\.kiosk\.module === 'POINT_OF_SALE'/);
  assert.match(mobileSource, /posWorkspace \? 'max-w-\[96rem\]' : providerWorkspace \? 'max-w-5xl' : 'max-w-3xl'/);
  assert.match(launcherSource, /cards\.length === 0 \? copy\.noAccess : copy\.noMatches/);
  assert.match(launcherSource, /grid-cols-1[\s\S]*min-\[360px\]:grid-cols-2[\s\S]*md:grid-cols-3[\s\S]*xl:grid-cols-4/);
  assert.match(hostSource, /toolKey === 'employee\.my-tasks@1'/);
  assert.match(hostSource, /!toolKey && workspaceKind === 'MY_TASKS'/);
  assert.match(hostSource, /!toolKey && \(workspaceKind === 'TASKS' \|\| ownerModule === 'PROCESS_TASKS'\)/);
  assert.match(hostSource, /<LegacyTaskMultiKioskWorkspace/);
  assert.match(hostSource, /<PayablesMultiKioskWorkspace/);
  assert.match(hostSource, /<PointOfSaleMultiKioskWorkspace/);
  assert.match(payablesWorkspaceSource, /payables\.submission\.create@1/);
  assert.match(payablesWorkspaceSource, /payables\.attachment\.presign@1/);
  assert.match(payablesWorkspaceSource, /data-multi-kiosk-payables/);
  assert.match(posWorkspaceSource, /pos\.self-service\.preticket\.create@1/);
  assert.match(posWorkspaceSource, /WaiterStationWorkspace/);
  assert.match(posWorkspaceSource, /kioskType === 'self_service'/);
  assert.match(posWorkspaceSource, /kioskType === 'waiter_station'/);
  assert.doesNotMatch(posWorkspaceSource, /OrderCenterWorkspace|KitchenWorkspace|self_checkout/);
  assert.match(adminTranslations, /Abrir y cobrar una caja permanece exclusivamente en la app POS/);
  assert.match(posWorkspaceSource, /data-multi-kiosk-pos/);
  assert.match(posWorkspaceSource, /data-preticket-cart-bar/);
  assert.match(posWorkspaceSource, /data-preticket-result/);
  assert.match(posWorkspaceSource, /<KioskModalFrame/);
  assert.match(posWorkspaceSource, /surface="public"/);
  assert.match(posWorkspaceSource, /grid h-11 w-11/);
  assert.doesNotMatch(posWorkspaceSource, /absolute inset-0 z-50 grid place-items-center/);
  assert.match(legacyTaskWorkspaceSource, /process-tasks\.task\.create@1/);
  assert.match(legacyTaskWorkspaceSource, /process-tasks\.task\.complete@1/);
  assert.match(legacyTaskWorkspaceSource, /canCreateTask/);
  assert.match(legacyTaskWorkspaceSource, /canCompleteTask/);
  assert.match(legacyTaskWorkspaceSource, /action_outcome === 'CONTRIBUTION_READY'/);
  assert.match(legacyTaskWorkspaceSource, /contributionFlow \? \{\} : \{ completion_percent: 100 \}/);
  assert.match(legacyTaskWorkspaceSource, /taskCopy\.selectedTask\.markContributionReady/);
  assert.match(hostSource, /!toolKey && \(workspaceKind === 'ATTENDANCE' \|\| ownerModule === 'HUMAN_RESOURCES'/);
  assert.match(taskWorkspaceSource, /employeeTaskCapabilities\.complete/);
  assert.match(mobileTranslations, /noAccess:/);
  assert.match(mobileTranslations, /Esta herramienta necesita actualización/);
});

test('kiosk center uses the Indice operating system for navigation, filters, tables, and safe modal detail', async () => {
  const [center, multi, access, activity, editor, lifecycle, navigator, translations, workspaceTranslations, makefile] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/KioskCenterPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskCenterPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/KioskAccessView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/KioskActivityView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskEditorModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskLifecycleModals.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/components/KioskStatusNavigator.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/kioskCenterTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/kioskCenterWorkspaceTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../Makefile', import.meta.url), 'utf8'),
  ]);

  for (const source of [center, multi, access, activity]) {
    assert.match(source, /IndiceTitleBar/);
    assert.match(source, /tone="aqua"/);
  }
  assert.match(center, /IndiceFilterDisclosureActions/);
  assert.match(center, /IndiceOperationalTable/);
  assert.match(center, /IndiceTableHeaderRow/);
  assert.match(center, /DataTablePagination/);
  assert.match(center, /<KioskModalFrame/);
  assert.match(center, /copy\.labels\.technicalDetails/);
  assert.doesNotMatch(center, /<IndiceModalFrame/);
  assert.doesNotMatch(center, /font-(?:bold|extrabold|black)/);
  assert.match(access, /copy\.access\.reviewAccess/);
  assert.match(access, /<IndiceTableShell/);
  assert.match(activity, /auditLabels\.events/);
  assert.match(activity, /technicalDetails/);
  assert.match(editor, /open=\{!discardPromptOpen\}/);
  assert.match(editor, /copy\.editor\.discardTitle/);
  assert.match(editor, /copy\.editor\.presentationOptions/);
  assert.match(editor, /accent="aqua"/);
  assert.doesNotMatch(`${editor}\n${lifecycle}`, /tone="blue"/);
  assert.match(navigator, /aria-pressed=\{active\}/);
  assert.match(multi, /navigate\('\/dashboard'\)/);
  assert.match(multi, /workspaceCopy\.backToDashboard/);
  assert.match(workspaceTranslations, /Volver al dashboard/);
  assert.match(makefile, /KIOSK_GLOBAL_CENTER_ENABLED="\$\(LOCAL_KIOSK_GLOBAL_CENTER_ENABLED\)"/);
  assert.match(makefile, /KIOSK_MULTI_DASHBOARD_ENABLED="\$\(LOCAL_KIOSK_MULTI_DASHBOARD_ENABLED\)"/);
  assert.match(makefile, /KIOSK_ENGINE_ADAPTER_PETTY_CASH_ENABLED="\$\(LOCAL_KIOSK_ADAPTER_PETTY_CASH_ENABLED\)"/);
  assert.match(makefile, /KIOSK_ENGINE_ADAPTER_PAYABLES_ENABLED="\$\(LOCAL_KIOSK_ADAPTER_PAYABLES_ENABLED\)"/);
  assert.match(translations, /Estado y señales/);
  assert.doesNotMatch(translations, /Información consolidada del Engine/);
});

test('multi-kiosk launcher and editor preserve accessible status, ordering and narrow layouts', async () => {
  const [identityGate, tile, launcher, editor, adminTranslations, mobileTranslations, taskDialog, kioskModalFrame] = await Promise.all([
    readFile(new URL('../src/app/components/kiosk-engine/KioskIdentityGate.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolTile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskLauncherDashboard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskEditorModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskAdminTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskMobileTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/components/EmployeeTaskMultiKioskTaskDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/components/kiosk-engine/KioskModalFrame.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(identityGate, /tone === 'aqua'[\s\S]*tone === 'coral'[\s\S]*tone === 'yellow'/);
  assert.match(tile, /aria-label=\{\[[\s\S]*statusLabel[\s\S]*\.join\('\. '\)\}/);
  assert.match(launcher, /const resultCountLabel = copy\.accessCount\(visibleCards\.length\)/);
  assert.match(launcher, /aria-live="polite"[\s\S]*\{resultCountLabel\}/);
  assert.match(editor, /const providerFlow = form\.audience_type === 'PROVIDER'/);
  assert.match(editor, /const activeTools = providerFlow \? catalog\.providerTools : catalog\.tools/);
  assert.match(editor, /selectableToolCount = activeTools\.filter\(toolIsSelectable\)\.length/);
  assert.match(editor, /footerSummary\([\s\S]*selectableToolCount/);
  assert.match(editor, /copy\.editor\.moveUp\(displayName\)/);
  assert.match(editor, /IndiceModalWizardStepper/);
  assert.match(editor, /grid h-11 w-11/);
  assert.doesNotMatch(editor, /font-semibold uppercase tracking-wide/);
  assert.match(editor, /grid-cols-1[\s\S]*min-\[360px\]:grid-cols-2[\s\S]*sm:grid-cols-3/);
  assert.match(adminTranslations, /moveUp: \(name: string\) => string/);
  assert.match(mobileTranslations, /INVENTORY: 'Inventarios'/);
  assert.match(mobileTranslations, /INVENTORY: 'Inventory'/);
  assert.doesNotMatch(mobileTranslations, /módulo o scope correspondiente|module or tab scope/);
  assert.match(taskDialog, /grid-cols-1[\s\S]*sm:grid-cols-2/);
  assert.doesNotMatch(taskDialog, /className="truncate">\{copy\.task\.(?:start|due)\}/);
  assert.match(kioskModalFrame, /!h-dvh !max-h-dvh !w-full !max-w-none !rounded-none/);
  assert.match(kioskModalFrame, /safe-area-inset-bottom/);
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
  assert.match(center, /setCashRegisterFilter\('all'\)[\s\S]*void reload\(\)/);
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

test('restaurant kiosks share one traced order from waiter to kitchen and POS checkout', async () => {
  const [routes, creation, workspace, waiterWorkspace, productModal, adminApi, sale, restaurantQueue] = await Promise.all([
    readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/RestaurantKioskCreationFlow.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/RestaurantKiosk/RestaurantKioskPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/RestaurantKiosk/WaiterStationWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/RestaurantKiosk/RestaurantProductModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Kiosks/posKioskAdminApi.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Sale/Sale.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/PointOfSale/Sale/hooks/usePendingRestaurantOrders.ts', import.meta.url), 'utf8'),
  ]);
  const restaurantWorkspace = `${workspace}\n${waiterWorkspace}\n${productModal}`;

  assert.match(creation, /<KioskModalFrame/);
  assert.ok(creation.includes('waiter_station'));
  assert.ok(creation.includes('table_order_center'));
  assert.ok(creation.includes('kitchen_display'));
  assert.match(creation, /Promise\.allSettled/);
  assert.match(creation, /ecosystemsResult\.status === 'fulfilled'/);
  assert.match(creation, /registersResult\.status === 'fulfilled'/);
  assert.match(creation, /setCashRegisterId\(current =>/);
  assert.match(creation, /Kiosco → empleado → mesa → cocina → ticket/);
  assert.match(creation, /Crear estación móvil de mesero/);
  assert.match(creation, /Teléfono o terminal táctil/);
  assert.match(adminApi, /restaurantTrace/);
  assert.ok(routes.includes("/pos-restaurant/waiter/:publicAccessToken"));
  assert.ok(routes.includes("/pos-restaurant/orders/:publicAccessToken"));
  assert.ok(routes.includes("/pos-restaurant/kitchen/:publicAccessToken"));
  assert.match(restaurantWorkspace, /pos.restaurant.order.open/);
  assert.match(restaurantWorkspace, /pos.restaurant.round.send/);
  assert.match(restaurantWorkspace, /pos.restaurant.item.status/);
  assert.match(restaurantWorkspace, /pos.restaurant.check.request/);
  assert.match(workspace, /!workspace.sourceRegisterOpen/);
  assert.match(workspace, /La operación del turno anterior quedó archivada/);
  assert.match(workspace, /requestFullscreen/);
  assert.match(workspace, /Pantalla completa/);
  assert.match(workspace, /data-order-center-workspace/);
  assert.match(workspace, /<RestaurantFloorPlanPanel/);
  assert.match(workspace, /data-captain-monitor/);
  assert.match(workspace, /data-captain-kpis/);
  assert.match(workspace, /Monitor del capitán/);
  assert.match(workspace, /data-hostess-assignment/);
  assert.match(workspace, /Asignar mesa e iniciar servicio/);
  assert.match(workspace, /data-service-timeline/);
  assert.match(workspace, /Tomar orden/);
  assert.match(workspace, /Enviar a cocina/);
  assert.match(workspace, /Inicio en cocina/);
  assert.match(workspace, /Preparación/);
  assert.match(workspace, /Servir/);
  assert.match(workspace, /Solicitar cuenta/);
  assert.match(workspace, /order\.firstItemAt/);
  assert.match(workspace, /order\.checkRequestedAt/);
  assert.match(workspace, /activeItems\.every\(item => item\.status === 'SERVED'\)/);
  assert.match(workspace, /En vivo · 5 s/);
  assert.match(workspace, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 1_000\)/);
  assert.match(workspace, /buildCaptainMonitor/);
  assert.match(workspace, /captainElapsed/);
  assert.match(workspace, /elapsedSeconds >= 15 \* 60/);
  assert.match(workspace, /elapsedSeconds >= 8 \* 60/);
  assert.match(workspace, /Ordenado por mesa seleccionada, atención y antigüedad/);
  assert.match(workspace, /captainPriority\(right, now\) - captainPriority\(left, now\)/);
  assert.match(workspace, /data-kitchen-workspace/);
  assert.match(workspace, /data-kitchen-ticket/);
  assert.match(workspace, /groupKitchenTickets/);
  assert.match(workspace, /itemIds: ticket\.items\.map/);
  assert.match(workspace, /Iniciar preparación/);
  assert.match(workspace, /Marcar como lista/);
  assert.match(workspace, /status === 'ACKNOWLEDGED'[\s\S]*return 'PREPARING'/);
  assert.doesNotMatch(workspace, /label: 'Confirmados'/);
  assert.doesNotMatch(workspace, /actionLabel: 'Confirmar comanda'/);
  assert.match(workspace, /elapsedKitchenTime/);
  assert.doesNotMatch(workspace, /function KitchenCard\(/);
  assert.match(waiterWorkspace, /export function RestaurantFloorPlanPanel/);
  assert.match(waiterWorkspace, /canEditFloorPlan=\{workspace\.canEditFloorPlan\}/);
  assert.match(workspace, /useKioskSessionBoundary/);
  assert.match(workspace, /isTerminalStationSessionFailure/);
  assert.match(workspace, /setSession\(null\)[\s\S]*setWorkspace\(null\)/);
  assert.match(workspace, /sessionExpiredMessage=/);
  assert.match(workspace, /Ingresa tu PIN nuevamente/);
  assert.match(waiterWorkspace, /data-waiter-workspace/);
  assert.match(waiterWorkspace, /data-mobile-waiter-navigation/);
  assert.match(waiterWorkspace, /sticky top-0 z-20 grid grid-cols-2/);
  assert.match(waiterWorkspace, /lg:grid-cols-2/);
  assert.match(waiterWorkspace, /mobilePane/);
  assert.match(waiterWorkspace, /responsibleWaiterName/);
  assert.match(waiterWorkspace, /pos\.restaurant\.floor-plan\.update/);
  assert.match(waiterWorkspace, /Editar salón/);
  assert.match(waiterWorkspace, /hidden h-11[\s\S]*lg:inline-flex/);
  assert.match(waiterWorkspace, /Acomodar automáticamente/);
  assert.match(waiterWorkspace, /Guardar acomodo/);
  assert.match(waiterWorkspace, /layoutShape === 'ROUND'/);
  assert.match(waiterWorkspace, /layoutShape === 'SQUARE'/);
  assert.match(waiterWorkspace, /layoutShape === 'RECTANGLE'/);
  assert.match(waiterWorkspace, /setPointerCapture/);
  assert.match(waiterWorkspace, /canPlaceTable/);
  assert.match(waiterWorkspace, /Código estable:/);
  assert.match(waiterWorkspace, /Orden del salón/);
  assert.doesNotMatch(waiterWorkspace, /role="tablist"/);
  assert.match(waiterWorkspace, /Comanda por comensal/);
  assert.match(waiterWorkspace, /sticky bottom-0 z-20[\s\S]*safe-area-inset-bottom/);
  assert.match(waiterWorkspace, /item\.guestNumber \|\| 1/);
  assert.match(waiterWorkspace, /RestaurantProductModal/);
  assert.match(waiterWorkspace, /Agregar productos/);
  assert.match(productModal, /<KioskModalFrame/);
  assert.match(productModal, /surface="public"/);
  assert.match(productModal, /size="workspace"/);
  assert.doesNotMatch(productModal, /PosModalFrame/);
  assert.match(productModal, /guestNumber,/);
  assert.match(productModal, /Comensal \{guest\}/);
  assert.match(productModal, /min-h-14/);
  assert.match(productModal, /Cantidad por toque/);
  assert.match(productModal, /const sellableProducts = useMemo/);
  assert.match(productModal, /!product\.stockTracked \|\| Number\(product\.availableQuantity \|\| 0\) > 0/);
  assert.match(productModal, /return sellableProducts\.filter\(product =>/);
  assert.match(sale, /usePendingRestaurantOrders/);
  assert.match(sale, /restaurantOrderId: activeRestaurantOrderId/);
  assert.ok(restaurantQueue.includes('/api/v1/pos/restaurant/orders/${orderId}/claim'));
  assert.match(restaurantQueue, /replaceCart\(lines\)/);
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
  assert.match(source, /executeKioskMutationWithMismatchRecovery/);
  assert.match(source, /completeKioskIdempotentOperation/);
  assert.match(source, /multi-kiosk:child:\$\{kioskId\}:action:\$\{capability\}/);
  assert.doesNotMatch(source, /Idempotency-Key': crypto\.randomUUID/);
  assert.doesNotMatch(source, /public_token.*child|child.*public_token/i);
});

test('multi-kiosk employee workspaces dispatch attendance and petty cash only through child actions', async () => {
  const [page, host, humanResources, attendance, pettyCash, uploads, attendanceCapture] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolHost.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/HumanResourcesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/AttendanceMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PettyCashMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskWorkspaceUploads.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/useMultiKioskAttendancePhotoCapture.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /<MultiKioskToolHost/);
  assert.match(host, /toolKey === 'employee\.attendance@1'/);
  assert.match(host, /workspaceKind === 'PETTY_CASH'/);
  assert.match(host, /<HumanResourcesMultiKioskWorkspace/);
  assert.match(humanResources, /<AttendanceMultiKioskWorkspace/);
  assert.match(host, /<PettyCashMultiKioskWorkspace/);
  assert.match(attendance, /PublicKioskIdentityPanel/);
  assert.match(attendance, /usePublicKioskViewModel/);
  assert.match(attendance, /attendance\.face\.verification\.begin@1/);
  assert.match(attendance, /attendance\.face\.verification\.capture\.presign@1/);
  assert.match(attendance, /attendance\.face\.verification\.complete@1/);
  assert.match(attendance, /attendance\.photo\.presign@1/);
  assert.match(attendance, /attendance\.punch\.create@1/);
  assert.match(attendance, /!canCreatePunch \|\| !hasIdentityEvidence/);
  assert.match(attendance, /if \(!locationState\)/);
  assert.match(attendance, /multiKioskPublicApi\.action/);
  assert.match(attendance, /const punchInFlightRef = useRef\(false\)/);
  assert.match(attendance, /if \(punchInFlightRef\.current\) return/);
  assert.match(attendance, /punchInFlightRef\.current = true/);
  assert.match(attendance, /finally \{[\s\S]*?punchInFlightRef\.current = false/);
  assert.match(attendance, /setTodayActivity\(\(current\) => result\.today_activity \?\? current\)/);
  assert.doesNotMatch(attendance, /await onRefresh\(\)/);
  assert.match(attendance, /aria-busy=\{busyState === 'recording' \|\| undefined\}/);
  assert.match(attendance, /role="status"[\s\S]*?\{copy\.recording\}/);
  assert.match(attendance, /timeoutMs: attendanceEvidenceUploadTimeoutMs/);
  assert.doesNotMatch(attendance, /humanResourcesApi\.|attendancePublicKiosk|deviceToken/);
  assert.doesNotMatch(attendanceCapture, /humanResourcesApi|attendancePublicKiosk/);

  assert.match(pettyCash, /petty-cash\.receipt\.create@1/);
  assert.match(pettyCash, /petty-cash\.attachment\.presign@1/);
  assert.match(pettyCash, /petty-cash\.attachment\.register@1/);
  assert.match(pettyCash, /petty-cash\.attachments\.read@1/);
  assert.match(pettyCash, /resource_id: receiptId/);
  assert.match(pettyCash, /KioskWorkspaceTabs/);
  assert.match(pettyCash, /multiKioskPublicApi\.action/);
  assert.doesNotMatch(pettyCash, /pettyCashKioskApi\.|public-kiosk/);

  assert.match(uploads, /method: 'PUT'/);
  assert.match(uploads, /new AbortController\(\)/);
  assert.match(uploads, /signal: controller\?\.signal/);
  assert.match(uploads, /KIOSK_EVIDENCE_UPLOAD_TIMEOUT/);
  assert.match(uploads, /globalThis\.clearTimeout\(timeoutId\)/);
  assert.doesNotMatch(uploads, /\/api\//);
});

test('multi-kiosk attendance presents a compact capability-aware mobile flow without dead ends', async () => {
  const [page, attendance, identityPanel, verificationSection, shell, index] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/AttendanceMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/HumanResources/Control/components/kiosk/PublicKioskIdentityPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/HumanResources/Control/components/kiosk/PublicKioskVerificationSection.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/components/kiosk-engine/KioskPublicShell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);

  assert.match(attendance, /max-w-\[31rem\]/);
  assert.match(attendance, /canUseFace=\{canUseFace\}/);
  assert.match(attendance, /function safeError\(error: unknown, fallback: string\)[\s\S]*error\.message/);
  assert.doesNotMatch(attendance, /function safeError\(error: unknown, fallback: string\) \{\s*void error;\s*return fallback;/);
  assert.match(identityPanel, /canUseFace\?: boolean/);
  assert.match(identityPanel, /canUseFace=\{canUseFace\}/);
  assert.match(verificationSection, /\{canUseFace \? \([\s\S]*Face ID/);
  assert.match(verificationSection, /canUseFace \? 'grid-cols-2' : 'grid-cols-1'/);
  assert.match(page, /posWorkspace \? 'max-w-\[96rem\]' : providerWorkspace \? 'max-w-5xl' : 'max-w-3xl'/);
  assert.match(page, /compact=\{Boolean\(session\)\}/);
  assert.match(page, /data-multi-kiosk-app-bar/);
  assert.match(page, /identityName=\{session\?\.identity\?\.name \?\? session\?\.provider\?\.name \?\? session\?\.employee\?\.name\}/);
  assert.match(page, /onBack=\{workspace \? providerAudience[\s\S]*?: returnToLauncher : undefined\}/);
  assert.match(page, /workspace\.experience_status !== 'READY'[\s\S]*onClick=\{returnToLauncher\}/);
  assert.match(page, /aria-label=\{copy\.workspace\.back\}[\s\S]*?<ArrowLeft/);
  assert.match(shell, /env\(safe-area-inset-top\)/);
  assert.match(index, /viewport-fit=cover/);
});

test('multi-kiosk launcher preserves its localized responsive and accessible interaction contract', async () => {
  const [page, launcher, tile, presentation, shell, translations, moduleCatalog] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskLauncherDashboard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolTile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/toolPresentation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/components/kiosk-engine/KioskPublicShell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskMobileTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/config/moduleCatalog.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(launcher, /actionLabel=\{copy\.open\}/);
  assert.match(translations, /open: 'Abrir'/);
  assert.match(translations, /open: 'Open'/);
  assert.match(tile, /aria-busy=\{busy \|\| undefined\}/);
  assert.match(tile, /data-multi-kiosk-id=\{'id' in source \? source\.id : undefined\}/);
  assert.match(tile, /motion-reduce:transition-none/);
  assert.match(page, /lastOpenedKioskIdRef\.current = card\.id/);
  assert.ok(page.includes('querySelector<HTMLButtonElement>(`[data-multi-kiosk-id="${lastOpenedKioskId}"]`)'));
  assert.match(page, /if \(lastOpenedTool\) lastOpenedTool\.focus\(\)/);
  assert.match(page, /launcherFocusRef\.current\?\.focus\(\{ preventScroll: true \}\)/);

  assert.match(launcher, /searchThreshold = 6/);
  assert.match(launcher, /const shouldSearch = cards\.length >= Math\.max\(6, searchThreshold\)/);
  assert.match(launcher, /\{shouldSearch \? \([\s\S]*?role="search"/);
  assert.match(launcher, /copy\.accessCount\(visibleCards\.length\)/);
  assert.match(launcher, /aria-describedby="multi-kiosk-access-note"/);
  assert.match(launcher, /id="multi-kiosk-access-note"[\s\S]*?\{copy\.accessNote\}/);
  assert.match(launcher, /grid-cols-1[\s\S]*?min-\[360px\]:grid-cols-2[\s\S]*?md:grid-cols-3[\s\S]*?xl:grid-cols-4/);

  assert.match(page, /const signOutLabel = bootstrap\.audience_type === 'PROVIDER'/);
  assert.match(page, /data-multi-kiosk-app-bar[\s\S]*?aria-label=\{signOutLabel\}/);
  assert.match(page, /header=\{bootstrap \? \(\(utilities\) => \(/);
  assert.match(page, /utilities=\{utilities\}/);
  assert.match(page, /employeeName=\{session\.identity\?\.name \?\? session\.employee\?\.name \?\? ''\}/);
  assert.match(shell, /data-kiosk-utility-mode="embedded"/);
  assert.match(shell, /headerUsesEmbeddedUtilities \? header\(embeddedUtilities\) : header/);
  assert.match(launcher, /type="search"[\s\S]*?className="min-h-12/);
  assert.match(launcher, /sticky top-0[\s\S]*?role="search"/);
  assert.match(launcher, /sessionStatusLabel/);
  assert.match(tile, /min-h-\[12rem\]/);
  assert.match(tile, /MultiKioskToolEmoji/);
  assert.match(tile, /source=\{source\}/);
  assert.match(tile, /flex w-full min-w-0 flex-1 flex-col items-center/);
  assert.match(tile, /text-center[\s\S]*data-kiosk-tool-action/);
  assert.match(tile, /className="mt-1 block[^\"]*"[\s\S]*?data-kiosk-tool-description/);
  assert.doesNotMatch(tile, /hidden[^\"]*data-kiosk-tool-description/);
  assert.match(shell, /data-kiosk-large-text=\{accessibilityPreferences\.largeText\}/);
  assert.match(shell, /\[&_\[data-kiosk-tool-description\]\]:!block/);
  assert.match(shell, /accessibility: 'Accesibilidad'/);
  assert.match(shell, /aria-label=\{copy\.accessibility\}/);

  assert.match(presentation, /POINT_OF_SALE: \{ Icon: MonitorSmartphone, tone: 'coral' \}/);
  assert.match(presentation, /INVENTORY: \{ Icon: Boxes, tone: 'coral' \}/);
  assert.match(presentation, /emoji: getModuleEmojiBySlug\(moduleSlug\)/);
  assert.match(presentation, /data-kiosk-tool-emoji/);
  assert.match(tile, /data-kiosk-tool-status/);
  assert.doesNotMatch(tile, /line-clamp-2">\{statusLabel\}/);
  assert.match(shell, /\[&_\[data-kiosk-tool-status\]\]:!text-base/);
  assert.match(moduleCatalog, /export function getModuleEmojiBySlug/);
  for (const emoji of ['👥', '✅', '💰', '💸', '🛒', '💼', '📦']) {
    assert.ok(moduleCatalog.includes(`emoji: '${emoji}'`));
  }
  assert.doesNotMatch(`${page}\n${launcher}\n${tile}`, /\bfont-(?:bold|extrabold|black)\b/);
});

test('employee multi-kiosk home remasters only the launcher and preserves authorized tool order', async () => {
  const [page, home, launcher] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/EmployeeKioskHome.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskLauncherDashboard.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /provider \? \([\s\S]*ProviderPortalHome[\s\S]*\) : \([\s\S]*EmployeeKioskHome/);
  assert.match(home, /data-employee-kiosk-home/);
  assert.match(home, /<h2[\s\S]*\{employeeName\}/);
  assert.match(home, /copy\.launcher\.activeSession/);
  assert.match(home, /copy\.launcher\.accessCount\(cards\.length\)/);
  assert.match(home, /<MultiKioskLauncherDashboard[\s\S]*cards=\{cards\}/);
  assert.doesNotMatch(home, /copy\.header\.defaultDescription|copy\.launcher\.accessNote/);
  assert.doesNotMatch(home, /\.sort\(|multiKioskPublicApi|MultiKioskToolHost|workspace/);
  assert.match(launcher, /min-\[360px\]:grid-cols-2/);
});

test('human resources kiosk expands attendance with capability-scoped employee sections', async () => {
  const [host, workspace, api, translations] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolHost.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/HumanResourcesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/multiKiosks.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/humanResourcesKioskTranslations.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(host, /toolKey === 'employee\.attendance@1'[\s\S]*<HumanResourcesMultiKioskWorkspace/);
  assert.match(workspace, /human-resources\.announcements\.read@1/);
  assert.match(workspace, /human-resources\.records\.read@1/);
  assert.match(workspace, /human-resources\.permissions\.read@1/);
  assert.match(workspace, /human-resources\.permission\.create@1/);
  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /<AttendanceMultiKioskWorkspace/);
  assert.match(workspace, /multiKioskPublicApi\.action/);
  assert.match(workspace, /<KioskModalFrame/);
  assert.match(workspace, /surface="public"/);
  assert.match(workspace, /min-h-12/);
  assert.match(api, /hr_portal\?: HumanResourcesKioskBootstrap/);
  assert.match(translations, /Asistencia[\s\S]*Comunicados[\s\S]*Actas[\s\S]*Permisos/);
  assert.doesNotMatch(workspace, /dangerouslySetInnerHTML|humanResourcesApi/);
});

test('multi-kiosk mobile workspace uses only canonical version-one capability keys', async () => {
  const [page, host, tasks, taskHook, humanResources, attendance, pettyCash] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolHost.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/EmployeeTaskMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/hooks/useEmployeeTaskMultiKioskWorkspace.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/HumanResourcesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/AttendanceMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PettyCashMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
  ]);

  const mobileWorkspaceSource = `${page}\n${host}\n${tasks}\n${taskHook}\n${humanResources}\n${attendance}\n${pettyCash}`;
  assert.doesNotMatch(mobileWorkspaceSource, /@[vV]1\b/);
  assert.match(taskHook, /process-tasks\.tasks\.read@1/);
  assert.match(taskHook, /process-tasks\.task\.create@1/);
  assert.match(taskHook, /process-tasks\.task\.complete@1/);
  assert.doesNotMatch(`${tasks}\n${taskHook}`, /process-tasks\.task\.(?:responsible|attachment)/);
});

test('multi-kiosk launcher lets a shared device return safely to employee PIN identification', async () => {
  const [page, api, identityGate, translations] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/multiKiosks.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/components/kiosk-engine/KioskIdentityGate.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskMobileTranslations.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /<KioskIdentityGate/);
  assert.match(page, /pinLength=\{5\}/);
  assert.doesNotMatch(page, /id="multi-kiosk-pin"/);
  assert.match(identityGate, /type="password"/);
  assert.match(page, /copy\.launcher\.signOut/);
  assert.match(translations, /signOut: 'Cerrar sesión \/ Cambiar colaborador'/);
  assert.match(page, /await multiKioskPublicApi\.signOut\(token, bootstrap\.csrf_token\)/);
  assert.match(page, /finally \{/);
  assert.match(page, /multiKioskMobileSession\.clearAuthority\(token\)/);
  assert.match(page, /setWorkspace\(null\)/);
  assert.match(page, /setActiveKioskId\(null\)/);
  assert.match(page, /setSession\(null\)/);
  assert.match(page, /onSignOut=\{session \? \(\) => \{ void signOut\(\); \} : undefined\}/);
  assert.match(page, /useSearchParams\(\)/);
  assert.match(page, /requestedToolIdentity = searchParams\.get\('tool'\)/);
  assert.match(page, /getMultiKioskToolIdentity\(card\)/);
  assert.match(page, /const returnToLauncher/);
  assert.match(page, /setToolRoute\(null, true\)/);
  assert.match(api, /signOut:[\s\S]*method: 'DELETE'/);
  assert.match(api, /signOut:[\s\S]*'X-CSRF-Token': currentCsrfToken/);
  assert.match(api, /signOut:[\s\S]*withPublicCsrfRecovery/);
  assert.match(api, /signOut:[\s\S]*'X-Multi-Kiosk-Session-Token': multiKioskMobileSession\.get\(token\)/);
});

test('multi-kiosk deep links keep the requested tool authoritative and permit a retry after failure', async () => {
  const [page, presentation] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/toolPresentation.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /const activeToolIdentity = workspace \? getMultiKioskToolIdentity\(workspace\.kiosk\) : ''/);
  assert.match(page, /if \(activeToolIdentity === requestedToolIdentity\) return/);
  assert.match(page, /setWorkspace\(null\);[\s\S]*setActiveKioskId\(null\);[\s\S]*void openTool\(card, false\)/);
  assert.match(page, /if \(requestedToolIdentity\) return;[\s\S]*routeAttemptRef\.current = '';[\s\S]*if \(!workspace\) return/);
  assert.match(presentation, /if \(isLauncherCard\(source\)\) return `legacy:\$\{source\.id\}`/);
});

test('multi-kiosk separates parent session failure from loss of one child kiosk', async () => {
  const [page, api, host, taskHook, humanResources, attendance, pettyCash] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/multiKiosks.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolHost.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/ProcessesTasks/Kiosk/hooks/useEmployeeTaskMultiKioskWorkspace.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/HumanResourcesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/AttendanceMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PettyCashMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(api, /clearAuthority:[\s\S]*removeStoredByPrefix\(childSessionPrefix\(token\)\)/);
  assert.match(api, /error\.status === 401 \|\| error\.status === 403/);
  assert.match(api, /error\.status === 404[\s\S]*error\.code === 'KIOSK_NOT_AVAILABLE'/);
  assert.match(page, /const handleAuthorizationFailure = useCallback/);
  assert.match(page, /clearLocalAuthority\(copy\.errors\.sessionExpired\)/);
  assert.match(page, /multiKioskMobileSession\.childClear\(token, kioskId\)/);
  assert.match(page, /current\.kiosks\.filter\(card => card\.id !== kioskId\)/);
  assert.match(page, /clearChildAuthority\(kioskId, copy\.errors\.toolUnavailable\)/);
  assert.match(page, /<MultiKioskToolHost[\s\S]*onAuthorizationFailure=\{handleAuthorizationFailure\}/);
  assert.match(host, /<EmployeeTaskMultiKioskWorkspace[\s\S]*onAuthorizationFailure=\{onAuthorizationFailure\}/);
  assert.match(host, /<HumanResourcesMultiKioskWorkspace[\s\S]*onAuthorizationFailure=\{onAuthorizationFailure\}/);
  assert.match(host, /<PettyCashMultiKioskWorkspace[\s\S]*onAuthorizationFailure=\{onAuthorizationFailure\}/);
  assert.match(taskHook, /onAuthorizationFailure\(error\)/);
  assert.match(attendance, /onAuthorizationFailure\(error\)/);
  assert.match(humanResources, /onAuthorizationFailure\(error\)/);
  assert.match(pettyCash, /onAuthorizationFailure\(error\)/);
});

test('multi-kiosk applies its configured locale without replacing an explicit kiosk choice', async () => {
  const [page, shell, translations, editor, adminTranslations] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/MultiKioskMobilePage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/components/kiosk-engine/KioskPublicShell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskMobileTranslations.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/MultiKioskEditorModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multiKioskAdminTranslations.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /defaultLocale=\{bootstrap\?\.locale\}/);
  assert.match(page, /locale=\{currentLanguage\.code\}/);
  assert.match(shell, /kioskLanguageStorageKey/);
  assert.match(shell, /explicitLocale/);
  assert.match(editor, /copy\.editor\.initialLanguage/);
  assert.match(adminTranslations, /initialLanguage: 'Idioma inicial'/);
  for (const locale of ['en-CA', 'en-US', 'fr-CA', 'es-MX', 'es-CO', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.match(translations, new RegExp(`['"]${locale}['"]`));
  }
  assert.match(shell, /'fr-CA': frenchUtilityCopy/);
  assert.match(shell, /'pt-BR': portugueseUtilityCopy/);
  assert.match(shell, /'ko-CA': koreanUtilityCopy/);
  assert.match(shell, /'zh-CA': chineseUtilityCopy/);
});

test('multi-kiosk financial and POS writes prevent double submit and retry evidence on the original record', async () => {
  const [payables, pettyCash, pointOfSale] = await Promise.all([
    readFile(new URL('../src/app/KioskCenter/PayablesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PettyCashMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/PointOfSaleMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(payables, /const submitLock = useRef\(false\)/);
  assert.match(payables, /pendingExpenseId/);
  assert.match(payables, /let expenseId = pendingExpenseId/);
  assert.match(payables, /setAttachments\(failedFiles\)/);
  assert.match(payables, /retryingEvidence \? copy\.retryEvidence : copy\.submitPayable/);

  assert.match(pettyCash, /const receiptInFlightRef = useRef\(false\)/);
  assert.match(pettyCash, /pendingReceiptId/);
  assert.match(pettyCash, /let receiptId = pendingReceiptId/);
  assert.match(pettyCash, /setAttachments\(failedFiles\)/);
  assert.match(pettyCash, /retryingEvidence \? copy\.publicKiosk\.receipt\.retryEvidence/);

  assert.match(pointOfSale, /const createInFlightRef = useRef\(false\)/);
  assert.match(pointOfSale, /if \(!canCreate \|\| createInFlightRef\.current\) return/);
  assert.match(pointOfSale, /createInFlightRef\.current = false/);
});

test('employee route sales is a native mobile tool with a guarded end-to-end checkout', async () => {
  const [workspace, host, presentation, api] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/Sales/Kiosk/RouteSalesMultiKioskWorkspace.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/MultiKioskToolHost.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/KioskCenter/multi-kiosk/toolPresentation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/api/multiKiosks.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(host, /toolKey === 'employee\.route-sales@1'/);
  assert.match(host, /<RouteSalesMultiKioskWorkspace[\s\S]*onAuthorizationFailure=\{onAuthorizationFailure\}/);
  assert.match(presentation, /'employee\.route-sales@1': \{ Icon: ShoppingBag, tone: 'coral' \}/);
  assert.match(presentation, /ROUTE_SALES: \{ Icon: ShoppingBag, tone: 'coral' \}/);
  assert.match(api, /export interface RouteSalesKioskBootstrap/);
  assert.match(workspace, /sales\.route\.contact\.create@1/);
  assert.match(workspace, /sales\.route\.sale\.create@1/);
  assert.match(workspace, /sales\.route\.payment-evidence\.presign@1/);
  assert.match(workspace, /sales\.route\.payment-evidence\.register@1/);
  assert.match(workspace, /fiscal: ContactFiscalDraft/);
  assert.match(workspace, /<details[\s\S]*Datos fiscales/);
  assert.match(workspace, /Uso de CFDI/);
  assert.match(workspace, /setFiscalField\('taxId'/);
  assert.match(workspace, /Se guardan en la ficha real del cliente/);
  assert.match(api, /fiscal_tax_id\?: string/);
  assert.match(workspace, /capture="environment"/);
  assert.match(workspace, /uploadPresignedKioskFile\(upload, file, contentType/);
  assert.match(workspace, /La venta quedó registrada, pero no pudimos subir el comprobante/);
  assert.match(workspace, /Reintentar comprobante/);
  assert.match(workspace, /const saleInFlightRef = useRef\(false\)/);
  assert.match(workspace, /if \(saleInFlightRef\.current \|\| !contactId \|\| !warehouseId \|\| !cartLines\.length\) return/);
  assert.match(workspace, /items: cartLines\.map\(line => \(\{ productId: line\.product\.id, quantity: line\.quantity \}\)\)/);
  assert.match(workspace, /No hay almacenes activos disponibles/);
  assert.match(workspace, /disabled=\{!warehouseId\}/);
  assert.match(workspace, /Selecciona un almacén para ver existencias/);
  assert.match(workspace, /Terminar venta/);
  assert.match(workspace, /Finanzas concilia el cobro después/);
});
