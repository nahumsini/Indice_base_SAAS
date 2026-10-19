import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardDefaults, normalizeFilters, boardQuery, completeAmount, dateLabel, moneyLabel } from '../src/app/ComplementaryModules/SalesBoard/boardModel.ts';

test('invalid or obsolete remembered views and filter choices recover safely', () => {
  const result = normalizeFilters({ view: 'email', origin: 'OTHER', status: 'POSTED', page: -5, pageSize: 3, direction: 'DROP', sort: 'total', granularity: 'hour', search: 'x'.repeat(300) });
  assert.equal(result.view, 'overview'); assert.equal(result.origin, 'ALL'); assert.equal(result.status, 'ALL');
  assert.equal(result.page, 1); assert.equal(result.pageSize, 25); assert.equal(result.sort, 'date'); assert.equal(result.direction, 'desc'); assert.equal(result.granularity, 'auto'); assert.equal(result.search.length, 180);
});
test('restoration never keeps a business without its parent unit', () => {
  assert.equal(normalizeFilters({ businessId: '10' }).businessId, 'ALL');
  assert.equal(normalizeFilters({ unitId: '7', businessId: '10' }).businessId, '10');
  assert.equal(normalizeFilters({ unitId: '-7', businessId: '10' }).businessId, 'ALL');
});
test('view switches preserve filters without producing a new server query', () => {
  const filters = { ...boardDefaults, from: '2026-09-01', to: '2026-10-01', origin: 'POS', channel: 'POS', page: 2 };
  assert.equal(boardQuery(filters, 'MXN'), boardQuery({ ...filters, view: 'trends' }, 'MXN'));
});
test('queries carry only declared scope and analytical currency', () => {
  const query = new URLSearchParams(boardQuery({ ...boardDefaults, unitId: '7', businessId: '10', channel: 'POS', search: 'a & b' }, 'CAD'));
  assert.equal(query.get('unitId'), '7'); assert.equal(query.get('businessId'), '10'); assert.equal(query.get('channel'), 'POS'); assert.equal(query.get('search'), 'a & b'); assert.equal(query.get('preferredCurrency'), 'CAD'); assert.equal(query.has('view'), false);
  const defaults = new URLSearchParams(boardQuery(boardDefaults, 'MXN'));
  for (const key of ['unitId', 'businessId', 'channel', 'companyId', 'userId']) assert.equal(defaults.has(key), false);
});
test('partial amounts stay unknown, complete zero stays zero', () => {
  assert.equal(completeAmount({ partial: true, preferredTotal: 400 }), null);
  assert.equal(completeAmount({ partial: false, preferredTotal: 0 }), 0);
  assert.equal(moneyLabel(null, 'MXN', 'es-MX'), '—');
  assert.match(moneyLabel(100, 'USD', 'es-MX'), /USD/);
});
test('sale dates are presented without browser timezone day shifts', () => {
  const original = process.env.TZ; process.env.TZ = 'Pacific/Honolulu';
  try { assert.match(dateLabel('2026-10-01', 'en-US'), /Oct 1, 2026/); } finally { process.env.TZ = original; }
});
test('native routing and permission are registered across all owner boundaries', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../src/app/config/navigation.ts'), /sales_board: 'sales-board'/);
  assert.match(read('../../src/main/java/com/indice/erp/access/tab/TabPermissionRouteClassifier.java'), /one\("sales_board.overview"\)/);
  assert.match(read('../../src/main/java/com/indice/erp/configcenter/users/ConfigCenterTabPermissionCatalog.java'), /tab\("sales_board", "overview"/);
});
test('localization provides the same complete copy for every supported language', () => {
  const source = readFileSync(new URL('../src/app/ComplementaryModules/SalesBoard/boardCopy.ts', import.meta.url), 'utf8');
  const literal = source.slice(source.indexOf('const text = {') + 13, source.indexOf('} satisfies') + 1);
  const copy = Function(`return (${literal});`)();
  assert.ok(Object.keys(copy).length > 60);
  for (const [key, values] of Object.entries(copy)) { assert.equal(values.length, 6, key); assert.ok(values.every(value => typeof value === 'string' && value.trim()), key); }
});

test('malformed historical currency and remembered dates cannot crash the workspace', () => {
  assert.match(moneyLabel(10, ' mxn ', 'es-MX'), /MXN/);
  assert.match(moneyLabel(10, '', 'es-MX'), /10/);
  assert.equal(normalizeFilters({ from: '2026-02-30', to: 'invalid' }).from, '');
});

test('sales-board tab assignment and entry agree with the server organizational role scope', async () => {
  const { isTabScopeAssignableToRole, canAccessModuleTab } = await import('../src/app/access/tabScopeCatalog.ts');
  for (const role of ['admin', 'manager', 'approver', 'owner', 'superadmin']) assert.equal(isTabScopeAssignableToRole('sales_board.overview', role), true);
  assert.equal(isTabScopeAssignableToRole('sales_board.overview', 'user'), false);
  const session = { user: { role: 'user', tab_permissions_configured: true, tab_permission_keys: ['sales_board.overview'] } };
  assert.equal(canAccessModuleTab('sales-board', 'overview', session), false);
  session.user.role = 'admin';
  assert.equal(canAccessModuleTab('sales-board', 'overview', session), true);
  session.user.tab_permission_keys = [];
  assert.equal(canAccessModuleTab('sales-board', 'overview', session), false);
});

test('quick periods use company calendar dates across months and week boundaries', async () => {
  const { periodRange, detectedPeriod } = await import('../src/app/ComplementaryModules/SalesBoard/boardModel.ts');
  assert.deepEqual(periodRange('week', '2026-01-01'), { from: '2025-12-29', to: '2026-01-01' });
  assert.deepEqual(periodRange('week', '2026-10-19'), { from: '2026-10-19', to: '2026-10-19' });
  assert.deepEqual(periodRange('month', '2024-02-29'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(periodRange('today', '2026-10-18'), { from: '2026-10-18', to: '2026-10-18' });
  assert.equal(periodRange('today', '2026-02-30'), null);
  assert.equal(detectedPeriod(boardDefaults, '2026-10-19'), 'month');
  assert.equal(detectedPeriod({ from: '2026-08-01', to: '2026-08-31' }, '2026-10-19'), 'custom');
  assert.equal(normalizeFilters({ sort: 'amount' }).sort, 'amount');
});
test('channel shares preserve incomplete conversion and zero denominators', async () => {
  const { amountShare } = await import('../src/app/ComplementaryModules/SalesBoard/boardModel.ts');
  const total = { partial: false, preferredTotal: 200 };
  assert.equal(amountShare({ partial: false, preferredTotal: 50 }, total), .25);
  assert.equal(amountShare({ partial: true, preferredTotal: 50 }, total), null);
  assert.equal(amountShare(total, { partial: true, preferredTotal: 200 }), null);
  assert.equal(amountShare(total, { partial: false, preferredTotal: 0 }), null);
});
test('CSV export loads every filtered page and rejects incomplete or changing results', async () => {
  const { collectBoardExport, boardCsv } = await import('../src/app/ComplementaryModules/SalesBoard/boardExport.ts');
  const controller = new AbortController(), all = Array.from({ length: 205 }, (_, id) => ({ sale: { id } })), calls = [];
  const rows = await collectBoardExport(async (page, size) => {
    calls.push([page, size]); return { items: all.slice((page - 1) * size, page * size), total: 205, page };
  }, 205, controller.signal);
  assert.equal(rows.length, 205); assert.deepEqual(calls, [[1, 200], [2, 200]]);
  await assert.rejects(collectBoardExport(async () => ({ items: [], total: 5, page: 1 }), 5, controller.signal));
  await assert.rejects(collectBoardExport(async () => ({ items: all, total: 206, page: 1 }), 205, controller.signal));
  await assert.rejects(collectBoardExport(async page => ({ items: [all[0]], total: 2, page }), 2, controller.signal));
  await assert.rejects(collectBoardExport(async () => { throw Error('must not fetch'); }, 10001, controller.signal), /export_limit/);
  controller.abort(); await assert.rejects(collectBoardExport(async () => {}, 1, controller.signal));
  const csv = boardCsv([['=HYPERLINK("bad")', ' +cmd', 'a,"b"\nc', 20.75, -5]]);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.includes("' +cmd"));
  assert.ok(csv.includes('"a,""b""\nc"')); assert.ok(csv.includes('"20.75","-5"'));
});
