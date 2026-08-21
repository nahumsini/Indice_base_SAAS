import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const expensesRoot = resolve(root, 'src/app/BasicModules/Expenses');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;
const undersizedTypography = /\btext-\[(?:10|11)px\]/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Expenses respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(expensesRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Expenses mantiene texto operativo legible desde 12px', () => {
  const violations = collectFiles(expensesRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(undersizedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Texto menor a 12px:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Expenses prioriza expediente, abono y menú contextual sobre acciones planas', () => {
  const detailSource = readFileSync(resolve(expensesRoot, 'Expenses/components/ExpenseDetailModal.tsx'), 'utf8');
  const actionsSource = readFileSync(resolve(expensesRoot, 'components/table/ExpenseRowActions.tsx'), 'utf8');
  const headerSource = readFileSync(resolve(expensesRoot, 'components/header/ExpensesHeader.tsx'), 'utf8');
  const mobileSource = readFileSync(resolve(expensesRoot, 'Expenses/components/ExpenseMobileCards.tsx'), 'utf8');
  const columnsSource = readFileSync(resolve(expensesRoot, 'constants/expenseColumns.ts'), 'utf8');

  assert.match(detailSource, /copy\.paymentHistory/);
  assert.match(detailSource, /copy\.audit/);
  assert.match(actionsSource, /<DropdownMenu>/);
  assert.match(actionsSource, /<Eye/);
  assert.match(actionsSource, /<HandCoins/);
  assert.match(headerSource, /<DropdownMenu>/);
  assert.doesNotMatch(mobileSource, /isExpanded/);
  assert.match(columnsSource, /key: 'balance', label: 'Balance', visible: true/);
  assert.match(columnsSource, /key: 'accountingAccount', label: 'Accounting account', visible: false/);
});

test('Expenses conserva el shell financiero y el Kiosk Engine compartido', () => {
  const moduleSource = readFileSync(resolve(expensesRoot, 'ExpensesModule.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(expensesRoot, 'Kiosk/PayablesKioskPage.tsx'), 'utf8');
  const managerSource = readFileSync(resolve(expensesRoot, 'components/modals/PayablesKioskManagementModal.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(kioskSource, /<KioskIdentityGate/);
  assert.match(managerSource, /<KioskModalFrame/);
});

test('Expenses elimina gastos numéricos por su API aunque el metadato histórico diga budget', () => {
  const expensesSource = readFileSync(resolve(expensesRoot, 'Expenses/Expenses.tsx'), 'utf8');

  assert.match(expensesSource, /if \(expense\.id\.startsWith\('budget-line-'\)\)/);
  assert.match(expensesSource, /await expensesService\.deleteExpense\(id\)/);
});

test('Saldo permite ordenar ascendente y descendente por el saldo calculado', () => {
  const tableSource = readFileSync(resolve(expensesRoot, 'Expenses/components/ExpenseTable.tsx'), 'utf8');
  const configSource = readFileSync(resolve(expensesRoot, 'constants/expenseTableConfig.ts'), 'utf8');

  assert.match(configSource, /key: 'balance', label: 'Saldo', sortable: 'balance'/);
  assert.match(tableSource, /sortField === 'balance'/);
  assert.match(tableSource, /getExpenseBalance\(left\)/);
  assert.match(tableSource, /getExpenseBalance\(right\)/);
});
