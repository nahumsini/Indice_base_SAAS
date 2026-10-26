import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5229';
const server = await createServer({
  root: resolve(import.meta.dirname, '..'), cacheDir: '/tmp/indice-mailing-tuneup-vite',
  server: { host: '127.0.0.1', port: 5229, strictPort: true, hmr: false, watch: null },
});
await server.listen();
const browser = await chromium.launch({ headless: true,
  ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  if (window === window.top) localStorage.setItem('frontend-indice-language', 'es-MX');
});
const unexpected = [], errors = [];
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin !== origin || url.pathname.startsWith('/api/')) {
    unexpected.push(url.origin + url.pathname);
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(60000);
page.on('pageerror', error => errors.push(error.message));
const button = name => page.getByRole('button', { name, exact: true });
const editor = () => page.getByRole('textbox', { name: 'Mensaje', exact: true });
const shots = '/tmp/indice-mailing-tuneup-review';
const content = async () => {
  await button('Continuar').click();
  await button('Continuar').click();
  await editor().waitFor();
};
try {
  await mkdir(shots, { recursive: true });
  await page.goto(origin + '/tests/browser/mailing-tuneup.html');
  await page.locator('input[name="name"]').fill('Campaña sintética');
  await content();
  console.log('PASS content step loaded');
  let pickers = 0;
  page.on('filechooser', () => { pickers++; });
  await editor().click({ position: { x: 20, y: 100 } });
  await editor().fill('Mensaje escrito a mano');
  assert.equal(pickers, 0, 'clicking the writing surface must not open a file picker');
  await page.getByRole('tab', { name: 'Usar plantilla', exact: true }).click();
  assert.equal(await editor().innerText(), 'Mensaje escrito a mano');
  await page.getByRole('tab', { name: 'Escribir desde cero', exact: true }).click();
  assert.equal(await editor().innerText(), 'Mensaje escrito a mano');
  await page.getByRole('tab', { name: 'Usar plantilla', exact: true }).click();
  await page.getByRole('combobox', { name: 'Plantilla', exact: true }).selectOption('synthetic-template');
  await button('Aplicar plantilla').click();
  await page.getByRole('heading', { name: 'Completa los datos de la plantilla' }).waitFor();
  assert.match(await editor().innerText(), /\{\{promotion\}\}/);
  await button('Guardar borrador').click();
  await page.getByText('Campaña sintética guardada', { exact: true }).waitFor();
  await button('Revisar envío de prueba').click();
  assert.ok(await button('Enviar prueba').isDisabled(), 'unresolved custom tokens block tests');
  assert.ok(await button('Revisar envío').isDisabled(), 'unresolved custom tokens block launch');
  await button('Cerrar').first().click();
  await button('Editar borrador de prueba').click();
  await content();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 24;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff6b5e'; ctx.fillRect(0, 0, 32, 24);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const chooser = page.waitForEvent('filechooser');
  await button('Insertar imagen').click();
  await (await chooser).setFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await editor().locator('img').waitFor();
  const imageBefore = await editor().locator('img').getAttribute('src');
  await page.getByLabel('{{promotion}}', { exact: true }).fill('Oferta de prueba');
  await button('Aplicar datos').click();
  assert.match(await editor().innerText(), /Oferta de prueba/);
  assert.match(await editor().innerText(), /\{\{name\}\}/);
  assert.doesNotMatch(await editor().innerText(), /\{\{promotion\}\}/);
  assert.equal(await editor().locator('img').getAttribute('src'), imageBefore);
  await page.screenshot({ path: shots + '/desktop.png', fullPage: true });
  await button('Guardar borrador').click();
  await button('Fallar próxima revisión').click();
  await button('Revisar envío de prueba').click();
  await button('Actualizar').first().click();
  await page.getByRole('heading', { name: 'Envío y resultados', exact: true }).waitFor();
  assert.ok(await button('Enviar prueba').isEnabled());
  await button('Cerrar').first().click();
  await button('Editar borrador de prueba').click();
  await content();
  assert.equal(await editor().locator('img').count(), 1, 'inline image survives save and reopen');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await page.getByRole('tab', { name: 'Usar plantilla', exact: true }).click();
  assert.equal(await editor().locator('img').count(), 1);
  await page.screenshot({ path: shots + '/mobile.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: shots + '/mobile-dark.png', fullPage: true });
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
  console.log('PASS mailing: writing/picker isolation, template choice, unresolved-token draft and delivery guards, inline image insertion, variable resolution preserving image/name token, save/reopen, review retry and mobile/dark. No real mail or business API.');
} catch (error) {
  await page.screenshot({ path: shots + '/failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
  await server.close();
}
