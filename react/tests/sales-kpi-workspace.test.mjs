import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../src/app/BasicModules/Sales');
const kpiRoot = resolve(root, 'KPIs');

function loadSelectors() {
  const file = resolve(kpiRoot, 'salesKpiWorkspaceSelectors.ts');
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { Date, Map, Set, Object })(() => ({}), module, module.exports);
  return module.exports;
}

const source = () => ({
  asOfDate: '2026-09-16', timeZone: 'America/Toronto', definitionVersion: 'sales-kpi-v1',
  units: [{ id: 1, name: 'North' }, { id: 2, name: 'South' }],
  businesses: [{ id: 11, unitId: 1, name: 'A' }, { id: 22, unitId: 2, name: 'B' }],
  contacts: [
    { id: 1, unitId: 1, businessId: 11, companyName: 'Alpha', contactPerson: 'Ana', ownerUserCompanyId: 101, ownerName: 'Alex', source: 'web', status: 'active' },
    { id: 2, unitId: 2, businessId: 22, companyName: 'Beta', contactPerson: 'Bea', ownerUserCompanyId: 202, ownerName: 'Sam', source: 'referral', status: 'active' },
  ],
  opportunities: [
    { id: 10, contactId: 1, unitId: 1, businessId: 11, opportunityCode: 'OP-10', opportunityName: 'Expansion', companyName: 'Alpha', source: 'web', stage: 'negotiation', lifecycleStatus: 'open', status: 'active', ownerUserCompanyId: 101, ownerName: 'Alex', probabilityPercent: 60, expectedCloseDate: '2026-09-20', nextAction: 'Call', nextActionAt: '2026-09-15T09:00:00', lastContactAt: null, createdAt: '2026-09-01T00:00:00', updatedAt: '2026-09-15T00:00:00' },
    { id: 20, contactId: 2, unitId: 2, businessId: 22, opportunityCode: 'OP-20', opportunityName: 'Renewal', companyName: 'Beta', source: 'referral', stage: 'won', lifecycleStatus: 'won', status: 'closed', ownerUserCompanyId: 202, ownerName: 'Sam', probabilityPercent: 100, expectedCloseDate: '2026-09-22', nextAction: null, nextActionAt: null, lastContactAt: null, createdAt: '2026-09-01T00:00:00', updatedAt: '2026-09-15T00:00:00' },
  ],
  quotes: [
    { id: 100, contactId: 1, opportunityId: 10, quoteNumber: 'Q-100', clientName: 'Alpha', status: 'approved', createdDate: '2026-09-10', expirationDate: '2026-09-30', sellerUserCompanyId: 101, sellerName: 'Alex' },
    { id: 200, contactId: 2, opportunityId: 20, quoteNumber: 'Q-200', clientName: 'Beta', status: 'approved', createdDate: '2026-09-11', expirationDate: '2026-09-30', sellerUserCompanyId: 202, sellerName: 'Sam' },
    { id: 300, contactId: 1, opportunityId: null, quoteNumber: 'Q-300', clientName: 'Alpha', status: 'approved', createdDate: '2026-09-12', expirationDate: '2026-09-30', sellerUserCompanyId: 101, sellerName: 'Alex' },
  ],
  sales: [
    { id: 1000, contactId: 1, opportunityId: 10, quoteId: 100, unitId: 1, businessId: 11, saleNumber: 'S-1000', customerName: 'Alpha', sellerUserCompanyId: 101, sellerName: 'Alex', saleDate: '2026-09-14', commercialStatus: 'approved', financeStatus: 'pending', inventoryStatus: 'pending', deliveryStatus: 'pending', commissionStatus: 'pending', inventoryMovementStatus: 'not_generated' },
    { id: 2000, contactId: 2, opportunityId: 20, quoteId: 200, unitId: 2, businessId: 22, saleNumber: 'S-2000', customerName: 'Beta', sellerUserCompanyId: 202, sellerName: 'Sam', saleDate: '2026-09-14', commercialStatus: 'cancelled', financeStatus: 'approved', inventoryStatus: 'ready', deliveryStatus: 'delivered', commissionStatus: 'paid', inventoryMovementStatus: 'generated' },
  ],
});

test('period boundaries use the backend business date, including January rollover and Monday week start', () => {
  const s = loadSelectors();
  assert.deepEqual(JSON.parse(JSON.stringify(s.salesKpiDateRange('last_month', '2026-01-03'))), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(JSON.parse(JSON.stringify(s.salesKpiDateRange('this_week', '2026-09-13'))), { from: '2026-09-07', to: '2026-09-13' });
});

test('unit and business filters use owned IDs and quote scope inherits opportunity/contact ownership', () => {
  const s = loadSelectors();
  const north = s.selectSalesKpis(source(), { ...s.defaultSalesKpiScope, unit: '1', business: '11' });
  assert.deepEqual(Array.from(north.opportunities, row => row.id), [10]);
  assert.deepEqual(Array.from(north.quotes, row => row.id), [100, 300]);
  assert.deepEqual(Array.from(north.sales, row => row.id), [1000]);
  assert.deepEqual(Array.from(north.contacts, row => row.id), [1]);
});

test('cancelled sales are excluded and operational handoff counts a sale once across several pending states', () => {
  const s = loadSelectors(), data = source();
  data.sales.push({ ...data.sales[0], id: 3000, saleNumber: 'S-OLD', saleDate: '2026-08-10' });
  const selection = s.selectSalesKpis(data, s.defaultSalesKpiScope);
  assert.deepEqual(Array.from(selection.sales, row => row.id), [1000]);
  assert.deepEqual(Array.from(selection.currentSales, row => row.id), [1000, 3000]);
  assert.deepEqual(Array.from(selection.handoffSales, row => row.id), [1000, 3000]);
  assert.deepEqual(Array.from(selection.overdueFollowUps, row => row.id), [10]);
});

test('the funnel only advances linked opportunities and seller identity prefers stable IDs over labels', () => {
  const s = loadSelectors();
  const selection = s.selectSalesKpis(source(), s.defaultSalesKpiScope);
  assert.deepEqual(JSON.parse(JSON.stringify(s.buildSalesFunnel(selection))), { opportunities: 2, quoted: 2, approved: 2, sold: 1 });
  assert.equal(s.sellerIdentity(101, 'Same name').key, 'id:101');
  assert.equal(s.sellerIdentity(202, 'Same name').key, 'id:202');
});

test('workspace implements four exclusive views, scoped memory, dependent filters, central money, and explicit partial states', () => {
  const page = readFileSync(resolve(kpiRoot, 'KPIs.tsx'), 'utf8');
  const selector = readFileSync(resolve(kpiRoot, 'salesKpiWorkspaceSelectors.ts'), 'utf8');
  const sourceHook = readFileSync(resolve(kpiRoot, 'hooks/useSalesKpiSource.ts'), 'utf8');
  assert.match(page, /salesKpiViews\.map/);
  assert.match(page, /activeView === 'overview'/);
  assert.match(page, /activeView === 'analysis'/);
  assert.match(page, /activeView === 'units'/);
  assert.match(page, /activeView === 'opportunities'/);
  assert.match(page, /moduleKey: 'sales', tabKey: 'kpis'/);
  assert.match(page, /unit, business: 'all'/);
  assert.match(page, /useKpiMonetaryAggregates/);
  assert.match(page, /SALES_COLLECTED'.*selection\.currentSales/s);
  assert.match(page, /SALES_RECEIVABLE_BALANCE'.*selection\.currentSales/s);
  assert.match(page, /aggregate\.partial/);
  assert.match(page, /aggregates\.current/);
  assert.match(page, /selection\.currentSales\.length \+ selection\.opportunities\.length \+ selection\.currentQuotes\.length/);
  assert.match(page, /title: copy\.quoteStatus, rows: quoteStatusRows/);
  assert.match(page, /const reportScope = \[/);
  assert.match(page, /meta: \[\.\.\.reportScope/);
  assert.doesNotMatch(page, /scopeLabels\.map\(\(value\) => \(\{ label: copy\.context/);
  assert.match(page, /context: monetaryContext\(monetaryData\.collected\)/);
  assert.match(page, /needsFollowUp\(row, data\.asOfDate\) \? '0'/);
  assert.match(page, /readableStatus\(row\.status, locale, copy\.statuses\)/);
  assert.match(page, /grid min-w-0 grid-cols-1 gap-6/);
  assert.doesNotMatch(page, /useSalesCrm/);
  assert.match(selector, /sellerKey\(id, name\)/);
  assert.match(sourceHook, /authorizationRevision.*refreshRevision/s);
  assert.match(sourceHook, /if \(active\) setSnapshot/);
});

test('zero-valued chart cohorts use an explicit empty state instead of decorative bars', () => {
  const charts = readFileSync(resolve(kpiRoot, 'components/SalesKpiWorkspaceCharts.tsx'), 'utf8');
  assert.match(charts, /!rows\.length \|\| max === 0/);
});

test('workspace copy covers every supported locale and critical follow-up offers a drilldown', () => {
  const file = resolve(kpiRoot, 'salesKpiWorkspaceCopy.ts');
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {})(() => ({}), module, module.exports);
  const strings = (value) => Object.values(value).flatMap((entry) => typeof entry === 'object' ? strings(entry) : typeof entry === 'function' ? [entry(1, 2)] : [entry]);
  for (const locale of ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.ok(strings(module.exports.getSalesKpiWorkspaceCopy(locale)).every((value) => typeof value === 'string' && value.length > 0));
  }
  const page = readFileSync(resolve(kpiRoot, 'KPIs.tsx'), 'utf8');
  assert.match(page, /actionLabel: copy\.viewOpportunities/);
  assert.match(page, /onClick: \(\) => setActiveView\('opportunities'\)/);
});

test('server source contract is typed, tenant-scoped, operationally scoped, and fails closed', () => {
  const controller = readFileSync(resolve(import.meta.dirname, '../../src/main/java/com/indice/erp/sales/SalesApiController.java'), 'utf8');
  const repository = readFileSync(resolve(import.meta.dirname, '../../src/main/java/com/indice/erp/sales/SalesRepository.java'), 'utf8');
  const dto = readFileSync(resolve(import.meta.dirname, '../../src/main/java/com/indice/erp/sales/SalesKpiWorkspaceDtos.java'), 'utf8');
  const api = readFileSync(resolve(root, 'salesApi.ts'), 'utf8');
  assert.match(controller, /@GetMapping\("\/kpis\/workspace"\)/);
  assert.match(controller, /kpiAccess\.monetary\(user\.get\(\), "SALES_TOTAL"\)/);
  assert.match(repository, /kpiScope\("sales_contacts", scope, args\)/);
  assert.match(repository, /kpiScope\("sales_opportunities", scope, args\)/);
  assert.match(repository, /kpiScope\("sales_quotes", scope, args\)/);
  assert.match(repository, /kpiScope\("sales_records", scope, args\)/);
  assert.match(repository, /scope\.type\(\) == .*UNASSIGNED.*return List\.of\(\)/);
  assert.match(dto, /record WorkspaceResponse/);
  assert.doesNotMatch(dto, /Map<String, Object>/);
  assert.match(api, /toSalesKpiWorkspaceSource/);
  assert.match(api, /Incomplete sales KPI workspace response/);
  assert.match(api, /definitionVersion !== 'sales-kpi-v1'/);
});
