import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(root, '../.run/kiosk-tools-ui');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5197, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
const date = '2026-10-10';
const cards = [
  { id: 21, name: 'Cuentas por pagar', module: 'EXPENSES', module_slug: 'expenses', workspace_kind: 'PAYABLES' },
  { id: 22, name: 'Caja chica', module: 'PETTY_CASH', module_slug: 'petty-cash', workspace_kind: 'PETTY_CASH' },
  { id: 23, name: 'Venta en ruta', module: 'SALES', module_slug: 'sales', workspace_kind: 'ROUTE_SALES', tool_key: 'employee.route-sales@1' },
  { id: 24, name: 'Pre-ticket', module: 'POINT_OF_SALE', module_slug: 'point-of-sale', workspace_kind: 'POS_SELF_SERVICE', kiosk_type: 'self_service' },
  { id: 25, name: 'Meseros', module: 'POINT_OF_SALE', module_slug: 'point-of-sale', workspace_kind: 'POS_WAITER_STATION', kiosk_type: 'waiter_station' },
].map(card => ({ ...card, availability: 'AVAILABLE', purpose: 'Herramienta de prueba' }));
const bootstrap = { name: 'Equipo de prueba', company_name: 'Empresa de prueba', locale: 'es-MX', access_methods: ['PIN'], csrf_token: 'synthetic-csrf', audience_type: 'EMPLOYEE' };
const session = { session_id: 'employee', session_token: 'synthetic-session', expires_at: '2099-01-01T00:00:00Z', identity: { type: 'EMPLOYEE', id: 7, name: 'Ana Prueba' }, employee: { name: 'Ana Prueba' }, multi_kiosk: { id: 1, name: bootstrap.name, company_name: bootstrap.company_name }, kiosks: cards };
const grants = ['payables.submission.create', 'payables.attachment.presign', 'payables.attachment.register', 'petty-cash.receipt.create', 'petty-cash.movements.read', 'petty-cash.attachments.read', 'petty-cash.attachment.presign', 'petty-cash.attachment.register', 'sales.route.sale.create', 'sales.route.contact.create', 'sales.route.payment-evidence.presign', 'sales.route.payment-evidence.register', 'pos.self-service.preticket.create', 'pos.restaurant.order.open', 'pos.restaurant.item.add', 'pos.restaurant.round.send', 'pos.restaurant.check.request'].map(x => `${x}@1`);
const productName = 'Paquete especial para compartir con el equipo';
const petty = { user: { id: 7, full_name: 'Ana Prueba' }, fund: { id: 1, name: 'Fondo de operaciones', currency_code: 'MXN', current_balance_amount: 12345.67, limit_amount: 20000, cut_off_day: 31, scope_label: 'Centro' }, periods: [{ id: 1, period_key: '2026-10', period_start: '2026-10-01', period_end: '2026-10-31', status: 'OPEN', currency_code: 'MXN' }], expenses: [], income_movements: [{ id: 1, period_key: '2026-10', type: 'INITIAL_FUNDING', amount: 20000, currency_code: 'MXN', movement_date: date }] };
const sales = { seller: { user_id: 7, user_company_id: 7, name: 'Ana Prueba' }, scope: {}, contacts: [{ id: 1, name: 'Cliente de prueba', contact_person: 'Contacto de prueba' }], products: [{ id: 1, name: productName, sku: 'S-001', category: 'Paquetes', type: 'PRODUCT', price: 100, tax_percent: 16, currency: 'MXN' }], warehouses: [{ id: 1, name: 'Almacén central' }], inventory_balances: [{ product_id: 1, warehouse_id: 1, available_quantity: 3, uses_inventory: true }], payment_accounts: [], recent_sales: [], summary: { today_count: 0, today_totals: {}, pending_settlement_count: 0 } };
const restaurant = { kioskId: 25, kioskType: 'waiter_station', name: 'Meseros', sourceRegisterOpen: true, status: 'ACTIVE', ecosystemName: 'Restaurante', canEditFloorPlan: false, tables: [{ id: 1, name: 'Mesa de la terraza principal', code: 'M1', capacity: 4, status: 'ACTIVE', version: 1, layoutShape: 'ROUND', layoutX: 0, layoutY: 0, layoutWidth: 2, layoutHeight: 2, layoutRotation: 0, areaId: 1, areaName: 'Terraza' }], orders: [], catalog: [{ id: 1, name: productName, sku: 'P-001', category: 'Para compartir', price: 100, currency: 'MXN', availableQuantity: 10, stockTracked: true }] };
const data = { 21: { kiosk: { name: 'Cuentas por pagar', currencyCode: 'MXN' }, providers: [{ id: 1, name: 'Proveedor de prueba' }] }, 22: petty, 23: sales, 24: { kioskType: 'self_service', name: 'Pre-ticket', warehouseName: 'Centro', cashRegisterName: 'Caja 1', currencyCode: 'MXN', sourceRegisterOpen: true, customerNameRequired: true, items: [{ productId: 1, name: productName, sku: 'P-001', category: 'Paquetes', unitPrice: 100, available: true }] }, 25: restaurant };
const mutations = [], errors = [], unexpected = [];
const failedUploads = new Set();
let browser, page;
try {
  await mkdir(artifacts, { recursive: true }); await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date(`${date}T12:00:00`));
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/synthetic-upload', route => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const base = '/api/v2/multi-kiosks/public/synthetic-link';
    const reply = result => route.fulfill({ json: { data: result, meta: {} } });
    const path = decodeURIComponent(url.pathname.slice(base.length));
    if (!url.pathname.startsWith(base)) { unexpected.push(url.pathname); return route.fulfill({ status: 500, json: {} }); }
    if (!path) return reply(bootstrap);
    if (req.method() !== 'GET') assert.equal(req.headers()['x-csrf-token'], bootstrap.csrf_token);
    if (path === '/sessions') return reply(session);
    assert.equal(req.headers()['x-multi-kiosk-session-token'], session.session_token);
    if (path === '/session') return reply(session);
    if (path === '/today') return reply({ date, attendance: null, tasks: null });
    if (path === '/messaging/unread') return reply(0);
    const id = Number(path.match(/kiosks\/(\d+)/)?.[1]);
    if (path.endsWith('/sessions')) return reply({ kiosk_session_id: `child-${id}`, kiosk_session_token: `synthetic-child-${id}`, experience_status: 'READY' });
    if (path.endsWith('/workspace')) return reply({ kiosk: cards.find(card => card.id === id), session: { id: `child-${id}`, capabilities: grants, expires_at: session.expires_at }, experience_status: 'READY', bootstrap: data[id] });
    assert.equal(req.headers()['x-kiosk-session-token'], `synthetic-child-${id}`);
    assert.ok(req.headers()['idempotency-key']);
    const body = req.postDataJSON(); mutations.push({ path, body });
    if (path.endsWith('.presign@1')) {
      if (!failedUploads.has(id)) { failedUploads.add(id); return route.fulfill({ status: 503, json: { error: { message: 'Carga de prueba interrumpida' } } }); }
      return reply({ object_key: 'synthetic-proof', objectKey: 'synthetic-proof', upload_url: 'http://127.0.0.1:5197/synthetic-upload', uploadUrl: 'http://127.0.0.1:5197/synthetic-upload' });
    }
    if (path.endsWith('.register@1')) return reply({});
    if (path.endsWith('payables.submission.create@1')) return reply({ expenseId: 71 });
    if (path.endsWith('petty-cash.receipt.create@1')) { petty.expenses.push({ id: 72, description: body.description, total_amount: body.total_amount, currency_code: 'MXN', expense_date: date, period_key: '2026-10', status: 'REGISTERED', attachment_count: 1 }); return reply({ settlement_line: { id: 72 }, ...petty }); }
    if (path.endsWith('petty-cash.attachments.read@1')) return reply({ items: [{ id: 1, original_filename: 'comprobante.png', mime_type: 'image/png', size_bytes: 100 }], count: 1 });
    if (path.endsWith('sales.route.sale.create@1')) { const sale = { id: 73, sale_number: 'V-073', customer_name: 'Cliente de prueba', sale_date: date, total_amount: 116, currency: 'MXN', payment_method: body.paymentMethod, settlement_status: 'route_cash_custody', commercial_status: 'completed', finance_status: 'paid', inventory_status: 'delivered', delivery_status: 'delivered' }; sales.recent_sales.push(sale); return reply({ sale }); }
    if (path.endsWith('pos.self-service.preticket.create@1')) return reply({ claimCode: 'PRUEBA-74', preticketNumber: 'P-074', totalAmount: 100, currencyCode: 'MXN' });
    if (path.endsWith('pos.restaurant.order.open@1')) { restaurant.orders = [{ id: 75, orderNumber: 'C-075', tableId: 1, tableName: restaurant.tables[0].name, areaName: 'Terraza', status: 'OPEN', guestCount: body.guestCount, currencyCode: 'MXN', totalAmount: 0, items: [] }]; Object.assign(restaurant.tables[0], { orderId: 75, orderStatus: 'OPEN', guestCount: body.guestCount }); return reply(restaurant); }
    if (path.endsWith('pos.restaurant.item.add@1')) { restaurant.orders[0].items.push({ id: 1, productId: 1, name: productName, quantity: body.quantity, unitPrice: 100, lineTotal: body.quantity * 100, guestNumber: body.guestNumber, kitchenStationCode: 'GENERAL', status: 'DRAFT' }); restaurant.orders[0].totalAmount = body.quantity * 100; return reply(restaurant); }
    if (path.includes('pos.restaurant.') && path.includes('/actions/')) { restaurant.orders[0].items.forEach(item => item.status = 'SENT'); return reply(restaurant); }
    unexpected.push(path); return route.fulfill({ status: 500, json: {} });
  });
  await page.goto('http://127.0.0.1:5197/tests/browser/kiosk-employee.html');
  await page.locator('input[inputmode="numeric"]').fill('11111'); await page.getByRole('button', { name: 'Entrar a mis kioscos', exact: true }).click();
  const openTool = async name => { console.log('Review:', name); await page.getByRole('button', { name: 'Herramientas', exact: true }).click(); await page.getByRole('button', { name: `Abrir: ${name}`, exact: true }).click(); await page.locator('.kiosk-personal-workspace').first().waitFor(); };
  const layout = async () => {
    if (await page.getByRole('dialog').count()) await page.waitForTimeout(250); // Measure after the shared modal enters.
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'page overflow');
    const small = await page.locator('.kiosk-personal-workspace button, .kiosk-personal-workspace summary').evaluateAll(nodes => nodes.filter(n => n.checkVisibility() && !n.disabled && !n.closest('[data-floor-table]')).filter(n => { const b = n.getBoundingClientRect(); return b.height < 43.5 || b.width < 43.5; }).map(n => ({ text: n.textContent, width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
    assert.deepEqual(small, [], 'touch targets');
  };
  const contrast = async scope => {
    for (const dark of [true, false]) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      await page.waitForTimeout(250); // Let color transitions settle before measuring contrast.
    const failures = await scope.evaluate(root => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rgba = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v); };
      const blend = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3]));
      const luminance = color => color.slice(0, 3).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const background = element => { const chain = []; for (let el = element; el; el = el.parentElement) chain.unshift(rgba(getComputedStyle(el).backgroundColor)); return chain.reduce((bg, color) => blend(color, bg), [255, 255, 255]); };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), failures = []; let node;
      while ((node = walker.nextNode())) {
        const el = node.parentElement, text = node.textContent.trim();
        if (!text || el.closest('[aria-hidden="true"], .sr-only, [disabled]') || !el.checkVisibility()) continue;
        const style = getComputedStyle(el), bg = background(el), fg = blend(rgba(style.color), bg);
        const ratio = (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05);
        if (ratio < (parseFloat(style.fontSize) >= 24 ? 3 : 4.5)) failures.push({ text, ratio });
      }
      return failures;
    });
    assert.deepEqual(failures, [], `text contrast in ${dark ? 'dark' : 'light'} mode`);
  }
  };
  const review = async name => {
    for (const width of [320, 360, 390, 430, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 844 }); await layout(); }
    await contrast(page.locator('.kiosk-personal-workspace').first());
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(artifacts, `${name}.png`), fullPage: true, animations: 'disabled' });
  };
  const evidence = { name: 'comprobante.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=', 'base64') };
  const dialog = page.getByRole('dialog');
  await openTool('Cuentas por pagar'); await review('payables');
  await page.locator('[data-payables-section="primary"] input').fill('Insumos de prueba');
  await page.locator('[data-multi-kiosk-payables] input[type=number]').fill('12345.67');
  await page.locator('[data-multi-kiosk-payables] input[type=file]').setInputFiles(evidence);
  const payableSubmit = page.locator('[data-multi-kiosk-payables] button[type=submit]');
  await payableSubmit.click(); await page.getByRole('button', { name: /Reintentar/i }).waitFor();
  await page.getByRole('button', { name: /Reintentar/i }).click(); await payableSubmit.filter({ hasText: /Registrar|Enviar/i }).waitFor();
  assert.equal(mutations.filter(x => x.path.endsWith('payables.submission.create@1')).length, 1, 'attachment retry does not duplicate payable');
  await openTool('Caja chica'); await review('petty-cash');
  const capture = page.getByRole('tabpanel');
  await capture.locator('input[id$=description]').fill('Material de prueba'); await capture.locator('input[id$=amount]').fill('150');
  await capture.locator('input[type=file]').last().setInputFiles(evidence);
  await capture.locator('[data-kiosk-sticky-action] button').click();
  await page.getByRole('button', { name: /Reintentar/i }).waitFor(); await page.getByRole('button', { name: /Reintentar/i }).click();
  await page.locator('[data-personal-tool-card]').waitFor();
  await review('petty-history');
  assert.equal(mutations.filter(x => x.path.endsWith('petty-cash.receipt.create@1')).length, 1);
  await page.locator('[data-personal-tool-card] button').click(); await dialog.waitFor(); await layout(); await contrast(dialog); await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Ingresos/ }).click(); await review('petty-income');
  await openTool('Venta en ruta'); await review('route-customer');
  await page.getByRole('button', { name: 'Nuevo', exact: true }).click(); await dialog.waitFor(); await layout(); await contrast(dialog); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Cliente de prueba Contacto/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await review('route-products');
  await page.getByRole('button', { name: `Agregar ${productName}`, exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await review('route-payment');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await review('route-review');
  await page.getByRole('button', { name: 'Terminar venta', exact: true }).click(); await page.getByRole('heading', { name: 'Venta terminada' }).waitFor();
  assert.equal(mutations.find(x => x.path.endsWith('sales.route.sale.create@1')).body.items[0].quantity, 1);
  await page.getByRole('button', { name: 'Ver mis ventas', exact: true }).click(); await review('route-history');
  await page.getByRole('tab', { name: 'Clientes', exact: true }).click(); await review('route-directory');
  await openTool('Pre-ticket'); await review('preticket');
  await page.getByRole('button', { name: `Venta actual: ${productName} +`, exact: true }).click();
  await page.getByRole('button', { name: /Ver pedido/ }).click(); await dialog.waitFor(); await layout(); await contrast(dialog);
  await dialog.getByLabel(/Nombre del cliente/).fill('Cliente de prueba');
  await page.screenshot({ path: resolve(artifacts, 'preticket-cart.png'), animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Crear pre-ticket', exact: true }).click(); await page.getByText('PRUEBA-74', { exact: true }).waitFor();
  await openTool('Meseros'); await review('waiter-tables');
  await page.getByRole('button', { name: /Mesa de la terraza principal, Disponible/ }).click(); await review('waiter-open');
  await page.getByRole('button', { name: 'Abrir mesa y crear comanda', exact: true }).click();
  await page.getByRole('button', { name: /Agregar productos/, exact: true }).first().click(); await dialog.waitFor();
  await page.setViewportSize({ width: 320, height: 650 }); await layout();
  await contrast(dialog);
  await page.screenshot({ path: resolve(artifacts, 'waiter-catalog.png'), animations: 'disabled' });
  await dialog.getByRole('button', { name: `Agregar 1 ${productName} al comensal 1`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Terminar captura', exact: true }).click(); await review('waiter-order');
  await page.getByText('Por enviar', { exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const itemBottom = (await page.getByText('Por enviar', { exact: true }).boundingBox()).y;
  const actionTop = (await page.locator('[data-waiter-workspace] footer').boundingBox()).y;
  assert.ok(itemBottom < actionTop, 'order items remain reachable above the action bar');
  await page.getByRole('button', { name: /Enviar 1 a cocina/ }).click();
  await page.getByRole('button', { name: 'Solicitar cuenta', exact: true }).click();
  assert.ok(mutations.some(x => x.path.endsWith('pos.restaurant.round.send@1')));
  assert.ok(mutations.some(x => x.path.endsWith('pos.restaurant.check.request@1')));
  await page.evaluate(() => localStorage.setItem('indice-kiosk-accessibility-mode', JSON.stringify({ largeText: true })));
  await page.reload();
  for (const card of cards) { await openTool(card.name); for (const width of [320, 390]) { await page.setViewportSize({ width, height: 650 }); await layout(); } }
  data[24].sourceRegisterOpen = false; await page.reload(); await openTool('Pre-ticket');
  await page.getByText('La caja asignada no tiene un turno activo. El pre-ticket no está disponible.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Crear pre-ticket', exact: true }).count(), 0);
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log('PASS: five employee tools, responsive layouts, attachment retries, sales, pre-ticket and waiter order with synthetic APIs.');
} catch (error) { if (page) { console.error(await page.locator('body').innerText()); await page.screenshot({ path: resolve(artifacts, 'failure.png'), fullPage: true }); } throw error; }
finally { if (browser) await browser.close(); await server.close(); }
