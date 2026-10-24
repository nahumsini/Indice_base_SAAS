import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5230';
const server = await createServer({ root: resolve(import.meta.dirname, '..'), cacheDir: '/tmp/indice-template-file-errors-vite',
  server: { host: '127.0.0.1', port: 5230, strictPort: true, hmr: false, watch: null }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { try { localStorage.setItem('frontend-indice-language', 'es-MX'); } catch {} });
const uploads = [], transfers = [], registrations = [], saves = [], errors = [], unexpected = [], assets = new Map();
let template, releaseRegistration, temporarilyUnavailable = true;
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname;
  if (url.origin !== origin) { unexpected.push('external'); return route.abort(); }
  if (path.startsWith('/synthetic-upload/')) {
    transfers.push(path.split('/').at(-1)); return route.fulfill({ status: 200, body: '' });
  }
  if (!path.startsWith('/api/')) return route.continue();
  if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
  if (request.method() !== 'GET') assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
  if (path === '/api/v1/mailing/templates') return route.fulfill({ json: { items: template ? [template] : [], total: template ? 1 : 0, page: 1, pageSize: 25, canManage: true } });
  if (path === '/api/v1/mailing/template-files/upload') {
    const input = request.postDataJSON(); uploads.push(input); assets.set(input.requestId, { id: input.requestId, ...input });
    return route.fulfill({ json: { id: input.requestId, url: origin + '/synthetic-upload/' + input.requestId, headers: { 'Content-Type': input.contentType, 'Content-Length': String(input.sizeBytes) } } });
  }
  if (/^\/api\/v1\/mailing\/template-files\/[^/]+\/register$/.test(path)) {
    const id = path.split('/').at(-2), asset = assets.get(id); registrations.push(id);
    await new Promise(resolve => { releaseRegistration = resolve; });
    releaseRegistration = undefined;
    if (asset.filename === 'active.pdf') return route.fulfill({ status: 422, json: { code: 'email_pdf_active' } });
    if (temporarilyUnavailable) { temporarilyUnavailable = false; return route.fulfill({ status: 503, json: { code: 'email_storage_unavailable' } }); }
    const prepared = { ...asset, sizeBytes: 1300 }; assets.set(id, prepared);
    return route.fulfill({ json: prepared });
  }
  if (/^\/api\/v1\/mailing\/templates\/[^/]+$/.test(path)) {
    if (request.method() === 'PUT') { const input = request.postDataJSON(); saves.push(input); template = { ...input, id: path.split('/').at(-1), version: 1, status: 'ACTIVE', updatedAt: new Date().toISOString(), attachments: input.attachmentIds.map(id => assets.get(id)) }; }
    return route.fulfill({ json: template });
  }
  unexpected.push(request.method() + ' ' + path); return route.fulfill({ status: 500, json: {} });
});
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
const button = name => page.getByRole('button', { name, exact: true });
const input = () => page.locator('input[type="file"][accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx"]');
const editor = () => page.getByRole('textbox', { name: 'Mensaje', exact: true });
const pdf = name => ({ name, mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(462991, 32)]) });
const waitVerification = async () => {
  await page.getByRole('status').filter({ hasText: 'Verificando adjunto' }).waitFor();
  assert.equal(await button('Guardar plantilla').isDisabled(), true);
  assert.equal(await input().isDisabled(), true);
  assert.equal(typeof releaseRegistration, 'function');
};
try {
  await mkdir('/tmp/indice-template-file-errors-review', { recursive: true });
  await page.goto(origin + '/tests/browser/mail-template.html?tone=blue');
  await button('Nueva plantilla').click();
  await page.getByLabel('Nombre de plantilla', { exact: true }).fill('Presentación sintética');
  await page.getByLabel('Asunto', { exact: true }).fill('Información de nuestros servicios');
  const text = 'Hola, {{name}}. Este mensaje debe conservarse al rechazar o reintentar un adjunto.';
  await editor().fill(text);
  await input().setInputFiles(pdf('active.pdf')); await waitVerification(); releaseRegistration();
  const alert = page.getByRole('alert');
  await alert.filter({ hasText: 'acciones automáticas no admitidas' }).waitFor();
  assert.equal(await button('Reintentar adjunto').count(), 0, 'Unsupported content requires a new copy rather than a futile retry');
  assert.equal(await editor().innerText(), text);
  assert.equal(await button('Guardar plantilla').isEnabled(), true);
  assert.equal(await input().isEnabled(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await alert.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/indice-template-file-errors-review/pdf-error-mobile.png', animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const frame = await page.locator('[role=dialog]').evaluate(node => {
    const dialog = node.getBoundingClientRect(), header = node.querySelector('[data-slot=dialog-header]').getBoundingClientRect(), footer = node.querySelector('[data-slot=dialog-footer]').getBoundingClientRect();
    return { top: dialog.top, bottom: dialog.bottom, header: header.top, footer: footer.bottom, scroll: node.scrollTop };
  });
  assert.equal(frame.scroll, 0); assert.ok(frame.header >= frame.top); assert.ok(Math.abs(frame.footer - frame.bottom) <= 2);
  await input().setInputFiles(pdf('embedded.pdf')); await waitVerification(); releaseRegistration();
  await alert.filter({ hasText: 'almacenamiento de adjuntos no está disponible' }).waitFor();
  assert.equal(await editor().innerText(), text);
  await button('Reintentar adjunto').click(); await waitVerification(); releaseRegistration();
  await page.getByText('embedded.pdf', { exact: false }).waitFor();
  await page.getByText('2 KB', { exact: true }).waitFor();
  assert.equal(await alert.count(), 0);
  assert.equal(uploads.length, 2); assert.equal(transfers.length, 2);
  assert.deepEqual(registrations, [uploads[0].requestId, uploads[1].requestId, uploads[1].requestId], 'Registration retry reuses identity and does not upload again');
  assert.equal(uploads[1].sizeBytes, 463000);
  assert.equal(uploads[1].filename, 'embedded.pdf', 'The user selects the original PDF, not a manually exported copy');
  await button('Guardar plantilla').click(); await page.getByText('Plantilla guardada', { exact: false }).waitFor();
  assert.equal(saves.length, 1); assert.equal(saves[0].bodyText, text);
  assert.deepEqual(saves[0].attachmentIds, [uploads[1].requestId], 'Only the verified copy is saved');
  await page.reload();
  await page.getByRole('row').filter({ hasText: 'Presentación sintética' }).getByRole('button').click();
  await button('Editar').click(); await page.getByText('embedded.pdf', { exact: false }).waitFor();
  assert.equal(await editor().innerText(), text);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('PASS: active PDF rejection, original embedded PDF selected, prepared size displayed, stable mobile frame, preserved content, verification guard, retry without repeat transfer, saved/reloaded; no real email/storage/DB.');
} finally { releaseRegistration?.(); await browser.close(); await server.close(); }
