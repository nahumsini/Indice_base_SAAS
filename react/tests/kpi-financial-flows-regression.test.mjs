import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

// Execute the real pure TypeScript calculations with the project's compiler (including enums).
const cache = new Map();
function load(relative) {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), relative);
  function compile(file) {
    const full = [file, `${file}.ts`, resolve(file, 'index.ts')].find(candidate => existsSync(candidate) && candidate.endsWith('.ts'));
    if (!full) throw new Error(`Missing test module: ${file}`);
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} };
    cache.set(full, module);
    const code = ts.transpileModule(readFileSync(full, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = specifier => specifier.startsWith('.') ? compile(resolve(dirname(full), specifier)) : createRequire(full)(specifier);
    new Function('require', 'module', 'exports', code)(require, module, module.exports);
    return module.exports;
  }
  return compile(path);
}
const { buildFinancialOverviewData } = load('../src/app/BasicModules/Expenses/KPIs/financialOverviewCalculations.ts');
const { esMX } = load('../src/app/BasicModules/Expenses/translations/es-MX.ts');
const { filterSalesKpiSources } = load('../src/app/BasicModules/Sales/KPIs/salesKpiSelectors.ts');
const expense = (status, total, currency = 'USD') => ({ id: status, status, total, paidAmount: 0,
  balance: total, currency, paymentStatus: 'UNPAID', attachments: [], expenseDate: '2026-09-05' });
function overview(expenses, extra = {}) {
  return buildFinancialOverviewData({ expenses, accountingAccounts: [], budgetLines: [], budgets: [],
    paymentAccounts: [], providers: [], referenceData: { units: [], businesses: [] },
    alertCopy: esMX.kpis.alertCopy, currentDate: new Date(2026, 8, 6), ...extra });
}

test('recognized expense includes approved, partial and unbudgeted expenses while drafts remain captured only', () => {
  const rows = [expense('APPROVED', 100), expense('PARTIALLY_PAID', 50), expense('PAID', 25),
    expense('CLOSED', 10), expense('DRAFT', 500), expense('CANCELLED', 900)];
  const data = overview(rows, { budgetLines: [{ id: '1', plannedAmount: 1000, committedAmount: 0,
    actualExpenseAmount: 100, pettyCashIssuedAmount: 1200, pettyCashSettledAmount: 100,
    availableAmount: 900, currencyCode: 'USD', healthStatus: 'ON_TRACK' }] });
  assert.equal(data.metrics.actual, 185);
  assert.equal(data.metrics.available, 900);
  assert.equal(data.metrics.expenseCount, 5);
});

test('conversion changes analytical results and preserves every native operation', () => {
  const rows = [expense('APPROVED', 100, 'USD'), expense('PAID', 100, 'MXN')];
  const original = structuredClone(rows);
  const data = overview(rows, { targetCurrency: 'MXN', convertAmount: (value, currency) => currency === 'USD' ? value * 20 : value });
  assert.equal(data.metrics.actual, 2100);
  assert.deepEqual(rows, original);
  const unconverted = overview(rows, { targetCurrency: 'USD' });
  assert.equal(unconverted.metrics.actual, 100);
});

test('Sales local KPI counts exclude the same cancelled population as monetary totals', () => {
  const sources = { contacts: [], opportunities: [], quotes: [], sales: [
    { id: 1, commercialStatus: 'approved' }, { id: 2, commercialStatus: 'Cancelled' },
    { id: 3, commercialStatus: 'REJECTED' }, { id: 4, commercialStatus: 'completed' },
  ] };
  const filtered = filterSalesKpiSources(sources, { businessUnit: 'all', business: 'all', seller: 'all', search: '' });
  assert.deepEqual(filtered.sales.map(sale => sale.id), [1, 4]);
  assert.equal(sources.sales.length, 4);
});

const { buildSalesKpiAmounts } = load('../src/app/BasicModules/Sales/Sales/utils/salesKpiAmounts.ts');
const moneyAggregate = (preferredTotal, partial, nativeTotals) => ({ preferredCurrency: 'MXN', preferredTotal, partial, nativeTotals });
test('Sales cards use posted collections, preserve partial native currencies and suppress unverifiable margin', () => {
  const records = [
    { commercialStatus: 'approved', totalAmount: 100, currency: 'MXN', marginTotal: 50, marginReady: true },
    { commercialStatus: 'completed', totalAmount: 100, currency: 'CAD', marginTotal: 999, marginReady: false },
    { commercialStatus: 'cancelled', totalAmount: 900, currency: 'MXN', marginTotal: 900, marginReady: true },
  ];
  const before = structuredClone(records);
  const amounts = buildSalesKpiAmounts(records, 'MXN', {
    revenue: moneyAggregate(100, true, [{ currency: 'MXN', amount: 100 }, { currency: 'CAD', amount: 100 }]),
    collected: moneyAggregate(40, false, [{ currency: 'MXN', amount: 40 }]),
    receivableBalance: moneyAggregate(60, false, [{ currency: 'MXN', amount: 60 }]),
  }, 'N/A');
  assert.match(amounts.revenueLabel, /CAD/);
  assert.match(amounts.revenueLabel, /MXN/);
  assert.match(amounts.collectedLabel, /40/);
  assert.match(amounts.receivableBalanceLabel, /60/);
  assert.equal(amounts.grossMarginLabel, 'N/A');
  assert.equal(amounts.averageTicketLabel, 'N/A');
  assert.deepEqual(records, before);
  assert.equal(buildSalesKpiAmounts(records, 'MXN', {}, 'N/A').collectedLabel, 'N/A');
});
