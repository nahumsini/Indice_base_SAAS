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

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Venta conserva la geometria coral y los controles tactiles del workspace POS', () => {
  const sale = readFileSync(resolve(pointOfSaleRoot, 'Sale/Sale.tsx'), 'utf8');
  const products = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/QuickProductsPanel.tsx'), 'utf8');
  const ticket = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SaleTicketPanel.tsx'), 'utf8');
  const payment = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/SalePaymentPanel.tsx'), 'utf8');
  const signal = readFileSync(resolve(pointOfSaleRoot, 'Sale/components/IndiceSignalBar.tsx'), 'utf8');

  assert.match(sale, /data-pos-fullscreen-root[\s\S]*rounded-xl/);
  assert.match(products, /min-h-\[420px\][\s\S]*rounded-xl/);
  assert.match(ticket, /focus:border-\[#FF6B5E\]/);
  assert.match(ticket, /h-11 w-11[\s\S]*aria-label={`Restar/);
  assert.match(payment, /min-h-11 rounded-xl[\s\S]*x\{quantity\}/);
  assert.match(signal, /border-\[#FF6B5E\]\/25/);
  assert.doesNotMatch(products, /hover:shadow-md|hover:-translate-y/);
  assert.doesNotMatch(payment, /hover:shadow-lg|hover:-translate-y/);
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

  assert.match(filters, /rounded-2xl[\s\S]*min-h-11 rounded-xl/);
  assert.doesNotMatch(kpiCard, /shadow-sm/);
  assert.match(closingTable, /h-11 rounded-xl[\s\S]*focus:border-\[#FF6B5E\]/);
  assert.match(kiosks, /rounded-2xl[\s\S]*h-11[\s\S]*bg-\[#FF6B5E\]/);
  assert.doesNotMatch(kiosks, /bg-teal-600|shadow-sm/);
  assert.match(selfService, /h-11[\s\S]*bg-\[#FF6B5E\]/);
  assert.doesNotMatch(selfService, /rounded-lg border border-slate-200 bg-white p-5 shadow-sm/);
  assert.doesNotMatch(customerDisplay, /rounded-lg border border-slate-200 bg-white p-5 shadow-sm/);
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
