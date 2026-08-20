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
