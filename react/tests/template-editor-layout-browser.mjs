import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5229';
const server = await createServer({ root: resolve(import.meta.dirname, '..'), cacheDir: '/tmp/indice-template-editor-layout-vite',
  server: { host: '127.0.0.1', port: 5229, strictPort: true, hmr: false, watch: null }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { try { localStorage.setItem('frontend-indice-language', 'es-MX'); } catch {} });
const paragraphs = Array.from({ length: 18 }, (_, i) => `Punto ${i+1}. Esta presentación de ejemplo permite revisar contenido largo, imágenes y documentos sin utilizar información de clientes.`);
let template = { id: '00000000-0000-4000-8000-000000000001', name: 'Presentación de prueba', subject: 'Nuestra propuesta de servicios', previewText: 'Una introducción breve para tus clientes',
  bodyText: paragraphs.join('\n\n'), bodyHtml: paragraphs.map(p => `<p>${p}</p>`).join(''), version: 1, status: 'ACTIVE', updatedAt: new Date().toISOString(),
  attachments: [{ id: 'synthetic-file', filename: 'Presentación de ejemplo.png', contentType: 'image/png', sizeBytes: 1855488 }], };
const mutations = [], errors = [], unexpected = [];
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname;
  if (url.origin !== origin) { unexpected.push('external request'); return route.abort(); }
  if (!path.startsWith('/api/')) return route.continue();
  if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
  if (path === '/api/v1/mailing/templates') return route.fulfill({ json: { items: [{ ...template, bodyText: '', bodyHtml: null }], total: 1, page: 1, pageSize: 25, canManage: true } });
  if (path === '/api/v1/mailing/templates/' + template.id) {
    if (request.method() === 'PUT') {
      const input = request.postDataJSON(); mutations.push(input);
      template = { ...template, ...input, version: input.version + 1 };
    }
    return route.fulfill({ json: template });
  }
  unexpected.push(request.method() + ' ' + path); return route.fulfill({ status: 500, json: {} });
});
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
const button = name => page.getByRole('button', { name, exact: true });
const editor = () => page.getByRole('textbox', { name: 'Mensaje', exact: true });
const geometry = () => page.evaluate(() => {
  const dialog = document.querySelector('[role=dialog]');
  const header = dialog.querySelector('[data-slot=dialog-header]');
  const footer = dialog.querySelector('[data-slot=dialog-footer]');
  const body = dialog.querySelector('[data-slot=indice-modal-body]');
  const rect = el => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height, left: b.left, right: b.right }; };
  return { dialog: rect(dialog), header: rect(header), footer: rect(footer), body: rect(body), scrollTop: dialog.scrollTop,
    bodyScrollTop: body.scrollTop, bodyScrollHeight: body.scrollHeight, bodyHeight: body.clientHeight,
    dialogScrollHeight: dialog.scrollHeight, dialogHeight: dialog.clientHeight, display: getComputedStyle(dialog).display,
    overflow: getComputedStyle(dialog).overflow, bodyOverflow: getComputedStyle(body).overflow,
    pageOverflow: document.documentElement.scrollWidth > innerWidth, viewport: { width: innerWidth, height: innerHeight } };
});
const verifyFrame = async label => {
  const g = await geometry(); console.log(label, JSON.stringify(g));
  assert.ok(g.header.top >= g.dialog.top - 1, 'The title stays inside the modal after editing/scrolling');
  assert.ok(Math.abs(g.dialog.bottom - g.footer.bottom) <= 2, 'No blank space below the modal actions');
  assert.equal(g.scrollTop, 0, 'Only the designated body may scroll');
  assert.ok(g.dialog.top >= -1 && g.dialog.bottom <= g.viewport.height + 1 && g.dialog.left >= -1 && g.dialog.right <= g.viewport.width + 1);
  assert.equal(g.pageOverflow, false);
};
try {
  await mkdir('/tmp/indice-template-editor-layout-review', { recursive: true });
  await page.goto(origin + '/tests/browser/mail-template.html?tone=blue');
  await page.getByRole('row').filter({ hasText: template.name }).getByRole('button').click();
  await button('Editar').click(); await editor().waitFor();
  await page.waitForTimeout(250);
  await verifyFrame('desktop initial');
  assert.equal(await page.locator('details[open]').count(), 0, 'The editing form does not duplicate the message preview by default');
  const tops = await page.getByLabel('Nombre de plantilla', { exact: true }).evaluate(node => [node.getBoundingClientRect().top, document.querySelector('input[maxlength="240"]').getBoundingClientRect().top]);
  assert.ok(Math.abs(tops[0] - tops[1]) < 2, 'Template name and subject share a compact desktop row');
  await editor().focus(); await editor().press('ControlOrMeta+End'); await page.keyboard.type(' Texto adicional.');
  await button('Guardar plantilla').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/indice-template-editor-layout-review/desktop-end.png', animations: 'disabled' });
  await verifyFrame('desktop after edit');
  await page.getByRole('region', { name: 'Adjuntos', exact: true }).evaluate(node => node.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: '/tmp/indice-template-editor-layout-review/desktop-attachment.png', animations: 'disabled' });
  await verifyFrame('desktop attachment focused');
  const preview = page.locator('details').filter({ has: page.locator('summary') });
  await preview.locator('summary').click();
  await preview.locator('iframe').waitFor({ state: 'visible' });
  assert.ok(!(await preview.locator('iframe').getAttribute('sandbox')).includes('allow-same-origin'));
  await preview.locator('iframe').evaluate(node => node.scrollIntoView({ block: 'center' }));
  await verifyFrame('expanded preview');
  await preview.locator('summary').click();
  for (const [width, height] of [[390, 844], [320, 568], [780, 440], [1586, 1568]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await page.waitForFunction(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.x >= -1 && r.y >= -1 && r.right <= innerWidth+1 && r.bottom <= innerHeight+1; });
    await page.getByRole('region', { name: 'Adjuntos', exact: true }).evaluate(node => node.scrollIntoView({ block: 'center' }));
    await verifyFrame(`${width}x${height} attachment`);
    await button('Guardar plantilla').focus();
    await page.getByLabel('Nombre de plantilla', { exact: true }).focus();
    await verifyFrame(`${width}x${height} field focus`);
    if(width<768)assert.ok((await geometry()).footer.height <= 80, 'Back and Save stay on one compact phone row');
    assert.ok((await geometry()).bodyScrollTop < 10, 'Returning to the first field scrolls the body back to the start');
    await page.screenshot({ path: `/tmp/indice-template-editor-layout-review/editor-${width}.png`, animations: 'disabled' });
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/indice-template-editor-layout-review/editor-dark.png', animations: 'disabled' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  assert.equal(mutations.length, 0);
  const textBeforeSave = await editor().innerText();
  await page.locator('[data-slot=dialog-footer]').getByRole('button', { name: 'Atrás', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  assert.equal(await page.getByRole('dialog').getAttribute('data-indice-modal'), 'confirmation');
  await button('Seguir editando').click();
  assert.equal(await editor().innerText(), textBeforeSave);
  await page.getByText('Presentación de ejemplo.png', { exact: false }).waitFor();
  await verifyFrame('discard cancelled');
  await button('Guardar plantilla').click(); await page.getByText('Plantilla guardada', { exact: false }).waitFor();
  assert.equal(mutations.length, 1); assert.equal(mutations[0].bodyText, textBeforeSave);
  assert.deepEqual(mutations[0].attachmentIds, ['synthetic-file']);
  await button('Nueva plantilla').click(); await editor().waitFor(); await page.waitForTimeout(250);
  await verifyFrame('empty template');
  assert.ok((await geometry()).dialog.height < 1200, 'Short forms follow content instead of reserving a full viewport');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('PASS: long template, native focus scrolling, stable frame, collapsed safe preview, mobile/landscape, dark, unchanged save/attachments and content-sized new form.');
} finally { await browser.close(); await server.close(); }
