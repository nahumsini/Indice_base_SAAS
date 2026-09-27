import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const cache = new Map();
const requests = [];
let partialCarryover = false;
let locale = 'es-MX';
function load(relative) {
  function compile(file) {
    const full = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts'), resolve(file, 'index.tsx')]
      .find(candidate => existsSync(candidate) && /\.tsx?$/.test(candidate))?.replaceAll('\\', '/');
    if (!full) throw new Error(`Missing test module: ${file}`);
    if (full.endsWith('/shared/kpiMonetaryApi.ts')) return { useKpiMonetaryAggregate(query) {
      requests.push(query);
      const carryover = query.ids.join(',') === '1,2';
      return { loading: false, error: null, data: { preferredCurrency: query.preferredCurrency,
        preferredTotal: query.metric === 'EXPENSE_TOTAL' ? 123.45 : carryover ? 654.32 : 777.77,
        nativeTotals: [], partial: carryover && partialCarryover, excludedRecords: carryover && partialCarryover ? 1 : 0,
        exchangeRate: { mode: 'daily', effectiveDate: '2026-09-07' } } };
    } };
    if (full.endsWith('/Expenses/hooks/useExpensesTranslations.ts')) return {
      useExpensesTranslations: () => load('../src/app/BasicModules/Expenses/translations/index.ts').getFinanceTranslations(locale),
      useExpensesResolvedLocale: () => locale,
    };
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module);
    const code = ts.transpileModule(readFileSync(full, 'utf8').replaceAll('import.meta.env', '({DEV:false})'), {
      fileName: full,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const require = id => id.endsWith('.css') ? {} : id.startsWith('.') ? compile(resolve(dirname(full), id)) : createRequire(full)(id);
    try { new Function('require', 'module', 'exports', code)(require, module, module.exports); }
    catch (error) { throw new Error(`Cannot load ${full}: ${error.message}`, { cause: error }); }
    return module.exports;
  }
  return compile(resolve(dirname(fileURLToPath(import.meta.url)), relative));
}
const { filterExpenses, splitExpensePeriod, getExpenseBalance, isExpenseEffectivelyOverdue } = load('../src/app/BasicModules/Expenses/utils/expenseFilters.ts');
const today = new Date(2026, 8, 7, 12);
const base = { searchTerm: '', periodFilter: 'this_month', businessUnitFilter: 'all', businessFilter: 'all', providerFilter: 'all', statusFilter: 'all' };
const expense = (id, overrides = {}) => ({ id, folio: `TEST-${id}`, concept: 'Synthetic expense', type: 'payable',
  businessUnit: 'u1', business: 'b1', providerId: 'p1', providerName: 'Synthetic provider', category: { id: 'other', name: 'Other' },
  date: new Date(2026, 7, 24), dueDate: new Date(2026, 7, 28), createdAt: new Date(2026, 7, 24), updatedAt: new Date(2026, 7, 24),
  total: 1000, amount: 1000, taxes: 0, amountPaid: 0, status: 'pending', backendStatus: 'APPROVED', currency: 'MXN', paymentMethod: 'transfer', ...overrides });
const ids = rows => rows.map(row => row.id);

test('current month carries unpaid overdue expenses from any earlier month without re-recognizing them', () => {
  const rows = [expense('1'), expense('2', { date: new Date(2026, 6, 1) }), expense('3', { date: new Date(2025, 11, 1) }),
    expense('4', { date: new Date(2026, 8, 1) }), expense('5', { dueDate: new Date(2026, 8, 20) })];
  const original = structuredClone(rows);
  const visible = filterExpenses(rows, base, today);
  assert.deepEqual(ids(visible), ['1', '2', '3', '4']);
  const scope = splitExpensePeriod(visible, 'this_month', today);
  assert.deepEqual(ids(scope.periodExpenses), ['4']);
  assert.deepEqual(ids(scope.carryoverExpenses), ['1', '2', '3']);
  assert.deepEqual(rows, original);
});

test('partial payments carry only their remaining balance; settlement removes the carryover immediately', () => {
  let row = expense('1', { currency: 'USD', status: 'partial', backendStatus: 'PARTIALLY_PAID', amountPaid: 300 });
  for (const statusFilter of ['all', 'overdue', 'partial', 'pending_and_overdue']) {
    assert.deepEqual(ids(filterExpenses([row], { ...base, statusFilter }, today)), ['1']);
  }
  assert.equal(getExpenseBalance(row), 700);
  row = { ...row, amountPaid: 1000, status: 'paid', backendStatus: 'PAID', paymentDate: today };
  assert.equal(filterExpenses([row], base, today).length, 0);
  assert.equal(row.date.getMonth(), 7);
  assert.equal(row.currency, 'USD');
});

test('zero, settled, closed, rejected and cancelled records cannot carry stale overdue flags', () => {
  const rows = [expense('1', { status: 'overdue', amountPaid: 1000 }), expense('2', { status: 'paid' }),
    expense('3', { status: 'audited' }), ...['PAID', 'CLOSED', 'REJECTED', 'CANCELLED'].map((backendStatus, index) => expense(String(index + 4), { status: 'overdue', backendStatus }))];
  assert.equal(filterExpenses(rows, base, today).length, 0);
  for (const row of rows) assert.equal(isExpenseEffectivelyOverdue(row, today), false);
});

test('carryover respects search, provider, business and unit scope and includes every overdue month', () => {
  const rows = [expense('1'), expense('2', { providerId: 'p2', businessUnit: 'u2', business: 'b2', concept: 'Different' })];
  for (const filter of [{ providerFilter: 'p1' }, { businessUnitFilter: 'u1' }, { businessFilter: 'b1' }, { searchTerm: 'TEST-1' }, { searchTerm: 'Synthetic expense' }]) {
    assert.deepEqual(ids(filterExpenses(rows, { ...base, ...filter }, today)), ['1']);
  }
  assert.equal(filterExpenses(rows, { ...base, providerFilter: 'missing' }, today).length, 0);
});

test('historical periods retain expense-date filtering instead of accumulating today’s carryover', () => {
  const rows = [expense('1'), expense('2', { date: new Date(2026, 6, 1) }), expense('3', { date: new Date(2026, 8, 1) }), expense('4', { status: 'paid', amountPaid: 1000 })];
  assert.deepEqual(ids(filterExpenses(rows, { ...base, periodFilter: 'last_month' }, today)), ['1', '4']);
  assert.deepEqual(ids(filterExpenses(rows, { ...base, periodFilter: 'two_months_ago' }, today)), ['2']);
  assert.equal(splitExpensePeriod(rows, 'last_month', today).carryoverExpenses.length, 0);
});

test('year rollover and local midnight preserve the same obligation and its original dates', () => {
  const january = new Date(2027, 0, 1, 0, 0, 1);
  const row = expense('1', { date: new Date(2026, 11, 31), dueDate: new Date(2026, 11, 31) });
  assert.equal(filterExpenses([row], { ...base, statusFilter: 'overdue' }, new Date(2026, 11, 31, 23, 59)).length, 0);
  assert.deepEqual(ids(filterExpenses([row], { ...base, statusFilter: 'overdue' }, january)), ['1']);
  assert.equal(splitExpensePeriod([row], 'this_month', january).periodExpenses.length, 0);
});

const { createElement } = createRequire(import.meta.url)('react');
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server');
const { ExpensesSummary } = load('../src/app/BasicModules/Expenses/components/kpis/ExpensesSummary.tsx');
const { ExpenseMobileCards } = load('../src/app/BasicModules/Expenses/Expenses/components/ExpenseMobileCards.tsx');
const { LanguageProvider } = load('../src/app/context/LanguageContext.tsx');
const { TooltipProvider } = load('../src/app/components/ui/tooltip.tsx');
const render = child => renderToStaticMarkup(createElement(LanguageProvider, null, createElement(TooltipProvider, null, child)));
const rows = [expense('1', { amountPaid: 250, status: 'partial', backendStatus: 'PARTIALLY_PAID' }), expense('2', { currency: 'USD', total: 20 }), expense('3', { date: new Date(2026, 8, 1) })];
const scope = splitExpensePeriod(rows, 'this_month', today);
const props = { expenses: rows, ...scope, referenceDate: today, preferredCurrency: 'MXN', statusFilter: 'all', totals: { overdueCount: 3 }, onStatusChange() {} };

test('rendered KPIs send period IDs for expense totals and current balances for carryover to the central engine', () => {
  requests.length = 0;
  const original = structuredClone(rows);
  const html = render(createElement(ExpensesSummary, props));
  assert.deepEqual(requests.map(({ metric, ids }) => ({ metric, ids })), [
    { metric: 'EXPENSE_TOTAL', ids: ['3'] }, { metric: 'EXPENSE_BALANCE', ids: ['1', '2', '3'] },
    { metric: 'EXPENSE_BALANCE', ids: ['1', '2', '3'] }, { metric: 'EXPENSE_BALANCE', ids: ['1', '2'] },
  ]);
  assert.match(html, /Total del período - 1/);
  assert.match(html, /Saldo anterior/);
  assert.ok(html.includes('$123'));
  assert.ok(html.includes('$654'));
  assert.deepEqual(rows, original);
});

test('empty scope is not presented as settled and empty explicit IDs never mean all expenses', () => {
  requests.length = 0;
  const html = render(createElement(ExpensesSummary, { ...props, expenses: [], periodExpenses: [], carryoverExpenses: [], totals: { overdueCount: 0 } }));
  assert.match(html, /No hay gastos para los filtros seleccionados/);
  assert.doesNotMatch(html, /Todas las cuentas visibles/);
  assert.ok(requests.every(query => Array.isArray(query.ids) && query.ids.length === 0));
});

test('missing conversion evidence for prior debt does not display a complete carryover amount', () => {
  partialCarryover = true;
  const html = render(createElement(ExpensesSummary, props));
  assert.equal(html.includes('$654'), false);
  assert.match(html, /—/);
  partialCarryover = false;
});

test('prior balance labels render on mobile and in all supported translations', () => {
  const { getFinanceTranslations } = load('../src/app/BasicModules/Expenses/translations/index.ts');
  for (locale of ['es-MX', 'es-CO', 'en-CA', 'fr-CA', 'pt-BR', 'zh-CA', 'ko-CA']) {
    const t = getFinanceTranslations(locale);
    assert.ok(t.expenses.summary.insightCarryover(2, '100').includes('100'));
    const html = render(createElement(ExpenseMobileCards, { expenses: [rows[0]], carryoverExpenseIds: new Set(['1']),
      emptyMessage: '', emptyTitle: '', isSelected: () => false }));
    assert.ok(html.includes(t.expenses.summary.carryoverBadge));
    assert.ok(html.includes('TEST-1'));
  }
  locale = 'es-MX';
});

const { EditableExpenseRow } = load('../src/app/BasicModules/Expenses/Expenses/components/EditableExpenseRow.tsx');
test('desktop rows retain the original expense date and mark prior balances', () => {
  const html = render(createElement('table', null, createElement('tbody', null, createElement(EditableExpenseRow, {
    expense: rows[0], isCarryover: true, attachmentsCount: 0, columnWidths: {}, isEditing: false, isSelected: false,
    isColumnVisible: key => ['folio', 'date', 'total', 'balance', 'status'].includes(key),
    options: { accountingAccounts: [], businessUnits: [], businesses: [], providers: [], users: [], paymentMethods: [], statuses: [] },
    workflow: { authorizer: '', performer: '', auditNotes: '' },
  }))));
  assert.ok(html.includes('Saldo anterior'));
  assert.ok(html.includes('TEST-1'));
  assert.ok(html.includes('2026'));
});

const { toExpense, toExpenseApiRequest, toFinanceExpense } = load('../src/app/BasicModules/Expenses/adapters/expense.adapter.ts');
test('API calendar dates keep month, due day and save round trips across company timezones', () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'America/Mexico_City', 'America/Toronto', 'America/New_York', 'America/Bogota', 'America/Sao_Paulo', 'Asia/Seoul']) {
      process.env.TZ = timezone;
      const dto = { id: 9, companyId: 1, folio: 'DATE-9', concept: 'Calendar boundary',
        expenseDate: '2026-09-01', dueDate: '2026-09-07', paymentDate: '2026-09-02',
        createdAt: '2026-09-01T04:15:00Z', totalAmount: 100, subtotalAmount: 100, taxAmount: 0,
        paidAmount: 25, balanceAmount: 75, currencyCode: 'USD', status: 'PARTIALLY_PAID', paymentStatus: 'PARTIALLY_PAID', customFields: {} };
      const row = toExpense(dto);
      const now = new Date(2026, 8, 7, 12);
      assert.equal(row.date.getDate(), 1, timezone);
      assert.equal(row.date.getMonth(), 8, timezone);
      assert.equal(row.dueDate.getDate(), 7, timezone);
      assert.equal(row.createdAt.toISOString(), '2026-09-01T04:15:00.000Z', timezone);
      assert.deepEqual(ids(splitExpensePeriod([row], 'this_month', now).periodExpenses), ['9'], timezone);
      assert.equal(isExpenseEffectivelyOverdue(row, now), false, timezone);
      assert.equal(isExpenseEffectivelyOverdue(row, new Date(2026, 8, 8)), true, timezone);
      const request = toExpenseApiRequest(row);
      const finance = toFinanceExpense(row);
      assert.equal(request.expenseDate, dto.expenseDate, timezone);
      assert.equal(request.dueDate, dto.dueDate, timezone);
      assert.equal(request.customFields.paymentDate, dto.paymentDate, timezone);
      assert.equal(finance.expenseDate, dto.expenseDate, timezone);
      assert.equal(finance.paidDate, dto.paymentDate, timezone);
      assert.equal(request.currencyCode, 'USD');
      assert.equal(request.totalAmount, 100);
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
