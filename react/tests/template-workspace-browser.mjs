import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5216';
const server = await createServer({ root: resolve(import.meta.dirname, '..'), cacheDir: '/tmp/indice-template-workspace-vite', server: { host: '127.0.0.1', port: 5216, strictPort: true, hmr: false, watch: null }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
const templates = new Map(Array.from({ length: 29 }, (_, i) => [String(i), {
  id: String(i), name: i ? `Plantilla ${String(i).padStart(2, '0')}` : 'Presentación de producto',
  subject: i ? `Asunto ${String(30 - i).padStart(2, '0')}` : 'Presentación de producto',
  previewText: i ? 'Información para el cliente' : 'Presentación de producto',
  bodyText: 'Hola {{name}},\nRevisa nuestra presentación y el archivo adjunto.', version: 1,
  status: i < 27 ? 'ACTIVE' : 'ARCHIVED', updatedAt: new Date(Date.UTC(2026, 9, 23, 12, i)).toISOString(),
  attachments: i ? [] : [{ id: 'file', filename: 'presentacion.txt', sizeBytes: 128, contentType: 'text/plain' }],
}]));
const queries = [], mutations = [], errors = [], unexpected = [];
let canManage = true, failList = false;
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
  if (url.origin !== origin) return route.abort();
  if (!path.startsWith('/api/')) return route.continue();
  const reply = json => route.fulfill({ json });
  if (path === '/api/v1/auth/csrf') return reply({ csrfToken: 'synthetic-csrf' });
  if (method !== 'GET') assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
  if (path === '/api/v1/mailing/templates') {
    if (failList) { failList = false; return route.fulfill({ status: 503, json: { message: 'private provider details' } }); }
    const q = url.searchParams; queries.push(Object.fromEntries(q));
    const page = Number(q.get('page')), size = Number(q.get('pageSize')), search = q.get('search').toLowerCase(), status = q.get('status'), sort = q.get('sort');
    const values = [...templates.values()].filter(t => (status === 'ALL' || t.status === status) && `${t.name} ${t.subject}`.toLowerCase().includes(search));
    values.sort((a, b) => String(a[sort]).localeCompare(String(b[sort])) * (q.get('direction') === 'asc' ? 1 : -1));
    return reply({ items: values.slice((page - 1) * size, page * size), total: values.length, page, pageSize: size, canManage });
  }
  if (/^\/api\/v1\/mailing\/templates\/[^/]+$/.test(path) && method === 'GET') return reply(templates.get(path.split('/').at(-1)));
  if (/^\/api\/v1\/mailing\/templates\/[^/]+\/status$/.test(path) && method === 'POST') {
    assert.ok(canManage); const value = templates.get(path.split('/').at(-2)), input = request.postDataJSON();
    assert.equal(input.version, value.version); mutations.push(input); Object.assign(value, { status: input.status, version: value.version + 1 }); return reply(value);
  }
  unexpected.push(`${method} ${path}`); return route.fulfill({ status: 500, json: {} });
});
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
const button = name => page.getByRole('button', { name, exact: true });
const row = name => page.getByRole('row').filter({ hasText: name });
const listReady = () => page.getByRole('table').waitFor();
const choose = async (label, option) => { await page.getByRole('combobox', { name: label, exact: true }).click(); await page.getByRole('option', { name: option, exact: true }).click(); await listReady(); };
const checkBounds = async () => {
  await page.waitForFunction(() => {
    const box = document.querySelector('[role=dialog]')?.getBoundingClientRect();
    return box && box.x >= -1 && box.y >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1;
  }, undefined, { timeout: 5000 });
  const result = await page.evaluate(() => {
    const dialog = document.querySelector('[role=dialog]'), box = dialog.getBoundingClientRect();
    return { width: box.width, height: box.height, bounded: box.x >= -1 && box.y >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
      overflow: document.documentElement.scrollWidth > innerWidth,
      tableOverflow: [...dialog.querySelectorAll('[data-slot=table-container]')].some(el => el.clientWidth && el.scrollWidth > el.clientWidth + 1) };
  });
  assert.ok(result.bounded); assert.equal(result.overflow, false); assert.equal(result.tableOverflow, false); return result;
};
try {
  await mkdir('/tmp/indice-template-workspace-review', { recursive: true });
  await page.goto(origin + '/tests/browser/mail-template.html?tone=blue'); await listReady();
  await page.getByRole('link', { name: 'Siguiente', exact: true }).click(); await row('Presentación de producto').waitFor();
  assert.equal(queries.at(-1).page, '2');
  for (const [option, sort, direction] of [['Nombre de plantilla · A–Z', 'name', 'asc'], ['Nombre de plantilla · Z–A', 'name', 'desc'], ['Asunto · A–Z', 'subject', 'asc'], ['Asunto · Z–A', 'subject', 'desc'], ['Más antiguas', 'updatedAt', 'asc'], ['Más recientes', 'updatedAt', 'desc']]) {
    await choose('Ordenar por', option); await page.waitForFunction(() => !document.body.innerText.includes('Cargando…'));
    assert.equal(queries.at(-1).sort, sort); assert.equal(queries.at(-1).direction, direction); assert.equal(queries.at(-1).page, '1');
  }
  await choose('Filas por página', '10'); await listReady();
  assert.equal(queries.at(-1).pageSize, '10');
  await page.getByLabel('Buscar', { exact: true }).fill('Presentación de producto'); await row('Presentación de producto').waitFor();
  assert.equal(queries.at(-1).search, 'Presentación de producto');
  await row('Presentación de producto').getByRole('button').click();
  await button('Editar').waitFor();
  await page.getByText('Hola Cliente de ejemplo,', { exact: false }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Presentación de producto', exact: true }).count(), 1);
  const attachment = page.getByRole('region', { name: 'Adjuntos', exact: true });
  assert.equal(await attachment.getByRole('link', { name: 'Descargar' }).getAttribute('href'), '/api/v1/mailing/template-files/file/download');
  await page.waitForTimeout(250); const desktop = await checkBounds(); assert.ok(desktop.width <= 1180); assert.ok(desktop.height < 850);
  console.log('Desktop dimensions:', JSON.stringify(desktop));
  await page.screenshot({ path: '/tmp/indice-template-workspace-review/desktop-blue.png', animations: 'disabled' });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await checkBounds();
  await page.screenshot({ path: '/tmp/indice-template-workspace-review/desktop-dark.png', animations: 'disabled' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await button('Archivar').click(); assert.equal(await page.getByRole('dialog').count(), 1); await page.locator('[data-slot=dialog-footer]').getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(mutations.length, 0);
  await button('Archivar').click(); await button('Archivar').click(); await page.getByText('Plantilla archivada.', { exact: true }).waitFor(); assert.equal(mutations.at(-1).status, 'ARCHIVED');
  await choose('Estado', 'Archivadas'); await row('Presentación de producto').waitFor(); await button('Restaurar').click(); await page.getByText('Plantilla restaurada.', { exact: true }).waitFor(); assert.equal(mutations.at(-1).status, 'ACTIVE');
  await choose('Estado', 'Activas'); await row('Presentación de producto').waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); await checkBounds();
  await button('Volver a plantillas').click();
  assert.equal(await page.getByLabel('Buscar', { exact: true }).inputValue(), 'Presentación de producto');
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-template-id') === '0');
  await row('Presentación de producto').getByRole('button').press('Enter'); await button('Editar').waitFor();
  assert.equal(await page.getByLabel('Buscar', { exact: true }).isVisible(), false); await checkBounds();
  await page.screenshot({ path: '/tmp/indice-template-workspace-review/mobile-preview.png', animations: 'disabled' });
  await button('Volver a plantillas').click(); await checkBounds();
  await page.screenshot({ path: '/tmp/indice-template-workspace-review/mobile-list.png', animations: 'disabled' });
  await page.setViewportSize({ width: 320, height: 568 }); await checkBounds();
  await page.setViewportSize({ width: 780, height: 440 }); await checkBounds();
  await page.setViewportSize({ width: 1440, height: 1000 }); canManage = false; failList = true;
  await page.reload(); await page.getByRole('alert').waitFor(); assert.equal(await page.getByText('private provider details').count(), 0);
  await button('Reintentar').click(); await listReady();
  assert.equal(await button('Nueva plantilla').count(), 0);
  await page.getByLabel('Buscar', { exact: true }).fill('Presentación de producto'); await row('Presentación de producto').waitFor();
  await row('Presentación de producto').getByRole('button').click(); await button('Volver a plantillas').waitFor();
  assert.equal(await button('Editar').count(), 0); assert.equal(await button('Archivar').count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('PASS: server paging, all sorts, filters, archive confirmation/restore, attachment link, mobile list/detail/focus, landscape, retry and read-only permissions. Synthetic data only.');
} finally { await browser.close(); await server.close(); }
