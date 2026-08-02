import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const usersSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/Users.tsx'),
  'utf8',
);
const configCenterApiSource = readFileSync(resolve(root, 'src/app/api/configCenter.ts'), 'utf8');
const apiClientSource = readFileSync(resolve(root, 'src/app/lib/apiClient.ts'), 'utf8');
const usersFiltersSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/components/UsersFilters.tsx'),
  'utf8',
);
const usersTranslationsSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/usersTranslations.ts'),
  'utf8',
);
const tabScopeCatalogSource = readFileSync(resolve(root, 'src/app/access/tabScopeCatalog.ts'), 'utf8');
const tabPermissionPickerSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/UsersTabPermissionPicker.tsx'),
  'utf8',
);
const moduleRegistryMigrationSource = readFileSync(
  resolve(root, '../src/main/resources/db/migration/V159__module_access_registry.sql'),
  'utf8',
);
const appSource = readFileSync(resolve(root, 'src/app/App.tsx'), 'utf8');
const moduleShellSource = readFileSync(
  resolve(root, 'src/app/components/frontend-os/IndiceModuleShell.tsx'),
  'utf8',
);

test('usuarios edita rol, alcance y permisos como una sola operacion', () => {
  assert.match(usersSource, /selectedRoleDraft/);
  assert.match(usersSource, /selectedScopeTypeDraft/);
  assert.match(usersSource, /selectedModulesDraft/);
  assert.match(usersSource, /selectedTabPermissionDraft/);
  assert.match(usersSource, /buildUserAccessPayload/);
  assert.doesNotMatch(usersSource, /handleBulkStatusUpdate|OperationalBulkActionsBar/);
});

test('acciones y modulos visibles provienen de capacidades del backend', () => {
  assert.match(usersSource, /user\.capabilities\.canActivate/);
  assert.match(usersSource, /user\.capabilities\.canDeactivate/);
  assert.match(usersSource, /setAvailableModules\(mappedModules\)/);
  assert.doesNotMatch(usersSource, /mergeAvailableModules/);
  assert.match(configCenterApiSource, /activateUser\(id: number\)[\s\S]*?\/activate/);
});

test('usuarios conserva operacion movil y errores estructurados de licencias', () => {
  assert.match(usersSource, /md:hidden/);
  assert.match(usersSource, /SEAT_CAPACITY_EXCEEDED/);
  assert.match(apiClientSource, /code\?: string; error\?: \{ code\?: string \}/);
});

test('usuarios conserva la composicion compacta y terminologia operativa de Indice', () => {
  assert.match(usersSource, /withActionTooltip/);
  assert.match(usersSource, /uniqueNames/);
  assert.match(usersFiltersSource, /xl:grid-cols-\[minmax\(135px,0\.65fr\)/);
  assert.match(usersTranslationsSource, /Usuarios activos/);
  assert.match(usersTranslationsSource, /Lugares disponibles/);
});

test('filtros de usuarios incluyen unidad y negocio encadenados', () => {
  assert.match(usersSource, /unitFilter/);
  assert.match(usersSource, /businessFilter/);
  assert.match(usersSource, /currentBusiness\?\.unitId === nextUnitId/);
  assert.match(usersFiltersSource, /unitOptions/);
  assert.match(usersFiltersSource, /businessOptions/);
});

test('catalogo de scopes cubre todos los modulos operativos y sus llaves canonicas', () => {
  for (const moduleSlug of [
    'config_center', 'human_resources', 'processes', 'expenses', 'petty_cash',
    'crm', 'pos', 'inventory', 'receivables', 'kpis',
  ]) {
    assert.match(tabScopeCatalogSource, new RegExp(`moduleSlug: '${moduleSlug}'`));
  }
  assert.match(tabScopeCatalogSource, /payment_accounts: 'payment-accounts'/);
  assert.match(tabScopeCatalogSource, /'purchase-orders': 'purchase-orders'/);
  assert.match(tabScopeCatalogSource, /isTabScopeAssignableToRole/);
  assert.match(tabScopeCatalogSource, /config_center\.plan/);
});

test('selector de pestañas escala por busqueda y modulos plegables', () => {
  assert.match(tabPermissionPickerSource, /type="search"/);
  assert.match(tabPermissionPickerSource, /expandedModuleSlugs/);
  assert.match(tabPermissionPickerSource, /replaceModuleTabs/);
  assert.match(tabPermissionPickerSource, /selectedCount/);
  assert.match(tabPermissionPickerSource, /tab\.name_es/);
  assert.match(tabPermissionPickerSource, /categoryFilter/);
  assert.match(tabPermissionPickerSource, /module\.assignable === false/);
  assert.match(tabPermissionPickerSource, /onModuleChange/);
});

test('registro de modulos futuros conserva ciclo de vida y candado de asignacion', () => {
  assert.match(configCenterApiSource, /lifecycle_status/);
  assert.match(configCenterApiSource, /assignment_enabled/);
  assert.match(moduleRegistryMigrationSource, /lifecycle_status VARCHAR/);
  assert.match(moduleRegistryMigrationSource, /assignment_enabled TINYINT/);
  assert.match(moduleRegistryMigrationSource, /'complementary', 'planned', 'module', 0/);
  assert.doesNotMatch(moduleRegistryMigrationSource, /INSERT INTO company_module_entitlements[\s\S]*control_minutas/);
});

test('rutas y navegacion ocultan y bloquean pestañas sin scope', () => {
  assert.match(appSource, /allowedModuleTabIds/);
  assert.match(appSource, /sessionTabAccess/);
  assert.match(moduleShellSource, /canAccessModuleTab/);
  assert.match(moduleShellSource, /visibleTabs/);
});
