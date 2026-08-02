import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const pettyCashRoot = resolve(root, 'src/app/BasicModules/PettyCash');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Petty Cash respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(pettyCashRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Petty Cash conserva el shell financiero y el Kiosk Engine compartido', () => {
  const moduleSource = readFileSync(resolve(pettyCashRoot, 'CajaChica.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(pettyCashRoot, 'Kiosk/PublicPettyCashKioskPage.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(kioskSource, /<KioskIdentityGate/);
  assert.match(kioskSource, /<KioskWorkspaceTabs/);
});
