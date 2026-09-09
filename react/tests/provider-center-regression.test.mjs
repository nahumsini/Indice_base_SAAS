import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = path => readFile(new URL(path, import.meta.url), 'utf8');

test('provider center login uses provider name and a six-digit PIN', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterAccessGate.tsx');
  const page = await readSource('../src/app/KioskCenter/MultiKioskMobilePage.tsx');

  assert.match(source, /identityField=/);
  assert.match(source, /copy\.access\.providerName/);
  assert.match(source, /copy\.access\.providerNameHelp/);
  assert.match(source, /copy\.access\.pinDescription/);
  assert.match(source, /pinLength=\{6\}/);
  assert.match(source, /onSubmit\(providerName\.trim\(\), pin\)/);
  assert.match(page, /getProviderCenterPublicCopy/);
  assert.match(page, /providerAudience \? 'indice-aqua'/);
});

test('self-registration does not ask the provider for internal organization scope', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterAccessGate.tsx');
  const translations = await readSource('../src/app/KioskCenter/providerCenterPublicTranslations.ts');

  assert.match(source, /view === 'registration'/);
  assert.match(source, /FormSection title=\{copy\.registration\.businessSection\}/);
  assert.match(source, /FormSection title=\{copy\.registration\.contactSection\}/);
  assert.match(source, /FormSection title=\{copy\.registration\.supplySection\}/);
  assert.match(source, /bg-\[#59C3A5\]/);
  assert.doesNotMatch(source, /name="(?:unit|unit_id|business|business_id|warehouse|warehouse_id)"/);
  assert.match(translations, /La unidad, el negocio y el almacén se asignan internamente/);
});

test('public kiosk mutations recover once when the browser CSRF session changes', async () => {
  const api = await readSource('../src/app/api/multiKiosks.ts');
  const exceptionHandler = await readSource('../../src/main/java/com/indice/erp/kiosk/api/KioskPublicV2ExceptionHandler.java');

  assert.match(api, /withPublicCsrfRecovery/);
  assert.match(api, /failure\.code !== 'KIOSK_CSRF_INVALID'/);
  assert.match(api, /const refreshed = await loadPublicBootstrap\(token\)/);
  assert.match(api, /return request\(refreshed\.csrf_token\)/);
  assert.match(exceptionHandler, /"KIOSK_CSRF_INVALID"/);
});

test('provider documents use presigned uploads and payable retries cannot duplicate the payable', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');
  const payableCapabilities = await readSource('../../src/main/java/com/indice/erp/finance/payablekiosk/PayableKioskCapabilities.java');

  assert.match(source, /procurement\.invoice\.document\.presign@1/);
  assert.match(source, /payables\.attachment\.presign@1/);
  assert.match(source, /uploadPresignedKioskFile/);
  assert.match(source, /registered\.object_key \?\? registered\.objectKey \?\? upload\.object_key/);
  assert.match(source, /uploadProviderDocument\(props, invoiceFile, 'invoice', purchaseOrderId\)/);
  assert.match(source, /pendingPayableId/);
  assert.match(source, /fieldset disabled=\{Boolean\(pendingPayableId\)\}/);
  assert.match(source, /reintentaremos únicamente el documento para evitar duplicados/);
  assert.match(payableCapabilities, /"text\/xml", "application\/xml"/);
  assert.match(payableCapabilities, /"\.xml"/);
  assert.doesNotMatch(source, /payment_account_id|paymentAccountId/);
});

test('tracking includes safe payment projections for invoices with and without purchase orders', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');

  assert.match(source, /purchase_order_payment_tracking/);
  assert.match(source, /purchaseOrderPaymentByInvoice/);
  assert.match(source, /\[\.\.\.payables, \.\.\.purchaseOrderPayments\]/);
  assert.doesNotMatch(source, /internal_account|approver_id|financial_notes/);
});

test('provider center creation is separate from employee multi-kiosks', async () => {
  const source = await readSource('../src/app/KioskCenter/MultiKioskEditorModal.tsx');

  assert.match(source, /\['PROVIDER', Handshake, 'Proveedores'/);
  assert.match(source, /form\.audience_type === 'EMPLOYEE' \? catalog\.kiosks/);
  assert.match(source, /El tipo de acceso no puede cambiarse después de crear el enlace/);
});

test('provider access and its four tools are administered only from the central modal', async () => {
  const editor = await readSource('../src/app/KioskCenter/MultiKioskEditorModal.tsx');
  const providersPage = await readSource('../src/app/BasicModules/Expenses/Providers/ProveedoresPage.tsx');
  const purchaseOrders = await readSource('../src/app/BasicModules/PointOfSale/OrdenesCompra/OrdenesCompra.tsx');
  const procurementPanel = await readSource('../src/app/BasicModules/PointOfSale/OrdenesCompra/components/ProviderCenterProcurementPanel.tsx');
  const catalog = await readSource('../../src/main/java/com/indice/erp/kiosk/engine/KioskProviderToolCatalogService.java');

  assert.match(editor, /Proveedores y NIP/);
  assert.match(editor, /multiKioskAdminApi\.issueProviderPin/);
  assert.match(editor, /multiKioskAdminApi\.revokeProviderPin/);
  assert.match(editor, /Un acceso, cuatro herramientas/);
  assert.match(catalog, /provider\.proposals@1/);
  assert.match(catalog, /provider\.orders-and-invoices@1/);
  assert.match(catalog, /provider\.payables@1/);
  assert.match(catalog, /provider\.tracking@1/);
  assert.doesNotMatch(providersPage, /ProviderKioskAccessModal|PayablesKioskManagementModal/);
  assert.doesNotMatch(purchaseOrders, /SupplierPortalAccessModal/);
  assert.match(procurementPanel, /NIP único.*Centro de kioscos/);
  assert.doesNotMatch(procurementPanel, /NIP individual/);
});

test('provider center currency belongs to each transaction, not to the portal', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');

  assert.match(source, /Moneda de la operación/);
  assert.match(source, /const invoiceOrder = invoiceable\.find/);
  assert.match(source, /const invoiceCurrency = text\(invoiceOrder\?\.currency_code\)/);
  assert.match(source, /currencyCode: invoiceCurrency/);
  assert.doesNotMatch(source, /portalCurrency|kioskCurrency|centerCurrency/);
});

test('provider proposals reuse the purchase-order wizard language and safe company catalog', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');
  const publicPage = await readSource('../src/app/KioskCenter/MultiKioskMobilePage.tsx');
  const service = await readSource('../../src/main/java/com/indice/erp/pos/purchaseorder/PurchaseOrderService.java');
  const projection = await readSource('../../src/main/java/com/indice/erp/pos/purchaseorder/kiosk/ProcurementProviderCenterService.java');

  assert.match(source, /function PurchaseProposalWorkspace/);
  assert.match(source, /IndiceModalWizardStepper/);
  assert.match(source, /density="compact"/);
  assert.match(source, /Datos de la propuesta/);
  assert.match(source, /Productos de la propuesta/);
  assert.match(source, /aria-label={`Agregar \${product\.name}`}/);
  assert.match(source, /Agregar otro \(\${selectedLine\.quantity}\)/);
  assert.match(source, /\{catalogProducts\.length\} disponibles/);
  assert.match(source, /La empresa debe tener al menos un producto activo en Inventarios/);
  assert.match(source, /activeStep === 'items' && !lines\.length/);
  assert.match(publicPage, /providerWorkspace \? 'max-w-5xl'/);
  assert.match(source, /Revisa antes de enviar/);
  assert.match(source, /providerProduct/);
  assert.match(source, /Tus productos aparecen primero/);
  assert.match(source, /PROVIDER_PROPOSALS.*PurchaseProposalWorkspace/s);
  assert.match(service, /createProviderCenterSupplierSubmission/);
  assert.match(service, /supplierCompanyProductAllowed/);
  assert.match(projection, /LOWER\(TRIM\(product\.status\)\) = 'active'/);
  assert.doesNotMatch(projection, /product\.price|product\.cost|inventory_ready/);
});

test('provider payables mirror Expenses and enter its review queue directly', async () => {
  const source = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');
  const catalog = await readSource('../../src/main/java/com/indice/erp/kiosk/engine/KioskProviderToolCatalogService.java');
  const repository = await readSource('../../src/main/java/com/indice/erp/finance/payablekiosk/PayableKioskPublicRepository.java');

  assert.match(source, /function ProviderPayablesWorkspace/);
  assert.match(source, /Crear cuenta por pagar/);
  assert.match(source, /Cuenta enviada directamente a Gastos para revisión/);
  assert.match(source, /PROVIDER_PAYABLES.*ProviderPayablesWorkspace/s);
  assert.match(catalog, /"Cuentas por pagar"/);
  assert.match(catalog, /directamente a Gastos para revisión/);
  assert.match(repository, /INSERT INTO finance_expenses/);
  assert.match(repository, /'DRAFT'/);
});

test('supplier adjustment requests pause the order and are actionable by procurement', async () => {
  const providerWorkspace = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');
  const procurementPanel = await readSource('../src/app/BasicModules/PointOfSale/OrdenesCompra/components/ProviderCenterProcurementPanel.tsx');
  const purchaseOrdersTable = await readSource('../src/app/BasicModules/PointOfSale/OrdenesCompra/components/PurchaseOrdersTable.tsx');

  assert.match(providerWorkspace, /orders\.filter\(order => text\(order\.status\) === 'SENT'\)/);
  assert.match(providerWorkspace, /Motivo del ajuste \*/);
  assert.match(providerWorkspace, /responseType === 'ADJUSTMENT_REQUESTED'/);
  assert.match(providerWorkspace, /Al confirmar aceptas cantidades, precios y fecha de entrega/);
  assert.match(procurementPanel, /inbox\.order_responses \?\? \[\]/);
  assert.match(procurementPanel, /Reenviar sin cambios/);
  assert.match(purchaseOrdersTable, /order\.status === 'NEEDS_CLARIFICATION'/);
});

test('confirmed orders continue through receiving and only mature orders can be invoiced', async () => {
  const providerWorkspace = await readSource('../src/app/KioskCenter/multi-kiosk/ProviderCenterMultiKioskWorkspace.tsx');
  const purchaseOrdersTable = await readSource('../src/app/BasicModules/PointOfSale/OrdenesCompra/components/PurchaseOrdersTable.tsx');

  assert.match(providerWorkspace, /\['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'\]\.includes/);
  assert.match(providerWorkspace, /invoiceable\.map/);
  assert.match(providerWorkspace, /Primero confirma o recibe una orden para poder facturarla/);
  assert.match(purchaseOrdersTable, /'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'/);
});
