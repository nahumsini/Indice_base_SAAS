import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const origin = 'http://127.0.0.1:5219';
const server = await createServer({ root, configFile: false,
  cacheDir: '/tmp/indice-inline-image-vite', plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  server: { host: '127.0.0.1', port: 5219, strictPort: true, hmr: false, watch: null },
});
await server.listen();
const browser = await chromium.launch({ headless: true,
  ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { try { localStorage.setItem('frontend-indice-language', 'es-MX'); } catch { /* Sandboxed mail previews have no storage access. */ } });
const drafts = new Map(), templates = new Map(), errors = [], unexpected = [];
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname;
  if (url.origin !== origin) { unexpected.push('external request'); return route.abort(); }
  if (!path.startsWith('/api/')) return route.continue();
  assert.ok(!/\/(send|launch|test)$/.test(path), 'No real or simulated send is part of insertion');
  if (path.endsWith('/preferences')) return route.fulfill({ json: { backgroundEnabled: false, signature: '', version: 1 } });
  if (/\/messages\/[^/]+\/attachments$/.test(path) && request.method() === 'GET') return route.fulfill({ json: [] });
  if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
  if (path === '/api/v1/mailing/audience') return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 10 } });
  if (path === '/api/v1/mailing/templates') return route.fulfill({ json: { items: [...templates.values()], total: templates.size, page: 1, pageSize: 25, canManage: true } });
  if (/^\/api\/v1\/mailing\/templates\/[^/]+$/.test(path)) {
    const id = path.split('/').at(-1);
    if (request.method() === 'PUT') {
      const input = request.postDataJSON();
      templates.set(id, { ...input, id, version: input.version + 1, status: 'ACTIVE', updatedAt: new Date().toISOString(), attachments: [] });
    }
    return route.fulfill({ json: templates.get(id) });
  }
  if (path.includes('/drafts/') && request.method() === 'PUT') {
    const input = request.postDataJSON(), id = path.split('/').at(-1);
    assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
    const value = { ...input, id, state: 'DRAFT', version: input.version + 1, hasAttachments: false };
    drafts.set(id, value); return route.fulfill({ json: value });
  }
  if (/\/messages\/[^/]+$/.test(path)) return route.fulfill({ json: drafts.get(path.split('/').at(-1)) });
  unexpected.push(request.method() + ' ' + path); return route.fulfill({ status: 500, json: {} });
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const body = page.getByRole('textbox', { name: 'Mensaje', exact: true });
const picker = () => page.getByRole('button', { name: 'Insertar imagen', exact: true });
const choose = async (name, buffer, mimeType = 'image/png') => {
  const selecting = page.waitForEvent('filechooser'); await picker().click();
  await (await selecting).setFiles({ name, mimeType, buffer });
};
const images = () => body.locator('img');
try {
  await mkdir('/tmp/indice-inline-image-review', { recursive: true });
  await page.goto(origin + '/tests/browser/mail-template.html?mode=email');
  await body.fill('Inicio Fin');
  await body.evaluate(node => {
    const range = document.createRange(); range.setStart(node.firstChild, 7); range.collapse(true);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  const logo = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#2563eb'; ctx.fillRect(20, 20, 200, 50);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  await page.evaluate(() => {
    window.originalImageDecode = Image.prototype.decode;
    Image.prototype.decode = async function () {
      await new Promise(resolve => setTimeout(resolve, 500)); return window.originalImageDecode.call(this);
    };
  });
  await choose('logo.png', logo);
  await page.waitForFunction(() => document.querySelector('.indice-mail-editor')?.getAttribute('aria-busy') === 'true');
  assert.equal(await page.getByRole('button', { name: 'Guardar borrador', exact: true }).isDisabled(), true);
  await page.waitForFunction(() => document.querySelector('[role=textbox][aria-label=Mensaje] img'), { }, { timeout: 5000 });
  await page.evaluate(() => { Image.prototype.decode = window.originalImageDecode; delete window.originalImageDecode; });
  assert.equal(await images().count(), 1, 'Selecting a valid PNG must insert it into the actual composer');
  assert.ok(await body.evaluate(node => /Inicio[\s\S]*<img[\s\S]*Fin/.test(node.innerHTML)), 'The image must use the saved caret');
  assert.equal(await body.getAttribute('contenteditable'), 'true');
  assert.equal(await picker().isEnabled(), true, 'Preparation must release the owner busy state');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  assert.equal(await images().count(), 0, 'Image insertion participates in native undo');
  await page.getByRole('button', { name: 'Rehacer', exact: true }).click();
  assert.equal(await images().count(), 1, 'Native redo restores the image');

  // A valid detailed PNG exceeds the encoded inline budget at 640px. Optimize it instead of rejecting it.
  const detailed = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 640;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(640, 640); let seed = 42;
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let c = 0; c < 3; c++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; pixels.data[i+c] = seed >>> 24; }
      pixels.data[i+3] = 180;
    }
    ctx.putImageData(pixels, 0, 0); return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  assert.ok(detailed.length > 102400 && detailed.length < 5 * 1024 * 1024);
  await choose('detailed.png', detailed);
  await page.waitForFunction(() => document.querySelectorAll('[role=textbox][aria-label=Mensaje] img').length === 2);
  assert.ok(await images().nth(1).evaluate(async node => {
    await node.decode(); const canvas = document.createElement('canvas'); canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(node, 0, 0); return ctx.getImageData(0, 0, 1, 1).data[3] < 255;
  }), 'PNG optimization must preserve transparency');
  await choose('fake.png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
  await page.getByRole('alert').filter({ hasText: 'Usa PNG o JPG' }).waitFor();
  assert.equal(await images().count(), 2, 'Rejected input retains the existing message and images');
  await choose('logo-again.png', logo, '');
  await page.waitForFunction(() => document.querySelectorAll('[role=textbox][aria-label=Mensaje] img').length === 3);
  await choose('fourth.png', logo);
  await page.getByRole('alert').filter({ hasText: 'Hasta tres imágenes' }).waitFor();
  assert.equal(await images().count(), 3);
  for (const src of await images().evaluateAll(nodes => nodes.map(n => n.getAttribute('src')))) {
    assert.match(src, /^data:image\/(png|jpeg);base64,/); assert.ok(Buffer.from(src.split(',')[1], 'base64').length <= 102400);
  }
  for (const width of [390, 320, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 1000 });
    await picker().scrollIntoViewIfNeeded();
    const visible = await picker().evaluate(node => {
      const a = node.getBoundingClientRect(), b = node.closest('.indice-mail-editor').getBoundingClientRect();
      return a.left >= b.left && a.right <= b.right + 1 && a.width >= 44 && a.height >= 44;
    });
    assert.ok(visible, 'Image action stays visible without horizontally scrolling the format toolbar');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/indice-inline-image-review/editor-${width}.png`, animations: 'disabled' });
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/indice-inline-image-review/editor-dark.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await page.getByText('done', { exact: true }).waitFor();
  assert.equal(drafts.size, 1); assert.equal([...drafts.values()][0].bodyHtml.match(/<img /g).length, 3);
  assert.ok([...drafts.values()][0].bodyText.includes('Inicio'));

  await page.goto(origin + '/tests/browser/mail-template.html');
  await page.getByRole('button', { name: 'Nueva plantilla', exact: true }).click();
  await page.getByLabel('Nombre de plantilla', { exact: true }).fill('Plantilla con imagen');
  await page.getByLabel('Asunto', { exact: true }).fill('Presentación con logotipo');
  await body.fill('Presentación de prueba');
  const photo = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#2563eb'; ctx.fillRect(20, 20, 200, 50);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  }), 'base64');
  await choose('photo.jpg', photo, 'image/jpeg');
  await page.waitForFunction(() => document.querySelector('[role=textbox][aria-label=Mensaje] img'));
  await page.getByRole('button', { name: 'Guardar plantilla', exact: true }).click();
  await page.getByText('Plantilla guardada', { exact: false }).waitFor();
  assert.equal([...templates.values()][0].bodyHtml.match(/<img /g).length, 1);
  await page.reload();
  await page.getByRole('row').filter({ hasText: 'Plantilla con imagen' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  assert.equal(await images().count(), 1, 'Reopening a saved template retains its embedded image');
  await page.locator('.indice-mail-editor').getByText('1 / 3', { exact: true }).waitFor();
  assert.match(await images().first().getAttribute('src'), /^data:image\/jpeg;base64,/);

  // Reproduce the owner's sequence: load a template, add an image, then review.
  const templateId = '00000000-0000-4000-8000-000000000002';
  templates.set(templateId, { id: templateId, name: 'Propuesta con datos pendientes', subject: 'Propuesta para {{empresa}}',
    bodyText: 'Hola {{name}},\nPropuesta para {{empresa}}.',
    bodyHtml: `<p>Hola {{na<strong>me}}</strong>,</p><p>Propuesta para {{empresa}}.</p><img src="data:image/png;base64,${logo.toString('base64')}" alt="Logo">`,
    version: 1, status: 'ACTIVE', updatedAt: new Date().toISOString(), attachments: [] });
  await page.goto(origin + '/tests/browser/mail-template.html?mode=email');
  await page.getByRole('button', { name: 'Plantillas de Ventas', exact: true }).click();
  await page.getByRole('button', { name: /Propuesta con datos pendientes/ }).click();
  await page.getByRole('button', { name: 'Insertar', exact: true }).click();
  await body.filter({ hasText: 'Hola {{name}}' }).waitFor();
  assert.equal(await images().count(), 1, 'Loading a template retains its own inline image');
  await choose('extra.png', logo);
  await page.waitForFunction(() => document.querySelectorAll('[role=textbox][aria-label=Mensaje] img').length === 2);
  assert.equal(await page.getByRole('alert').count(), 0, 'Selecting an image must not invoke send review');
  await page.getByRole('textbox', { name: 'Para', exact: true }).fill('person@example.com');
  await page.getByRole('textbox', { name: 'Para', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Revisar envío', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Completa las variables' }).waitFor();
  assert.equal(await images().count(), 2, 'The placeholder guard must preserve both images');
  const nameField = page.getByLabel('{{name}}', { exact: true });
  await nameField.waitFor({ timeout: 3000 });
  await page.waitForFunction(() => document.activeElement?.closest('label')?.textContent === '{{empresa}}');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('region', { name: 'Completa los datos de la plantilla', exact: true }).scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('dialog').evaluate(node => {
      const frame = node.getBoundingClientRect();
      const header = node.querySelector('[data-slot="dialog-header"]').getBoundingClientRect();
      const footer = node.querySelector('[data-slot="dialog-footer"]').getBoundingClientRect();
      return node.scrollTop === 0 && header.top >= frame.top && Math.abs(footer.bottom - frame.bottom) < 2;
    }), true, 'Native focus/scroll keeps compose header and footer pinned');
    await page.screenshot({ path: `/tmp/indice-inline-image-review/template-fields-${width}.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.getByRole('button', { name: 'Aplicar datos', exact: true }).isDisabled(), true);
  await nameField.fill('Ana & <equipo>');
  assert.equal(await page.getByRole('button', { name: 'Aplicar datos', exact: true }).isDisabled(), true, 'Incomplete values do not erase missing placeholders');
  await page.getByLabel('{{empresa}}', { exact: true }).fill('Empresa de prueba');
  await page.getByRole('button', { name: 'Aplicar datos', exact: true }).click();
  await body.filter({ hasText: 'Hola Ana & <equipo>' }).waitFor();
  assert.equal(await images().count(), 2, 'Completing placeholders must preserve inserted and template images');
  assert.equal(await body.locator('equipo').count(), 0, 'Replacement values are text, never HTML');
  assert.equal(await page.getByRole('alert').count(), 0, 'Resolving the fields clears the stale review error');
  await page.getByRole('button', { name: 'Revisar envío', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar correo', exact: true }).waitFor();
  const completed = [...drafts.values()].at(-1);
  assert.equal(completed.subject, 'Propuesta para Empresa de prueba');
  assert.ok(!/\{\{/.test(completed.bodyText + completed.bodyHtml));
  assert.equal(completed.bodyHtml.match(/<img /g).length, 2);
  assert.ok(completed.bodyHtml.includes('&lt;equipo&gt;'));
  assert.deepEqual(completed.to, ['person@example.com']);
  assert.ok(templates.get(templateId).bodyText.includes('{{name}}'), 'Completing one draft never changes the shared template');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('PASS: native image chooser, caret/undo, PNG optimization, limits/persistence, dark/mobile, imported-template images, actionable placeholder review, escaped field completion and shared-template preservation; no email sent.');
} finally { await browser.close(); await server.close(); }
