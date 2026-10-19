import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const readSource = (path) => readFileSync(resolve(root, path), 'utf8');

const routesSource = readSource('src/app/routes.tsx');
const appSource = readSource('src/app/App.tsx');
const headerSource = readSource('src/app/components/Header.tsx');
const headerTranslationsSource = readSource('src/app/components/header/translations/index.ts');
const contextSource = readSource('src/app/components/workbar/WorkbarLayoutContext.tsx');
const preferencesSource = readSource('src/app/components/workbar/workbarPreferences.ts');
const hostSource = readSource('src/app/components/workbar/DualWorkspaceHost.tsx');
const modalSource = readSource('src/app/components/workbar/WorkbarLayoutModal.tsx');
const dualPaneSource = readSource('src/app/components/workbar/DualWorkspacePane.tsx');
const modalTranslationsSource = readSource('src/app/components/workbar/translations.ts');
const favoritesSource = readSource('src/app/components/FavoritesBar.tsx');
const moduleShellSource = readSource('src/app/components/frontend-os/IndiceModuleShell.tsx');
const panelHeaderSource = readSource('src/app/BasicModules/Dashboard/components/PanelInicialHeader.tsx');
const panelSource = readSource('src/app/BasicModules/Dashboard/PanelInicial.tsx');
const themeSource = readSource('src/styles/theme.css');
const operatingSystemSource = readSource('../docs/indice-frontend-operating-system-v2.md');

test('la preferencia de barra se limita a arriba o izquierda y se guarda por usuario y empresa', () => {
  assert.match(routesSource, /<WorkbarLayoutProvider>/);
  assert.match(preferencesSource, /value === 'top' \|\| value === 'left'/);
  assert.match(preferencesSource, /WORKBAR_MODULE_KEY = 'system'/);
  assert.match(preferencesSource, /WORKBAR_TAB_KEY = 'workbar-layout'/);
  assert.match(contextSource, /await workspaceStateApi\.save/);
  assert.match(preferencesSource, /session\.company\.id/);
  assert.match(preferencesSource, /session\.user\.id/);
  assert.match(preferencesSource, /dualScreenEnabled: boolean/);
  assert.match(contextSource, /DUAL_SCREEN_MEDIA_QUERY = '\(min-width: 1280px\)'/);
  assert.match(preferencesSource, /parseWorkbarPreferences/);
  assert.match(contextSource, /window\.self !== window\.top/);
  assert.match(contextSource, /!actor \|\| isEmbeddedWorkspacePane/);
  assert.match(contextSource, /isDualScreenActive: isEmbeddedWorkspacePane/);
});

test('el menú de cuenta abre un modal azul con elección explícita y sin aplicar al cancelar', () => {
  assert.match(headerSource, /copy\.actions\.workbarLayout/);
  assert.match(headerSource, /<WorkbarLayoutModal/);
  assert.match(headerTranslationsSource, /workbarLayout: 'Personalizar navegación'/);
  assert.match(modalSource, /modalType="standard-form"/);
  assert.match(modalSource, /tone="blue"/);
  assert.match(modalSource, /type="radio"/);
  assert.match(modalSource, /await savePreferences\(\{ position: selectedPosition/);
  assert.match(modalSource, /copy\.dualScreenTitle/);
  assert.match(modalSource, /type="checkbox"/);
  assert.match(modalSource, /disabled=\{dualScreenEnabled \|\| !dualScreenAvailable\}/);
  assert.match(modalSource, /dualScreenEnabled: dualScreenEnabled \|\| enableDualScreen/);
  assert.match(modalSource, /onClick=\{\(\) => onOpenChange\(false\)\}/);
  assert.match(modalTranslationsSource, /'en-CA'/);
  assert.match(modalTranslationsSource, /'es-MX'/);
  assert.match(modalTranslationsSource, /'fr-CA'/);
  assert.match(modalTranslationsSource, /'pt-BR'/);
  assert.match(modalTranslationsSource, /'ko-CA'/);
  assert.match(modalTranslationsSource, /'zh-CA'/);
});

test('los shells canónicos mueven sólo la barra blanca y conservan el color del módulo', () => {
  assert.match(moduleShellSource, /useWorkbarLayout/);
  assert.match(moduleShellSource, /workbarPosition === 'left' && !isDualScreenActive/);
  assert.match(moduleShellSource, /data-workbar-position=\{isSideLayout \? 'left' : 'top'\}/);
  assert.match(moduleShellSource, /'--indice-workbar-tone': theme\.primary/);
  assert.match(moduleShellSource, /lg:flex-row/);
  assert.match(moduleShellSource, /lg:w-72/);
  assert.match(moduleShellSource, /orientation=\{isSideLayout \? 'desktop-vertical' : 'horizontal'\}/);
  assert.match(panelHeaderSource, /workbarPosition === 'left' && !isDualScreenActive/);
  assert.match(panelHeaderSource, /data-workbar-position=\{isSideLayout \? 'left' : 'top'\}/);
  assert.match(panelSource, /workbarPosition === 'left' && !isDualScreenActive \? 'lg:flex-row'/);
  assert.match(favoritesSource, /orientation\?: 'horizontal' \| 'desktop-vertical'/);
  assert.match(themeSource, /var\(--indice-workbar-tone\)/);
  assert.match(themeSource, /\[data-workbar-position='left'\]/);
});

test('las pantallas pequeñas conservan la barra superior y los módulos canónicos no duplican favoritos', () => {
  assert.match(moduleShellSource, /isSideLayout \? 'lg:flex-row' : ''/);
  assert.match(panelSource, /workbarPosition === 'left' && !isDualScreenActive \? 'lg:flex-row' : ''/);
  assert.match(appSource, /currentPage === 'inventory'[\s\S]{0,100}<Inventarios[^>]*onNavigate=\{handleModuleNavigation\}/);
  assert.match(appSource, /currentPage === 'material-warehouse'[\s\S]{0,100}<MaterialWarehouse onNavigate=\{handleModuleNavigation\}/);
  assert.match(appSource, /currentPage === 'production'[\s\S]{0,100}<Production onNavigate=\{handleModuleNavigation\}/);
  assert.match(operatingSystemSource, /The blue global product header always remains at the top/);
  assert.match(operatingSystemSource, /moduleKey=system/);
  assert.match(operatingSystemSource, /tabKey=workbar-layout/);
});

test('pantalla doble monta dos rutas independientes y solo se cierra desde el panel secundario', () => {
  assert.match(appSource, /window\.self !== window\.top/);
  assert.match(appSource, /allowDualWorkspace = !isEmbeddedWorkspacePane/);
  assert.match(appSource, /&& !isSubscriptionBlocked/);
  assert.match(appSource, /<DualWorkspaceHost enabled=\{allowDualWorkspace\}/);
  assert.match(appSource, /!isEmbeddedWorkspacePane && !collectionBlocked \? <ProductAnalyticsTracker/);
  assert.match(dualPaneSource, /<iframe/);
  assert.match(dualPaneSource, /src="\/dashboard\?workspacePane=secondary"/);
  assert.match(dualPaneSource, /await closeDualScreen\(\)/);
  assert.match(hostSource, /openedScope !== preferenceScope/);
  assert.match(hostSource, /visible=\{visible\}/);
  assert.match(dualPaneSource, /copy\.closeDualScreen/);
  assert.doesNotMatch(modalSource, /setDualScreenEnabled\(false\)/);
  assert.match(operatingSystemSource, /### 9\.2 Dual Workspace Mode/);
});
