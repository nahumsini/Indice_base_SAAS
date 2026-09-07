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
    const full = [file, `${file}.ts`, `${file}.tsx`, resolve(file, 'index.ts')].find(candidate => existsSync(candidate) && (/\.tsx?$/.test(candidate)));
    if (!full) throw new Error(`Missing test module: ${file}`);
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} };
    cache.set(full, module);
    const code = ts.transpileModule(readFileSync(full, 'utf8').replaceAll('import.meta.env', '({DEV:false})'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const require = specifier => specifier.endsWith('.css') ? {} : specifier.startsWith('.') ? compile(resolve(dirname(full), specifier)) : createRequire(full)(specifier);
    new Function('require', 'module', 'exports', code)(require, module, module.exports);
    return module.exports;
  }
  return compile(path);
}

const { toFrontendSaleRecord } = load('../src/app/BasicModules/Sales/adapters/salesApiAdapters.ts');
const { calculateCommissionRecords } = load('../src/app/BasicModules/Sales/Sales/utils/commissionRules.ts');
const { commissionSelections } = load('../src/app/BasicModules/Sales/Sales/services/commissionSummaryApi.ts');
const { commissionSummaryKpis } = load('../src/app/BasicModules/Sales/Sales/utils/commissionSummaryPresentation.ts');
const { formatCommissionRate, formatSalesCurrency, formatCommissionMoney } = load('../src/app/BasicModules/Sales/Sales/utils/salesFormatters.ts');
const rawSale = { id: 15, saleNumber: 'SAL-15', totalAmount: '100', currency: 'USD', commercialStatus: 'approved',
  saleDate: '2026-09-06', commissionStatus: 'calculated', commissionAmount: '10', commissionBreakdown: [
    { ruleName: 'First', commissionType: 'percentage_of_product', commissionValue: '4', commissionAmount: '4', productId: 1 },
    { ruleName: 'Second', commissionType: 'percentage_of_product', commissionValue: '6', commissionAmount: '6', productId: 2 }], saleLines: [] };
test('legacy decimal strings normalize into finite commission rows without changing source data', () => {
  const before = structuredClone(rawSale);
  const rows = calculateCommissionRecords([toFrontendSaleRecord(rawSale)]);
  assert.equal(rows[0].commissionValue, 4);
  assert.equal(rows[1].commissionAmount, 6);
  assert.equal(rows[0].productId, '1');
  assert.equal(formatCommissionRate(rows[1].commissionValue), '6%');
  assert.match(formatCommissionMoney(6, 'CAD'), /CAD/);
  assert.match(formatCommissionMoney(6, 'USD'), /USD/);
  assert.equal(formatCommissionMoney(rows[1].commissionAmount, 'USD').includes('6.00'), true);
  assert.deepEqual(commissionSelections([...rows, rows[0]]), [{ saleId: 15, componentIndexes: [0, 1] }]);
  assert.deepEqual(commissionSelections([rows[1]]), [{ saleId: 15, componentIndexes: [1] }]);
  assert.deepEqual(rawSale, before);
});
test('malformed historical components render unavailable amounts and keep their index for server verification', () => {
  const rows = calculateCommissionRecords([toFrontendSaleRecord({ ...rawSale, commissionBreakdown: [null, { commissionAmount: 'bad' }] })]);
  assert.equal(rows.length, 2);
  assert.equal(formatSalesCurrency(rows[1].commissionAmount, 'USD'), '—');
  assert.equal(formatCommissionRate(rows[0].commissionValue), '—');
});
test('summary never computes money locally or presents a partial aggregate as a complete amount', () => {
  const aggregate = { preferredCurrency: 'USD', preferredTotal: 10.5, nativeTotals: [], partial: false };
  const summary = { total: aggregate, paid: aggregate, pending: aggregate, approved: aggregate, salesBase: aggregate,
    commissionRate: 10, incomplete: false };
  assert.equal(commissionSummaryKpis(summary, 3).commissionRate, 10);
  assert.equal(commissionSummaryKpis(summary, 3).totalCommissionsLabel, 'USD 10.50');
  assert.equal(commissionSummaryKpis({ ...summary, total: { ...aggregate, partial: true }, commissionRate: null }, 3).totalCommissionsLabel, '—');
  assert.equal(commissionSummaryKpis(null, 3).commissionRate, null);
  assert.equal(commissionSummaryKpis({ ...summary, incomplete: true }, 3).totalCommissionsLabel, '—');
});
test('cancelled and rejected sales remain identifiable instead of entering payable status', () => {
  for (const commercialStatus of ['cancelled', 'rejected']) {
    assert.equal(calculateCommissionRecords([toFrontendSaleRecord({ ...rawSale, commercialStatus })])[0].status, 'cancelled');
  }
});

const { createElement } = createRequire(import.meta.url)('react');
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server');
const { CommissionKpiStrip } = load('../src/app/BasicModules/Sales/Sales/components/CommissionKpiStrip.tsx');
const { CommissionTable } = load('../src/app/BasicModules/Sales/Sales/components/CommissionTable.tsx');
const { LanguageProvider } = load('../src/app/context/LanguageContext.tsx');
const { TooltipProvider } = load('../src/app/components/ui/tooltip.tsx');
const render = child => renderToStaticMarkup(createElement(LanguageProvider, null, createElement(TooltipProvider, null, child)));
const { getSalesRecordsTranslations } = load('../src/app/BasicModules/Sales/Sales/translations/index.ts');
test('actual commission cards and table render with decimal strings and every supported locale', () => {
  const rows = calculateCommissionRecords([toFrontendSaleRecord(rawSale)]);
  const money = { preferredCurrency: 'USD', preferredTotal: 10, nativeTotals: [], partial: false };
  const kpis = commissionSummaryKpis({ total: money, pending: money, approved: money, paid: money, commissionRate: 10, incomplete: false }, 2);
  for (const locale of ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const t = getSalesRecordsTranslations(locale);
    assert.match(render(createElement(CommissionKpiStrip, { kpis, records: rows, t })), /USD 10.00/);
    assert.ok(render(createElement(CommissionTable, { records: rows, t, onViewRecord() {} })).includes('SAL-15'));
  }
});
