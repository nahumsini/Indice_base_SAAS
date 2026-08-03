import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/Dashboard');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;
const accessibleCatalogSource = readFileSync(
  resolve(root, 'src/app/hooks/useAccessibleModuleCatalog.ts'),
  'utf8',
);
const appSource = readFileSync(resolve(root, 'src/app/App.tsx'), 'utf8');
const mainDashboardSource = readFileSync(
  resolve(root, 'src/app/Dashboard/MainDashboard.tsx'),
  'utf8',
);

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Panel Inicial respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Panel Inicial conserva navegación, permisos y Modo aprendiz', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'PanelInicial.tsx'), 'utf8');

  assert.match(moduleSource, /useRoutedModuleTab/);
  assert.match(moduleSource, /canAccessHomePanelTab/);
  assert.match(moduleSource, /<LearningModeHeaderActionsProvider/);
  assert.match(moduleSource, /<PanelInicialHeader/);
});

test('el registro global gobierna módulos, rutas y KPIs sin reconstruir módulos apagados', () => {
  assert.match(accessibleCatalogSource, /includeMissingFallbacks:\s*false/);
  assert.match(accessibleCatalogSource, /setAvailableModules\(\[\]\)/);
  assert.doesNotMatch(accessibleCatalogSource, /FRONTEND_OWNED_BASIC_MODULE_ROUTES/);
  assert.doesNotMatch(accessibleCatalogSource, /canUseDefaultCatalogFallback/);

  assert.doesNotMatch(appSource, /FRONTEND_OWNED_BASIC_MODULE_ROUTES/);
  assert.doesNotMatch(appSource, /routes\.size === 0 && isAdminAccessRole/);
  assert.match(appSource, /setAllowedModuleRoutes\(new Set<PageId>\(\)\)/);

  assert.match(mainDashboardSource, /dashboardKpiModuleRouteById/);
  assert.match(mainDashboardSource, /accessibleModuleRoutes\.has\(moduleRoute\)/);
});
