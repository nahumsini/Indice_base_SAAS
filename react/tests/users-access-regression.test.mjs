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
const usersAccessProfilesSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/components/UsersAccessProfiles.tsx'),
  'utf8',
);
const usersKpiStripSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/components/UsersKpiStrip.tsx'),
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
const kioskPermissionPickerSource = readFileSync(
  resolve(root, 'src/app/BasicModules/Dashboard/Users/UsersKioskPermissionPicker.tsx'),
  'utf8',
);
const moduleRegistryMigrationSource = readFileSync(
  resolve(root, '../src/main/resources/db/migration/V159__module_access_registry.sql'),
  'utf8',
);
const appSource = readFileSync(resolve(root, 'src/app/App.tsx'), 'utf8');
const headerSource = readFileSync(resolve(root, 'src/app/components/Header.tsx'), 'utf8');
const kpisSource = readFileSync(resolve(root, 'src/app/BasicModules/Kpis/Kpis.tsx'), 'utf8');
const moduleShellSource = readFileSync(
  resolve(root, 'src/app/components/frontend-os/IndiceModuleShell.tsx'),
  'utf8',
);
const accessibleCatalogSource = readFileSync(
  resolve(root, 'src/app/hooks/useAccessibleModuleCatalog.ts'),
  'utf8',
);
const authSessionStoreSource = readFileSync(resolve(root, 'src/app/api/authSessionStore.ts'), 'utf8');
const authorizationRevisionHookSource = readFileSync(
  resolve(root, 'src/app/hooks/useAuthorizationRevision.ts'),
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
  assert.match(usersSource, /useState<AvailableModule\[\]>\(\[\]\)/);
  assert.doesNotMatch(usersSource, /buildAvailableModules/);
  assert.doesNotMatch(usersSource, /buildDefaultModuleCatalog/);
  assert.doesNotMatch(usersSource, /mergeAvailableModules/);
  assert.match(configCenterApiSource, /activateUser\(id: number\)[\s\S]*?\/activate/);
});

test('usuarios conserva operacion movil y errores estructurados de licencias', () => {
  assert.match(usersSource, /md:hidden/);
  assert.match(usersSource, /SEAT_CAPACITY_EXCEEDED/);
  assert.match(apiClientSource, /code\?: string; error\?: \{ code\?: string \}/);
});

test('usuarios conserva la composicion compacta y terminologia operativa de Indice', () => {
  assert.match(usersSource, /uniqueNames/);
  assert.match(usersSource, /min-w-\[760px\]/);
  assert.match(usersSource, /DropdownMenuContent/);
  assert.match(usersSource, /usersCopy\.actions\.manage/);
  assert.match(usersFiltersSource, /showAdvancedFilters/);
  assert.match(usersFiltersSource, /advancedFilterCount/);
  assert.match(usersKpiStripSource, /statusItems/);
  assert.match(usersSource, /usersCopy\.seats\.unlimited/);
  assert.match(usersTranslationsSource, /Usuarios activos/);
  assert.match(usersTranslationsSource, /Lugares disponibles/);
  assert.match(usersTranslationsSource, /Sin límite/);
});

test('perfiles de acceso aceleran la invitacion sin exceder el techo delegable', () => {
  assert.match(usersSource, /profileReadyModules = assignableModules\.filter/);
  assert.match(usersSource, /permissionKeysForModuleIds/);
  assert.match(usersSource, /pruneTabPermissionKeysForRole\(inviteForm\.role, nextPermissionKeys\)/);
  assert.match(usersSource, /setInviteKioskDefinitionIds\(\[\]\)/);
  assert.match(usersSource, /<UsersAccessProfiles/);
  assert.match(usersAccessProfilesSource, /activeProfileId/);
  assert.match(usersTranslationsSource, /Perfil de acceso/);
});

test('editor de acceso explica el orden rol alcance modulos y kioscos', () => {
  assert.match(usersSource, /organizationTitle/);
  assert.match(usersSource, /permissionsTitle/);
  assert.match(usersSource, /kiosksTitle/);
  assert.match(usersSource, /number=\{1\}/);
  assert.match(usersSource, /number=\{2\}/);
  assert.match(usersSource, /number=\{3\}/);
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
  assert.match(tabScopeCatalogSource, /permissionKey === 'config_center\.plan'/);
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

test('selector explica funciones capacidades y restricciones segun el rol', () => {
  assert.match(configCenterApiSource, /description_es/);
  assert.match(configCenterApiSource, /compatible_roles/);
  assert.match(configCenterApiSource, /role_access/);
  assert.match(tabPermissionPickerSource, /selectedRole/);
  assert.match(tabPermissionPickerSource, /scopeLabel/);
  assert.match(tabPermissionPickerSource, /roleAccessFor/);
  assert.match(tabPermissionPickerSource, /capabilityLabels/);
  assert.match(tabPermissionPickerSource, /restriction_reason_es/);
  assert.match(usersSource, /roleAdjusted/);
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

test('usuarios asigna kioscos de empleado como acceso exacto e independiente', () => {
  assert.match(configCenterApiSource, /kiosk_definition_ids/);
  assert.match(configCenterApiSource, /employee_kiosks/);
  assert.match(usersSource, /selectedKioskDefinitionDraft/);
  assert.match(usersSource, /inviteKioskDefinitionIds/);
  assert.match(usersSource, /kiosk_definition_ids:/);
  assert.match(usersSource, /UsersKioskPermissionPicker/);
});

test('selector de kioscos respeta modulo y alcance organizacional', () => {
  assert.match(kioskPermissionPickerSource, /selectedModuleIds/);
  assert.match(kioskPermissionPickerSource, /unitId/);
  assert.match(kioskPermissionPickerSource, /businessId/);
  assert.match(kioskPermissionPickerSource, /moduleAllowed/);
  assert.match(kioskPermissionPickerSource, /scopeAllows/);
  assert.doesNotMatch(kioskPermissionPickerSource, /return businessId == null \|\| kiosk\.business_id == null/);
});

test('revocar rol o permisos refresca sesion catalogo rutas pestanas y cabecera', () => {
  assert.match(authSessionStoreSource, /authorizationFingerprint/);
  assert.match(authSessionStoreSource, /subscribeToAuthorizationChanged/);
  assert.match(authorizationRevisionHookSource, /useSyncExternalStore/);
  assert.match(appSource, /AUTHORIZATION_REVALIDATION_MS/);
  assert.match(appSource, /authApi\.me\(\)/);
  assert.match(appSource, /window\.addEventListener\('focus'/);
  assert.match(appSource, /document\.addEventListener\('visibilitychange'/);
  assert.match(appSource, /\}, \[pathname\]\);/);
  assert.match(appSource, /\[authorizationRevision, t\]/);
  assert.match(moduleShellSource, /useAuthorizationRevision\(\)/);
  assert.match(usersSource, /selectedUser\.backendId === currentUserId/);
  assert.match(usersSource, /canAccessModuleTab\('home-panel', 'users', nextSession\)/);
  assert.match(apiClientSource, /response\.status === 403[\s\S]*refreshAuthSession\(\)/);
  assert.doesNotMatch(accessibleCatalogSource, /localDevelopmentModules|import\.meta\.env\.DEV/);
  assert.doesNotMatch(appSource, /routes\.add\('material-warehouse'\)|routes\.add\('production'\)/);
  assert.match(tabScopeCatalogSource, /canAccessKioskCenter/);
  assert.match(tabScopeCatalogSource, /KIOSK_CENTER_PERMISSION_KEYS/);
  assert.match(appSource, /canAccessKioskCenter\(session\)/);
  assert.match(headerSource, /canAccessKioskCenter\(effectiveAuthSession\)/);
  assert.match(headerSource, /effectiveAuthSession/);
  assert.match(kpisSource, /useAuthorizationRevision\(\)/);
});
