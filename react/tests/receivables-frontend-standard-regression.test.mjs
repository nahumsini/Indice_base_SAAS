import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const receivablesRoot = resolve(root, 'src/app/BasicModules/Receivables');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Cartera respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(receivablesRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Cartera conserva sus primitivas visuales y la integración con Sales CRM', () => {
  const moduleSource = readFileSync(resolve(receivablesRoot, 'index.tsx'), 'utf8');
  const titleBarSource = readFileSync(resolve(receivablesRoot, 'components/ReceivablesTitleBar.tsx'), 'utf8');
  const modalFrameSource = readFileSync(resolve(receivablesRoot, 'components/modals/ReceivablesModalFrame.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(moduleSource, /<SalesCrmProvider/);
  assert.match(titleBarSource, /<IndiceTitleBar/);
  assert.match(modalFrameSource, /<IndiceModalFrame/);
});

test('Cartera mantiene sus acciones de titulo directas mientras no superan tres', () => {
  const viewFiles = [
    'views/AccountsReceivableView.tsx',
    'views/PaymentsView.tsx',
    'views/CreditSalesView.tsx',
    'views/CreditCustomersView.tsx',
  ];

  for (const viewFile of viewFiles) {
    const source = readFileSync(resolve(receivablesRoot, viewFile), 'utf8');
    const titleBarSource = source.slice(
      source.indexOf('<ReceivablesTitleBar'),
      source.indexOf('<ReceivablesFilters'),
    );

    assert.match(titleBarSource, /onClick=\{\(\) => setShowColumnsModal\(true\)\}/);
    assert.equal(titleBarSource.match(/<Button/g)?.length, 2);
    assert.doesNotMatch(titleBarSource, /DropdownMenu/);
  }
});

test('Cartera conserva expediente financiero e índices móviles compactos', () => {
  const accountsSource = readFileSync(resolve(receivablesRoot, 'views/AccountsReceivableView.tsx'), 'utf8');
  const paymentsSource = readFileSync(resolve(receivablesRoot, 'views/PaymentsView.tsx'), 'utf8');
  const salesSource = readFileSync(resolve(receivablesRoot, 'views/CreditSalesView.tsx'), 'utf8');
  const customersSource = readFileSync(resolve(receivablesRoot, 'views/CreditCustomersView.tsx'), 'utf8');
  const detailSource = readFileSync(resolve(receivablesRoot, 'components/modals/ReceivableDetailModal.tsx'), 'utf8');

  assert.match(accountsSource, /<ReceivableDetailModal/);
  assert.match(detailSource, /accountPayments/);
  assert.match(detailSource, /accountInstallments/);
  assert.match(detailSource, /openReceipt/);
  for (const source of [accountsSource, paymentsSource, salesSource, customersSource]) {
    assert.match(source, /md:hidden/);
    assert.match(source, /hidden md:block/);
  }
});

test('Cartera no introduce texto operativo menor a 12 px', () => {
  const violations = collectFiles(receivablesRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/text-\[(?:[0-9]|1[01])px\]/g)].map(() => relative(root, file).replaceAll('\\', '/'));
  });

  assert.deepEqual(violations, []);
});

test('Cartera usa filtros progresivos y omite controles que no afectan cada vista', () => {
  const filtersSource = readFileSync(resolve(receivablesRoot, 'components/ReceivablesFilters.tsx'), 'utf8');
  const accountsSource = readFileSync(resolve(receivablesRoot, 'views/AccountsReceivableView.tsx'), 'utf8');
  const paymentsSource = readFileSync(resolve(receivablesRoot, 'views/PaymentsView.tsx'), 'utf8');
  const salesSource = readFileSync(resolve(receivablesRoot, 'views/CreditSalesView.tsx'), 'utf8');
  const customersSource = readFileSync(resolve(receivablesRoot, 'views/CreditCustomersView.tsx'), 'utf8');

  assert.match(filtersSource, /advancedFilterCount/);
  assert.match(filtersSource, /showAdvancedFilters/);
  assert.match(filtersSource, /<IndiceFilterDisclosureActions/);
  assert.match(filtersSource, /<IndiceFilterAdvancedSection/);
  assert.match(filtersSource, /hasAdvancedFilters && showAdvancedFilters/);
  assert.match(filtersSource, /resultSummary=/);
  assert.match(filtersSource, /showPeriod \? \(/);
  assert.match(filtersSource, /showStatus \? \(/);
  assert.match(paymentsSource, /showOrganization=\{false\}/);
  assert.match(paymentsSource, /showStatus=\{false\}/);
  assert.match(paymentsSource, /advancedContent=/);
  assert.match(customersSource, /showPeriod=\{false\}/);
  assert.doesNotMatch(accountsSource, /show(?:Organization|Period|Status)=\{false\}/);
  assert.doesNotMatch(salesSource, /show(?:Organization|Period|Status)=\{false\}/);
});

test('Cartera conecta KPI, filtros avanzados y ancho de tabla compacto', () => {
  const kpiSource = readFileSync(resolve(receivablesRoot, 'components/ReceivablesKpiAreas.tsx'), 'utf8');
  const creditKpiSource = readFileSync(resolve(receivablesRoot, 'components/CreditSalesKpiArea.tsx'), 'utf8');
  const tableSource = readFileSync(resolve(receivablesRoot, 'components/ReceivablesTableShell.tsx'), 'utf8');
  const paymentsSource = readFileSync(resolve(receivablesRoot, 'views/PaymentsView.tsx'), 'utf8');

  assert.match(kpiSource, /onStatusChange/);
  assert.match(kpiSource, /onEvidenceChange/);
  assert.match(kpiSource, /currencyContext=/);
  assert.match(creditKpiSource, /useKpiMonetaryAggregates/);
  assert.match(creditKpiSource, /onStatusChange/);
  assert.match(tableSource, /emptyColSpan <= 6/);
  assert.match(paymentsSource, /methodFilter/);
  assert.match(paymentsSource, /evidenceFilter/);
});
