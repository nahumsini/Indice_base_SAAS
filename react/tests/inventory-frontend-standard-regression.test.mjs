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
  'src/app/BasicModules/PointOfSale/Descuentos',
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
  const warehouseManagerSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/warehouses/WarehouseManagerView.tsx'), 'utf8');
  const warehouseFormSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/warehouses/WarehouseFormView.tsx'), 'utf8');
  const warehouseColumnsSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/warehouses/WarehouseColumnsModal.tsx'), 'utf8');
  const filtersSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/InventoryFilters.tsx'), 'utf8');
  const receiptModalSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/movements/AddInventoryModal.tsx'), 'utf8');
  const tabScopeSource = readFileSync(resolve(root, 'src/app/access/tabScopeCatalog.ts'), 'utf8');
  const inventoryApiSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/services/inventoryApi.ts'), 'utf8');

  assert.match(moduleSource, /'warehouses'/);
  assert.match(moduleSource, /Inventory\/Warehouses/);
  assert.match(moduleSource, /almacenes:\s*'warehouses'/);
  assert.match(moduleSource, /WarehouseColorIcon/);
  assert.doesNotMatch(moduleSource, /warehouses[^\n]+🏭/);
  assert.ok(
    moduleSource.indexOf("{ id: 'warehouses'") < moduleSource.indexOf("{ id: 'inventory'"),
    'Almacenes debe aparecer antes de Inventario en la navegacion del modulo',
  );
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
  assert.match(workspaceSource, /createView === 'discard' \? 'confirmation' : 'wizard'/);
  assert.match(workspaceSource, /hasSelectedStock \? 'standard-form' : 'confirmation'/);
  assert.match(workspaceSource, /busy=\{isCreating\}/);
  assert.match(workspaceSource, /busy=\{isDeleting\}/);
  assert.match(workspaceSource, /overflow-y-auto overscroll-contain/);
  assert.match(workspaceSource, /scrollbar-gutter:stable/);
  assert.match(workspaceSource, /unsavedChanges/);
  assert.match(workspaceSource, /actions=\{/);
  assert.match(workspaceSource, /WarehouseColumnsModal/);
  assert.match(workspaceSource, /indice\.inventory\.warehouses\.columns/);
  assert.doesNotMatch(workspaceSource, /max-w-(?:3xl|4xl)/);
  assert.match(warehouseFormSource, /activeStep: 'identity' \| 'assignment' \| 'review'/);
  assert.match(warehouseFormSource, /IndiceModalSummary/);
  assert.match(warehouseFormSource, /warehouseNameHelp/);
  assert.match(warehouseFormSource, /step="1"/);
  assert.match(warehouseFormSource, /step="2"/);
  assert.match(warehouseFormSource, /step="3"/);
  assert.doesNotMatch(warehouseFormSource, /modals\.warehouseType/);
  assert.doesNotMatch(warehouseFormSource, /modals\.addressNote/);
  assert.match(warehouseManagerSource, /SalesFilterBar/);
  assert.match(warehouseManagerSource, /SalesFilterSearch/);
  assert.match(warehouseManagerSource, /SalesFilterSelect/);
  assert.match(warehouseManagerSource, /clearFilters/);
  assert.match(warehouseManagerSource, /businessUnitFilter/);
  assert.match(warehouseManagerSource, /businessFilter/);
  assert.match(warehouseManagerSource, /filterLabels\.business/);
  assert.doesNotMatch(warehouseManagerSource, /typeFilter/);
  assert.doesNotMatch(warehouseManagerSource, /filterLabels\.warehouseType/);
  assert.match(warehouseManagerSource, /DataTablePagination/);
  assert.match(warehouseManagerSource, /visibleColumns\.map/);
  assert.match(warehouseColumnsSource, /ColumnasConfigModal/);
  assert.match(warehouseColumnsSource, /fixedColumns/);
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
  assert.match(movementModalSource, /await onSubmit\(draft\)/);
  assert.match(movementModalSource, /setSaveError\(getOperationErrorMessage/);
  assert.match(movementModalSource, /busy=\{isSaving\}/);
  const movementEntriesSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/utils/inventoryMovementEntries.ts'), 'utf8');
  assert.match(movementEntriesSource, /adjustmentDirection === 'increase' \? quantity : -quantity/);
  assert.match(inventoryApiSource, /salesApi\.context\(\)/);
  assert.match(inventoryApiSource, /if \(!isDatabaseId\(warehouse\.businessUnitId\) \|\| !isDatabaseId\(warehouse\.businessId\)\)/);
  assert.match(inventoryApiSource, /businessUnitId: warehouse\.businessUnitId/);
  assert.match(inventoryApiSource, /businessId: warehouse\.businessId/);
  assert.match(inventoryApiSource, /commitInventoryOperation/);
  assert.doesNotMatch(inventorySource, /inventoryBusinessStructureMocks/);
});

test('Descuentos se administra desde Inventarios y se publica hacia los canales comerciales', () => {
  const moduleSource = readFileSync(resolve(root, 'src/app/ComplementaryModules/Inventory/Multiinventarios.tsx'), 'utf8');
  const guidanceSource = readFileSync(resolve(root, 'src/app/ComplementaryModules/Inventory/operationalGuidance/inventoryLearningControls.ts'), 'utf8');
  const discountsSource = readFileSync(resolve(root, 'src/app/BasicModules/PointOfSale/Descuentos/Descuentos.tsx'), 'utf8');
  const discountModalSource = readFileSync(resolve(root, 'src/app/BasicModules/PointOfSale/Descuentos/components/DiscountRuleModal.tsx'), 'utf8');
  const tabScopeSource = readFileSync(resolve(root, 'src/app/access/tabScopeCatalog.ts'), 'utf8');

  assert.match(moduleSource, /'discounts'/);
  assert.match(moduleSource, /PointOfSale\/Descuentos/);
  assert.match(moduleSource, /descuentos:\s*'discounts'/);
  assert.match(moduleSource, /t\.tabs\.discounts/);
  assert.match(tabScopeSource, /discounts:\s*'products'/);
  assert.match(guidanceSource, /Habilitar en POS, Ventas y kioscos/);
  assert.match(guidanceSource, /política comercial asociada al producto/);
  assert.match(discountsSource, /overflow-hidden rounded-xl/);
  assert.match(discountModalSource, /type DiscountWizardStepId = 'benefit' \| 'reach' \| 'review'/);
  assert.match(discountModalSource, /modalType="wizard"/);
  assert.match(discountModalSource, /IndiceModalWizardStepper/);
  assert.match(discountModalSource, /IndiceModalSummary/);
  assert.match(discountModalSource, /IndiceModalValidation/);
  assert.match(discountModalSource, /const validationError = validateStep\(activeStep\)/);
  assert.match(discountModalSource, /for \(const step of wizardSteps\)/);
  assert.match(discountModalSource, /onSave\(draft\)/);
  assert.match(discountModalSource, /draft\.scope === 'customer' && !draft\.customerType/);
});

test('El shell de Inventarios mantiene navegacion, idioma y modo aprendiz coherentes', () => {
  const moduleSource = readFileSync(resolve(root, 'src/app/ComplementaryModules/Inventory/Multiinventarios.tsx'), 'utf8');
  const purchaseOrdersSource = readFileSync(resolve(root, 'src/app/BasicModules/PointOfSale/OrdenesCompra/OrdenesCompra.tsx'), 'utf8');
  const createPurchaseOrderSource = readFileSync(resolve(root, 'src/app/BasicModules/PointOfSale/OrdenesCompra/components/CreatePurchaseOrderModal.tsx'), 'utf8');
  const commerceCatalogSource = readFileSync(resolve(root, 'src/app/BasicModules/CommerceCore/posCatalog.ts'), 'utf8');

  assert.match(moduleSource, /IndiceModuleShell/);
  assert.match(moduleSource, /LearningModeHeaderActionsProvider/);
  assert.match(moduleSource, /activeContextLabel=\{activeTabConfig\.label\}/);
  assert.ok(
    moduleSource.indexOf("'warehouses'") < moduleSource.indexOf("'inventory'"),
    'Almacenes debe preceder a Inventario tambien en el catalogo de rutas validas',
  );
  assert.match(purchaseOrdersSource, /useLearningModeHeaderActions/);
  assert.match(purchaseOrdersSource, /!learningModeActive \? \(/);
  assert.match(purchaseOrdersSource, /<PurchaseOrderKpis/);
  assert.match(purchaseOrdersSource, /<SupplierSubmissionKpis/);
  assert.match(createPurchaseOrderSource, /type PurchaseStep = 'reference' \| 'items' \| 'review'/);
  assert.match(createPurchaseOrderSource, /modalType="wizard"/);
  assert.match(createPurchaseOrderSource, /IndiceModalWizardStepper/);
  assert.match(createPurchaseOrderSource, /IndiceModalSummary/);
  assert.match(createPurchaseOrderSource, /IndiceModalValidation/);
  assert.match(createPurchaseOrderSource, /IndiceConfirmationDialog/);
  assert.match(createPurchaseOrderSource, /if \(!order\) \{/);
  assert.match(createPurchaseOrderSource, /order = await onSubmit\(/);
  assert.match(createPurchaseOrderSource, /setCreatedOrder\(order\)/);
  assert.match(createPurchaseOrderSource, /await onSubmitInvoice\(/);
  assert.match(createPurchaseOrderSource, /setSaveError\(getPurchaseOrderSaveError/);
  assert.match(purchaseOrdersSource, /products=\{purchasingProducts\}/);
  assert.match(commerceCatalogSource, /buildPurchasingCatalogProducts/);
  assert.match(createPurchaseOrderSource, /selectedProviderProductIds/);
  assert.match(createPurchaseOrderSource, /role="combobox"/);
  assert.match(createPurchaseOrderSource, /bulkInput\.split/);
  assert.match(createPurchaseOrderSource, /onUpdate\?\.\(line\.id, 'quantity'/);
});

test('La entrada de inventario carga productos por categoría y cantidad antes de afectar existencias', () => {
  const addInventorySource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/movements/AddInventoryModal.tsx'), 'utf8');
  const productLinesSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Inventory/components/movements/MovementProductLines.tsx'), 'utf8');

  assert.match(addInventorySource, /items: initialProductId \? \[createMovementProductLine\(initialProductId\)\] : \[\]/);
  assert.match(productLinesSource, /categoryFilter/);
  assert.match(productLinesSource, /Todas las categorías/);
  assert.match(productLinesSource, /stagedQuantities/);
  assert.match(productLinesSource, />Seleccionar<\/Button>/);
  assert.match(productLinesSource, /Esta acción sólo los carga al borrador del modal/);
  assert.match(productLinesSource, /Number\.isInteger\(quantity\) && quantity > 0/);
  assert.match(productLinesSource, /onItemsChange\(normalizedItems\)/);
});

test('Productos permite cambiar la categoria de una seleccion masiva con persistencia y reintento parcial', () => {
  const productsSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/Productos.tsx'), 'utf8');
  const catalogSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/hooks/useProductsCatalog.ts'), 'utf8');
  const selectionSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/hooks/useProductRowSelection.ts'), 'utf8');
  const tableSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/table/ProductsCatalogTable.tsx'), 'utf8');
  const bulkActionsSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/table/ProductBulkActionsBar.tsx'), 'utf8');

  assert.match(productsSource, /onBulkSetProductCategory=\{catalog\.handleBulkSetProductCategory\}/);
  assert.match(catalogSource, /const handleBulkSetProductCategory = async/);
  assert.match(catalogSource, /Promise\.allSettled/);
  assert.match(catalogSource, /updateProductRecord\(productId, \{/);
  assert.match(catalogSource, /category: normalizedCategory as SalesCatalogItem\['category'\]/);
  assert.match(catalogSource, /await reloadProducts\(\)\.catch/);
  assert.match(selectionSource, /const replaceSelection = useCallback/);
  assert.match(tableSource, /const handleApplyBulkCategory = async/);
  assert.match(tableSource, /rowSelection\.replaceSelection\(result\.failedIds\)/);
  assert.match(bulkActionsSource, /categoryOptions\.map/);
  assert.match(bulkActionsSource, /onClick=\{onApplyCategory\}/);
  assert.match(bulkActionsSource, /disabled=\{!selectedCategory \|\| isApplyingCategory/);
});

test('El filtro de categorias de Productos permite consultar items sin categoria', () => {
  const catalogSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/hooks/useProductsCatalog.ts'), 'utf8');
  const spanishTranslationsSource = readFileSync(resolve(root, 'src/app/BasicModules/Sales/Productos/translations/es-MX.ts'), 'utf8');

  assert.match(catalogSource, /const uncategorizedCategoryFilter = '__uncategorized__'/);
  assert.match(catalogSource, /categoryFilter === uncategorizedCategoryFilter/);
  assert.match(catalogSource, /!product\.category\.trim\(\)/);
  assert.match(catalogSource, /label: t\.filters\.uncategorized/);
  assert.match(spanishTranslationsSource, /uncategorized: 'Sin categoría'/);
});
