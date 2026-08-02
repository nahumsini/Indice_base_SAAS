import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/Dashboard');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

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
