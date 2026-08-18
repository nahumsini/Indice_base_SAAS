import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const governedPaths = [
  'src/app/BasicModules/Sales/Productos',
  'src/app/BasicModules/Sales/Inventory',
  'src/app/ComplementaryModules/Inventory',
  'src/app/BasicModules/PointOfSale/OrdenesCompra',
  'src/app/BasicModules/Expenses/Providers',
  'src/app/components/frontend-os',
  'src/app/components/indice-modal',
  'src/app/components/kiosk-engine',
];

const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  if (statSync(path).isFile()) return sourceExtensions.test(path) ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Inventarios y sus superficies compartidas respetan la escala tipográfica del Frontend Engine V2', () => {
  const violations = governedPaths.flatMap((path) => collectFiles(resolve(root, path))).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Almacenes vive en una pestaña propia y conserva los manejadores reales de inventario', () => {
  const moduleSource = readFileSync(resolve(root, 'src/app/ComplementaryModules/Inventory/Multiinventarios.tsx'), 'utf8');
  const inventorySource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/Inventory.tsx'), 'utf8');
  const workspaceSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/warehouses/WarehouseManagementWorkspace.tsx'), 'utf8');
  const filtersSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/InventoryFilters.tsx'), 'utf8');
  const receiptModalSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/movements/AddInventoryModal.tsx'), 'utf8');
  const tabScopeSource = readFileSync(resolve(root, 'src/app/access/tabScopeCatalog.ts'), 'utf8');
  const inventoryApiSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/services/inventoryApi.ts'), 'utf8');

  assert.match(moduleSource, /'warehouses'/);
  assert.match(moduleSource, /Inventory\/Warehouses/);
  assert.match(moduleSource, /almacenes:\s*'warehouses'/);
  assert.match(tabScopeSource, /warehouses:\s*'inventory'/);
  assert.doesNotMatch(inventorySource, /<CreateWarehouseModal/);
  assert.match(inventorySource, /onSubmit=\{handleCreateWarehouse\}/);
  assert.match(inventorySource, /onUpdate=\{handleUpdateWarehouse\}/);
  assert.match(inventorySource, /onDeleteWarehouse=\{handleDeleteWarehouse\}/);
  assert.match(inventorySource, /onTransferAndDeleteWarehouse=\{handleTransferAndDeleteWarehouse\}/);
  assert.match(workspaceSource, /WarehouseManagerView/);
  assert.match(workspaceSource, /WarehouseFormView/);
  assert.match(workspaceSource, /WarehouseDeleteView/);
  assert.match(workspaceSource, /selectedBusiness\?\.businessUnitId === draft\.businessUnitId/);
  assert.match(workspaceSource, /invalidWarehouseIds/);
  assert.match(workspaceSource, /onUpdate\(editingWarehouse\.id, normalizedDraft\)/);
  assert.match(workspaceSource, /createView === 'discard' \? 'confirmation' : 'standard-form'/);
  assert.match(workspaceSource, /hasSelectedStock \? 'standard-form' : 'confirmation'/);
  assert.match(workspaceSource, /busy=\{isCreating\}/);
  assert.match(workspaceSource, /busy=\{isDeleting\}/);
  assert.match(workspaceSource, /overflow-y-auto overscroll-contain/);
  assert.match(workspaceSource, /scrollbar-gutter:stable/);
  assert.match(workspaceSource, /unsavedChanges/);
  assert.doesNotMatch(workspaceSource, /max-w-(?:3xl|4xl)/);
  assert.doesNotMatch(filtersSource, /filterLabels\.businessUnit/);
  assert.doesNotMatch(filtersSource, /filterLabels\.business\}/);
  assert.match(filtersSource, /businessUnitId:\s*warehouse\?\.businessUnitId/);
  assert.match(filtersSource, /businessId:\s*warehouse\?\.businessId/);
  assert.match(receiptModalSource, /layout="workspace"/);
  assert.match(receiptModalSource, /busy=\{isSaving\}/);
  assert.match(receiptModalSource, /unsavedChanges/);
  assert.doesNotMatch(receiptModalSource, /Supplier receipt/);
  assert.match(receiptModalSource, /IndiceModalWizardStepper/);
  assert.match(receiptModalSource, /'receipt' \| 'products' \| 'review'/);
  assert.match(receiptModalSource, /view === 'discard' \? 'confirmation' : 'wizard'/);
  assert.match(receiptModalSource, /activeStep === 'review'/);
  const movementModalSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/movements/TransferStockModal.tsx'), 'utf8');
  assert.match(movementModalSource, /IndiceModalWizardStepper/);
  assert.match(movementModalSource, /modalType="wizard"/);
  assert.match(movementModalSource, /'movement' \| 'products' \| 'review'/);
  assert.match(movementModalSource, /activeStep === 'review'/);
  assert.match(movementModalSource, /creatableMovementTypes = movementTypes\.filter\(\(type\) => type !== 'sale'\)/);
  assert.match(movementModalSource, /isEditing \? movementTypes : creatableMovementTypes/);
  assert.match(movementModalSource, /adjustmentDirection/);
  assert.match(movementModalSource, /adjustmentLabels\.criteria/);
  assert.match(movementModalSource, /adjustmentLabels\.difference/);
  const movementEntriesSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/utils/inventoryMovementEntries.ts'), 'utf8');
  assert.match(movementEntriesSource, /adjustmentDirection === 'increase' \? quantity : -quantity/);
  assert.match(inventoryApiSource, /salesApi\.context\(\)/);
  assert.match(inventoryApiSource, /businessUnitId: isDatabaseId\(warehouse\.businessUnitId\) \? warehouse\.businessUnitId : undefined/);
  assert.match(inventoryApiSource, /businessId: isDatabaseId\(warehouse\.businessId\) \? warehouse\.businessId : undefined/);
  assert.doesNotMatch(inventorySource, /inventoryBusinessStructureMocks/);
});

test('Descuentos se administra desde Inventarios y se publica hacia los canales comerciales', () => {
  const moduleSource = readFileSync(resolve(root, 'src/app/ComplementaryModules/Inventory/Multiinventarios.tsx'), 'utf8');
  const guidanceSource = readFileSync(resolve(root, 'src/app/ComplementaryModules/Inventory/operationalGuidance/inventoryLearningControls.ts'), 'utf8');
  const discountsSource = readFileSync(resolve(root, 'src/app/BasicModules/PointOfSale/Descuentos/Descuentos.tsx'), 'utf8');
  const tabScopeSource = readFileSync(resolve(root, 'src/app/access/tabScopeCatalog.ts'), 'utf8');

  assert.match(moduleSource, /'discounts'/);
  assert.match(moduleSource, /PointOfSale\/Descuentos/);
  assert.match(moduleSource, /descuentos:\s*'discounts'/);
  assert.match(moduleSource, /t\.tabs\.discounts/);
  assert.match(tabScopeSource, /discounts:\s*'products'/);
  assert.match(guidanceSource, /Habilitar en POS, Ventas y kioscos/);
  assert.match(guidanceSource, /política comercial asociada al producto/);
  assert.match(discountsSource, /overflow-hidden rounded-xl/);
});
