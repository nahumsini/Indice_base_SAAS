import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5194, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser, page;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
  const errors = [], unexpected = [], requests = [];
  let failPage = false, deny = false, detailFails = false, historyRequests = 0, holdSlow;
  const account = (id, name, country, extra = {}) => ({ id, name, country_code: country, user_type: 'SUPER_ADMIN', platform_status: 'ACTIVE', lifecycle_state: 'ACTIVE', billing_status: 'active', owner_email: `owner${id}@example.test`, product_names: ['Operaciones'], catalog_version: '2026.1', currency: 'CAD', ...extra });
  const accounts = [account(1, 'México Cliente', 'MX'), account(2, 'Canadá Cliente', 'CA', { billing_status: 'past_due' }), account(3, 'Sin país', null), account(4, 'Canadá Adicional', 'CA')];
  const pagination = (p, total = 4) => ({ page: p, page_size: 3, total_items: total, total_pages: total > 3 ? 2 : 1 });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== 'http://127.0.0.1:5194') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = data => route.fulfill({ json: data });
    if (url.pathname === '/api/v1/auth/me') return reply({ user: { id: 1, role: 'ROOT' }, company: { id: 1, role: 'ROOT', active: true } });
    if (url.pathname.startsWith('/api/v1/workspace-state/')) {
      if (req.method() === 'PUT') assert.equal(req.headers()['x-csrf-token'], 'synthetic-csrf');
      return reply({ state: {}, schemaVersion: 1 });
    }
    assert.equal(req.method(), 'GET', 'Commercial records must not be mutated');
    if (url.pathname === '/api/v1/platform-admin/overview') {
      const q = url.searchParams.get('q'), p = Number(url.searchParams.get('page'));
      requests.push({ q, p });
      assert.equal(url.searchParams.get('userType'), 'SUPER_ADMIN');
      assert.equal(url.searchParams.get('pageSize'), '50');
      if (deny) return route.fulfill({ status: 403, json: {} });
      if (failPage && p === 2) { failPage = false; return route.fulfill({ status: 503, json: {} }); }
      if (q === 'slow') await new Promise(resolve => { holdSlow = resolve; });
      const filtered = q ? accounts.filter(c => c.name.toLowerCase().includes(q.toLowerCase())) : p === 1 ? accounts.slice(0, 3) : accounts.slice(2);
      return reply({ companies: filtered, pagination: pagination(p, q ? filtered.length : 4) });
    }
    if (/\/companies\/\d+\/history$/.test(url.pathname)) {
      historyRequests++;
      return reply({ company_id: 2, events: [{ id: '1', source: 'PLATFORM', action: 'COMPANY_USER_INVITED', outcome: 'SUCCESS', actor_name: 'Operador de prueba', reason: 'Seguimiento de prueba', occurred_at: '2026-10-05T12:00:00Z' }], pagination: pagination(1, 1) });
    }
    const match = url.pathname.match(/\/companies\/(\d+)$/);
    if (match) {
      if (detailFails) return route.fulfill({ status: 503, json: {} });
      return reply(accounts.find(c => c.id === Number(match[1])));
    }
    unexpected.push(`${req.method()} ${url.pathname}`);
    return route.fulfill({ status: 500, json: {} });
  });
  await page.goto('http://127.0.0.1:5194/tests/browser/commercial-operations.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  const workspace = page.getByTestId('commercial-operations');
  await workspace.getByText(/Clientes cargados: 3 \/ 4/).waitFor();
  const table = workspace.getByRole('table');
  assert.equal(await table.getByRole('row').count(), 3);
  await workspace.getByRole('tab', { name: 'México', exact: true }).click();
  await workspace.getByRole('listitem').filter({ hasText: 'Prueba guiada' }).waitFor();
  assert.equal(await table.getByRole('row').count(), 2);
  await workspace.getByRole('tab', { name: 'Canadá', exact: true }).click();
  await workspace.getByRole('listitem').filter({ hasText: 'Prueba autogestionada' }).waitFor();
  assert.equal(await workspace.getByText('Prueba guiada', { exact: true }).count(), 0);
  failPage = true;
  await workspace.getByRole('button', { name: 'Cargar más clientes' }).click();
  await workspace.getByRole('alert').waitFor();
  assert.equal(await table.getByRole('row').count(), 2);
  await workspace.getByRole('alert').getByRole('button', { name: 'Actualizar' }).click();
  await workspace.getByText(/Clientes cargados: 4 \/ 4/).waitFor();
  assert.equal(await table.getByRole('row').count(), 3);
  console.log('PASS: real API pagination, market separation, partial coverage, retry without duplicates');
  detailFails = true;
  await table.getByRole('row').filter({ hasText: 'Canadá Cliente' }).getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('alert').waitFor();
  detailFails = false;
  await dialog.getByRole('button', { name: 'Actualizar' }).click();
  await dialog.getByText('owner2@example.test', { exact: true }).waitFor();
  await dialog.getByRole('tab', { name: 'Historial', exact: true }).click();
  await dialog.getByText(/Seguimiento de prueba/).waitFor();
  assert.ok(historyRequests >= 1 && historyRequests <= 2, 'History loads on mount, including StrictMode effect replay');
  await dialog.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await dialog.getByRole('button', { name: 'Facturación', exact: true }).click();
  await page.getByTestId('destination').filter({ hasText: '2:billing' }).waitFor();
  assert.equal(await dialog.count(), 0);
  for (const [label, destination] of [['Centro de atención', 'care:Canadá Cliente'], ['Consultorías', 'consulting:Canadá Cliente']]) {
    await table.getByRole('row').filter({ hasText: 'Canadá Cliente' }).getByRole('button').click();
    await dialog.getByRole('button', { name: label, exact: true }).click();
    await page.getByTestId('destination').filter({ hasText: destination }).waitFor();
    assert.equal(await dialog.count(), 0);
  }
  console.log('PASS: detail retry, account history, contextual links, modal closes before handoff');
  await page.setViewportSize({ width: 390, height: 844 });
  await workspace.getByRole('button', { name: 'Abrir seguimiento', exact: true }).filter({ visible: true }).first().click();
  await dialog.getByText('owner2@example.test', { exact: true }).waitFor();
  const bounds = await dialog.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391 && bounds.y >= 0 && bounds.y + bounds.height <= 845);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  console.log('PASS: mobile cards, bounded modal, Escape and no page overflow');
  const search = workspace.getByRole('searchbox', { name: 'Buscar cliente', exact: true });
  await search.fill('slow');
  await page.waitForRequest(r => r.url().includes('q=slow'));
  await search.fill('Canadá');
  await workspace.getByText(/Clientes cargados: 2 \/ 2/).waitFor();
  holdSlow();
  await page.waitForTimeout(200);
  await workspace.getByText(/Clientes cargados: 2 \/ 2/).waitFor();
  assert.equal(await workspace.getByText('No hay coincidencias en los clientes cargados.').count(), 0);
  deny = true;
  await workspace.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await workspace.getByText('Tu acceso a esta información ya no está disponible.', { exact: true }).waitFor();
  assert.equal(await workspace.getByRole('button', { name: 'Abrir seguimiento', exact: true }).count(), 0);
  assert.equal(await workspace.getByText(/Clientes cargados:/).count(), 0);
  assert.equal(await workspace.getByText('No hay coincidencias en los clientes cargados.').count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log('PASS: stale search response ignored; revoked access clears data without a false empty result');
} catch (error) {
  console.error((await page?.locator('body').innerText())?.slice(0, 4500));
  throw error;
} finally { await browser?.close(); await server.close(); }
