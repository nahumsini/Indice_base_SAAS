import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Use an installed Playwright or an external toolchain without modifying production dependencies.
const { chromium, webkit, devices } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5194, strictPort: true },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser;
try {
  await server.listen();
  console.log('Fixture server ready');
  const useWebkit = process.env.INDICE_BROWSER === 'webkit';
  browser = await (useWebkit ? webkit : chromium).launch({ headless: true,
    ...(!useWebkit && process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({ ...(useWebkit ? devices['iPhone 13'] : devices['Pixel 7']) });
  // Keep native Date/Intl semantics while reproducing the module's bootstrap.
  page.setDefaultTimeout(15000);
  console.log(useWebkit ? 'iPhone/WebKit ready' : 'Android/Chrome ready');
  const errors = [], unknownRequests = [], saved = new Map();
  let requests = 0;
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (/Maximum update depth|Too many re-renders/.test(message.text())) errors.push(message.text()); });
  const aggregate = query => ({ preferredCurrency: query.preferredCurrency, preferredTotal: (query.ids?.length ?? 0) * 116,
    nativeTotals: query.ids?.length ? [{ currency: query.preferredCurrency, amount: query.ids.length * 116 }] : [],
    partial: false, excludedRecords: 0, excludedCurrencies: [], exchangeRate: { mode: 'daily' } });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:5194') return route.abort();
    if (url.pathname.startsWith('/expenses/')) return route.fulfill({ contentType: 'text/html', body: await server.transformIndexHtml(url.pathname, readFileSync(resolve(root, 'tests/browser/expenses-module-mobile.html'), 'utf8')) });
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = body => route.fulfill({ json: body });
    if (url.pathname === '/api/v1/modules') return json([]);
    if (url.pathname === '/api/v1/finance/providers') return json({ providers: [] });
    if (url.pathname === '/api/v1/finance/budget-lines') return json({ budgetLines: [] });
    if (url.pathname.endsWith('/budget-obligations/synchronize')) return json({ enabled: true, generated: 0, reviews: [] });
    if (url.pathname === '/api/v1/finance/expenses') {
      await new Promise(resolve => setTimeout(resolve, 900));
      return json({ expenses: Array.from({ length: 1200 }, (_, index) => ({ id: index + 1, version: 1,
        companyId: 9001, unitId: 8, businessId: 80, folio: `TEST-${index + 1}`, concept: `Synthetic expense ${index + 1}`,
        status: index % 2 ? 'PAID' : 'APPROVED', paymentStatus: index % 2 ? 'PAID' : 'UNPAID',
        expenseType: 'REAL', subtotalAmount: 100, taxAmount: 16, totalAmount: 116,
        paidAmount: index % 2 ? 116 : 0, balanceAmount: index % 2 ? 0 : 116, currencyCode: 'MXN',
        expenseDate: index % 3 ? '2026-08-15' : '2026-09-15', dueDate: '2026-09-29',
        originFund: index % 7 ? undefined : { id: 1 + index % 35, name: `Fund ${index % 35}`, type: 'INTERNAL_COMPANY' },
        customFields: { entryType: 'real' }, attachmentCount: 0,
      })) });
    }
    if (url.pathname.includes('/monetary-aggregate/')) {
      requests++;
      const body = request.postDataJSON();
      await new Promise(resolve => setTimeout(resolve, requests % 2 ? 450 : 80));
      return json(body.queries ? { results: Object.fromEntries(body.queries.map(query => [query.key, aggregate(query)])) } : aggregate(body));
    }
    if (url.pathname.includes('/workspace-state/')) {
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
  saved.set('/api/v1/workspace-state/expenses/expenses', { periodFilter: 'last_month', statusFilter: 'paid', businessUnitFilter: '8', businessFilter: 'all', providerFilter: 'all', searchTerm: '' });
  saved.set('/api/v1/workspace-state/expenses/expenses-table', { pageSize: 200, currentPage: 999, sortField: 'total', sortDirection: 'asc' });
  await page.goto('http://127.0.0.1:5194/expenses/expenses');
  await filter('Periodo').waitFor();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('ex_rows') === '200' && new URL(location.href).searchParams.get('ex_status') === 'paid');
  await page.waitForTimeout(1800); await check();
  console.log('PASS: full Expenses module mobile cold entry with learning mode, data loading, saved filters and page correction');
  for (let cycle = 0; cycle < 18; cycle++) {
    await filter('Periodo').selectOption(['last_month', 'this_month', 'custom'][cycle % 3]);
    await filter('Estado').selectOption(['paid', 'all', 'pending'][cycle % 3]);
    await check();
  }
  for (let reload = 0; reload < 3; reload++) {
    await page.reload(); await filter('Periodo').waitFor(); await page.waitForTimeout(2200); await check();
  }
  assert.deepEqual(unknownRequests, []);
  await page.waitForTimeout(1000);
  const commits = await page.evaluate(() => window.expenseSoakStats.commits);
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.expenseSoakStats.commits), commits, 'module must stop rendering at rest');
  console.log(JSON.stringify({ result: 'passed', engine: useWebkit ? 'webkit' : 'chromium', module: true, cycles: 18, reloads: 3, errors, requests }));
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) console.error(await page.evaluate(() => ({ body: document.body.innerText.slice(0, 1800), stats: window.expenseSoakStats })).catch(() => null));
  throw error;
} finally { await browser?.close(); await server.close(); }
