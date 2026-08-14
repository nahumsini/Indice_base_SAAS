import assert from 'node:assert/strict';
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

test('Cortes, Facturacion y Descuentos comparten superficies y acciones del POS refinado', () => {
  const cortes = readFileSync(resolve(pointOfSaleRoot, 'Cortes/Cortes.tsx'), 'utf8');
  const cortesFilters = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesFiltersBar.tsx'), 'utf8');
  const cortesTable = readFileSync(resolve(pointOfSaleRoot, 'Cortes/components/CortesTable.tsx'), 'utf8');
  const billing = readFileSync(resolve(pointOfSaleRoot, 'Facturacion/Facturacion.tsx'), 'utf8');
  const discounts = readFileSync(resolve(pointOfSaleRoot, 'Descuentos/Descuentos.tsx'), 'utf8');

  assert.match(cortesFilters, /rounded-2xl[\s\S]*h-11 w-full rounded-xl/);
  assert.match(cortesTable, /overflow-hidden rounded-xl/);
  assert.match(cortesTable, /inline-flex h-11 w-11[\s\S]*hover:bg-\[#FF6B5E\]\/10/);
  assert.doesNotMatch(cortes, /bg-\[#FF6B5E\][^'"\n]*shadow-sm/);
  assert.match(billing, /rounded-2xl border border-slate-200 bg-white p-5/);
  assert.match(billing, /h-11 w-11[\s\S]*border-\[#FF6B5E\]\/25/);
  assert.doesNotMatch(billing, /rounded-lg border border-slate-200 bg-white shadow-sm/);
  assert.match(discounts, /overflow-hidden rounded-xl/);
  assert.match(discounts, /h-11 w-11[\s\S]*border-\[#FF6B5E\]\/25/);
});

test('KPIs y Kioscos conservan la jerarquia operativa y la identidad coral del POS', () => {
  const filters = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiFilters.tsx'), 'utf8');
  const kpiCard = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiCard.tsx'), 'utf8');
  const closingTable = readFileSync(resolve(pointOfSaleRoot, 'KPIs/components/PosKpiCashClosingTable.tsx'), 'utf8');
  const kiosks = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/KiosksWorkspace.tsx'), 'utf8');
  const selfService = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/SelfServiceKioskManager.tsx'), 'utf8');
  const customerDisplay = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/CustomerDisplayManager.tsx'), 'utf8');
  const customerDisplaySetup = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/CustomerDisplaySetupModal.tsx'), 'utf8');
  const selfCheckout = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/SelfCheckoutWorkspace.tsx'), 'utf8');
  const publicSelfCheckout = readFileSync(resolve(pointOfSaleRoot, 'SelfCheckoutKiosk/SelfCheckoutKiosk.tsx'), 'utf8');
  const routes = readFileSync(resolve(root, 'src/app/routes.tsx'), 'utf8');
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const shiftBar = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/ShiftBar.tsx'), 'utf8');

  assert.match(filters, /rounded-2xl[\s\S]*min-h-11 rounded-xl/);
  assert.doesNotMatch(kpiCard, /shadow-sm/);
  assert.match(closingTable, /h-11 rounded-xl[\s\S]*focus:border-\[#FF6B5E\]/);
  assert.match(kiosks, /rounded-2xl[\s\S]*h-11[\s\S]*bg-\[#FF6B5E\]/);
  assert.doesNotMatch(kiosks, /bg-teal-600|shadow-sm/);
  assert.match(selfService, /h-11[\s\S]*bg-\[#FF6B5E\]/);
  assert.doesNotMatch(selfService, /rounded-lg border border-slate-200 bg-white p-5 shadow-sm/);
  assert.doesNotMatch(customerDisplay, /rounded-lg border border-slate-200 bg-white p-5 shadow-sm/);
  assert.match(kiosks, /useState<KioskSection>\('customer-display'\)/);
  assert.match(kiosks, /waiterTab[\s\S]*kitchenTab[\s\S]*tablesTab/);
  assert.match(kiosks, /selfCheckoutTab/);
  assert.match(kiosks, /setSection\('self-checkout'\)[\s\S]*<SelfCheckoutWorkspace/);
  assert.match(selfCheckout, /catalogTitle[\s\S]*cartTitle[\s\S]*paymentTitle/);
  assert.match(selfCheckout, /scopeTitle[\s\S]*methodsTitle[\s\S]*peripheralsTitle[\s\S]*securityTitle/);
  assert.match(selfCheckout, /SelfCheckoutOrientation = 'horizontal' \| 'vertical'/);
  assert.match(selfCheckout, /SelfCheckoutStep = 'products' \| 'cart' \| 'payment'/);
  assert.match(selfCheckout, /HorizontalSelfCheckoutPreview[\s\S]*VerticalSelfCheckoutPreview/);
  assert.match(selfCheckout, /requestFullscreen[\s\S]*exitFullscreen/);
  assert.match(selfCheckout, /naturalWaterImage[\s\S]*vanillaIceCreamImage[\s\S]*freshSandwichImage[\s\S]*orangeJuiceImage/);
  assert.match(selfCheckout, /<img[\s\S]*object-cover/);
  assert.match(routes, /path: '\/pos-self-checkout\/:publicAccessToken'/);
  assert.match(publicSelfCheckout, /selfServiceKioskApi\.bootstrap\(publicAccessToken\)/);
  assert.match(publicSelfCheckout, /SelfCheckoutStep = 'products' \| 'cart' \| 'payment'/);
  assert.match(publicSelfCheckout, /requestFullscreen[\s\S]*exitFullscreen/);
  assert.match(publicSelfCheckout, /<img[\s\S]*object-cover/);
  assert.match(selfService, /\/pos-self-checkout\//);
  assert.match(selfService, /selfCheckoutLinkHelp/);
  assert.match(customerDisplay, /selfServiceKioskApi\.listCashRegisters\(\)/);
  assert.match(customerDisplay, /<CustomerDisplaySetupModal/);
  assert.match(customerDisplaySetup, /customerDisplayApi\.createPairingCode/);
  assert.doesNotMatch(sale, /CustomerDisplaySetupModal|onOpenCustomerDisplay/);
  assert.doesNotMatch(shiftBar, /Pantalla del cliente|onOpenCustomerDisplay/);
});

test('Kioscos normaliza las colecciones paginadas antes de filtrar cajas', () => {
  const kioskApi = readFileSync(resolve(pointOfSaleRoot, 'SelfServiceKiosk/selfServiceKioskApi.ts'), 'utf8');
  const kioskManager = readFileSync(resolve(pointOfSaleRoot, 'Kiosks/SelfServiceKioskManager.tsx'), 'utf8');

  assert.match(kioskApi, /function collectionFromResponse/);
  assert.match(kioskApi, /response\.items \?\? response\.data \?\? response\.rows \?\? response\.content \?\? \[\]/);
  assert.match(kioskApi, /return collectionFromResponse\(response\)/);
  assert.match(kioskManager, /register\.active && register\.unitId != null && register\.businessId != null/);
  assert.match(kioskManager, /registerScopeRequired/);
});
