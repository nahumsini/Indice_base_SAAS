import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Use an installed Playwright or an external toolchain without modifying production dependencies.
const { chromium, webkit, devices } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5193, strictPort: true },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser;
try {
  await server.listen();
  console.log('Fixture server ready');
  const useWebkit = process.env.INDICE_BROWSER === 'webkit';
  browser = await (useWebkit ? webkit : chromium).launch({ headless: true,
    ...(!useWebkit && process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({ ...(useWebkit ? devices['iPhone 13'] : devices['Pixel 7']) });
  await page.clock.install({ time: new Date('2026-09-30T12:00:00') });
  page.setDefaultTimeout(15000);
  console.log(useWebkit ? 'iPhone/WebKit ready' : 'Android/Chrome ready');
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
    if (url.origin !== 'http://127.0.0.1:5193') return route.abort();
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
      if (request.method() === 'GET') await new Promise(resolve => setTimeout(resolve, 350));
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
  saved.set('/api/v1/workspace-state/expenses/expenses', { searchTerm: '', periodFilter: 'last_month', statusFilter: 'paid', businessUnitFilter: '8', businessFilter: 'all', providerFilter: 'all' });
  saved.set('/api/v1/workspace-state/expenses/expenses-table', { pageSize: 200, currentPage: 1, sortField: 'total', sortDirection: 'asc' });
  await page.goto('http://127.0.0.1:5193/tests/browser/expenses-soak.html?ex_rows=200');
  await filter('Estado').waitFor();
  await page.waitForFunction(() => document.querySelector('select') && new URL(location.href).searchParams.get('ex_status') === 'paid');
  await check();
  console.log('PASS: mobile cold load with saved Paid / Last month filters and 200 rows');
  const periods = ['this_month', 'last_month', 'two_months_ago', 'this_year', 'last_year', 'custom'];
  const statuses = ['all', 'paid', 'pending', 'partial', 'overdue', 'audited', 'pending_and_overdue'];
  for (let iteration = 0; iteration < 36; iteration++) {
    await filter('Periodo').selectOption(periods[iteration % periods.length]);
    await filter('Estado').selectOption(statuses[iteration % statuses.length]);
    if (iteration % 6 === 0) {
      await page.getByRole('button', { name: 'Refresh fixture', exact: true }).click();
      await filter('Buscar').fill('Synthetic expense 1');
      await filter('Buscar').fill('');
      await page.setViewportSize(iteration % 12 ? { width: 390, height: 844 } : { width: 844, height: 390 });
    }
    if (iteration % 12 === 0) {
      await page.getByRole('button', { name: 'Leave expenses', exact: true }).click();
      await page.getByRole('button', { name: 'Return expenses', exact: true }).click();
      await filter('Estado').waitFor();
    }
    await check();
  }
  await filter('Periodo').selectOption('last_month');
  await filter('Estado').selectOption('paid');
  for (let reload = 0; reload < 3; reload++) {
    await page.reload(); await filter('Estado').waitFor();
    await page.waitForTimeout(800); await check();
    assert.equal(await filter('Estado').inputValue(), 'paid');
    assert.equal(await filter('Periodo').inputValue(), 'last_month');
  }
  await page.waitForTimeout(1500);
  const commits = await page.evaluate(() => window.expenseSoakStats.commits);
  const idleRequests = requests;
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.expenseSoakStats.commits), commits, 'idle mobile must stop rendering');
  assert.equal(requests, idleRequests, 'idle mobile must stop requesting');
  assert.deepEqual(unknownRequests, []); await check();
  console.log(JSON.stringify({ result: 'passed', engine: useWebkit ? 'webkit' : 'chromium', mobile: true, cycles: 36, reloads: 3, errors, requests }));
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) console.error(await page.evaluate(() => ({ body: document.body.innerText.slice(0, 1800), stats: window.expenseSoakStats })).catch(() => null));
  throw error;
} finally { await browser?.close(); await server.close(); }
