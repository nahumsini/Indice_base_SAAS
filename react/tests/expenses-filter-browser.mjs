import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Use an installed Playwright or an external toolchain without modifying production dependencies.
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5189, strictPort: true },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser;
try {
  await server.listen();
  console.log('Fixture server ready');
  browser = await chromium.launch({ headless: true,
    ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.clock.install({ time: new Date('2026-09-30T12:00:00') });
  page.setDefaultTimeout(15000);
  console.log('Chrome ready');
  const errors = [], unknownRequests = [], saved = new Map();
  let requests = 0, aborted = 0, failNextBatch = false, failNextColumns = false;
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (/Maximum update depth|Too many re-renders/.test(message.text())) errors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().includes('monetary-aggregate')) aborted++; });
  const aggregate = query => ({ preferredCurrency: query.preferredCurrency, preferredTotal: (query.ids?.length ?? 0) * 116,
    nativeTotals: query.ids?.length ? [{ currency: query.preferredCurrency, amount: query.ids.length * 116 }] : [],
    partial: false, excludedRecords: 0, excludedCurrencies: [], exchangeRate: { mode: 'daily' } });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:5189') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = body => route.fulfill({ json: body });
    if (url.pathname.includes('/monetary-aggregate/')) {
      requests++;
      const body = request.postDataJSON();
      const fail = Boolean(body.queries && failNextBatch);
      if (fail) failNextBatch = false;
      await new Promise(resolve => setTimeout(resolve, requests % 2 ? 450 : 80));
      if (fail) return route.fulfill({ status: 503, json: { message: 'Synthetic failure' } });
      return json(body.queries ? { results: Object.fromEntries(body.queries.map(query => [query.key, aggregate(query)])) } : aggregate(body));
    }
    if (url.pathname.includes('/workspace-state/')) {
      if (url.pathname.endsWith('/expenses-columns') && request.method() === 'PUT' && failNextColumns) {
        failNextColumns = false;
        return route.fulfill({ status: 503, json: { message: 'Synthetic preference save failure' } });
      }
      if (request.method() === 'PUT') saved.set(url.pathname, request.postDataJSON().state);
      return json({ state: saved.get(url.pathname) ?? {}, schemaVersion: 1 });
    }
    if (url.pathname === '/api/v1/org/units') return json({ data: [{ id: 8, name: 'Unit 8' }, { id: 9, name: 'Unit 9' }] });
    if (url.pathname === '/api/v1/org/businesses') return json({ data: [{ id: 80, unitId: 8, name: 'Business 80' }, { id: 90, unitId: 9, name: 'Business 90' }] });
    if (url.pathname === '/api/v1/hr/users') return json({ items: [] });
    if (url.pathname === '/api/v1/config-center/users') return json({ users: [] });
    if (/\/finance\/(payment|accounting)-accounts$/.test(url.pathname)) return json({ accounts: [] });
    if (url.pathname === '/api/v1/exchange-rates/daily') return json({ ratesPerUsd: { USD: 1, MXN: 20 } });
    unknownRequests.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 500, json: { message: 'Unexpected fixture request' } });
  });
  const check = async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => window.expenseSoakStats.errors), []);
  };
  const filter = label => page.getByLabel(label);
  const ready = async () => {
    await filter('Periodo').waitFor();
    await page.waitForFunction(() => new URL(location.href).searchParams.get('ex_rows') === '200');
    await check();
  };
  await page.goto('http://127.0.0.1:5189/tests/browser/expenses-soak.html?ex_unit=8&ex_rows=200&ex_dir=asc&ex_sort=total&ex_page=999&ex_status=paid&ex_period=last_month');
  await ready();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('ex_page') !== '999');
  console.log('PASS: full Expenses mount, saved filters/sort, invalid page and 200-row restoration');
  const periods = ['this_month', 'last_month', 'two_months_ago', 'this_year', 'last_year', 'custom'];
  const statuses = ['all', 'paid', 'pending', 'partial', 'overdue', 'audited', 'pending_and_overdue'];
  const iterations = Number(process.env.INDICE_SOAK_ITERATIONS || 100);
  for (let iteration = 0; iteration < iterations; iteration++) {
    await filter('Periodo').selectOption(periods[iteration % periods.length]);
    await filter('Estado').selectOption(statuses[iteration % statuses.length]);
    await page.locator('thead button').filter({ hasText: iteration % 2 ? 'Fecha' : 'Total' }).first().click();
    if (iteration % 10 === 0) {
      const unit = iteration % 20 ? '9' : '8';
      await filter('Unidad').selectOption(unit);
      await filter('Negocio').selectOption(`${unit}0`);
      await filter('Proveedor').selectOption(iteration % 20 ? '10' : '11');
      await filter('Buscar').fill('Synthetic expense 1');
      await filter('Buscar').fill('');
      await page.getByRole('button', { name: 'Refresh fixture', exact: true }).click();
    }
    if (iteration % 20 === 0) {
      await page.getByRole('button', { name: 'Leave expenses', exact: true }).click();
      await page.getByRole('button', { name: 'Return expenses', exact: true }).click();
      await ready();
    }
    await check();
    if ((iteration + 1) % 20 === 0) console.log(`PASS: ${iteration + 1} repeated filter/sort cycles`);
  }
  await filter('Estado').selectOption('all');
  await filter('Periodo').selectOption('custom');
  await filter('Unidad').selectOption('all');
  await filter('Negocio').selectOption('all');
  await filter('Proveedor').selectOption('all');
  await page.waitForTimeout(1000);
  const selectAll = page.locator('thead [role="checkbox"]');
  await selectAll.check();
  await check();
  assert.ok(await page.locator('tbody tr').count() >= 200);
  await selectAll.uncheck();
  console.log('PASS: 200 visible rows and bulk selection');
  failNextBatch = true;
  await filter('Periodo').selectOption('last_month');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByRole('button', { name: 'Reintentar', exact: true }).waitFor({ state: 'hidden' });
  await filter('Estado').selectOption('paid');
  await page.reload();
  await ready();
  assert.equal(await filter('Periodo').inputValue(), 'last_month');
  assert.equal(await filter('Estado').inputValue(), 'paid');
  await page.waitForTimeout(1200);
  const idle = await page.evaluate(() => window.expenseSoakStats.commits);
  const idleRequests = requests;
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.expenseSoakStats.commits), idle, 'idle view must stop rendering');
  assert.equal(requests, idleRequests, 'idle view must stop requesting');
  const openColumns = async () => {
    await page.getByRole('button', { name: 'Acciones', exact: true }).first().click();
    await page.getByRole('menuitem', { name: 'Columnas', exact: true }).click();
    return page.getByRole('dialog', { name: 'Configurar columnas', exact: true });
  };
  let dialog = await openColumns();
  await dialog.getByRole('checkbox', { name: 'Folio', exact: true }).uncheck();
  await dialog.getByRole('checkbox', { name: /^Impuestos/ }).check();
  // Keep source and target visible together: scrolling the target after pointer coordinates
  // are captured can otherwise start a native drag on a different row in the test driver.
  await dialog.locator('label[for="folio"]').scrollIntoViewIfNeeded();
  await dialog.locator('label[for="date"]').locator('..').locator('.cursor-grab')
    .dragTo(dialog.locator('label[for="folio"]'));
  await page.getByRole('button', { name: 'Refresh fixture', exact: true, includeHidden: true }).evaluate(button => button.click());
  assert.equal(await dialog.getByRole('checkbox', { name: 'Folio', exact: true }).isChecked(), false);
  assert.equal(await dialog.getByRole('checkbox', { name: /^Impuestos/ }).isChecked(), true);
  failNextColumns = true;
  await dialog.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('checkbox', { name: 'Folio', exact: true }).isChecked(), false);
  await dialog.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const savedColumns = saved.get('/api/v1/workspace-state/expenses/expenses-columns').columns;
  assert.equal(savedColumns[0].key, 'date', 'dragged order must be persisted');
  assert.match(await page.locator('thead th').nth(1).innerText(), /^Fecha del gasto/);
    assert.equal(await page.locator('thead').getByText(/^Impuestos/).count(), 1);
  const assertColumns = async () => {
    assert.equal(await page.locator('thead').getByText('Folio', { exact: true }).count(), 0);
    assert.match(await page.locator('thead th').nth(1).innerText(), /^Fecha del gasto/);
    assert.equal(await page.locator('thead').getByText(/^Impuestos/).count(), 1);
  };
  await page.getByRole('button', { name: 'Leave expenses', exact: true }).click();
  await page.getByRole('button', { name: 'Return expenses', exact: true }).click();
  await ready(); await assertColumns();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await assertColumns();
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await ready();
  await page.waitForFunction(() => document.querySelector('thead th:nth-child(2)')?.textContent?.startsWith('Fecha del gasto'));
  await assertColumns();
  dialog = await openColumns();
  await dialog.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await assertColumns();
  dialog = await openColumns();
  await dialog.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('thead th').nth(1).innerText(), 'Folio');
  await filter('Estado').selectOption('paid');
  console.log('PASS: columns draft, dragging, save failure/retry, tab/filter changes, logout cache cleanup, restore/cancel');
  await filter('Periodo').selectOption('this_month');
  await page.waitForTimeout(800);
  assert.ok(await page.locator('tbody').getByText(/^TEST-/).count() > 0);
  await page.clock.setSystemTime(new Date('2026-10-01T12:00:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => !document.querySelector('tbody')?.textContent?.includes('TEST-'));
  await page.setViewportSize({ width: 390, height: 844 });
  await filter('Periodo').selectOption('last_month');
  await filter('Estado').selectOption('all');
  await page.waitForTimeout(800);
  await check();
  console.log('PASS: month rollover on focus and mobile filters');
  await check();
  assert.deepEqual(unknownRequests, []);
  console.log(JSON.stringify({ result: 'passed', iterations, expenses: 1200, pageSize: 200, requests, aborted, errors }));
} catch (error) {
  console.error(error);
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) console.error(await page.evaluate(() => ({ body: document.body.innerText.slice(0, 1800), stats: window.expenseSoakStats })).catch(() => null));
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
