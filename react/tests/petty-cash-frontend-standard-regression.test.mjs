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

test('Petty Cash conserva índices móviles y detalle operativo de cortes', () => {
  const fundsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashFundsWorkspace.tsx'), 'utf8');
  const reconciliationSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashReconciliationWorkspace.tsx'), 'utf8');
  const statementsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashStatementsWorkspace.tsx'), 'utf8');
  const financialSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashFinancialViewWorkspace.tsx'), 'utf8');
  const detailSource = readFileSync(resolve(pettyCashRoot, 'components/statements/PettyCashStatementDetailModal.tsx'), 'utf8');

  for (const source of [fundsSource, reconciliationSource, statementsSource, financialSource]) {
    assert.match(source, /md:hidden/);
    assert.match(source, /md:block/);
  }
  assert.match(fundsSource, /<FundActionsMenu/);
  assert.doesNotMatch(fundsSource, /DropdownMenu/);
  assert.match(reconciliationSource, /<DropdownMenu/);
  assert.match(detailSource, /statement\.responsibleName/);
  assert.match(detailSource, /copy\.status\.statement/);
});

test('Petty Cash no introduce texto operativo menor a 12 px', () => {
  const violations = collectFiles(pettyCashRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/text-\[(?:[0-9]|1[01])px\]/g)].map(() => relative(root, file).replaceAll('\\', '/'));
  });

  assert.deepEqual(violations, []);
});
