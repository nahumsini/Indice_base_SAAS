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

test('Oportunidades y Ventas usan el motor compartido de tablas operativas', () => {
  const engineSource = readFileSync(resolve(root, 'src/app/components/table/IndiceTableEngine.tsx'), 'utf8');
  const sizingSource = readFileSync(resolve(root, 'src/app/components/table/indiceTableColumnSizing.ts'), 'utf8');
  const widthsHookSource = readFileSync(resolve(root, 'src/app/hooks/usePersistentColumnWidths.ts'), 'utf8');
  const opportunitiesTableSource = readFileSync(resolve(salesRoot, 'Prospectos/table/ProspectosTable.tsx'), 'utf8');
  const opportunitiesStateSource = readFileSync(resolve(salesRoot, 'Prospectos/hooks/useProspectosViewState.ts'), 'utf8');
  const salesTableSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesTable.tsx'), 'utf8');
  const salesHeaderSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesTableHeader.tsx'), 'utf8');

  assert.match(engineSource, /rounded-\[24px\]/);
  assert.match(engineSource, /export function IndiceOperationalTable/);
  assert.match(engineSource, /style=\{\{ minWidth: resolvedWidth, width: resolvedWidth \}\}/);
  assert.match(engineSource, /export function IndiceTableHeaderRow/);
  assert.match(engineSource, /export function IndiceTableColGroup/);
  assert.match(engineSource, /h-\[52px\].*text-\[13px\].*font-normal/);
  assert.match(engineSource, /aria-sort=/);
  assert.match(engineSource, /whitespace-nowrap/);
  assert.doesNotMatch(engineSource, /break-words|whitespace-normal/);
  assert.match(engineSource, /getIndiceTableMinimumColumnWidth/);
  assert.match(engineSource, /width < effectiveMinimumWidth/);
  assert.match(sizingSource, /estimateIndiceTableHeaderWidth/);
  assert.match(sizingSource, /Array\.from\(label\.trim\(\)\)/);
  assert.match(engineSource, /role="separator"/);
  assert.match(engineSource, /aria-valuemin=/);
  assert.match(engineSource, /event\.key === 'ArrowLeft'/);
  assert.match(engineSource, /event\.key === 'ArrowRight'/);
  assert.match(engineSource, /event\.key === 'Home'/);
  assert.match(engineSource, /onDoubleClick=/);
  assert.match(widthsHookSource, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(widthsHookSource, /window\.localStorage\.setItem\(storageKey/);
  assert.match(widthsHookSource, /headerLabels/);
  assert.match(widthsHookSource, /sortableColumnIds/);

  assert.match(opportunitiesTableSource, /<IndiceTableShell/);
  assert.match(opportunitiesTableSource, /<IndiceOperationalTable/);
  assert.match(opportunitiesTableSource, /<IndiceTableHeaderRow/);
  assert.match(opportunitiesTableSource, /<IndiceTableColGroup/);
  assert.match(opportunitiesStateSource, /usePersistentColumnWidths/);
  assert.match(salesTableSource, /<IndiceTableShell/);
  assert.match(salesTableSource, /<IndiceOperationalTable/);
  assert.match(salesTableSource, /<IndiceTableColGroup/);
  assert.match(salesTableSource, /salesColumnWidthsStorageKey/);
  assert.match(salesHeaderSource, /<IndiceTableHeaderRow/);
  assert.match(salesHeaderSource, /leadingControl=\{\{/);
  assert.match(salesHeaderSource, /actions=\{/);
});

test('las tablas activas de Ventas comparten encabezados, anchos y contenedor estándar', () => {
  const tableFiles = [
    resolve(salesRoot, 'Contactos/Contactos.tsx'),
    resolve(salesRoot, 'Cotizacion/Cotizacion.tsx'),
    resolve(salesRoot, 'Contrato/Contrato.tsx'),
    resolve(salesRoot, 'Sales/components/CommissionTable.tsx'),
    resolve(salesRoot, 'Sales/components/CommissionCutsTable.tsx'),
    resolve(root, 'src/app/BasicModules/Expenses/PaymentAccounts/components/PaymentAccountsTable.tsx'),
    resolve(salesRoot, 'KPIs/components/SalesSellerRanking.tsx'),
    resolve(salesRoot, 'KPIs/components/SalesProspectsPerformanceTable.tsx'),
  ];

  tableFiles.forEach((tableFile) => {
    const source = readFileSync(resolve(salesRoot, tableFile), 'utf8');
    const label = relative(root, tableFile);
    assert.match(source, /<IndiceTableShell/, `${label} no usa el contenedor estándar`);
    assert.match(source, /<IndiceOperationalTable/, `${label} no fija el ancho real ni el scroll con el motor compartido`);
    assert.match(source, /<IndiceTableHeaderRow/, `${label} no usa la fila de encabezado canónica`);
    assert.match(source, /<IndiceTableColGroup/, `${label} no declara los anchos con el motor compartido`);
    assert.match(source, /IndiceTableColumnDefinition/, `${label} no define columnas tipadas`);
    assert.match(source, /usePersistentColumnWidths/, `${label} no conserva los anchos elegidos`);
    assert.match(source, /headerLabels:/, `${label} no calcula el ancho mínimo desde el título visible`);
    assert.match(source, /sortableColumnIds:/, `${label} no reserva el espacio del indicador de orden`);
    assert.match(source, /sortable/, `${label} no expone orden ascendente y descendente`);
  });

  const contactsSource = readFileSync(resolve(salesRoot, 'Contactos/Contactos.tsx'), 'utf8');
  const quotesSource = readFileSync(resolve(salesRoot, 'Cotizacion/Cotizacion.tsx'), 'utf8');
  const contractsSource = readFileSync(resolve(salesRoot, 'Contrato/Contrato.tsx'), 'utf8');
  const commissionsSource = readFileSync(resolve(salesRoot, 'Sales/components/CommissionTable.tsx'), 'utf8');
  const paymentAccountsSource = readFileSync(resolve(root, 'src/app/BasicModules/Expenses/PaymentAccounts/components/PaymentAccountsTable.tsx'), 'utf8');

  for (const source of [contactsSource, quotesSource, contractsSource, commissionsSource, paymentAccountsSource]) {
    assert.match(source, /<IndiceTableActionGroup/);
    assert.match(source, /actions=\{\{/);
  }

  assert.match(quotesSource, /headerLabels: quoteColumnLabels/);
  assert.match(quotesSource, /sortableColumnIds: quoteSortableColumnIds/);

  const spanishQuotesSource = readFileSync(resolve(salesRoot, 'Cotizacion/translations/es-MX.ts'), 'utf8');
  assert.match(spanishQuotesSource, /number: 'Cotización'/);
  assert.match(spanishQuotesSource, /readiness: 'Validación'/);
  assert.match(spanishQuotesSource, /amount: 'Valor'/);
  assert.doesNotMatch(spanishQuotesSource, /Cotización \/ cliente|Valor \/ margen/);

  const spanishSalesSource = readFileSync(resolve(salesRoot, 'Sales/translations/es-MX.ts'), 'utf8');
  const englishSalesSource = readFileSync(resolve(salesRoot, 'Sales/translations/en-CA.ts'), 'utf8');
  assert.match(spanishSalesSource, /actions: 'Acciones'/);
  assert.match(spanishSalesSource, /nextAction: 'Siguiente acción'/);
  assert.doesNotMatch(spanishSalesSource, /Documentos y acciones|Pendiente \/ siguiente acción/);
  assert.match(englishSalesSource, /actions: 'Actions'/);
  assert.match(englishSalesSource, /nextAction: 'Next action'/);
  assert.doesNotMatch(englishSalesSource, /Documents and actions|Pending \/ next action/);
});

test('Contratos permite editar y persistir un registro existente', () => {
  const contractsSource = readFileSync(resolve(salesRoot, 'Contrato/Contrato.tsx'), 'utf8');
  const crmContextSource = readFileSync(resolve(salesRoot, 'salesCrmContext.tsx'), 'utf8');
  const crmTypesSource = readFileSync(resolve(salesRoot, 'types/salesCrmContextTypes.ts'), 'utf8');

  assert.match(contractsSource, /const openEditContract = \(contract: DigitalContract\)/);
  assert.match(contractsSource, /onClick=\{\(\) => openEditContract\(contract\)\}/);
  assert.match(contractsSource, /updateContract\(editingContractId, contractPayload\)/);
  assert.match(crmTypesSource, /updateContract: \(contractId: string, patch: UpdateDigitalContractInput\) => void/);
  assert.match(crmContextSource, /updateContract: \(contractId, patch\) =>/);
  assert.match(crmContextSource, /salesApi\.update\('contracts'/);
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
  const filterBarSource = readFileSync(resolve(salesRoot, 'components/SalesFilterBar.tsx'), 'utf8');

  assert.match(prospectsSource, /const handleClearFilters = \(\) =>/);
  assert.match(contactsSource, /const handleClearFilters = \(\) =>/);
  assert.doesNotMatch(prospectsSource.match(/const handleClearFilters[\s\S]*?\n  };/)?.[0] ?? '', /setActiveView|setSortState/);
  assert.doesNotMatch(contactsSource.match(/const handleClearFilters[\s\S]*?\n  };/)?.[0] ?? '', /setSortState|setVisibleContactColumns/);
  assert.match(contactsSource, /onClear=\{handleClearFilters\}/);
  assert.doesNotMatch(contactsSource, /summary=/);
  assert.match(contactsSource, /title=\{titleBarTitle \?\? t\.header\.title\}/);
  assert.match(filterBarSource, /clearLabel\?: string/);
  assert.match(filterBarSource, /onClear\?: \(\) => void/);
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

test('el wizard de Productos hace visible la publicación en POS y advierte inventario no publicado', () => {
  const modalSource = readFileSync(resolve(salesRoot, 'Productos/components/ProductCreateModal.tsx'), 'utf8');
  const tabsSource = readFileSync(resolve(salesRoot, 'Productos/components/product-modal/ProductModalTabs.tsx'), 'utf8');
  const constantsSource = readFileSync(resolve(salesRoot, 'Productos/components/product-modal/productModalConstants.ts'), 'utf8');

  assert.match(constantsSource, /'basics',[\s\S]*'commercial',[\s\S]*'availability',[\s\S]*'review'/);
  assert.match(modalSource, /activeStep === 'commercial'.*form\.visibility !== 'Internal'.*Number\(form\.price\) <= 0/);
  assert.match(tabsSource, /activeStep === 'availability'/);
  assert.match(tabsSource, /form\.usesInventory && !form\.visibility\.includes\('POS'\)/);
  assert.doesNotMatch(tabsSource, /<Collapsible>/);
});

test('Productos conserva POS listo al recargar y el ticket muestra la unidad configurada', () => {
  const adaptersSource = readFileSync(resolve(salesRoot, 'adapters/salesApiAdapters.ts'), 'utf8');
  const posCatalogSource = readFileSync(resolve(root, 'src/app/BasicModules/CommerceCore/posCatalog.ts'), 'utf8');
  const ticketSource = readFileSync(resolve(root, 'src/app/BasicModules/PointOfSale/Sale/components/SaleTicketPanel.tsx'), 'utf8');

  assert.match(adaptersSource, /pos_ready: 'POS ready'/);
  assert.match(posCatalogSource, /Kilogram: 'kg'/);
  assert.match(posCatalogSource, /packaging\.saleUnit === 'Unit' \? packaging\.baseUnit : packaging\.saleUnit/);
  assert.match(ticketSource, /product\?\.unitLabel \?\? 'uds'/);
  assert.doesNotMatch(ticketSource, />uds<\/span>/);
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
  const pdfSource = readFileSync(resolve(salesRoot, 'Cotizacion/quotePdf.ts'), 'utf8');
  const companyIdentitySource = readFileSync(resolve(salesRoot, '../shared/print/useCompanyPrintIdentity.ts'), 'utf8');
  const filterSource = readFileSync(resolve(salesRoot, 'Cotizacion/utils/quotePageUtils.ts'), 'utf8');
  const translationsSource = readFileSync(resolve(salesRoot, 'Cotizacion/translations/es-MX.ts'), 'utf8');
  const tableSource = pageSource.match(/<IndiceTableShell[\s\S]*?<\/IndiceTableShell>/)?.[0] ?? '';

  assert.match(pageSource, /const quoteTableColumns:[\s\S]*quoteTableColumnIds\.map/);
  assert.match(pageSource, /sortable: columnId !== 'readiness'/);
  assert.match(tableSource, /<IndiceTableHeaderRow/);
  assert.match(tableSource, /actions=\{\{ label: t\.table\.columns\.actions/);
  assert.match(tableSource, /<TableCell colSpan=\{9\}/);
  assert.match(tableSource, /<QuoteMarginBadge/);
  assert.match(tableSource, /<QuoteExpirationBadge[\s\S]*quote\.lastUpdated/);
  assert.match(pageSource, /salesRecords\.find\(\(sale\) =>/);
  assert.match(tableSource, /salesT\.table\.columns\.saleNumber/);
  assert.match(tableSource, /prospectosT\.options\.nextActions\[opportunity\.nextAction\]/);
  assert.match(tableSource, /opportunity\.nextActionDate/);
  assert.match(pageSource, /const downloadSavedQuote = \(quote: SalesQuote\)/);
  assert.match(tableSource, /onClick=\{\(\) => downloadSavedQuote\(quote\)\}/);
  assert.match(translationsSource, /number: 'Cotización'/);
  assert.match(translationsSource, /readiness: 'Validación'/);
  assert.match(translationsSource, /productRequiresReview: 'Revisar estado, precio o visibilidad'/);
  assert.match(translationsSource, /amount: 'Valor'/);
  assert.match(translationsSource, /expiration: 'Seguimiento'/);
  assert.match(translationsSource, /files: 'Documentos'/);
  assert.match(pageSource, /gridClassName="xl:grid-cols-\[1\.5fr_repeat\(2,minmax\(0,1fr\)\)\]"/);
  assert.match(pageSource, /SalesFilterSelect label=\{t\.filters\.client\}/);
  assert.match(pageSource, /SalesFilterSelect label=\{t\.filters\.seller\}/);
  assert.doesNotMatch(pageSource, /statusFilter|opportunityFilter/);
  assert.match(filterSource, /normalizeTextKey\(quote\.clientName\) === clientFilter/);
  assert.doesNotMatch(filterSource, /matchesStatus|matchesOpportunity/);
  assert.match(pageSource, /company: companyPrintIdentity/);
  assert.match(pdfSource, /lineItems: 'Partidas'/);
  assert.match(pdfSource, /units: 'Unidades'/);
  assert.match(pdfSource, /contact\?\.fiscalTaxId/);
  assert.match(pdfSource, /contactFiscalAddress/);
  assert.match(pdfSource, /company\?\.address/);
  assert.match(pdfSource, /loadLogoDataUrl\(company\?\.logoUrl \|\| ''\)/);
  assert.match(pdfSource, /doc\.addImage\(companyLogoDataUrl/);
  assert.match(pdfSource, /else \{\s*doc\.text\(fittedCompanyName, companyHeaderCenter/);
  assert.match(pdfSource, /logoX = companyHeaderCenter - logoWidth \/ 2/);
  assert.match(pdfSource, /fitSingleLine/);
  assert.doesNotMatch(pdfSource, /drawInsightCard|customerSummary|drawMetricCard|drawBrandBar|documentSubtitle|canBeAccepted|signatureY/);
  assert.match(companyIdentitySource, /address: companyAddress \|\| officeAddress/);
  assert.match(companyIdentitySource, /phone: corporateOffice\?\.telefono/);
});

test('Cotizaciones elimina de forma confirmada y actualiza el pipeline derivado', () => {
  const pageSource = readFileSync(resolve(salesRoot, 'Cotizacion/Cotizacion.tsx'), 'utf8');
  const contextSource = readFileSync(resolve(salesRoot, 'salesCrmContext.tsx'), 'utf8');

  assert.match(pageSource, /setQuotePendingDeletion\(quote\)/);
  assert.match(pageSource, /await deleteQuote\(quotePendingDeletion\.id\)/);
  assert.match(pageSource, /AlertDialogTitle/);
  assert.match(contextSource, /await salesApi\.delete\('quotes', backendId\)/);
  assert.match(contextSource, /setQuotes\(\(current\) => current\.filter/);
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

test('el detalle de venta usa el modal estándar y conserva el alta como wizard', () => {
  const modalSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesDetailModal.tsx'), 'utf8');
  const detailSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesRecordDetailView.tsx'), 'utf8');

  assert.match(modalSource, /modalType=\{isCreateMode \? 'wizard' : 'standard-form'\}/);
  assert.doesNotMatch(modalSource, /large-workspace/);
  assert.match(modalSource, /<SalesRecordDetailView/);
  assert.match(detailSource, /t\.modal\.sections\.payment/);
  assert.match(detailSource, /t\.modal\.sections\.inventory/);
  assert.match(detailSource, /<CollapsibleDetailSection/);
  assert.match(modalSource, /t\.modal\.previewSaleSummary/);
});

test('Ventas elimina con confirmación y espera la baja lógica del backend', () => {
  const pageSource = readFileSync(resolve(salesRoot, 'Sales/Sales.tsx'), 'utf8');
  const rowSource = readFileSync(resolve(salesRoot, 'Sales/components/SalesTableRow.tsx'), 'utf8');
  const contextSource = readFileSync(resolve(salesRoot, 'salesCrmContext.tsx'), 'utf8');

  assert.match(rowSource, /t\.table\.actions\.deleteSale/);
  assert.match(pageSource, /<SaleDeleteDialog/);
  assert.match(pageSource, /await deleteSaleRecord\(record\.id\)/);
  assert.match(contextSource, /await salesApi\.delete\('sales', backendId\)/);
});
