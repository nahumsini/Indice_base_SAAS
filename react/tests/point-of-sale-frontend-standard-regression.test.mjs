import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const pointOfSaleRoot = resolve(root, 'src/app/BasicModules/PointOfSale');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('Punto de Venta mantiene nombre traducido en todos los idiomas soportados', () => {
  const languageContext = readFileSync(resolve(root, 'src/app/context/LanguageContext.tsx'), 'utf8');
  const moduleCatalog = readFileSync(resolve(root, 'src/app/config/moduleCatalog.ts'), 'utf8');
  const mainDashboard = readFileSync(resolve(root, 'src/app/Dashboard/MainDashboard.tsx'), 'utf8');
  const expectedDashboardLabels = [
    ['Punto de Venta', 2],
    ['Point of Sale', 2],
    ['Point de vente', 1],
    ['Ponto de Venda', 1],
    ['판매 시점 관리', 1],
    ['销售点', 1],
  ];
  const expectedPageTitles = [
    ['en-CA.ts', 'Point of Sale'],
    ['en-US.ts', 'Point of Sale'],
    ['es-CO.ts', 'Punto de Venta'],
    ['es-MX.ts', 'Punto de Venta'],
    ['fr-CA.ts', 'Point de vente'],
    ['ko-CA.ts', '판매 시점 관리'],
    ['pt-BR.ts', 'Ponto de Venda'],
    ['zh-CA.ts', '销售点'],
  ];

  assert.match(moduleCatalog, /title: \(t\) => t\.modules\.puntoVenta/);
  assert.match(mainDashboard, /pointOfSale: t\.modules\.puntoVenta/);
  for (const [label, expectedCount] of expectedDashboardLabels) {
    assert.equal(
      countOccurrences(languageContext, `puntoVenta: '${label}'`),
      expectedCount,
      `Expected ${expectedCount} dashboard module label(s) for ${label}`,
    );
  }
  for (const [fileName, title] of expectedPageTitles) {
    const source = readFileSync(resolve(pointOfSaleRoot, 'translations', fileName), 'utf8');
    assert.ok(source.includes(`title: '${title}'`), `${fileName} must translate the POS page title`);
  }
});

test('Punto de Venta ejecuta la auditoria i18n de tabs y catalogos soportados', () => {
  const result = spawnSync(process.execPath, ['scripts/pos-i18n-audit.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join('\n'),
  );
});

test('Venta traduce el estado sin turno y el aviso de cierre en todos los idiomas POS', () => {
  const noShiftState = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SaleNoShiftState.tsx'), 'utf8');
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const shiftHook = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleShift.ts'), 'utf8');
  const localeFiles = [
    ['en-CA.ts', 'Shift closed', 'View closing'],
    ['en-US.ts', 'Shift closed', 'View closing'],
    ['es-CO.ts', 'Turno cerrado', 'Ver cierre'],
    ['es-MX.ts', 'Turno cerrado', 'Ver corte'],
    ['fr-CA.ts', 'Quart fermé', 'Voir la fermeture'],
    ['ko-CA.ts', '근무조 종료됨', '마감 보기'],
    ['pt-BR.ts', 'Turno fechado', 'Ver fechamento'],
    ['zh-CA.ts', '班次已关闭', '查看结算'],
  ];
  const leakedSpanish = [
    'Cargando punto de venta',
    'Turno cerrado',
    'El corte quedó guardado',
    'Abre un turno',
    'Configura POS para operar',
    'Paso 1: crea',
    'Paso 2: crea',
    'Se necesita una caja activa',
    'Ver corte',
    'Abrir otro turno',
    'No se pudo cerrar el turno',
    'Diferencia:',
  ];

  assert.match(noShiftState, /moduleCopy\.sale\.noShiftState/);
  assert.match(noShiftState, /copy\.closedTitle/);
  assert.match(noShiftState, /copy\.viewClosing/);
  assert.match(noShiftState, /copy\.openAnotherShift/);
  assert.match(sale, /copy: pointOfSaleCopy\.sale\.shift/);
  assert.match(sale, /pointOfSaleCopy\.sale\.shift\.currencyMismatchNotice/);
  assert.match(shiftHook, /copy\.closedNotice/);
  assert.match(shiftHook, /copy\.closeError/);

  for (const phrase of leakedSpanish) {
    assert.ok(
      !noShiftState.includes(phrase),
      `SaleNoShiftState must not hardcode Spanish phrase: ${phrase}`,
    );
    assert.ok(
      !shiftHook.includes(phrase),
      `useSaleShift must not hardcode Spanish phrase: ${phrase}`,
    );
  }

  for (const [fileName, closedTitle, viewClosing] of localeFiles) {
    const source = readFileSync(resolve(pointOfSaleRoot, 'translations', fileName), 'utf8');
    assert.match(source, /noShiftState: \{/);
    assert.match(source, /shift: \{/);
    assert.ok(source.includes(`closedTitle: '${closedTitle}'`), `${fileName} must translate the closed shift title`);
    assert.ok(source.includes(`viewClosing: '${viewClosing}'`), `${fileName} must translate the view closing action`);
    assert.match(source, /closedNotice: \(tickets: number, total: string, difference: string\) =>/);
    assert.match(source, /currencyMismatchNotice: \(shiftCurrency: string, transactionCurrency: string\) =>/);
  }
});

test('Punto de Venta respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(pointOfSaleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(
    violations,
    [],
    `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`,
  );
});

test('Venta conserva la geometria coral y los controles tactiles del workspace POS', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const theme = readFileSync(resolve(root, 'src/styles/theme.css'), 'utf8');
  const products = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/QuickProductsPanel.tsx'), 'utf8');
  const preTickets = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/PendingPreTicketsPanel.tsx'), 'utf8');
  const ticket = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SaleTicketPanel.tsx'), 'utf8');
  const payment = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SalePaymentPanel.tsx'), 'utf8');
  const signal = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/IndiceSignalBar.tsx'), 'utf8');

  assert.match(sale, /data-pos-fullscreen-root[\s\S]*rounded-xl/);
  assert.match(sale, /data-pos-fullscreen-root[\s\S]*data-pos-terminal-mode/);
  assert.match(theme, /\[data-pos-fullscreen-root\]\[data-pos-terminal-mode\][\s\S]*--pos-terminal-height/);
  assert.match(theme, /\[data-pos-terminal-mode\] \[data-pos-fixed-footer\][\s\S]*display: grid/);
  assert.match(theme, /\[data-pos-terminal-mode\] \[data-pos-workspace-grid\][\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(products, /min-h-\[420px\][\s\S]*rounded-xl/);
  assert.match(ticket, /focus:border-\[#FF6B5E\]/);
  assert.match(ticket, /h-11 w-11[\s\S]*aria-label={`Restar/);
  assert.match(payment, /min-h-11 rounded-xl[\s\S]*x\{quantity\}/);
  assert.match(signal, /border-\[#FF6B5E\]\/25/);
  assert.match(sale, /const \[isPreticketWorkspaceOpen, setIsPreticketWorkspaceOpen\] = useState\(false\)/);
  assert.match(sale, />Pretickets<\/|\? 'Ocultar pretickets' : 'Pretickets'/);
  assert.match(sale, /workspaceMode=\{isPreticketWorkspaceOpen\}/);
  assert.match(theme, /\[data-pos-pre-tickets\]\[data-workspace-active="true"\][\s\S]*display: block/);
  assert.match(preTickets, /const expanded = workspaceMode \|\| isOpen/);
  assert.match(sale, /target\?\.closest\('button, input, select, textarea/);
  assert.doesNotMatch(products, /hover:shadow-md|hover:-translate-y/);
  assert.doesNotMatch(payment, /hover:shadow-lg|hover:-translate-y/);
});

test('Venta muestra solamente productos disponibles en la caja seleccionada', () => {
  const catalog = readFileSync(resolve(pointOfSaleRoot, 'Sale/utils/saleCatalog.ts'), 'utf8');
  const catalogHook = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleCatalog.ts'), 'utf8');
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const products = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/QuickProductsPanel.tsx'), 'utf8');

  assert.match(catalog, /isProductAvailableForSale/);
  assert.match(catalog, /!product\.useInventory \|\| product\.currentStock > 0/);
  assert.match(catalog, /\.filter\(isProductAvailableForSale\)[\s\S]*\.slice\(0, QUICK_PRODUCTS_LIMIT\)/);
  assert.match(catalog, /getProductCategories[\s\S]*\.filter\(isProductAvailableForSale\)/);
  assert.match(catalogHook, /availableProducts[\s\S]*products\.filter\(isProductAvailableForSale\)/);
  assert.match(catalogHook, /filterQuickProducts\(availableProducts, selectedCategory\)[\s\S]*getQuickProducts\(categoryProducts\)/);
  assert.match(sale, /catalogProducts=\{availableProducts\}/);
  assert.match(products, /categoryCatalogProducts[\s\S]*matchingCatalogProducts/);
  assert.match(products, /matchingCatalogProducts\.map/);
  assert.match(products, /product\.useInventory \? `Stock \$\{product\.currentStock\}` : 'Venta libre'/);
  assert.match(products, /product\.useInventory \? `Stock \$\{product\.currentStock\}` : 'Disponible'/);
});

test('Cobro en efectivo conserva recibido, cambio y una jerarquia clara para caja', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const payment = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SalePaymentPanel.tsx'), 'utf8');
  const checkout = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleCheckout.ts'), 'utf8');
  const calculations = readFileSync(resolve(pointOfSaleRoot, 'Sale/utils/saleCalculations.ts'), 'utf8');

  assert.match(sale, /isPaymentWorkspaceOpen \? 'Cobro en curso' : 'Cobrar'/);
  assert.match(payment, /Cambio a entregar/);
  assert.match(payment, /Cambio pendiente de entregar/);
  assert.match(payment, /Finalizar venta y entregar cambio/);
  assert.match(payment, /Registrar efectivo/);
  assert.match(checkout, /cashReceived: method === 'cash' \? receivedCash : undefined/);
  assert.match(checkout, /Pago exacto agregado\. Finaliza la venta para cerrar el cobro\./);
  assert.doesNotMatch(checkout, /setTimeout\(\(\) => \{\s*void completeSale\(nextPayments, nextTotals\)/);
  assert.match(calculations, /recordedCashChange/);
});

test('Devoluciones y movimientos operan dentro del workspace izquierdo', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const frame = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/PosModalFrame.tsx'), 'utf8');
  const movement = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/CashMovementModal.tsx'), 'utf8');
  const modalRegistry = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SaleModals.tsx'), 'utf8');

  assert.match(sale, /<ReturnModal[\s\S]*workspaceMode/);
  assert.match(sale, /<CashMovementModal[\s\S]*workspaceMode/);
  assert.match(frame, /presentation === 'workspace'/);
  assert.match(frame, /border-t border-gray-200 bg-white/);
  assert.match(movement, /tone=\{workspaceMode \? 'graphite' : 'coral'\}/);
  assert.doesNotMatch(modalRegistry, /ReturnModal|CashMovementModal/);
});

test('El resumen del corte actual se consulta sin abandonar el workspace de venta', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const shiftBar = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/ShiftBar.tsx'), 'utf8');
  const summary = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/ShiftSummaryWorkspace.tsx'), 'utf8');
  const shiftHook = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleShift.ts'), 'utf8');

  assert.match(shiftBar, /label="Resumen"[\s\S]*onOpenShiftSummary/);
  assert.match(sale, /<ShiftSummaryWorkspace[\s\S]*onRefresh={loadClosingSummary}/);
  assert.match(summary, /presentation="workspace"/);
  assert.match(summary, /tone="graphite"/);
  assert.match(summary, /Vista informativa · No cierra ni modifica el turno/);
  assert.match(shiftHook, /getShiftClosingSummary\(shiftId\)/);
});

test('Cortes conserva las superficies del POS y las funciones fiscales quedan fuera del modulo general', () => {
  const cortes = readFileSync(resolve(pointOfSaleRoot, 'Cortes/Cortes.tsx'), 'utf8');
  const cortesHeader = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesHeader.tsx'), 'utf8');
  const cortesFilters = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesFiltersBar.tsx'), 'utf8');
  const cortesKpis = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesKpiArea.tsx'), 'utf8');
  const cortesTable = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesTable.tsx'), 'utf8');
  const cortesColumnsModal = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesColumnsModal.tsx'), 'utf8');
  const corteDetail = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CorteDetailModal.tsx'), 'utf8');
  const cortesColumns = readFileSync(resolve(pointOfSaleRoot, 'Cortes/utils/cortesColumns.ts'), 'utf8');
  const cortesTypes = readFileSync(resolve(pointOfSaleRoot, 'Cortes/types/cashClosingHistory.types.ts'), 'utf8');
  const moduleSource = readFileSync(resolve(pointOfSaleRoot, 'PuntoDeVenta.tsx'), 'utf8');

  assert.match(cortesHeader, /<PointOfSaleTitleBar/);
  assert.match(cortesHeader, /icon="💵"/);
  assert.match(cortesHeader, /pointOfSaleTitleBarSecondaryActionClassName/);
  assert.match(cortesHeader, /pointOfSaleTitleBarPrimaryActionClassName/);
  assert.doesNotMatch(cortesHeader, /LearningModeTitleBarBridge|<section/);
  assert.match(cortesFilters, /<IndiceFilterBar/);
  assert.match(cortesFilters, /<IndiceFilterSearch/);
  assert.match(cortesFilters, /<IndiceFilterSelect/);
  assert.doesNotMatch(cortesFilters, /subtitle=|summary=|copy\.filters\.difference/);
  assert.match(cortes, /setTimeout\(\(\) => setDebouncedSearch\(filters\.search\), 300\)/);
  assert.match(cortes, /search: debouncedSearch/);
  assert.match(cortes, /getCortesPeriodRange\('month'\)/);
  assert.match(cortes, /period: 'month'/);
  assert.match(cortesTable, /rounded-\[24px\]/);
  assert.match(cortesTable, /table-fixed/);
  assert.match(cortesTable, /<colgroup>/);
  assert.match(cortesTable, /h-\[52px\]/);
  assert.match(cortesTable, /text-\[13px\] font-normal/);
  assert.match(cortesTable, /CORTES_COLUMN_WIDTHS_STORAGE_PREFIX/);
  assert.match(cortesTable, /getMinimumColumnWidths/);
  assert.match(cortesTable, /estimateHeaderWidth/);
  assert.match(cortesTable, /style=\{\{ width: `\$\{tableWidth\}px`, minWidth: '100%' \}\}/);
  assert.match(cortesTable, /overflow-x-auto overscroll-x-contain/);
  assert.match(cortesTable, /whitespace-nowrap/);
  assert.doesNotMatch(cortesTable, /resizeColumnBoundary|CORTES_RESIZABLE_WIDTH/);
  assert.match(cortesTable, /role="separator"/);
  assert.match(cortesTable, /inline-flex h-9 w-9/);
  assert.match(cortesTable, /<TooltipContent/);
  assert.match(cortesTable, /getClosingPaymentTotal\(row, 'CASH'\)/);
  assert.match(cortesTable, /getClosingPaymentTotal\(row, 'CARD'\)/);
  assert.match(cortesTable, /getClosingPaymentTotal\(row, 'TRANSFER'\)/);
  assert.match(cortesTable, /getClosingPaymentTotal\(row, 'CREDIT'\)/);
  assert.match(corteDetail, /getPaymentTotal\(detail, 'CREDIT'\)/);
  assert.match(cortesColumns, /'cash'[\s\S]*'card'[\s\S]*'transfer'[\s\S]*'credit'/);
  assert.doesNotMatch(cortesColumns, /\| 'expected'|\| 'counted'|\| 'difference'|\| 'shift'|\| 'status'/);
  assert.match(cortesTypes, /paymentsSummary\?: PosPaymentMethodSummary\[\]/);
  assert.match(cortesKpis, /analytics\.convertedCashSales/);
  assert.match(cortesKpis, /analytics\.convertedCardSales/);
  assert.match(cortesKpis, /analytics\.convertedTransferSales/);
  assert.match(cortesKpis, /analytics\.convertedCreditSales/);
  assert.match(cortesKpis, /nativeSalesLabel/);
  assert.match(cortesKpis, /copy\.kpis\.preferredTotal\(analytics\.preferredCurrency\)/);
  assert.match(cortesKpis, /copy\.kpis\.averageTicket/);
  assert.match(cortesKpis, /copy\.kpis\.averageClosing/);
  assert.doesNotMatch(cortesKpis, /copy\.kpis\.balancedChip/);
  assert.match(cortesColumnsModal, /<ColumnasConfigModal/);
  assert.match(cortesColumnsModal, /theme="pointOfSale"/);
  assert.match(cortesColumnsModal, /description: copy\.columnsModal\.descriptions\[id\]/);
  assert.match(cortesColumnsModal, /defaultCortesColumns\.filter/);
  assert.match(cortes, /metric: 'POS_CLOSING_CARD_SALES'/);
  assert.match(cortes, /metric: 'POS_CLOSING_TRANSFER_SALES'/);
  assert.match(cortes, /metric: 'POS_CLOSING_CREDIT_SALES'/);
  assert.doesNotMatch(cortesTable, /copy\.table\.title/);
  assert.match(cortes, /pagination=\{renderPagination\(true\)\}/);
  assert.match(cortes, /cashRegisterNames=\{cashRegisterNames\}/);
  assert.match(cortes, /warehouseNames=\{warehouseNames\}/);
  assert.doesNotMatch(cortes, /bg-\[#FF6B5E\][^'"\n]*shadow-sm/);
  assert.doesNotMatch(moduleSource, /id: 'facturacion'/);
  assert.doesNotMatch(moduleSource, /import\('\.\/Facturacion'\)/);
  assert.doesNotMatch(moduleSource, /id: 'descuentos'/);
  assert.match(moduleSource, /descuentos: '\/inventory\/discounts'/);
});

test('Descuentos ofrece controles compactos y eliminación confirmada con persistencia real', () => {
  const discounts = readFileSync(resolve(pointOfSaleRoot, 'Descuentos/Descuentos.tsx'), 'utf8');
  const hook = readFileSync(resolve(pointOfSaleRoot, 'Descuentos/hooks/useDiscountRules.ts'), 'utf8');
  const api = readFileSync(resolve(pointOfSaleRoot, 'shared/commercial/discounts/services/discountRulesApi.ts'), 'utf8');

  assert.match(discounts, /<Play className="h-4 w-4"/);
  assert.match(discounts, /<Pause className="h-4 w-4"/);
  assert.match(discounts, /<Trash2 className="h-4 w-4"/);
  assert.match(discounts, /<ConfirmDeleteDialog/);
  assert.match(hook, /await deleteDiscountRule\(rule\)/);
  assert.match(api, /method: 'DELETE'/);
});

test('KPIs y Kioscos conservan la jerarquia operativa y la identidad coral del POS', () => {
  const filters = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiFilters.tsx'), 'utf8');
  const kpiTitleBar = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiTitleBar.tsx'), 'utf8');
  const kpiCard = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiCard.tsx'), 'utf8');
  const kpiWorkspace = readFileSync(resolve(pointOfSaleRoot, 'KPIs/KPIs.tsx'), 'utf8');
  const kpiPanels = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiOperatingPanels.tsx'), 'utf8');
  const kpiHook = readFileSync(resolve(pointOfSaleRoot, 'KPIs/hooks/usePosKpiCashClosings.ts'), 'utf8');
  const closingTable = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiCashClosingTable.tsx'), 'utf8');
  const kiosks = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/KiosksWorkspace.tsx'), 'utf8');
  const kioskCenter = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/KioskCenterWorkspace.tsx'), 'utf8');
  const standardCreation = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/StandardKioskCreationFlow.tsx'), 'utf8');
  const kioskEdit = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/KioskEditModal.tsx'), 'utf8');
  const selfCheckoutCreation = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/SelfCheckoutCreationFlow.tsx'), 'utf8');
  const selfCheckoutWizard = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/SelfCheckoutSetupWizard.tsx'), 'utf8');
  const restaurantKiosks = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/RestaurantKioskWorkspace.tsx'), 'utf8');
  const publicSelfCheckout = readFileSync(resolve(pointOfSaleRoot, 'SelfCheckoutKiosk/SelfCheckoutKiosk.tsx'), 'utf8');
  const routes = readFileSync(resolve(root, 'src/app/routes.tsx'), 'utf8');
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const shiftBar = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/ShiftBar.tsx'), 'utf8');

  assert.match(filters, /<IndiceFilterBar/);
  assert.match(kpiTitleBar, /<PointOfSaleTitleBar/);
  assert.match(kpiTitleBar, /icon="📊"/);
  assert.doesNotMatch(kpiTitleBar, /eyebrow=/);
  assert.match(filters, /copy\.filters\.period[\s\S]*copy\.filters\.warehouse[\s\S]*copy\.filters\.cashRegister[\s\S]*copy\.filters\.cashier/);
  assert.doesNotMatch(filters, /onRefresh|rounded-2xl/);
  assert.match(kpiCard, /comparison\.direction[\s\S]*positiveWhenDown/);
  assert.match(kpiWorkspace, /POS_CLOSING_ABSOLUTE_DIFFERENCE/);
  assert.match(kpiWorkspace, /POS_CLOSING_SHORTAGE/);
  assert.match(kpiWorkspace, /POS_CLOSING_OVERAGE/);
  assert.match(kpiWorkspace, /POS_CLOSING_REFUNDS/);
  assert.match(kpiWorkspace, /previousRows[\s\S]*preferredCurrency/);
  assert.match(kpiPanels, /<LineChart[\s\S]*<PieChart/);
  assert.match(kpiHook, /while \(rows\.length < target\)/);
  assert.match(closingTable, /PosKpiPerformanceRow/);
  assert.match(closingTable, /min-w-\[1260px\][\s\S]*<colgroup>/);
  assert.match(closingTable, /<PointOfSaleTablePagination/);
  assert.match(closingTable, /point-of-sale\/cortes\?warehouseId=/);
  assert.match(kioskCenter, /<PointOfSaleTitleBar/);
  assert.match(kioskCenter, /icon="🖥️"/);
  assert.doesNotMatch(kioskCenter, /icon="🖥️"\s*eyebrow=/);
  assert.match(kioskCenter, /pointOfSaleTitleBarPrimaryActionClassName/);
  assert.match(kioskCenter, /pointOfSaleTitleBarSecondaryActionClassName/);
  assert.doesNotMatch(kioskCenter, /<section className="rounded-xl border border-\[#FF6B5E\]/);
  assert.doesNotMatch(kioskCenter, /bg-teal-600/);
  assert.match(kioskCenter, /rounded-\[24px\][\s\S]*shadow-sm/);
  assert.match(kioskCenter, /table-fixed[\s\S]*<colgroup>/);
  assert.match(kioskCenter, /KIOSK_COLUMN_WIDTHS_STORAGE_KEY/);
  assert.match(kioskCenter, /getKioskMinimumColumnWidths/);
  assert.match(kioskCenter, /role="separator"/);
  assert.match(kioskCenter, /aria-sort=/);
  assert.match(kioskCenter, /inline-flex items-center justify-end gap-1\.5 rounded-xl border/);
  assert.match(kioskCenter, /inline-flex h-9 w-9/);
  assert.match(kioskCenter, /kioskCashRegisterFilterValue/);
  assert.match(kioskCenter, /cashRegisterFilter === 'all'/);
  assert.match(kioskCenter, /copy\.center\.cashRegister[\s\S]*copy\.center\.connection/);
  assert.match(kioskCenter, /<IndiceFilterBar/);
  assert.match(kioskCenter, /<IndiceFilterSearch/);
  assert.match(kioskCenter, /<IndiceFilterSelect/);
  assert.doesNotMatch(kioskCenter, /function FilterField|function FilterSelect/);
  assert.doesNotMatch(kioskCenter, /label=\{copy\.center\.(?:type|branch|status)\}/);
  assert.match(kiosks, /useState<CreatableKioskExperience \| null>\(null\)/);
  assert.match(kiosks, /<StandardKioskCreationFlow/);
  assert.match(kiosks, /<SelfCheckoutCreationFlow/);
  assert.match(kiosks, /finishCreation/);
  assert.doesNotMatch(kiosks, /SelfServiceKioskManager|SelfCheckoutWorkspace|CustomerDisplayManager/);
  assert.match(kioskCenter, /restaurant-waiter[\s\S]*restaurant-tables[\s\S]*restaurant-kitchen/);
  assert.match(kioskCenter, /selfCheckoutTab/);
  assert.match(kioskCenter, /advisor-queue/);
  assert.match(kioskCenter, /maturity: 'prototype'/);
  assert.match(kioskCenter, /maturity: 'planned'/);
  assert.match(kioskCenter, /isCreatableKioskExperience/);
  assert.match(kioskCenter, /customerExperiences[\s\S]*operationExperiences/);
  assert.match(kioskCenter, /<KioskStatusBadge status=/);
  assert.match(kioskCenter, /<KioskEditModal/);
  assert.doesNotMatch(kioskCenter, /onOpenView|onOpenExperience|EditCustomerDisplayModal/);
  assert.match(restaurantKiosks, /syncOrder[\s\S]*syncInventory[\s\S]*syncStatus/);
  assert.match(kioskCenter, /KioskSensitiveActionModal/);
  assert.match(kioskCenter, /onCopy[\s\S]*onRotate[\s\S]*onToggle[\s\S]*onDelete/);
  assert.doesNotMatch(kioskCenter, /MoreHorizontal/);
  assert.match(standardCreation, /const steps = \['Experiencia', 'Información', 'Asignación', 'Catálogo', 'Acceso', 'Resumen'\]/);
  assert.match(standardCreation, /customerDisplayApi\.createPairingCode/);
  assert.match(standardCreation, /selfServiceKioskApi\.createAdmin/);
  assert.match(standardCreation, /Crear no abre un menú adicional/);
  assert.match(kioskEdit, /modalType="standard-form"/);
  assert.match(kioskEdit, /posKioskAdminApi\.update/);
  assert.match(kioskEdit, /selfServiceKioskApi\.updateAdmin/);
  assert.match(selfCheckoutCreation, /<SelfCheckoutSetupWizard/);
  assert.match(selfCheckoutWizard, /steps\.experience[\s\S]*steps\.general[\s\S]*steps\.assignment[\s\S]*steps\.catalog[\s\S]*steps\.access[\s\S]*steps\.summary/);
  assert.match(routes, /path: '\/pos-self-checkout\/:publicAccessToken'/);
  assert.match(publicSelfCheckout, /selfServiceKioskApi\.bootstrap\(publicAccessToken\)/);
  assert.match(publicSelfCheckout, /SelfCheckoutStep = 'products' \| 'cart' \| 'payment'/);
  assert.match(publicSelfCheckout, /requestFullscreen[\s\S]*exitFullscreen/);
  assert.match(publicSelfCheckout, /<img[\s\S]*object-cover/);
  assert.doesNotMatch(sale, /CustomerDisplaySetupModal|onOpenCustomerDisplay/);
  assert.doesNotMatch(shiftBar, /Pantalla del cliente|onOpenCustomerDisplay/);
});

test('Kioscos normaliza las colecciones paginadas antes de filtrar cajas', () => {
  const kioskApi = readFileSync(resolve(pointOfSaleRoot, 'SelfServiceKiosk/selfServiceKioskApi.ts'), 'utf8');
  const creationFlow = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/StandardKioskCreationFlow.tsx'), 'utf8');

  assert.match(kioskApi, /function collectionFromResponse/);
  assert.match(kioskApi, /response\.items \?\? response\.data \?\? response\.rows \?\? response\.content \?\? \[\]/);
  assert.match(kioskApi, /return collectionFromResponse\(response\)/);
  assert.match(creationFlow, /item\.active && item\.unitId && item\.businessId && item\.warehouseId/);
  assert.match(creationFlow, /No hay cajas activas con almacén, unidad y negocio completos/);
});

test('Clientes usa la tabla operativa estandar sin controles de fila innecesarios', () => {
  const customers = readFileSync(resolve(pointOfSaleRoot, 'Clientes/Clientes.tsx'), 'utf8');

  assert.match(customers, /rounded-\[24px\][\s\S]*shadow-sm/);
  assert.match(customers, /overflow-x-auto overscroll-x-contain/);
  assert.match(customers, /table-fixed[\s\S]*<colgroup>/);
  assert.match(customers, /h-\[52px\]/);
  assert.match(customers, /text-\[13px\] font-normal/);
  assert.match(customers, /CUSTOMER_TABLE_COLUMN_WIDTHS_STORAGE_KEY/);
  assert.match(customers, /getCustomerTableMinimumWidths/);
  assert.match(customers, /estimateCustomerTableHeaderWidth/);
  assert.match(customers, /style=\{\{ width: `\$\{tableWidth\}px`, minWidth: '100%' \}\}/);
  assert.match(customers, /role="separator"/);
  assert.match(customers, /aria-sort=/);
  assert.match(customers, /compareCustomers/);
  assert.match(customers, /inline-flex items-center justify-end gap-1\.5 rounded-xl border/);
  assert.match(customers, /inline-flex h-9 w-9/);
  assert.match(customers, /label="Editar cliente"[\s\S]*label="Datos de crédito"[\s\S]*label="Estado de cuenta"[\s\S]*label="Quitar cliente"/);
  assert.doesNotMatch(customers, /type="checkbox"/);
});

test('Cajas concentra la operación en vivo y los cortes cerrados del día', () => {
  const cashRegisters = readFileSync(resolve(pointOfSaleRoot, 'CashRegisters/CashRegistersWorkspace.tsx'), 'utf8');
  const cashRegisterTranslations = readFileSync(resolve(pointOfSaleRoot, 'CashRegisters/cashRegistersTranslations.ts'), 'utf8');

  assert.match(cashRegisters, /type CashRegisterActivityFilter = 'all' \| 'available' \| 'open' \| 'closing' \| 'missing' \| 'closed'/);
  assert.match(cashRegisterTranslations, /todayAccumulated: 'Acumulado del día'/);
  assert.match(cashRegisterTranslations, /availableRegisters: 'Cajas disponibles'/);
  assert.match(cashRegisterTranslations, /closingRegisters: 'Cajas en cierre'/);
  assert.match(cashRegisters, /copy\.metrics\.todayAccumulated/);
  assert.match(cashRegisters, /getDailySalesSummary\(currency\)/);
  assert.match(cashRegisters, /value=\{loading \? '—' : availableCount\}/);
  assert.match(cashRegisters, /shift\.status === 'CLOSED' && isToday\(shift\.closedAt \|\| shift\.openedAt\)/);
  assert.match(cashRegisterTranslations, /todayClosings: \(count\) => `Cajas con cortes hoy/);
  assert.match(cashRegisters, /<ClosedSessionCard/);
  assert.match(cashRegisterTranslations, /countedCash: 'Efectivo contado'/);
  assert.match(cashRegisterTranslations, /difference: 'Diferencia'/);
  assert.match(cashRegisters, /copy\.session\.countedCash/);
  assert.match(cashRegisters, /copy\.session\.difference/);
  assert.match(cashRegisters, /<SuccessToast[\s\S]*isVisible=\{Boolean\(successMessage\)\}/);
  assert.match(cashRegisters, /icon=\{<span className="text-xl leading-none">🏪<\/span>\}/);
  assert.doesNotMatch(cashRegisters, /copy\.header\.eyebrow|copy\.header\.refresh|pointOfSaleTitleBarSecondaryActionClassName/);
  assert.doesNotMatch(cashRegisterTranslations, /Administración operativa|Operational administration|refresh: 'Refresh'|refresh: 'Actualizar'/);
  assert.doesNotMatch(cashRegisters, /error \|\| notice/);
  assert.doesNotMatch(cashRegisters, /border-emerald-200 bg-emerald-50 text-emerald-700/);
  assert.match(cashRegisters, /<IndiceFilterBar/);
  assert.match(cashRegisters, /<IndiceFilterSearch/);
  assert.match(cashRegisters, /<IndiceFilterSelect/);
  assert.doesNotMatch(cashRegisters.match(/<IndiceFilterBar[\s\S]*?>/)?.[0] ?? '', /subtitle=|summary=/);
});

test('El localizador heredado permite que React actualice textos y atributos dinámicos', () => {
  const localizer = readFileSync(resolve(pointOfSaleRoot, 'PointOfSaleLegacyLocalizer.tsx'), 'utf8');

  assert.match(localizer, /currentValue === previous\.translated/);
  assert.match(localizer, /\? previous\.source\s*:\s*currentValue/);
  assert.match(localizer, /textSnapshots\.current\.set\(node, snapshot\)/);
  assert.match(localizer, /posI18nSource/);
  assert.match(localizer, /posI18nTranslated/);
  assert.doesNotMatch(localizer, /textOriginals/);
});

test('Venta mantiene caja, turno, catálogo e inventario dentro del mismo almacén operativo', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const registerContext = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleRegisterContext.ts'), 'utf8');
  const openShiftModal = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/OpenShiftModal.tsx'), 'utf8');
  const mexicanSpanishTranslations = readFileSync(resolve(pointOfSaleRoot, 'translations/es-MX.ts'), 'utf8');
  const noShiftState = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SaleNoShiftState.tsx'), 'utf8');
  const catalog = readFileSync(resolve(root, 'src/app/BasicModules/CommerceCore/posCatalog.ts'), 'utf8');
  const cart = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleCart.ts'), 'utf8');
  const audits = readFileSync(resolve(pointOfSaleRoot, 'Arqueos/hooks/useCashAudits.ts'), 'utf8');
  const moduleSource = readFileSync(resolve(pointOfSaleRoot, 'PuntoDeVenta.tsx'), 'utf8');

  assert.match(sale, /usePointOfSaleCatalogProducts\(\s*registerContext\?\.warehouseId/);
  assert.match(registerContext, /warehouse\.status\?\.toLocaleLowerCase\(\) === 'active'/);
  assert.match(registerContext, /warehouse\.unitId === register\.unitId[\s\S]*warehouse\.businessId === register\.businessId/);
  assert.match(openShiftModal, /const eligibleRegisters = useMemo/);
  assert.match(openShiftModal, /label=\{copy\.registerLabel\}/);
  assert.match(openShiftModal, /\{copy\.registerSectionDescription\}/);
  assert.match(mexicanSpanishTranslations, /registerLabel: 'Caja POS'/);
  assert.match(mexicanSpanishTranslations, /Si un almacén tiene varias cajas, aparecen por separado/);
  assert.match(openShiftModal, /registerContextMatchesSelection/);
  assert.doesNotMatch(openShiftModal, /label="Almacén"|onEnsureWarehouseRegister|handleWarehouseChange|isProvisioningRegister/);
  assert.doesNotMatch(noShiftState, /onEnsureWarehouseRegister|handleEnsureWarehouseRegister/);
  assert.match(noShiftState, /<PointOfSaleTitleBar/);
  assert.match(noShiftState, /icon="🧾"/);
  assert.match(noShiftState, /moduleCopy\.titleBars\.saleSubtitle/);
  assert.match(sale, /Frontend Engine title-bar exception/);
  assert.match(moduleSource, /emoji: '👥', component: Clientes/);
  assert.match(moduleSource, /<Clientes titleBarTitle=\{t\.tabs\.clientes\}/);
  assert.match(catalog, /balances\.filter\(\(balance\) => String\(balance\.warehouseId \?\? ''\) === selectedWarehouseId\)/);
  assert.match(cart, /requestedQuantityByProduct[\s\S]*blockedProductIds[\s\S]*acceptedRequests/);
  assert.match(audits, /warehouseId: String\(row\.warehouseId\)/);
  assert.match(audits, /businessUnitId: row\.unitId == null \? '' : String\(row\.unitId\)/);
  assert.match(audits, /businessId: row\.businessId == null \? '' : String\(row\.businessId\)/);
});
