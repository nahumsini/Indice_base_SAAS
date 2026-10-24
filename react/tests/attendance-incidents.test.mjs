import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '../src/app/BasicModules/HumanResources/Control');
const cache = new Map();
function load(path) {
  if (path.endsWith('documentPrintFeedback.ts')) return { notifyDocumentPrintFailure() {} };
  if (path.endsWith('documentHtmlPrintEngine.ts')) return {
    escapeDocumentPrintHtml: v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'),
    printDocumentHtml: params => params,
  };
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} }; cache.set(path, module.exports);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = spec => load(resolve(dirname(path), `${spec}.ts`));
  vm.runInNewContext(`(function(module,exports,require){${source}\n})`, { Date, Intl, Map, Set, URL })(module, module.exports, require);
  cache.set(path, module.exports); return module.exports;
}
const dates = load(resolve(root, 'utils/incidentReportPeriod.ts'));
const copies = load(resolve(root, 'translations/incidentReportCopy.ts'));
const printing = load(resolve(root, 'utils/incidentReportPrint.ts'));

test('period presets cover leap months, half-months and weeks crossing a year', () => {
  assert.equal(JSON.stringify(dates.incidentPeriodRange('month', '2024-02-29')), JSON.stringify({ from: '2024-02-01', to: '2024-02-29' }));
  assert.equal(JSON.stringify(dates.incidentPeriodRange('fortnight', '2026-02-15')), JSON.stringify({ from: '2026-02-01', to: '2026-02-15' }));
  assert.equal(JSON.stringify(dates.incidentPeriodRange('fortnight', '2026-02-16')), JSON.stringify({ from: '2026-02-16', to: '2026-02-28' }));
  assert.equal(JSON.stringify(dates.incidentPeriodRange('week', '2027-01-01')), JSON.stringify({ from: '2026-12-28', to: '2027-01-03' }));
});
test('date validation rejects normalized invalid dates and limits the inclusive range', () => {
  assert.equal(dates.validIncidentRange('2026-02-30', '2026-03-01'), false);
  assert.equal(dates.validIncidentRange('2026-03-01', '2026-02-01'), false);
  assert.equal(dates.validIncidentRange('2026-01-01', '2026-04-03'), true);
  assert.equal(dates.validIncidentRange('2026-01-01', '2026-04-04'), false);
  assert.equal(dates.validIncidentRange('', '2026-01-01'), false);
});
test('overnight exits show the actual exit date and preserve wall-clock attendance time', () => {
  assert.match(dates.incidentTimeLabel('2026-10-02T01:00:00', 'es-MX', '2026-10-01'), /^01:00 · /);
  assert.equal(dates.incidentTimeLabel('2026-10-01T09:20:00', 'es-MX', '2026-10-01'), '09:20');
});
test('all supported languages supply complete user-facing incident labels', () => {
  const keys = Object.keys(copies.getIncidentReportCopy('en-CA')).sort();
  for (const locale of ['es-MX', 'es-CO', 'en-CA', 'en-US', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    const copy = copies.getIncidentReportCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), keys);
    assert.ok(Object.values(copy).every(v => typeof v === 'string' && v.length > 0));
    assert.notEqual(copies.incidentStatusLabel('on_time', copy), copies.incidentStatusLabel('late', copy));
  }
});
const employee = id => ({ person: { id, name: `Employee ${id}<script>`, code: 'A&B', unitName: 'North', businessName: 'Office' },
  totals: { statuses: { on_time: 1, rest: 1 }, daysWithEntry: 1, incompleteDays: 0 },
  days: [{ date: '2026-10-01', status: 'on_time', correctedStatus: 'on_time', checkIn: '2026-10-01T09:00:00', checkOut: '2026-10-01T17:00:00', minutesLate: 0, notes: '<img src=x onerror=alert(1)>', incomplete: false },
    { date: '2026-10-02', status: 'rest', correctedStatus: null, checkIn: null, checkOut: null, minutesLate: 0, notes: null, incomplete: false }] });
const report = { from: '2026-10-01', to: '2026-10-02', generatedAt: '2026-10-24T10:30:00', employees: [employee(1), employee(2)] };
test('printing includes every selected day, correction and status while escaping business text', () => {
  const html = printing.incidentReportPrintHtml(report, report.employees, copies.getIncidentReportCopy('es-MX'), 'es-MX', 'Test & Company');
  assert.ok(html.includes('Test &amp; Company'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/<tbody>/g) ?? []).length, 2);
  assert.ok(html.includes('Descansos'));
  assert.ok(html.includes('Corregido'));
  assert.ok(html.includes('v2.1'));
});
test('individual printing excludes other collaborators and uses the shared portrait print engine', () => {
  const result = printing.printIncidentReport(report, [report.employees[1]], copies.getIncidentReportCopy('es-MX'), 'es-MX', 'Test company');
  assert.equal(result.pageSize, 'a4'); assert.equal(result.orientation, 'portrait');
  assert.equal(result.presentation, 'quotation');
  assert.equal(result.bodyHtml, printing.incidentReportPrintHtml(report, [report.employees[1]], copies.getIncidentReportCopy('es-MX'), 'es-MX', 'Test company'));
  assert.ok(!result.bodyHtml.includes('Employee 1')); assert.ok(result.bodyHtml.includes('Employee 2'));
  assert.equal(printing.printIncidentReport(report, [], copies.getIncidentReportCopy('es-MX'), 'es-MX', ''), false);
});

test('company branding uses the real safe logo, neutral shared theme and a text fallback', () => {
  const identity = { name: 'Test company', logoUrl: 'data:image/png;base64,WA==' };
  const copy = copies.getIncidentReportCopy('es-MX');
  const html = printing.incidentReportPrintHtml(report, report.employees, copy, 'es-MX', identity);
  assert.match(html, /<img data-company-logo class="document-logo"/);
  assert.ok(html.includes('Test company'));
  const hostile = printing.incidentReportPrintHtml(report, report.employees, copy, 'es-MX', { ...identity, logoUrl: 'javascript:alert(1)' });
  assert.ok(!hostile.includes('<img'));
  assert.ok(hostile.includes('Test company'));
  assert.ok(!html.includes('#177d66'));
  const job = printing.printIncidentReport(report, report.employees, copy, 'es-MX', identity);
  assert.equal(job.contentStyles, undefined);
  assert.ok(!job.bodyHtml.includes('break-before: page'));
  assert.ok(job.documentTitle.includes('2026-10-01_2026-10-02'));
});

test('daily context, totals and very long observations remain complete in the common definition', () => {
  const copy = copies.getIncidentReportCopy('es-MX');
  const long = 'Observación completa con acentos y contexto. '.repeat(1500);
  const selected = employee(3); selected.days[0].notes = long;
  const definition = printing.buildIncidentReportDocument(report, [selected], copy, 'es-MX', { name: '', logoUrl: '' });
  assert.equal(definition.tables[0].rows.length, 2);
  assert.equal(definition.tables[0].rows[0][5], long);
  assert.equal(definition.contract.category, 'operational-report');
  assert.equal(definition.confidentiality, 'confidential');
  assert.equal(definition.issuer, undefined);
  const fields = definition.tables[0].metadata;
  assert.ok(fields.some(field => field.label === copy.unit && field.value === 'North'));
  assert.ok(fields.some(field => field.label === copy.rest && field.value === 1));
  assert.ok(fields.some(field => field.label === copy.entries && field.value === 1));
  assert.ok(printing.incidentReportPrintHtml(report, [selected], copy, 'es-MX', '').includes(long));
});
