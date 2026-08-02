import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/HumanResources');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Recursos Humanos respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Recursos Humanos conserva el shell, el title bar y el Kiosk Engine de asistencia', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'HumanResources.tsx'), 'utf8');
  const titleBarSource = readFileSync(resolve(moduleRoot, 'shared/HrTitleBar.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(moduleRoot, 'Control/components/kiosk/PublicKioskPage.tsx'), 'utf8');
  const identitySource = readFileSync(resolve(moduleRoot, 'Control/components/kiosk/PublicKioskIdentityPanel.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(titleBarSource, /<IndiceTitleBar/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(identitySource, /<KioskIdentityGate/);
});
