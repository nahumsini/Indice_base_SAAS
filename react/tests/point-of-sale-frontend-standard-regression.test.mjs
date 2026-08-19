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
  assert.doesNotMatch(products, /hover:shadow-md|hover:-translate-y/);
  assert.doesNotMatch(payment, /hover:shadow-lg|hover:-translate-y/);
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
  const cortesFilters = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesFiltersBar.tsx'), 'utf8');
  const cortesTable = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesTable.tsx'), 'utf8');
  const moduleSource = readFileSync(resolve(pointOfSaleRoot, 'PuntoDeVenta.tsx'), 'utf8');

  assert.match(cortesFilters, /rounded-2xl[\s\S]*h-11 w-full rounded-xl/);
  assert.match(cortesTable, /overflow-hidden rounded-xl/);
  assert.match(cortesTable, /inline-flex h-11 w-11[\s\S]*hover:bg-\[#FF6B5E\]\/10/);
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
  const kpiCard = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiCard.tsx'), 'utf8');
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

  assert.match(filters, /rounded-2xl[\s\S]*min-h-11 rounded-xl/);
  assert.doesNotMatch(kpiCard, /shadow-sm/);
  assert.match(closingTable, /h-11 rounded-xl[\s\S]*focus:border-\[#FF6B5E\]/);
  assert.match(kioskCenter, /rounded-xl[\s\S]*h-11[\s\S]*bg-\[#FF6B5E\]/);
  assert.doesNotMatch(kioskCenter, /bg-teal-600|shadow-sm/);
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

test('Cajas concentra la operación en vivo y los cortes cerrados del día', () => {
  const cashRegisters = readFileSync(resolve(pointOfSaleRoot, 'CashRegisters/CashRegistersWorkspace.tsx'), 'utf8');
  const cashRegisterTranslations = readFileSync(resolve(pointOfSaleRoot, 'CashRegisters/cashRegistersTranslations.ts'), 'utf8');

  assert.match(cashRegisters, /sessionView.*'all'.*'open'.*'closed'/);
  assert.match(cashRegisterTranslations, /closedToday: 'Cortes cerrados hoy'/);
  assert.match(cashRegisterTranslations, /todaySales: 'Ventas de hoy'/);
  assert.match(cashRegisterTranslations, /averageTicket: 'Ticket promedio del día'/);
  assert.match(cashRegisters, /copy\.metrics\.closedToday/);
  assert.match(cashRegisters, /copy\.metrics\.todaySales/);
  assert.match(cashRegisters, /copy\.metrics\.averageTicket/);
  assert.match(cashRegisters, /shift\.status === 'CLOSED' && isToday\(shift\.closedAt \|\| shift\.openedAt\)/);
  assert.match(cashRegisterTranslations, /todayClosings: \(count\) => `Cortes de hoy/);
  assert.match(cashRegisters, /<ClosedSessionCard/);
  assert.match(cashRegisterTranslations, /countedCash: 'Efectivo contado'/);
  assert.match(cashRegisterTranslations, /difference: 'Diferencia'/);
  assert.match(cashRegisters, /copy\.session\.countedCash/);
  assert.match(cashRegisters, /copy\.session\.difference/);
});

test('Venta mantiene caja, turno, catálogo e inventario dentro del mismo almacén operativo', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const registerContext = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleRegisterContext.ts'), 'utf8');
  const catalog = readFileSync(resolve(root, 'src/app/BasicModules/CommerceCore/posCatalog.ts'), 'utf8');
  const cart = readFileSync(resolve(pointOfSaleRoot, 'Sale/hooks/useSaleCart.ts'), 'utf8');
  const audits = readFileSync(resolve(pointOfSaleRoot, 'Arqueos/hooks/useCashAudits.ts'), 'utf8');

  assert.match(sale, /usePointOfSaleCatalogProducts\(\s*registerContext\?\.warehouseId/);
  assert.match(registerContext, /warehouse\.status\?\.toLocaleLowerCase\(\) === 'active'/);
  assert.match(registerContext, /warehouse\.unitId === register\.unitId[\s\S]*warehouse\.businessId === register\.businessId/);
  assert.match(catalog, /balances\.filter\(\(balance\) => String\(balance\.warehouseId \?\? ''\) === selectedWarehouseId\)/);
  assert.match(cart, /requestedQuantityByProduct[\s\S]*blockedProductIds[\s\S]*acceptedRequests/);
  assert.match(audits, /warehouseId: String\(row\.warehouseId\)/);
  assert.match(audits, /businessUnitId: row\.unitId == null \? '' : String\(row\.unitId\)/);
  assert.match(audits, /businessId: row\.businessId == null \? '' : String\(row\.businessId\)/);
});
