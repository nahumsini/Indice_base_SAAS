import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const salesRoot = resolve(root, 'src/app/BasicModules/Sales');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Ventas respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(salesRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Oportunidades limita la divisa preferida a la barra KPI y conserva la tabla transaccional', () => {
  const opportunitiesSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const kpiSource = readFileSync(resolve(salesRoot, 'Prospectos/components/ProspectosKpiStrip.tsx'), 'utf8');
  const tableSource = readFileSync(resolve(salesRoot, 'Prospectos/table/ProspectosTable.tsx'), 'utf8');

  assert.match(kpiSource, /currencyContext=\{currencyContext\}/);
  assert.match(kpiSource, /value: periodWonConvertedLabel/);
  assert.match(kpiSource, /value: convertedPipelineLabel/);
  assert.match(kpiSource, /value: periodLostConvertedLabel/);
  assert.match(opportunitiesSource, /nativeBreakdown: pipelineNativeBreakdown/);
  assert.match(opportunitiesSource, /exchangeRateMetadata\.sourceDate/);
  assert.doesNotMatch(tableSource, /preferredCurrency|exchangeRatesPerUsd|convertSalesCurrencyAmount/);
});

test('el motor compartido de barras KPI respeta tipografía y contexto monetario', () => {
  const engineSource = readFileSync(resolve(root, 'src/app/BasicModules/shared/operational/OperationalKpiArea.tsx'), 'utf8');

  assert.doesNotMatch(engineSource, prohibitedTypography);
  assert.match(engineSource, /OperationalKpiCurrencyContext/);
  assert.match(engineSource, /nativeBreakdown/);
  assert.match(engineSource, /preferredCurrency/);
  assert.match(engineSource, /excludedRecords/);
});

test('la memoria de navegación conserva contexto por empresa, usuario, módulo y pestaña', () => {
  const memorySource = readFileSync(resolve(root, 'src/app/hooks/useWorkspaceNavigationMemory.ts'), 'utf8');
  const routedTabSource = readFileSync(resolve(root, 'src/app/hooks/useRoutedModuleTab.ts'), 'utf8');
  const prospectsSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const contactsSource = readFileSync(resolve(salesRoot, 'Contactos/Contactos.tsx'), 'utf8');

  assert.match(memorySource, /session\.company\.id.*session\.user\.id.*moduleKey.*tabKey/s);
  assert.match(memorySource, /workspaceStateApi\.save/);
  assert.match(routedTabSource, /workspaceStateApi\.get.*'navigation'/s);
  assert.match(prospectsSource, /tabKey: 'prospects'/);
  assert.match(contactsSource, /tabKey: 'contacts'/);
});

test('Prospectos y Contactos limpian filtros sin restablecer la vista del usuario', () => {
  const prospectsSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const contactsSource = readFileSync(resolve(salesRoot, 'Contactos/Contactos.tsx'), 'utf8');

  assert.match(prospectsSource, /const handleClearFilters = \(\) =>/);
  assert.match(contactsSource, /const handleClearFilters = \(\) =>/);
  assert.doesNotMatch(prospectsSource.match(/const handleClearFilters[\s\S]*?\n  };/)?.[0] ?? '', /setActiveView|setSortState/);
  assert.doesNotMatch(contactsSource.match(/const handleClearFilters[\s\S]*?\n  };/)?.[0] ?? '', /setSortState|setVisibleContactColumns/);
});

test('Productos expone el control de inventario desde el primer paso y lo refleja en la tabla', () => {
  const generalSectionSource = readFileSync(resolve(salesRoot, 'Productos/components/product-modal/ProductGeneralSection.tsx'), 'utf8');
  const usageSectionSource = readFileSync(resolve(salesRoot, 'Productos/components/product-modal/ProductUsageReadinessSection.tsx'), 'utf8');
  const tableRowSource = readFileSync(resolve(salesRoot, 'Productos/table/ProductTableRow.tsx'), 'utf8');
  const catalogHookSource = readFileSync(resolve(salesRoot, 'Productos/hooks/useProductsCatalog.ts'), 'utf8');

  assert.match(generalSectionSource, /t\.inventoryTracking\.tracked\.label/);
  assert.match(generalSectionSource, /t\.inventoryTracking\.untracked\.label/);
  assert.match(generalSectionSource, /nextType === 'Product' \|\| nextType === 'Package'/);
  assert.match(generalSectionSource, /usesInventory: value === 'tracked'/);
  assert.doesNotMatch(usageSectionSource, /toggles\.usesInventory/);
  assert.match(tableRowSource, /t\.inventoryTracking\.badges\.tracked/);
  assert.match(tableRowSource, /t\.inventoryTracking\.badges\.untracked/);
  assert.match(catalogHookSource, /type === 'Service' \|\| type === 'Subscription' \|\| type === 'Operational item'/);
  assert.match(catalogHookSource, /t\.inventoryTracking\.filterSuffix/);
});

test('Modo aprendiz cubre todas las pestañas visibles de Ventas y Comisiones usa la barra compartida', () => {
  const salesModuleSource = readFileSync(resolve(salesRoot, 'Ventas.tsx'), 'utf8');
  const guidanceTypeSource = readFileSync(resolve(salesRoot, 'operationalGuidance/types.ts'), 'utf8');
  const guidanceSource = readFileSync(resolve(salesRoot, 'operationalGuidance/translations/en-CA.ts'), 'utf8');
  const commissionsSource = readFileSync(resolve(salesRoot, 'SalesCommissions.tsx'), 'utf8');

  assert.match(salesModuleSource, /guide=\{learningModeActive \? \(/);
  assert.doesNotMatch(salesModuleSource, /activeTab !== 'payment-accounts'|activeTab !== 'commissions'/);
  assert.match(guidanceTypeSource, /SalesGuidanceTabId = SalesTabId/);
  assert.match(guidanceSource, /commissions:/);
  assert.match(guidanceSource, /'payment-accounts':/);
  assert.match(commissionsSource, /<SalesTitleBar/);
  assert.match(commissionsSource, /salesTitleBarPrimaryActionClassName/);
  assert.match(commissionsSource, /salesTitleBarSecondaryActionClassName/);
});

test('Ventas presenta el flujo B2B principal y deja en Más solo sus herramientas comerciales', () => {
  const salesModuleSource = readFileSync(resolve(salesRoot, 'Ventas.tsx'), 'utf8');
  const identitySource = readFileSync(resolve(salesRoot, 'salesIdentity.tsx'), 'utf8');
  const shellSource = readFileSync(resolve(root, 'src/app/components/frontend-os/IndiceModuleShell.tsx'), 'utf8');
  const spanishSource = readFileSync(resolve(salesRoot, 'translations/es-MX.ts'), 'utf8');

  assert.match(identitySource, /'contacts',[\s\S]*'leads',[\s\S]*'quotes',[\s\S]*'sales',[\s\S]*'kpis'/);
  assert.match(identitySource, /\['contacts', 'leads', 'quotes', 'sales', 'kpis'\]\.includes\(tab\.id\)/);
  assert.match(salesModuleSource, /useRoutedModuleTab<SalesWorkspaceTabId>\(\s*'contacts'/);
  assert.match(salesModuleSource, /moreTabs=\{\[/);
  assert.match(salesModuleSource, /id: 'commissions'/);
  assert.match(salesModuleSource, /id: 'payment-accounts'/);
  assert.doesNotMatch(salesModuleSource, /import\('\.\/Providers'\)|import\('\.\.\/PointOfSale\/OrdenesCompra'\)/);
  assert.doesNotMatch(salesModuleSource.match(/moreTabs=\{\[[\s\S]*?\]\}/)?.[0] ?? '', /providers|purchase-orders/);
  assert.match(salesModuleSource, /providers: '\/inventory\/providers'/);
  assert.match(salesModuleSource, /'purchase-orders': '\/inventory\/purchase-orders'/);
  assert.match(shellSource, /moreTabs\?: ReadonlyArray<IndiceModuleTab<TabId>>/);
  assert.match(spanishSource, /prospectos: 'Oportunidades'/);
  assert.match(spanishSource, /contactos: 'Clientes'/);
  assert.match(spanishSource, /purchaseOrders: 'Órdenes de compra'/);
});

test('Crear oportunidad solo permite responsables activos del contexto de Ventas', () => {
  const opportunitiesSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const modalSource = readFileSync(resolve(salesRoot, 'Prospectos/modals/CreateOpportunityModal.tsx'), 'utf8');
  const formSource = readFileSync(resolve(salesRoot, 'Prospectos/utils/prospectosStatus.ts'), 'utf8');

  assert.match(opportunitiesSource, /salesApi\.context\(\)/);
  assert.match(opportunitiesSource, /salesContextOwners\.forEach/);
  assert.doesNotMatch(opportunitiesSource, /humanResourcesApi\.listHrUsers|\.\.\.salesOwners/);
  assert.match(opportunitiesSource, /if \(!ownerPayload\.ownerUserCompanyId\) return;/);
  assert.match(modalSource, /ownerValue\.startsWith\('user-company:'\)/);
  assert.match(modalSource, /disabled=\{!canSave\}/);
  assert.match(modalSource, /<SalesCustomerSelector/);
  assert.match(modalSource, /onCreateCustomer=\{onCreateCustomer\}/);
  assert.match(opportunitiesSource, /onCreateCustomer=\{createContactRecord\}/);
  assert.match(opportunitiesSource, /createdContact \?\? getContactById\(contacts, contactId\)/);
  assert.match(formSource, /ownerValue: '',[\s\S]*owner: ''/);
});

test('Oportunidades prioriza filtros operativos y repliega los secundarios', () => {
  const opportunitiesSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const filtersSource = readFileSync(resolve(salesRoot, 'Prospectos/components/ProspectosFilters.tsx'), 'utf8');
  const translationsSource = readFileSync(resolve(salesRoot, 'Prospectos/translations/prospectosTranslations.ts'), 'utf8');

  assert.match(filtersSource, /showAdvancedFilters/);
  assert.match(filtersSource, /advancedFilterCount/);
  assert.match(filtersSource, /showOwnerFilter \? \(/);
  assert.match(filtersSource, /copy\.filters\.more/);
  assert.match(filtersSource, /copy\.filters\.period/);
  assert.doesNotMatch(filtersSource, /opportunityStatuses|statusFilter/);
  assert.doesNotMatch(opportunitiesSource, /statusFilter/);
  assert.match(opportunitiesSource, /showOwnerFilter=\{canViewAllVisibleOpportunities\}/);
  assert.match(translationsSource, /focus: 'Vista rápida'/);
});

test('Oportunidades usa cotizaciones creadas para valor y forecast y permite descargar sus PDFs', () => {
  const pageSource = readFileSync(resolve(salesRoot, 'Prospectos/Prospectos.tsx'), 'utf8');
  const valueSource = readFileSync(resolve(salesRoot, 'Prospectos/components/OpportunityCommercialValueCell.tsx'), 'utf8');
  const quoteCellSource = readFileSync(resolve(salesRoot, 'Prospectos/components/OpportunityQuoteSignalBadge.tsx'), 'utf8');
  const quoteSignalsSource = readFileSync(resolve(salesRoot, 'Prospectos/utils/prospectosQuoteSignals.ts'), 'utf8');
  const pipelineSource = readFileSync(resolve(salesRoot, 'Prospectos/utils/prospectosPipeline.ts'), 'utf8');

  assert.match(quoteSignalsSource, /opportunityForecastQuoteStatuses[\s\S]*'Draft'[\s\S]*'Sent'[\s\S]*'Viewed'[\s\S]*'Negotiation'[\s\S]*'Approved'[\s\S]*'Closed Won'/);
  assert.doesNotMatch(quoteSignalsSource.match(/opportunityForecastQuoteStatuses[\s\S]*?\];/)?.[0] ?? '', /'Rejected'|'Expired'/);
  assert.match(pipelineSource, /getForecastQuotesForOpportunity/);
  assert.match(valueSource, /total \* \(probability \/ 100\)/);
  assert.match(valueSource, /formatSalesCurrencyAmount\(0, opportunityCurrency\)/);
  assert.doesNotMatch(valueSource, /onEstimatedValueChange|<Input/);
  assert.match(quoteCellSource, /DropdownMenu/);
  assert.match(quoteCellSource, /onDownloadQuote\(quote\)/);
  assert.match(pageSource, /downloadQuotePdf\(\{/);
});

test('Cotizaciones concentra la decisión comercial y deja el PDF a un clic', () => {
  const pageSource = readFileSync(resolve(salesRoot, 'Cotizacion/Cotizacion.tsx'), 'utf8');
  const filterSource = readFileSync(resolve(salesRoot, 'Cotizacion/utils/quotePageUtils.ts'), 'utf8');
  const translationsSource = readFileSync(resolve(salesRoot, 'Cotizacion/translations/es-MX.ts'), 'utf8');
  const tableSource = pageSource.match(/<Table className="min-w-\[1510px\][\s\S]*?<DataTablePagination/)?.[0] ?? '';

  assert.match(tableSource, /renderSortableHead\('number'[\s\S]*renderSortableHead\('opportunity'[\s\S]*renderSortableHead\('seller'[\s\S]*renderSortableHead\('status'/);
  assert.doesNotMatch(tableSource, /renderSortableHead\('client'|renderSortableHead\('margin'|renderSortableHead\('created'/);
  assert.match(tableSource, /<TableCell colSpan=\{9\}/);
  assert.match(tableSource, /<QuoteMarginBadge/);
  assert.match(tableSource, /<QuoteExpirationBadge[\s\S]*quote\.lastUpdated/);
  assert.match(pageSource, /salesRecords\.find\(\(sale\) =>/);
  assert.match(tableSource, /salesT\.table\.columns\.saleNumber/);
  assert.match(tableSource, /prospectosT\.options\.nextActions\[opportunity\.nextAction\]/);
  assert.match(tableSource, /opportunity\.nextActionDate/);
  assert.match(pageSource, /const downloadSavedQuote = \(quote: SalesQuote\)/);
  assert.match(tableSource, /onClick=\{\(\) => downloadSavedQuote\(quote\)\}/);
  assert.match(translationsSource, /number: 'Cotización \/ cliente'/);
  assert.match(translationsSource, /readiness: 'Pendiente'/);
  assert.match(translationsSource, /productRequiresReview: 'Revisar estado, precio o visibilidad'/);
  assert.match(translationsSource, /amount: 'Valor \/ margen'/);
  assert.match(translationsSource, /expiration: 'Seguimiento'/);
  assert.match(translationsSource, /files: 'Documentos'/);
  assert.match(pageSource, /gridClassName="xl:grid-cols-\[1\.5fr_repeat\(2,minmax\(0,1fr\)\)\]"/);
  assert.match(pageSource, /SalesFilterSelect label=\{t\.filters\.client\}/);
  assert.match(pageSource, /SalesFilterSelect label=\{t\.filters\.seller\}/);
  assert.doesNotMatch(pageSource, /statusFilter|opportunityFilter/);
  assert.match(filterSource, /normalizeTextKey\(quote\.clientName\) === clientFilter/);
  assert.doesNotMatch(filterSource, /matchesStatus|matchesOpportunity/);
});

test('los KPI de Ventas consolidan oportunidades con las mismas cotizaciones ligadas', () => {
  const kpiPageSource = readFileSync(resolve(salesRoot, 'KPIs/KPIs.tsx'), 'utf8');
  const performanceSource = readFileSync(resolve(salesRoot, 'KPIs/components/SalesProspectsPerformanceTable.tsx'), 'utf8');
  const selectorSource = readFileSync(resolve(salesRoot, 'KPIs/salesKpiSelectors.ts'), 'utf8');

  assert.match(kpiPageSource, /metric: 'SALES_OPPORTUNITY_PIPELINE'/);
  assert.match(kpiPageSource, /!\['Won', 'Lost'\]\.includes\(opportunity\.stage\)/);
  assert.match(kpiPageSource, /getOpportunityNativePipelineTotals\(item, quotes\)\.totalLabel/);
  assert.match(kpiPageSource, /quotes=\{quotes\}/);
  assert.match(performanceSource, /getOpportunityNativePipelineTotals\(item, quotes\)/);
  assert.doesNotMatch(performanceSource, /item\.estimatedValue|parseSalesKpiMoney/);
  assert.match(selectorSource, /getLinkedQuotesForOpportunity\(opportunity, filteredQuotes\)/);
  assert.match(selectorSource, /!\['Won', 'Lost'\]\.includes\(opportunity\.stage\)/);
});

test('la tabla compacta agrupa contacto y seguimiento y conserva secundarios en Columnas', () => {
  const statusSource = readFileSync(resolve(salesRoot, 'Prospectos/utils/prospectosStatus.ts'), 'utf8');
  const rowSource = readFileSync(resolve(salesRoot, 'Prospectos/table/ProspectosTableRow.tsx'), 'utf8');

  assert.match(statusSource, /sales-opportunities-columns-v3/);
  assert.match(statusSource, /id: 'estimatedValue'.*label: 'Valor \/ forecast'.*visible: true/);
  assert.match(statusSource, /id: 'nextAction'.*label: 'Seguimiento'.*visible: true/);
  assert.match(statusSource, /id: 'status'.*label: 'Salud'.*visible: true/);
  for (const columnId of ['phone', 'email', 'probability', 'source', 'temperature', 'nextActionDate', 'lastContact', 'files', 'pipeline']) {
    assert.match(statusSource, new RegExp(`id: '${columnId}'.*visible: false`));
  }
  assert.match(rowSource, /href=\{`tel:\$\{opportunity\.phone\}`\}/);
  assert.match(rowSource, /href=\{`mailto:\$\{opportunity\.email\}`\}/);
  assert.match(rowSource, /OpportunityScheduleInlineEditor opportunity=\{opportunity\}/);
  assert.match(rowSource, /copy\.columns\.lastContact\.label/);
});

test('Ventas resume cobro, cumplimiento y siguiente acción con datos reales de Cartera', () => {
  const pageSource = readFileSync(resolve(salesRoot, 'Sales/Sales.tsx'), 'utf8');
  const filtersSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesFilters.tsx'), 'utf8');
  const rowSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesTableRow.tsx'), 'utf8');
  const kpiSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesKpiStrip.tsx'), 'utf8');
  const columnsSource = readFileSync(resolve(salesRoot, 'Sales/utils/salesStatuses.ts'), 'utf8');
  const signalsSource = readFileSync(resolve(salesRoot, 'Sales/utils/salesOperationalSignals.ts'), 'utf8');

  assert.match(pageSource, /receivablesApi\.workspace\(\)/);
  assert.match(pageSource, /buildSaleReceivableSummary\(record, receivableAccounts\)/);
  assert.match(pageSource, /downloadSaleInvoicePdf\(\{/);
  assert.match(pageSource, /downloadQuotePdf\(\{/);
  assert.match(filtersSource, /label=\{t\.filters\.period\}[\s\S]*label=\{t\.filters\.focus\}[\s\S]*label=\{t\.filters\.customer\}[\s\S]*label=\{t\.filters\.seller\}/);
  assert.doesNotMatch(filtersSource, /label=\{t\.filters\.businessUnit\}|label=\{t\.filters\.business\}/);
  assert.match(columnsSource, /id: 'financeStatus', defaultVisible: true/);
  assert.match(columnsSource, /id: 'deliveryStatus', defaultVisible: true/);
  assert.match(columnsSource, /id: 'nextAction', defaultVisible: true/);
  assert.match(columnsSource, /id: 'relationship', defaultVisible: false/);
  assert.match(columnsSource, /id: 'customerHealth', defaultVisible: false/);
  assert.match(columnsSource, /id: 'postSaleStatus', defaultVisible: false/);
  assert.match(rowSource, /receivable\.paidAmount/);
  assert.match(rowSource, /receivable\.balance/);
  assert.match(rowSource, /getSaleNextActionKey\(record, receivable\)/);
  assert.match(rowSource, /onDownloadInvoice\(record\)/);
  assert.match(rowSource, /onDownloadQuote\(record\)/);
  assert.match(signalsSource, /return 'createReceivable'/);
  assert.match(signalsSource, /return 'collectBalance'/);
  assert.match(kpiSource, /metric: 'RECEIVABLE_BALANCE'/);
  assert.match(kpiSource, /metric: 'RECEIVABLE_PAYMENT_AMOUNT'/);
  assert.match(kpiSource, /label: t\.kpis\.grossMargin/);
  assert.match(kpiSource, /label: t\.kpis\.averageTicket/);
});
