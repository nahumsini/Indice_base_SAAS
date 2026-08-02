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
