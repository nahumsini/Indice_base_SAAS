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

test('los flujos de oportunidades son seleccionables y alimentan Kanban y filtros', () => {
  const page = read('src/app/BasicModules/Sales/Prospectos/Prospectos.tsx');
  const header = read('src/app/BasicModules/Sales/Prospectos/components/ProspectosHeader.tsx');
  const filters = read('src/app/BasicModules/Sales/Prospectos/components/ProspectosFilters.tsx');
  const kanban = read('src/app/BasicModules/Sales/Prospectos/kanban/ProspectosKanban.tsx');
  const manager = read('src/app/BasicModules/Sales/Prospectos/modals/OpportunityFlowManagerModal.tsx');
  const stageEditor = read('src/app/BasicModules/Sales/Prospectos/modals/OpportunityFlowStageEditor.tsx');

  assert.match(header, /copy\.manageFlow/);
  assert.match(header, /SelectTrigger aria-label=\{activeFlowLabel\}/);
  assert.match(header, /onSelectFlow\(Number\(value\)\)/);
  assert.match(page, /salesApi\.getOpportunityFlows\(\)/);
  assert.match(page, /salesApi\.getOpportunityFlowPositions\(selectedFlowId\)/);
  assert.match(page, /salesApi\.createOpportunityFlow/);
  assert.match(page, /salesApi\.updateOpportunityFlow/);
  assert.match(page, /setStageFilter\('all'\)/);
  assert.match(page, /stages=\{opportunityFlowStages\}/);
  assert.match(filters, /stages\.map/);
  assert.match(kanban, /stages\.map/);
  assert.match(manager, /modalType="operational-workspace"/);
  assert.match(manager, /view === 'catalog'/);
  assert.match(manager, /OpportunityFlowListCard/);
  assert.match(manager, /OpportunityFlowStageEditor/);
  assert.match(manager, /await onSelectFlow\(saved\.id\)/);
  assert.match(manager, /flow\.factory/);
  assert.match(manager, /loadError \? \(/);
  assert.match(manager, /onClick=\{onRetry\}/);
  assert.match(stageEditor, /stage\.opportunityCount === 0/);
});

test('Clientes importa leads de Meta mediante el backend sin persistir el token en el navegador', () => {
  const page = read('src/app/BasicModules/Sales/Contactos/Contactos.tsx');
  const modal = read('src/app/BasicModules/Sales/Contactos/components/MetaLeadImportModal.tsx');
  const api = read('src/app/BasicModules/Sales/salesApi.ts');

  assert.match(page, /t\.metaImport\.trigger/);
  assert.match(page, /<MetaLeadImportModal/);
  assert.match(page, /onImported=\{reloadAll\}/);
  assert.match(modal, /modalType="standard-form"/);
  assert.match(modal, /type="password"/);
  assert.match(modal, /setAccessToken\(''\)/);
  assert.doesNotMatch(modal, /localStorage|sessionStorage/);
  assert.match(api, /\/meta-leads\/import/);
});

test('las relaciones vacías del CRM permanecen vacías al volver a guardar', () => {
  const source = read('src/app/BasicModules/Sales/adapters/salesApiAdapters.ts');

  assert.match(
    source,
    /if \(value === null \|\| value === undefined \|\| value === ''\) return undefined;/,
  );
  assert.match(source, /unitId: contact\.unitId \?\? undefined/);
  assert.match(source, /ownerUserCompanyId: opportunity\.ownerUserCompanyId \?\? undefined/);
});

test('ninguna venta puede guardarse sin partidas ni total', () => {
  const bridge = read('src/app/BasicModules/Sales/services/salesWorkflowBridge.ts');
  const modal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');

  assert.match(bridge, /if \(!sale\.customerName\.trim\(\)\) errors\.push\('missingCustomer'\)/);
  assert.match(bridge, /if \(!sale\.saleLines\.length\) errors\.push\('missingLines'\)/);
  assert.match(bridge, /if \(!\(Number\(sale\.totalAmount\) > 0\)\) errors\.push\('invalidTotal'\)/);
  assert.match(modal, /&& \(!form\.prospectId \|\| selectedQuote\)/);
  assert.match(modal, /&& form\.saleLines\.length/);
  assert.match(modal, /&& form\.totalAmount > 0/);
});

test('oportunidad y cotización se completan cuando existe una relación', () => {
  const source = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');

  assert.match(source, /linkedConvertibleQuotes\.length === 1/);
  assert.match(source, /buildFormFromQuote\(opportunityPatch, autoSelectedQuote\)/);
  assert.match(source, /setForm\(\(current\) => buildFormFromQuote\(current, quote\)\)/);
  assert.match(source, /quotes\.filter\(isOpportunityForecastQuote\)/);
});

test('el origen de la venta sigue oportunidad, cliente y cotización', () => {
  const source = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');
  const opportunity = source.indexOf('<FormField label={`${t.modal.fields.opportunitySelector} *`}>');
  const customer = source.indexOf('<FormField label={`${t.modal.fields.customerName} *`}>');
  const quote = source.indexOf('<FormField label={`${t.modal.fields.quoteSelector}${form.prospectId');

  assert.ok(opportunity >= 0 && opportunity < customer);
  assert.ok(customer < quote);
  assert.match(source, /disabled=!\{form\.prospectId\}|disabled=\{!form\.prospectId\}/);
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

  assert.match(source, /getProductGalleryImages\(product, \{ includeTransient: includeTransientImages \}\)\[0\]/);
  assert.match(source, /setHasImageError\(false\)/);
  assert.match(source, /\[imageUrl\]/);
});

test('Productos conserva la imagen temporal en la revisión y enruta almacenamiento firmado por el origen activo', () => {
  const productImages = read('src/app/BasicModules/Sales/Productos/utils/productImages.ts');
  const preview = read('src/app/BasicModules/Sales/Productos/components/product-modal/ProductPreviewPanel.tsx');
  const storageUrls = read('src/app/BasicModules/Sales/utils/salesStorageUrls.ts');
  const salesApi = read('src/app/BasicModules/Sales/salesApi.ts');
  const publicCatalog = read('src/app/BasicModules/Sales/Productos/publicCatalog/PublicCatalogPage.tsx');
  const viteConfig = read('vite.config.ts');

  assert.match(productImages, /includeTransientUploads && isTransientProductImageUrl/);
  assert.match(preview, /includeTransientImages/);
  assert.doesNotMatch(preview, /Math\.max\(getProductGalleryImages/);
  assert.match(storageUrls, /parsedUrl\.pathname\.startsWith\('\/storage\/'\)/);
  assert.match(salesApi, /fetch\(resolveSalesStorageUrl\(uploadUrl\)/);
  assert.match(publicCatalog, /resolveSalesStorageUrl\(item\.thumbnailUrl\)/);
  assert.match(publicCatalog, /resolveSalesStorageUrl\(bootstrap\.companyLogoUrl\)/);
  assert.match(viteConfig, /'\/storage': \{/);
  assert.match(viteConfig, /Host: storageSignedHost/);
});

test('nueva venta permite partidas editables antes de confirmar', () => {
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

test('el folio de una venta nueva lo genera el backend y un rechazo revierte la fila temporal', () => {
  const records = read('src/app/BasicModules/Sales/Sales/hooks/useSalesRecords.ts');
  const context = read('src/app/BasicModules/Sales/salesCrmContext.tsx');
  const boundary = read('src/app/BasicModules/Sales/components/SalesDataStateBoundary.tsx');

  assert.match(records, /saleNumber: draft\.saleNumber\?\.trim\(\) \|\| ''/);
  assert.doesNotMatch(records, /SALE-2026-\$\{String\(nextIndex\)/);
  assert.match(context, /!Number\.isSafeInteger\(persistedSale\.backendId\)/);
  assert.match(context, /current\.filter\(\(item\) => item\.id !== saleRecord\.id\)/);
  assert.match(boundary, /\$\{copy\.syncErrorDescription\} \$\{syncIssue\.message\}/);
});

test('el folio de una cotización nueva lo genera el backend y el wizard espera su confirmación', () => {
  const page = read('src/app/BasicModules/Sales/Cotizacion/Cotizacion.tsx');
  const modal = read('src/app/BasicModules/Sales/Cotizacion/modals/QuoteBuilderModal.tsx');
  const context = read('src/app/BasicModules/Sales/salesCrmContext.tsx');

  assert.doesNotMatch(context, /Q-2026-\$\{String\(nextIndex\)/);
  assert.match(context, /createQuoteRecord: async \(quote\)/);
  assert.match(context, /quoteNumber: quote\.quoteNumber\?\.trim\(\) \?\? ''/);
  assert.match(context, /!Number\.isSafeInteger\(persistedQuote\.backendId\)/);
  assert.match(page, /createdQuote = await createQuoteRecord/);
  assert.match(page, /setQuoteSaveError\(t\.builder\.saveError\)/);
  assert.match(modal, /busy=\{isSaving\}/);
  assert.match(modal, /disabled=\{isSaving\}/);
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

test('Ganada exige registrar primero la venta desde tabla o Kanban', () => {
  const opportunitiesPage = read('src/app/BasicModules/Sales/Prospectos/Prospectos.tsx');
  const saleModal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');
  const saleForm = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');

  assert.match(opportunitiesPage, /patch\.stage === 'Won' && opportunity\.stage !== 'Won'/);
  assert.match(opportunitiesPage, /setPendingWonTransition\(\{ opportunity, patch \}\)/);
  assert.match(opportunitiesPage, /onUpdateOpportunity=\{handleUpdateOpportunity\}/);
  assert.match(opportunitiesPage, /onStageChange=\{handleKanbanStageChange\}/);
  assert.match(opportunitiesPage, /requiredOpportunityId=\{pendingWonTransition\?\.opportunity\.id\}/);
  assert.match(opportunitiesPage, /commitOpportunityUpdate\(opportunityId, \{/);
  assert.match(saleModal, /if \(!createdRecord\)[\s\S]*if \(form\.quoteId\)[\s\S]*onQuoteConverted/);
  assert.match(saleModal, /handleOpportunitySelection\(requiredOpportunityId\)/);
  assert.match(saleForm, /lockCommercialSource=\{lockCommercialSource\}/);
  assert.match(saleForm, /disabled=\{lockCommercialSource\}/);
});

test('Ventas limita medios de pago y entrega el crédito a Cartera desde cualquier origen', () => {
  const paymentMethods = read('src/app/BasicModules/Sales/Sales/utils/salesPaymentMethods.ts');
  const saleForm = read('src/app/BasicModules/Sales/Sales/components/SalesCreateForm.tsx');
  const saleModal = read('src/app/BasicModules/Sales/Sales/components/SalesDetailModal.tsx');
  const opportunitiesPage = read('src/app/BasicModules/Sales/Prospectos/Prospectos.tsx');
  const salesPage = read('src/app/BasicModules/Sales/Sales/Sales.tsx');

  assert.match(paymentMethods, /salesPaymentMethodIds = \[\s*'cash',\s*'card',\s*'transfer',\s*'credit',\s*\]/);
  assert.doesNotMatch(paymentMethods, /'wallet'|'check'/);
  assert.match(saleForm, /const isCreditPayment = selectedPaymentMethod === 'credit'/);
  assert.match(saleForm, /t\.modal\.creditHandoff/);
  assert.match(saleModal, /if \(closesAsCredit\)[\s\S]*onCreditSaleCreated\?\.\(createdRecord\)/);
  assert.match(opportunitiesPage, /onCreditSaleCreated=\{handleSendToCredit\}/);
  assert.match(opportunitiesPage, /\/receivables\/credit-sales\?candidateSaleId=/);
  assert.match(salesPage, /onCreditSaleCreated=\{handleSendToCredit\}/);
});
