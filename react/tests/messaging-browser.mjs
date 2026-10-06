import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5193, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser;
let page;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = [], unexpected = [], sendKeys = [];
  const conversations = [], messages = [];
  const photos = new Map();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=', 'base64');
  let failUpload = false, uploadCount = 0;
  let company = 1, failSend = false, loseCreateResponse = false, duplicateCreateKey;
  page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message); });
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== 'http://127.0.0.1:5193') return route.abort();
    if (url.pathname.startsWith('/synthetic-storage/')) {
      if (req.method() === 'PUT') {
        uploadCount++;
        assert.equal(req.headers()['x-csrf-token'], undefined);
        if (failUpload) { failUpload = false; return route.fulfill({ status: 503 }); }
        return route.fulfill({ status: 200 });
      }
      return route.fulfill({ contentType: 'image/png', body: png });
    }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = data => route.fulfill({ json: data });
    const operator = url.pathname.includes('platform-admin');
    const path = url.pathname.replace(/^\/api\/v1\/(messaging|platform-admin\/customer-care)/, '');
    if (req.method() !== 'GET') assert.equal(req.headers()['x-csrf-token'], 'synthetic-csrf');
    if (path === '/context') return reply({ userId: company, companyId: company, membershipId: company, distributor: null, supportOnly: false });
    if (path === '/directory') return reply([{ id: 2, name: 'Compañero' }]);
    if (path === '/assignees') return reply([{ id: 9, name: 'Operador' }]);
    if (path === '/summary') return reply({ unassigned: 1, waitingCare: 1, waitingCustomer: 0, resolved: 0, overdue: 0, averageFirstResponseMinutes: null, averageResolutionMinutes: null, pendingNotifications: 0 });
    if (path === '/conversations' && req.method() === 'GET') return reply({ items: conversations.filter(c => operator || c.companyId === company), hasMore: false });
    if (path === '/conversations' && req.method() === 'POST') {
      const body = req.postDataJSON();
      let c = conversations.find(c => c.requestKey === body.requestKey);
      if (!c) {
        c = { id: conversations.length + 1, companyId: company, companyName: 'Empresa de prueba', requesterName: 'Cliente', assignedUserId: null, assigneeName: '',
          status: 'OPEN', priority: 'MEDIUM', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), awaitingSince: new Date().toISOString(), unreadCount: 0, ...body };
        conversations.push(c); messages.push({ id: messages.length + 1, conversationId: c.id, senderUserId: company, senderName: 'Cliente', senderScope: 'MEMBER', visibility: 'PUBLIC', body: body.body, requestKey: body.requestKey, createdAt: c.createdAt });
      } else assert.equal(body.requestKey, duplicateCreateKey);
      if (loseCreateResponse) { loseCreateResponse = false; duplicateCreateKey = body.requestKey; return route.fulfill({ status: 503, json: { message: 'Synthetic lost response' } }); }
      return reply({ conversation: c, messages: { items: messages.filter(m => m.conversationId === c.id), hasMore: false } });
    }
    const match = path.match(/^\/conversations\/(\d+)(.*)$/);
    if (match) {
      const id = Number(match[1]), suffix = match[2], c = conversations.find(c => c.id === id);
      if (!c || (!operator && c.companyId !== company)) return route.fulfill({ status: 404, json: {} });
      if (suffix === '/read') return route.fulfill({ status: 204 });
      if (suffix === '/audit') return reply([]);
      if (suffix === '/attachments') {
        const body = req.postDataJSON();
        const photo = { id: body.requestKey, ...body };
        photos.set(photo.id, photo);
        return reply({ id: photo.id, uploadUrl: `${url.origin}/synthetic-storage/${photo.id}`, uploadHeaders: { 'Content-Type': body.contentType }, expiresAt: new Date(Date.now() + 900000).toISOString() });
      }
      if (suffix.startsWith('/attachments/')) return reply({ url: `${url.origin}/synthetic-storage/${suffix.split('/').pop()}` });
      if (suffix === '' && req.method() === 'GET') return reply({ conversation: c, messages: { items: messages.filter(m => m.conversationId === id && m.id > Number(url.searchParams.get('after') || 0)), hasMore: false } });
      if (suffix === '' && req.method() === 'PATCH') {
        const body = req.postDataJSON();
        if (body.version !== c.version) return route.fulfill({ status: 409, json: {} });
        c.version++;
        if (body.action === 'ASSIGN') c.assignedUserId = body.assigneeUserId;
        if (body.action === 'STATUS') c.status = body.value;
        return route.fulfill({ status: 204 });
      }
      if (suffix === '/messages') {
        const body = req.postDataJSON(); sendKeys.push(body.requestKey);
        let message = messages.find(m => m.requestKey === body.requestKey);
        if (!message) { message = { id: messages.length + 1, conversationId: id, senderUserId: operator ? 9 : company, senderName: operator ? 'Operador' : 'Cliente', senderScope: operator ? 'PLATFORM' : 'MEMBER', ...body, attachments: (body.attachmentIds || []).map(id => photos.get(id)), createdAt: new Date().toISOString() }; messages.push(message); c.version++; }
        if (failSend) { failSend = false; return route.fulfill({ status: 503, json: { message: 'Synthetic lost acknowledgement' } }); }
        return reply(message);
      }
    }
    unexpected.push(`${req.method()} ${url.pathname}`); return route.fulfill({ status: 500, json: {} });
  });
  await page.goto('http://127.0.0.1:5193/tests/browser/messaging.html', { timeout: 120000 });
  await page.getByRole('button', { name: 'Nueva conversación', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: /Mi consultor/ }).count(), 0);
  await page.getByLabel('Asunto', { exact: true }).fill('Consulta Canadá');
  await page.getByLabel('Mensaje', { exact: true }).fill('Necesito ayuda para empezar.');
  loseCreateResponse = true;
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByLabel('Mensaje', { exact: true }).inputValue(), 'Necesito ayuda para empezar.');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.getByRole('log').getByText('Necesito ayuda para empezar.', { exact: true }).waitFor();
  assert.equal(conversations.length, 1);
  const inboxBounds = await page.getByRole('complementary', { name: 'Bandeja', exact: true }).boundingBox();
  const detailBounds = await page.locator('[data-messaging-detail]').boundingBox();
  assert.ok(inboxBounds.x + inboxBounds.width <= detailBounds.x + 1, 'Desktop inbox stays left of the conversation');
  console.log('PASS: support without consultant; creation retries recover one case');
  await page.getByLabel('Mensaje', { exact: true }).fill('<img src=x onerror=alert(1)> Texto seguro');
  failSend = true;
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByLabel('Mensaje', { exact: true }).inputValue(), /Texto seguro/);
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('textarea')?.value === '');
  assert.equal(sendKeys[0], sendKeys[1]);
  assert.equal(await page.getByRole('log').locator('img').count(), 0);
  assert.equal(await page.getByRole('log').getByText('<img src=x onerror=alert(1)> Texto seguro', { exact: true }).count(), 1);
  console.log('PASS: lost send acknowledgement retries without duplicate bubbles; text is escaped');
  const picker = page.locator('input[type=file]');
  await picker.setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await page.getByText('Selecciona hasta 5 fotografías JPG, PNG o WebP de máximo 8 MB.', { exact: true }).waitFor();
  await picker.setInputFiles({ name: 'evidencia.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Quitar fotografía: evidencia.png', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Seguir escribiendo', exact: true }).click();
  failUpload = true;
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.getByText(/No se pudieron enviar las fotografías/).waitFor();
  assert.equal(photos.size, 1);
  failSend = true;
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.getByText(/No se pudieron enviar las fotografías/).waitFor();
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Quitar fotografía: evidencia.png"]'));
  const sentPhoto = page.getByRole('log').getByRole('img', { name: 'evidencia.png', exact: true });
  await sentPhoto.waitFor();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[role=log] img')).every(img => img.complete && img.naturalWidth > 0));
  assert.equal(await sentPhoto.count(), 1);
  assert.equal(uploadCount, 2, 'Retry of a committed send must not upload the photo again');
  assert.equal(photos.size, 1, 'A failed PUT reuses its upload identity');
  assert.equal(messages.filter(m => m.attachments?.length).length, 1);
  await page.getByRole('button', { name: 'Ampliar fotografía: evidencia.png', exact: true }).click();
  await page.getByRole('button', { name: 'Reducir fotografía: evidencia.png', exact: true }).waitFor();
  console.log('PASS: photo selection, unsafe type rejection, draft guard, upload retry, lost acknowledgement, inline image and zoom');
  if (process.env.INDICE_MESSAGING_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.INDICE_MESSAGING_SCREENSHOTS, 'messaging-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.getByRole('button', { name: /Consulta Canadá/ }).click();
  await page.getByRole('log').waitFor();
  assert.equal(await page.getByRole('complementary', { name: 'Bandeja', exact: true }).isVisible(), false);
  const assertComposerVisible = async () => {
    await page.waitForFunction(() => {
      const send = document.querySelector('button[aria-label="Enviar"]')?.getBoundingClientRect();
      return send && send.y >= 0 && send.bottom <= innerHeight;
    });
    const send = await page.getByRole('button', { name: 'Enviar', exact: true }).boundingBox();
    const viewport = page.viewportSize();
    assert.ok(send && send.y >= 0 && send.y + send.height <= viewport.height, 'Send stays inside the viewport');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  };
  await assertComposerVisible();
  await page.setViewportSize({ width: 390, height: 480 });
  await assertComposerVisible();
  if (process.env.INDICE_MESSAGING_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.INDICE_MESSAGING_SCREENSHOTS, 'messaging-mobile.png') });
  await page.getByLabel('Mensaje', { exact: true }).fill('Borrador conservado');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.getByRole('button', { name: 'Seguir escribiendo', exact: true }).click();
  assert.equal(await page.getByLabel('Mensaje', { exact: true }).inputValue(), 'Borrador conservado');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Seguir escribiendo', exact: true }).click();
  assert.equal(await page.getByLabel('Mensaje', { exact: true }).inputValue(), 'Borrador conservado');
  await page.getByLabel('Mensaje', { exact: true }).fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  console.log('PASS: mobile list and conversation navigation without horizontal overflow');
  console.log('PASS: real modal keeps composer visible at reduced height and protects unsent drafts');
  await page.getByRole('button', { name: 'Operator view', exact: true }).click();
  await page.getByRole('button', { name: /Consulta Canadá/ }).click();
  await page.getByRole('button', { name: 'Asignarme', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('select[aria-label="Responsable"]')?.value === '9');
  await page.getByRole('button', { name: 'Resolver', exact: true }).click();
  await page.getByRole('button', { name: 'Reabrir', exact: true }).waitFor();
  assert.equal(conversations[0].status, 'RESOLVED');
  console.log('PASS: operator takes and resolves a customer case');
  await page.getByRole('button', { name: 'Client view', exact: true }).click();
  await page.getByRole('button', { name: /Consulta Canadá/ }).click();
  company = 2;
  // Simulate the parent account switch while the modal is open (background controls are inert).
  await page.getByRole('button', { name: 'Switch company', exact: true, includeHidden: true }).evaluate(button => button.click());
  await page.getByText('Todavía no hay conversaciones aquí.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Consulta Canadá', { exact: true }).count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('PASS: company switch clears the conversation and history');
} catch (error) {
  console.error((await page?.locator('body').innerText())?.slice(0,4000));
  throw error;
} finally { await browser?.close(); await server.close(); }
