import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5194';
const server = await createServer({
  root: resolve(import.meta.dirname, '..'),
  server: { host: '127.0.0.1', port: 5194, strictPort: true },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let listCalls = 0, deleteCalls = 0, failDelete = false, failList = false;
  let connections = [1, 2].map(id => ({
    id, provider: 'generic_mcp', label: `Test assistant ${id}`, tokenPrefix: 'synthetic',
    scopes: ['customers.read', 'tasks.read'], createdAt: '2026-01-01T00:00:00Z',
    expiresAt: '2099-01-01T00:00:00Z', lastUsedAt: null, revokedAt: null,
  }));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/v1/ai/connections' && request.method() === 'GET') {
      listCalls++;
      return route.fulfill(failList ? { status: 503, json: { message: 'Synthetic failure' } } : { json: { connections } });
    }
    if (/\/connections\/\d+\/activity$/.test(url.pathname)) return route.fulfill({ json: { events: [] } });
    if (/\/connections\/\d+$/.test(url.pathname) && request.method() === 'DELETE') {
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      deleteCalls++;
      await new Promise(resolve => setTimeout(resolve, 200));
      if (failDelete) return route.fulfill({ status: 503, json: { message: 'Synthetic failure' } });
      const id = Number(url.pathname.split('/').at(-1));
      connections = connections.map(item => item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item);
      return route.fulfill({ status: 204 });
    }
    throw new Error(`Unexpected API: ${request.method()} ${url.pathname}`);
  });
  await page.goto(`${origin}/tests/browser/ai-connections.html`);
  await page.getByRole('tab', { name: 'How to connect', exact: true }).waitFor();
  assert.equal(listCalls, 0, 'setup guide must not query account connections');
  await page.getByRole('tab', { name: 'My connections', exact: true }).click();
  await page.getByRole('heading', { name: 'Test assistant 1', exact: true }).waitFor();
  const closeAccess = () => page.getByRole('button', { name: 'Close access', exact: true });
  await closeAccess().click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Keep connection', exact: true }).click();
  assert.equal(deleteCalls, 0, 'cancel must preserve connection');
  await closeAccess().click();
  failDelete = true;
  await page.getByRole('dialog').getByRole('button', { name: 'Close access', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').waitFor();
  assert.equal(connections[0].revokedAt, null);
  failDelete = false;
  await page.getByRole('dialog').getByRole('button', { name: 'Close access', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Access closed', { exact: true }).waitFor();
  assert.equal(await closeAccess().count(), 0, 'revoked connection must no longer offer revoke');
  assert.equal(connections.length, 2, 'revocation preserves history');
  assert.equal(deleteCalls, 2, 'only the failed attempt and confirmed retry mutate');
  assert.ok(listCalls >= 2, 'successful revoke reloads server state');
  await page.getByRole('tab', { name: 'Questions to ask', exact: true }).click();
  await page.getByRole('tab', { name: 'My connections', exact: true }).click();
  await page.getByText('Access closed', { exact: true }).waitFor();
  failList = true;
  await page.getByRole('button', { name: 'Refresh connections', exact: true }).click();
  await page.getByRole('alert').waitFor();
  failList = false;
  await page.getByRole('button', { name: 'Refresh connections', exact: true }).click();
  await page.getByRole('alert').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/tests/browser/ai-connections.html?language=es-MX`);
  await page.getByRole('tab', { name: 'Mis conexiones', exact: true }).click();
  await page.getByRole('heading', { name: 'Test assistant 1', exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout must fit viewport');
  await page.screenshot({ path: '/private/tmp/indice-ai-connections-mobile-20260925.png', fullPage: true });
  connections = [];
  await page.getByRole('button', { name: 'Actualizar conexiones', exact: true }).click();
  await page.getByRole('button', { name: 'Crear mi primera conexión', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Cómo conectar', exact: true }).getAttribute('aria-selected'), 'true');
  assert.deepEqual(errors, []);
  console.log('PASS: connections tab, cancellation, CSRF, failed revoke/retry, history, refresh/error recovery, Spanish mobile layout and OAuth guide navigation');
} finally {
  await browser?.close();
  await server.close();
}
