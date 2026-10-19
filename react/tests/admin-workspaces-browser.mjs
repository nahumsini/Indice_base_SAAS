import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium, webkit } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.INDICE_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const origin = 'http://127.0.0.1:5204';
const output = `/tmp/indice-admin-${engine}`;
const server = await createServer({ root: resolve(import.meta.dirname, '..'), cacheDir: '/tmp/indice-admin-vite', server: { host: '127.0.0.1', port: 5204, strictPort: true, hmr: false, watch: null }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser, page;
try {
  await mkdir(output, { recursive: true }); await server.listen();
  browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true, ...(engine === 'chromium' && process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
  const errors = [], unexpected = [], memory = new Map(), calls = [];
  let failCommand = true, transitions = 0;
  const kiosk = { id: 1, name: 'Sucursal Centro', code: 'demo', status: 'ACTIVE', theme_key: 'indice-blue', default_locale: 'es-MX', access_path: '/synthetic-only', public_token_hint: 'demo', configuration_version: 1, kiosk_count: 0, tool_count: 0, employee_count: 0, audience_type: 'EMPLOYEE' };
  const products = [{ id: 1, product_code: 'sales', display_name: 'Ventas', product_type: 'BASIC', unit_amount_cents: 1000, stripe_ready: false, capabilities: ['sales'] }, { id: 2, product_code: 'hr', display_name: 'Recursos Humanos', product_type: 'BASIC', unit_amount_cents: 1000, stripe_ready: false, capabilities: ['human_resources'] }];
  const selection = { source: 'STRIPE', status: 'trial', catalog_version: 'fixture', billing_interval: 'MONTH', currency: 'USD', included_seats: 5, extra_seats: 0, used_seats: 1, available_seats: 4, base_amount_cents: 1000, complementary_amount_cents: 0, extra_seat_unit_amount_cents: 0, estimated_amount_cents: 1000, change_timing: 'TRIAL_END', charged_now: false, can_update: true, selected_product_codes: ['sales'], available_products: products, selection_state: 'CURRENT', current_product_codes: ['sales'], current_included_seats: 5, current_extra_seats: 0, stripe_enabled: false, stripe_mode: 'TEST', stripe_catalog_ready: false, activation_available: false, payment_management_available: false, access_allowed: true, payment_method_required: false, trial_ends_at: '2026-11-01T12:00:00Z' };
  const pagination = { page: 1, page_size: 25, total_items: 0, total_pages: 1 };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (url.origin !== origin) return route.abort();
    if (!path.startsWith('/api/')) return route.continue();
    calls.push([req.method(), path]);
    if (path.startsWith('/api/v1/workspace-state/')) {
      if (req.method() === 'PUT') memory.set(path, req.postDataJSON().state);
      return route.fulfill({ json: { state: memory.get(path) ?? {}, schemaVersion: 1 } });
    }
    if (path === '/api/v1/auth/me') return route.fulfill({ json: { user: { id: 901, role: 'root' }, company: { id: 901, role: 'root', user_company_id: 901, active: true }, csrfToken: 'synthetic-csrf' } });
    if (path === '/api/v2/kiosk-center/multi-kiosks') return route.fulfill({ json: { data: { items: [kiosk, { ...kiosk, id: 2, name: 'Sucursal Norte', status: 'DISABLED' }] } } });
    if (path === '/api/v2/kiosk-center/multi-kiosks/catalog') return route.fulfill({ json: { data: { employees: [], kiosks: [], tools: [] } } });
    if (path === '/api/v2/kiosk-center/multi-kiosks/1/disable') {
      assert.equal(req.headers()['x-csrf-token'], 'synthetic-csrf'); transitions++;
      if (failCommand) return route.fulfill({ status: 503, json: { message: 'Synthetic failure' } });
      kiosk.status = 'DISABLED'; return route.fulfill({ json: { data: { ...kiosk, tools: [], employees: [], kiosks: [] } } });
    }
    if (path === '/api/v1/auth/managed-companies') return route.fulfill({ json: { active: false, read_only: false, active_company: null, companies: [], authority_mode: 'NONE' } });
    if (path === '/api/v1/billing/subscription') return route.fulfill({ status: 404, json: { message: 'Synthetic no contract' } });
    if (path === '/api/v1/billing/subscription/selection') { assert.equal(req.method(), 'GET'); return route.fulfill({ json: selection }); }
    if (path === '/api/v1/billing/subscription/invoices') return route.fulfill({ json: { invoices: [] } });
    if (path === '/api/v1/billing/subscription/payment-method') return route.fulfill({ status: 403, json: { message: 'Synthetic unavailable' } });
    if (path === '/api/v1/platform-admin/context') return route.fulfill({ json: { role: 'PLATFORM_ROOT', permissions: [], can_manage_accounts: true, can_create_accounts: true, can_manage_benefits: false, can_manage_ownership: true } });
    if (path === '/api/v1/platform-admin/overview') return route.fulfill({ json: { companies: [], distributors: [], pagination, totals: { companies: 0, currency: 'USD', projected_monthly_billing_cents: 0, active_customer_companies: 0, demo_and_trial_accounts: 0 }, control: { attention: 0, expiring: 0, no_offer: 0, no_adoption: 0, priorities: [] } } });
    if (path === '/api/v1/platform-admin/billing') return route.fulfill({ json: { invoices: [], totals: {}, pagination } });
    if (path === '/api/v1/platform-admin/catalog') return route.fulfill({ json: { versions: [], products: [], prices: [] } });
    if (path === '/api/v1/platform-admin/modules') return route.fulfill({ json: { modules: [] } });
    if (path === '/api/v1/platform-admin/audit') return route.fulfill({ json: { events: [] } });
    unexpected.push(`${req.method()} ${path}`); return route.fulfill({ status: 500, json: { message: 'Unexpected fixture API' } });
  });
  const visit = workspace => page.goto(`${origin}/tests/browser/admin-workspaces.html?workspace=${workspace}`, { timeout: 120000 });
  const fit = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page must fit viewport');
  const shot = async name => { await fit(); await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled', timeout: 15000 }); };
  await visit('kiosk'); await page.getByRole('heading', { name: 'Sucursal Centro', exact: true }).waitFor();
  await page.getByRole('searchbox').fill('inexistente'); await page.getByText('Sin resultados con estos filtros', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await page.getByRole('combobox', { name: 'Estado', exact: true }).click();
  await page.getByRole('option', { name: 'Deshabilitado', exact: true }).click();
  await page.locator('[data-kiosk-status-navigator]').getByRole('button', { name: /Activos/ }).click();
  await page.getByRole('heading', { name: 'Sucursal Centro', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Sucursal Norte', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await shot('kiosks-desktop');
  await page.getByRole('button', { name: 'Más opciones', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /^Deshabilitar/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deshabilitar', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').waitFor(); assert.equal(transitions, 1);
  await page.setViewportSize({ width: 390, height: 844 }); await shot('kiosk-error-mobile');
  failCommand = false; await page.getByRole('dialog').getByRole('button', { name: 'Deshabilitar', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(transitions, 2);
  await page.getByRole('button', { name: 'Compartir enlace y QR', exact: true }).first().click(); await page.getByRole('dialog').locator('img').waitFor(); await shot('kiosk-share-mobile');
  console.log('PASS: kiosks search/reset, lifecycle failure in modal, confirmed retry and mobile share');
  await page.setViewportSize({ width: 1440, height: 1000 }); await visit('billing'); await page.locator('#billing-plan').waitFor();
  await page.getByRole('searchbox').fill('inexistente'); await page.getByText('Sin resultados con estos filtros', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await page.getByRole('combobox', { name: 'Selección', exact: true }).click();
  await page.getByRole('option', { name: 'Seleccionados', exact: true }).click();
  assert.equal(await page.locator('#billing-plan button[aria-pressed=true]').count(), 1);
  assert.equal(await page.locator('#billing-plan button[aria-pressed=false]').count(), 0);
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await shot('billing-desktop');
  const history = page.locator('#billing-history');
  await page.getByRole('tab', { name: 'Facturas y comprobantes', exact: true }).click(); await history.waitFor();
  assert.equal(await history.evaluate(el => el === document.activeElement), true);
  assert.equal(calls.some(([method, path]) => path.startsWith('/api/v1/billing') && method !== 'GET'), false, 'presentation never changes billing');
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0,0)); await shot('billing-mobile');
  console.log('PASS: billing filters and history keep selected products and make no billing mutations');
  await page.setViewportSize({ width: 1440, height: 1000 }); await visit('platform'); await page.getByRole('searchbox').waitFor();
  await page.getByRole('searchbox').fill('prueba'); await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click(); assert.equal(await page.getByRole('searchbox').inputValue(), ''); await shot('platform-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await shot('platform-mobile');
  await page.setViewportSize({ width: 320, height: 700 });
  await visit('forms');
  for (const form of ['type', 'distributor', 'trial']) {
    await page.getByRole('button', { name: form, exact: true }).click(); const dialog = page.getByRole('dialog'); await dialog.waitFor();
    if (form === 'type') { await dialog.getByRole('combobox').selectOption('DISTRIBUTOR'); await dialog.getByRole('textbox').fill('Motivo de prueba'); }
    if (form === 'distributor') await dialog.getByRole('textbox').fill('Motivo de prueba');
    if (form === 'trial') await dialog.getByRole('checkbox').check();
    await dialog.locator('button[type=submit]').click(); await dialog.getByRole('alert').waitFor(); await shot(`platform-${form}-mobile`);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  console.log('PASS: platform filters and three simple forms preserve values and show failed save in the modal');
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.getByRole('button', { name: 'type', exact: true }).click(); await shot('platform-form-dark');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log(`PASS: ${engine} desktop/mobile/dark; only synthetic state was mutated`);
} finally { await page?.close({ runBeforeUnload: false }).catch(() => {}); await browser?.close(); server.httpServer?.closeAllConnections(); await server.close(); }
