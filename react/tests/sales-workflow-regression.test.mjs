import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Kanban normaliza todas las etapas operativas entregadas por la API', () => {
  const source = read('src/app/BasicModules/Sales/adapters/salesApiAdapters.ts');

  for (const [apiValue, label] of [
    ['new', 'New'],
    ['contacted', 'Contacted'],
    ['qualified', 'Qualified'],
    ['proposal', 'Proposal'],
    ['negotiation', 'Negotiation'],
    ['won', 'Won'],
    ['lost', 'Lost'],
  ]) {
    assert.match(source, new RegExp(`\\b${apiValue}: '${label}'`));
  }
});

test('una venta directa requiere cliente, pero no fuerza cotización ni partidas', () => {
  const bridge = read('src/app/BasicModules/Sales/services/salesWorkflowBridge.ts');
  const modal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');

  assert.match(bridge, /if \(!sale\.customerName\.trim\(\)\) errors\.push\('missingCustomer'\)/);
  assert.doesNotMatch(bridge, /if \(!sale\.saleLines\.length\) errors\.push\('missingLines'\)/);
  assert.match(modal, /const originStepReady = Boolean\(form\.customerName\.trim\(\)\)/);
  assert.match(modal, /const selectedQuoteIsConvertible = !selectedQuote/);
});

test('oportunidad y cotización se completan cuando existe una relación', () => {
  const source = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');

  assert.match(source, /linkedAcceptedQuotes\.length === 1/);
  assert.match(source, /buildFormFromQuote\(opportunityPatch, autoSelectedQuote\)/);
  assert.match(source, /setForm\(\(current\) => buildFormFromQuote\(current, quote\)\)/);
});

test('alta rápida de cliente persiste antes de ligarse a la venta', () => {
  const context = read('src/app/BasicModules/Sales/salesCrmContext.tsx');
  const selector = read('src/app/BasicModules/Sales/Sales/components/SalesCustomerSelector.tsx');

  assert.match(context, /createContactRecord: async \(contact\)/);
  assert.match(context, /await salesApi\.create\('contacts'/);
  assert.match(selector, /const contact = await onCreateCustomer/);
  assert.match(selector, /onSelectCustomer\(contact\.id, contact\)/);
});

test('miniatura usa la galería persistida y reinicia errores al cambiar la URL', () => {
  const source = read('src/app/BasicModules/Sales/Productos/components/ProductThumbnail.tsx');

  assert.match(source, /getProductGalleryImages\(product\)\[0\]/);
  assert.match(source, /setHasImageError\(false\)/);
  assert.match(source, /\[imageUrl\]/);
});

test('nueva venta permite partidas editables y conserva la venta rápida sin partidas', () => {
  const editor = read('src/app/BasicModules/Sales/Sales/components/SalesLineItemsEditor.tsx');
  const form = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');

  assert.match(editor, /unitPrice: asNumber\(event\.target\.value\)/);
  assert.match(editor, /quantity: asNumber\(event\.target\.value\)/);
  assert.match(editor, /discountPercent: asNumber\(event\.target\.value\)/);
  assert.match(form, /<SalesLineItemsEditor/);
});

test('evidencia de pago se carga como archivo y no se marca subida antes de persistir', () => {
  const form = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');
  const modal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');
  const records = read('src/app/BasicModules/Sales/Sales/hooks/useSalesRecords.ts');

  assert.match(form, /type="file"/);
  assert.match(form, /application\/pdf,image\/jpeg,image\/png,image\/webp/);
  assert.match(form, /paymentEvidenceStatus: 'missing'/);
  assert.match(modal, /paymentEvidenceFiles\?\.length \? 'missing'/);
  assert.match(records, /setCreationWarning\('paymentEvidenceUploadFailed'\)/);
  assert.match(records, /cannot create\s+\/\/ a duplicate sale|duplicate sale/);
});

test('ventas reutiliza las cuentas de pago de Expenses con permiso compartido', () => {
  const field = read('src/app/BasicModules/Sales/Sales/components/SalesPaymentAccountField.tsx');
  const module = read('src/app/BasicModules/Sales/Ventas.tsx');
  const paymentAccounts = read('src/app/BasicModules/Sales/SalesPaymentAccounts.tsx');

  assert.match(field, /paymentAccountsService\.getPaymentAccounts/);
  assert.match(field, /<PaymentAccountModal/);
  assert.match(field, /paymentAccountsService\.createPaymentAccount/);
  assert.match(module, /const SalesPaymentAccounts = lazy\(\(\) => import\('\.\/SalesPaymentAccounts'\)\)/);
  assert.match(module, /'payment-accounts': SalesPaymentAccounts/);
  assert.match(paymentAccounts, /import PaymentAccounts from '\.\.\/Expenses\/PaymentAccounts'/);
  assert.match(paymentAccounts, /<PaymentAccounts/);
  assert.match(paymentAccounts, /headerTone="coral"/);
});

test('la venta toma vendedor autenticado y almacén para confirmar inventario', () => {
  const form = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');
  const modal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');
  const page = read('src/app/BasicModules/Sales/Sales/Sales.tsx');

  assert.match(page, /salesApi\.context\(\)/);
  assert.match(modal, /sellerUserCompanyId: currentSeller\?\.sellerUserCompanyId/);
  assert.match(modal, /form\.warehouseId \?\? ''/);
  assert.doesNotMatch(form, /onBusinessUnitSelection/);
  assert.doesNotMatch(form, /onBusinessSelection/);
  assert.match(form, /businessUnitId: warehouse\?\.businessUnitId \?\? ''/);
  assert.match(form, /businessId: warehouse\?\.businessId \?\? ''/);
});

test('Ventas sólo utiliza almacenes activos con asignación organizacional real', () => {
  const page = read('src/app/BasicModules/Sales/Sales/Sales.tsx');
  const modal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');
  const form = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');
  const scope = read('src/app/BasicModules/Sales/Sales/utils/salesWarehouseScope.ts');

  assert.match(page, /warehousesResult\.value\.filter\(isSalesWarehouseReady\)/);
  assert.match(scope, /warehouse\.status === 'active'/);
  assert.match(scope, /isDatabaseId\(warehouse\.businessUnitId\)/);
  assert.match(scope, /isDatabaseId\(warehouse\.businessId\)/);
  assert.match(modal, /warehouseMatchesSaleScope\(selectedWarehouse, form\)/);
  assert.doesNotMatch(modal, /salesBusinessOptions|salesBusinessUnitOptions/);
  assert.match(form, /warehouses\.filter\(isSalesWarehouseReady\)/);
});

test('el contrato de venta exige un único almacén, unidad y negocio por operación', () => {
  const bridge = read('src/app/BasicModules/Sales/services/salesWorkflowBridge.ts');

  assert.match(bridge, /if \(!sale\.warehouseId\) errors\.push\('missingWarehouse'\)/);
  assert.match(bridge, /line\.warehouseId !== sale\.warehouseId/);
  assert.match(bridge, /line\.businessUnitId !== sale\.businessUnitId/);
  assert.match(bridge, /line\.businessId !== sale\.businessId/);
});
