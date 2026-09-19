import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');

function loadTypeScript(relativePath) {
  const file = resolve(root, relativePath);
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${output}\n})`, { Error, Map, Set })(module, module.exports);
  return module.exports;
}

const measurements = loadTypeScript('src/app/BasicModules/HumanResources/KPIs/hrKpiMeasurements.ts');
const sourceLoader = loadTypeScript('src/app/BasicModules/HumanResources/KPIs/hrKpiSourceLoader.ts');

const assignment = (todayStatus, todayRule = { is_rest_day: false }) => ({
  today_status: todayStatus,
  today_rule: todayRule,
  user_company_id: 1,
});

test('attendance rates use only completed scheduled shifts', () => {
  const result = measurements.measureHrAttendance([
    assignment('on_time'),
    assignment('late'),
    assignment('absence'),
    assignment('pending'),
    assignment('leave'),
    assignment('rest', { is_rest_day: true }),
    assignment('not_scheduled', null),
  ]);

  assert.equal(result.scheduled, 4);
  assert.equal(result.completedSample, 3);
  assert.equal(result.present, 2);
  assert.equal(result.attendanceRate, 67);
  assert.equal(result.punctualityRate, 50);
  assert.equal(result.pending, 1);
  assert.equal(result.leave, 1);
  assert.equal(result.rest, 1);
  assert.equal(result.unconfigured, 1);
});

test('attendance preserves a valid zero and distinguishes an unfinished sample', () => {
  const confirmedAbsence = measurements.measureHrAttendance([assignment('absence')]);
  const unfinishedShift = measurements.measureHrAttendance([assignment('pending')]);

  assert.equal(confirmedAbsence.attendanceRate, 0);
  assert.equal(unfinishedShift.attendanceRate, null);
  assert.equal(unfinishedShift.completedSample, 0);
});

test('critical records are an open-record subset and resolved records are not double counted', () => {
  const records = [
    { id: 1, status: 'pending', severity: 'high' },
    { id: 2, status: 'reviewed', severity: 'low' },
    { id: 3, status: 'resolved', severity: 'high' },
  ];
  const result = measurements.measureHrRecords(records);

  assert.equal(result.total, 3);
  assert.equal(result.open, 2);
  assert.equal(result.criticalOpen, 1);
  assert.equal(result.resolved, 1);
  assert.equal(result.open + result.resolved, result.total);
});

test('asset measurements count assigned items and unique people separately', () => {
  const assets = [
    { id: 1, status: 'assigned', responsible_user_company_id: 10 },
    { id: 2, status: 'custody', responsible_user_company_id: 10 },
    { id: 3, status: 'assigned', responsible_user_company_id: 20 },
    { id: 4, status: 'maintenance', responsible_user_company_id: null },
  ];
  const result = measurements.measureHrAssets(assets, new Set([10, 20]));

  assert.equal(result.assignedItems, 3);
  assert.equal(result.assignedPeople, 2);
  assert.equal(result.maintenance, 1);
});

test('asset scope follows the responsible employee and never broadens business filters', () => {
  const assigned = { id: 1, responsible_user_company_id: 10, unit_id: 4 };
  const unassigned = { id: 2, responsible_user_company_id: null, unit_id: 4 };
  const base = { employeeIds: new Set([10]), unitFilter: '4', departmentFilter: 'all' };

  assert.equal(measurements.assetMatchesHrScope({ ...base, asset: assigned, businessFilter: '9' }), true);
  assert.equal(measurements.assetMatchesHrScope({ ...base, asset: unassigned, businessFilter: '9' }), false);
  assert.equal(measurements.assetMatchesHrScope({ ...base, asset: unassigned, businessFilter: 'all' }), true);
});

test('complete source loader stops after a complete non-paginated response', async () => {
  let calls = 0;
  const response = await sourceLoader.loadCompleteHrCollection({
    fetchPage: async () => {
      calls += 1;
      return { items: [{ id: 1 }, { id: 2 }], count: 2 };
    },
    itemKey: item => item.id,
    pageSize: 200,
  });

  assert.equal(calls, 1);
  assert.equal(response.items.length, 2);
});

test('complete source loader follows declared pages and deduplicates stable identifiers', async () => {
  const requestedPages = [];
  const response = await sourceLoader.loadCompleteHrCollection({
    fetchPage: async page => {
      requestedPages.push(page);
      return page === 1
        ? { items: [{ id: 1 }, { id: 2 }], total_count: 3, total_pages: 2 }
        : { items: [{ id: 2 }, { id: 3 }], total_count: 3, total_pages: 2 };
    },
    itemKey: item => item.id,
    pageSize: 100,
  });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.deepEqual(Array.from(response.items, item => item.id), [1, 2, 3]);
});

test('complete source loader fails closed on repeated or incomplete pages', async () => {
  await assert.rejects(
    sourceLoader.loadCompleteHrCollection({
      fetchPage: async () => ({ items: [{ id: 1 }], total_count: 2, total_pages: 2 }),
      itemKey: item => item.id,
      pageSize: 100,
    }),
    error => error?.name === 'IncompleteHrKpiSourceError' && /repeated page/.test(error.message),
  );

  await assert.rejects(
    sourceLoader.loadCompleteHrCollection({
      fetchPage: async () => ({ items: [{ id: 1 }], total_count: 2 }),
      itemKey: item => item.id,
      pageSize: 100,
    }),
    error => error?.name === 'IncompleteHrKpiSourceError' && /without pagination metadata/.test(error.message),
  );
});
