import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/Kpis');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('KPIs respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('KPIs conserva rutas, reportes y Modo aprendiz', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'Kpis.tsx'), 'utf8');

  assert.match(moduleSource, /useRoutedModuleTab/);
  assert.match(moduleSource, /<LearningModeHeaderActionsProvider/);
  assert.match(moduleSource, /<SimpleModuleLearningGuide/);
  assert.match(moduleSource, /InformesContables/);
  assert.match(moduleSource, /InformesAutomatizados/);
});

test('el panel ejecutivo usa el contrato KPI 2.1, calidad fail-closed y divisa preferida', () => {
  const panelSource = readFileSync(resolve(moduleRoot, 'KPIs/KPIs.tsx'), 'utf8');
  const apiSource = readFileSync(resolve(moduleRoot, 'KPIs/executivePanelApi.ts'), 'utf8');
  const typesSource = readFileSync(resolve(moduleRoot, 'KPIs/types.ts'), 'utf8');

  assert.match(panelSource, /usePreferredBusinessCurrency/);
  assert.match(panelSource, /DomainHealthWorkspace/);
  assert.match(panelSource, /DecisionReadiness/);
  assert.match(panelSource, /Sin datos/);
  assert.match(panelSource, /Cobertura parcial/);
  assert.match(apiSource, /preferredCurrency/);
  assert.match(typesSource, /ExecutiveKpiDomains/);
  assert.match(typesSource, /comparisonAvailable/);
  assert.match(typesSource, /decisionReady/);
  assert.match(typesSource, /basis/);
  assert.match(typesSource, /excludedCurrencies/);
});
