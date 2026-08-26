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

test('Expenses mantiene acciones visibles y semánticas con el patrón de Agenda', () => {
  const detailSource = readFileSync(resolve(expensesRoot, 'Expenses/components/ExpenseDetailModal.tsx'), 'utf8');
  const actionsSource = readFileSync(resolve(expensesRoot, 'components/table/ExpenseRowActions.tsx'), 'utf8');
  const headerSource = readFileSync(resolve(expensesRoot, 'components/header/ExpensesHeader.tsx'), 'utf8');
  const providersHeaderSource = readFileSync(resolve(expensesRoot, 'Providers/components/ProvidersHeaderBanner.tsx'), 'utf8');
  const providersPageSource = readFileSync(resolve(expensesRoot, 'Providers/ProveedoresPage.tsx'), 'utf8');
  const mobileSource = readFileSync(resolve(expensesRoot, 'Expenses/components/ExpenseMobileCards.tsx'), 'utf8');
  const columnsSource = readFileSync(resolve(expensesRoot, 'constants/expenseColumns.ts'), 'utf8');

  assert.match(detailSource, /copy\.paymentHistory/);
  assert.match(detailSource, /copy\.audit/);
  assert.doesNotMatch(actionsSource, /<DropdownMenu>/);
  assert.match(actionsSource, /<Eye/);
  assert.match(actionsSource, /<HandCoins/);
  assert.match(actionsSource, /<Pencil/);
  assert.match(actionsSource, /<Printer/);
  assert.match(actionsSource, /<Copy/);
  assert.match(actionsSource, /<ShieldCheck/);
  assert.match(actionsSource, /<Trash2/);
  assert.match(actionsSource, /rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2/);
  assert.doesNotMatch(headerSource, /<DropdownMenu>/);
  assert.doesNotMatch(headerSource, /onOpenPayablesKiosk/);
  assert.match(providersHeaderSource, /onClick=\{onManagePayablesKiosks\}/);
  assert.match(providersHeaderSource, /Kioscos CxP/);
  assert.match(providersPageSource, /<PayablesKioskManagementModal/);
  assert.match(headerSource, /onClick=\{onConfigureColumns\}/);
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

test('Expenses recupera la primera carga cuando la sesion acaba de iniciar', () => {
  const moduleSource = readFileSync(resolve(expensesRoot, 'ExpensesModule.tsx'), 'utf8');
  const navigationMemorySource = readFileSync(resolve(root, 'src/app/hooks/useWorkspaceNavigationMemory.ts'), 'utf8');

  assert.match(moduleSource, /useAuthorizationRevision\(\)/);
  assert.match(moduleSource, /await authApi\.getSessionOrNull\(\)/);
  assert.match(moduleSource, /requestWithSessionRecovery/);
  assert.match(moduleSource, /error\.status === 401 \|\| error\.status === 403/);
  assert.match(moduleSource, /await recoverSession\(\)/);
  assert.match(moduleSource, /\[authorizationRevision, financeRefreshKey\]/);
  assert.match(navigationMemorySource, /const authorizationRevision = useAuthorizationRevision\(\)/);
  assert.match(navigationMemorySource, /\[authorizationRevision, moduleKey, rememberScroll, tabKey\]/);
});

test('El administrador de kioscos mantiene una vista compacta, filtrable y protegida', () => {
  const managerSource = readFileSync(resolve(expensesRoot, 'components/modals/PayablesKioskManagementModal.tsx'), 'utf8');
  const formSource = readFileSync(resolve(expensesRoot, 'components/modals/PayablesKioskAccessFormModal.tsx'), 'utf8');

  assert.match(managerSource, /Buscar por nombre, alcance o moneda/);
  assert.match(managerSource, /Filtrar kioscos por estado/);
  assert.match(managerSource, /Editar<\/Button>/);
  assert.match(managerSource, /Abrir<\/Button>/);
  assert.match(managerSource, /Compartir<\/Button>/);
  assert.match(managerSource, /Confirma el cambio global/);
  assert.match(managerSource, /Ya existe un kiosco con ese nombre/);
  assert.doesNotMatch(managerSource, /footerSummary=\{copyText\.activeCount/);
  assert.equal(managerSource.match(/Los portales solo permiten registrar cuentas por pagar/g)?.length, 1);
  assert.match(formSource, /Identidad del kiosco/);
  assert.match(formSource, /Alcance y operación/);
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

test('Gastos vencidos conserva Pagar y no mezcla lineas presupuestales', () => {
  const pageSource = readFileSync(resolve(expensesRoot, 'Expenses/Expenses.tsx'), 'utf8');
  const rowSource = readFileSync(resolve(expensesRoot, 'Expenses/components/EditableExpenseRow.tsx'), 'utf8');
  const tableSource = readFileSync(resolve(expensesRoot, 'Expenses/components/ExpenseTable.tsx'), 'utf8');

  assert.match(pageSource, /expenses\.filter\(expense => expense\.type !== 'budget'\)/);
  assert.match(pageSource, /filterExpenses\(operationalExpenses, filters\)/);
  assert.match(rowSource, /const canMarkPaid = expense\.type !== 'budget' && getExpenseBalance\(expense\) > 0/);
  assert.match(rowSource, /showMarkPaid=\{canMarkPaid/);
  assert.match(tableSource, /const savedExpense = await onMarkExpensePaid\(expense\)/);
});

test('La vista predeterminada de Gastos prioriza operación y vencimiento', () => {
  const columnsSource = readFileSync(resolve(expensesRoot, 'constants/expenseColumns.ts'), 'utf8');
  const tableConfigSource = readFileSync(resolve(expensesRoot, 'constants/expenseTableConfig.ts'), 'utf8');
  const rowSource = readFileSync(resolve(expensesRoot, 'Expenses/components/EditableExpenseRow.tsx'), 'utf8');
  const columnsHookSource = readFileSync(resolve(expensesRoot, 'hooks/useExpenseColumns.ts'), 'utf8');

  for (const key of ['folio', 'date', 'providerName', 'concept', 'total', 'balance', 'dueDate', 'status']) {
    assert.match(columnsSource, new RegExp(`key: '${key}', label: '[^']+', visible: true`));
  }
  for (const key of ['taxes', 'amount', 'amountPaid', 'paymentDate', 'paymentMethod', 'accountingAccount']) {
    assert.match(columnsSource, new RegExp(`key: '${key}', label: '[^']+', visible: false`));
  }
  assert.match(tableConfigSource, /key: 'date', label: 'Fecha del gasto', sortable: 'date'/);
  assert.match(rowSource, /isColumnVisible\('date'\)/);
  assert.match(rowSource, /t\.expenses\.columns\.date\.label/);
  assert.match(columnsHookSource, /reconcileExpenseColumns\(JSON\.parse\(storedColumns\), true\)/);
});

test('Los filtros de Gastos priorizan periodo, estado y proveedor', () => {
  const filtersSource = readFileSync(resolve(expensesRoot, 'components/filters/ExpensesFilters.tsx'), 'utf8');
  const periodIndex = filtersSource.indexOf('label={t.filters.period}');
  const statusIndex = filtersSource.indexOf('label={t.filters.status}');
  const providerIndex = filtersSource.indexOf('label={t.filters.provider}');
  const unitIndex = filtersSource.indexOf('label={t.filters.unit}');
  const businessIndex = filtersSource.indexOf('label={t.filters.business}');

  assert.ok(periodIndex < statusIndex);
  assert.ok(statusIndex < providerIndex);
  assert.ok(providerIndex < unitIndex);
  assert.ok(unitIndex < businessIndex);
});

test('Gastos permite integración masiva validada y protege registros con origen financiero', () => {
  const headerSource = readFileSync(resolve(expensesRoot, 'components/header/ExpensesHeader.tsx'), 'utf8');
  const modalSource = readFileSync(resolve(expensesRoot, 'components/modals/ExpenseBulkIntegrationModal.tsx'), 'utf8');
  const pageSource = readFileSync(resolve(expensesRoot, 'Expenses/Expenses.tsx'), 'utf8');
  const adapterSource = readFileSync(resolve(expensesRoot, 'adapters/expense.adapter.ts'), 'utf8');

  assert.match(headerSource, /Integración masiva/);
  assert.match(modalSource, /Pega desde Excel: fecha \| concepto \| monto/);
  assert.match(modalSource, /Solo concepto y monto son obligatorios/);
  assert.match(modalSource, /date: toDateInput\(new Date\(\)\)/);
  assert.match(modalSource, /compactMatch/);
  assert.match(modalSource, /normalizeDateCell/);
  assert.match(modalSource, /No se importará nada mientras exista una celda con errores/);
  assert.match(modalSource, /La fecha de hoy viene precargada/);
  assert.match(modalSource, /type="month"/);
  assert.match(modalSource, /required type="month"/);
  assert.doesNotMatch(modalSource, />Ver todos</);
  assert.match(modalSource, /Buscar dentro del mes/);
  assert.match(modalSource, /Importar gastos/);
  assert.match(modalSource, /Editar gastos existentes/);
  assert.match(modalSource, /Mes a consultar/);
  assert.match(modalSource, /editPageSize = 100/);
  assert.match(modalSource, /filteredEditEvaluations\.slice/);
  assert.match(modalSource, /No hay gastos abiertos que coincidan con el mes y la búsqueda seleccionados/);
  assert.match(pageSource, /amountPaid: draft\.total/);
  assert.match(pageSource, /status: 'paid'/);
  assert.doesNotMatch(pageSource, /No hay una unidad y un negocio disponibles para clasificar los gastos/);
  assert.match(pageSource, /!expense\.purchaseOrderId/);
  assert.match(pageSource, /!expense\.budgetLineId/);
  assert.match(pageSource, /expense\.status === 'pending' \|\| expense\.status === 'overdue'/);
  assert.match(adapterSource, /purchaseOrderId: expense\.purchaseOrderId \? String\(expense\.purchaseOrderId\) : undefined/);
});

test('Agregar gasto registra una operación pagada y reserva la clasificación para detalles opcionales', () => {
  const modalSource = readFileSync(resolve(expensesRoot, 'components/modals/ExpenseFormModal.tsx'), 'utf8');
  const pageSource = readFileSync(resolve(expensesRoot, 'Expenses/Expenses.tsx'), 'utf8');

  assert.match(modalSource, /expenseDate: formatDateInputValue\(expense\?\.date \?\? new Date\(\)\)/);
  assert.match(modalSource, /<DateInput label=\{t\.expenses\.modal\.date\} required/);
  assert.match(modalSource, /<MoneyInput label=\{t\.expenses\.modal\.amount\} required/);
  assert.match(modalSource, /t\.expenses\.modal\.advancedTitle/);
  assert.match(modalSource, /const \[isAdvancedOpen, setIsAdvancedOpen\] = useState\(Boolean\(editingExpense\)\)/);
  assert.match(modalSource, /onToggle=\{\(event\) => setIsAdvancedOpen\(event\.currentTarget\.open\)\}/);
  assert.match(modalSource, /dueDate: isEditMode \? draft\.dueDate : draft\.expenseDate/);
  assert.match(modalSource, /paymentDate: isEditMode \? draft\.paymentDate : draft\.expenseDate/);
  assert.match(pageSource, /const inputExpenseDate = values\.expenseDate/);
  assert.match(pageSource, /const recordDate = inputExpenseDate/);
});

test('Cuenta por pagar exige la obligación principal y reserva clasificación e impuestos para configuración avanzada', () => {
  const modalSource = readFileSync(resolve(expensesRoot, 'components/modals/PayableAccountDialog.tsx'), 'utf8');
  const pageSource = readFileSync(resolve(expensesRoot, 'Expenses/Expenses.tsx'), 'utf8');
  const adapterSource = readFileSync(resolve(expensesRoot, 'adapters/expense.adapter.ts'), 'utf8');

  assert.match(modalSource, /draft\.providerId\.trim\(\)\.length > 0/);
  assert.match(modalSource, /draft\.expenseDate\.trim\(\)\.length > 0/);
  assert.match(modalSource, /draft\.dueDate\.trim\(\)\.length > 0/);
  assert.match(modalSource, /reference: draft\.reference\.trim\(\)/);
  assert.match(modalSource, /capture="environment"/);
  assert.match(modalSource, /advancedTitle/);
  assert.match(modalSource, /statusNote/);
  assert.match(pageSource, /businessUnit: values\.businessUnit/);
  assert.match(pageSource, /date: expenseDate/);
  assert.match(pageSource, /reference: values\.reference/);
  assert.match(adapterSource, /reference: expense\.reference/);
});

test('Expenses recuerda la pestana y el contexto operativo por usuario y empresa', () => {
  const moduleSource = readFileSync(resolve(expensesRoot, 'ExpensesModule.tsx'), 'utf8');
  const navigationMemorySource = readFileSync(resolve(root, 'src/app/hooks/useWorkspaceNavigationMemory.ts'), 'utf8');
  const workspaceSources = [
    ['Expenses/Expenses.tsx', 'expenses'],
    ['Expenses/components/ExpenseTable.tsx', 'expenses-table'],
    ['Budgets/useBudgetLogic.ts', 'budgets'],
    ['Budgets/components/BudgetLinesTable.tsx', 'budgets-table'],
    ['Providers/useProveedoresLogic.ts', 'providers'],
    ['Providers/components/ProvidersTable.tsx', 'providers-table'],
    ['AccountingAccounts/AccountingAccounts.tsx', 'accounting'],
    ['AccountingAccounts/components/AccountingAccountsTable.tsx', 'accounting-table'],
    ['PaymentAccounts/PaymentAccounts.tsx', 'payment_accounts'],
    ['PaymentAccounts/components/PaymentAccountsTable.tsx', 'payment_accounts_table'],
    ['KPIs/GastosKPIPage.tsx', 'kpis'],
  ].map(([path, tabKey]) => ({
    path,
    source: readFileSync(resolve(expensesRoot, path), 'utf8'),
    tabKey,
  }));

  assert.match(moduleSource, /useRoutedModuleTab<TabId>\(\s*'expenses'/);
  assert.match(navigationMemorySource, /session\.company\.id/);
  assert.match(navigationMemorySource, /session\.user\.id/);
  assert.match(navigationMemorySource, /workspaceStateApi\.save/);

  for (const { path, source, tabKey } of workspaceSources) {
    assert.match(source, /useWorkspaceNavigationMemory/,
      `${path} debe usar la memoria compartida de navegacion`);
    assert.match(source, new RegExp(`moduleKey:\\s*'expenses'[\\s\\S]*tabKey:\\s*'${tabKey}'`),
      `${path} debe guardar su estado en un ambito independiente`);
  }
});

test('La memoria de Expenses conserva filtros, orden y pagina sin reabrir operaciones incompletas', () => {
  const tablePaths = [
    'Expenses/components/ExpenseTable.tsx',
    'Budgets/components/BudgetLinesTable.tsx',
    'Providers/components/ProvidersTable.tsx',
    'AccountingAccounts/components/AccountingAccountsTable.tsx',
    'PaymentAccounts/components/PaymentAccountsTable.tsx',
  ];
  const tableSources = tablePaths.map(path => ({
    path,
    source: readFileSync(resolve(expensesRoot, path), 'utf8'),
  }));
  const allWorkspaceSources = collectFiles(expensesRoot)
    .map(file => readFileSync(file, 'utf8'))
    .filter(source => source.includes('WorkspaceState'))
    .join('\n');

  for (const { path, source } of tableSources) {
    assert.match(source, /currentPage/,
      `${path} debe recordar la pagina`);
    assert.match(source, /pageSize/,
      `${path} debe recordar el tamano de pagina`);
    assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*setCurrentPage\(1\)/,
      `${path} no debe perder la pagina al recargar filas`);
  }

  assert.match(allWorkspaceSources, /searchTerm/);
  assert.match(allWorkspaceSources, /sortDirection/);
  assert.match(allWorkspaceSources, /periodFilter/);
  assert.doesNotMatch(
    allWorkspaceSources,
    /type \w+WorkspaceState = \{[^}]*(?:draft|editing|Modal|pendingDelete)/s,
    'La memoria de navegacion no debe persistir borradores, modales ni eliminaciones pendientes',
  );
});
