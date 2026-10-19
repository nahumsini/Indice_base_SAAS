import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
const runtime = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5198';
const server = await createServer({ root: resolve(import.meta.dirname, '..'), cacheDir: '/private/tmp/indice-account-preferences-vite', server: { host: '127.0.0.1', port: 5198, strictPort: true, hmr: false, watch: null }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const rates = { MXN: 18.5, CAD: 1.36, USD: 1, COP: 4000, BRL: 5.5 };
const stored = (currency = 'MXN') => ({ version: 1, preferredCurrency: currency, exchangeRateSettings: { ratesPerUsd: { ...rates }, metadata: { mode: 'manual', source: 'manual_override', sourceDate: '2026-10-18', updatedAt: '2026-10-18T12:00:00Z' } } });
const session = (id, company, role = 'admin', modules = ['config_center'], tabs = ['config_center.profile', 'config_center.business-structure']) => ({ user: { id, role, name: 'Synthetic user', module_slugs: modules, tab_permissions_configured: true, tab_permission_keys: tabs }, company: { id: company, name: 'Synthetic company', role, active: true, commercial_account_type: 'SUPER_ADMIN' }, companies: [], csrfToken: 'synthetic-csrf' });
async function flow(engine) {
  const browser = await runtime[engine].launch({ headless: true, ...(engine === 'chromium' && process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    localStorage.setItem('frontend-indice-language', 'es-MX');
    localStorage.setItem('indice.business.preferredCurrency', JSON.stringify('BRL'));
    localStorage.setItem('indice.business.exchangeRatesPerUsd', JSON.stringify({ MXN: 99 }));
  });
  let currentSession = session(9001, 9001), failLoad = false, failSave = false, loseAck = false, loadDelay = 0, saveDelay = 0, failLearningSave = false;
  const saved = new Map(), learning = new Map(), writes = [], errors = [];
  const actor = () => `${currentSession.company.id}:${currentSession.user.id}`;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (url.origin !== origin) return route.abort();
    if (!path.startsWith('/api/')) return route.continue();
    const reply = value => route.fulfill({ json: value });
    if (path === '/api/v1/workspace-state/system/business-currency') {
      const scope = actor();
      assert.equal(request.headers()['x-workspace-actor'], scope, 'request must bind its expected user/company');
      if (request.method() === 'GET') {
        if (failLoad) return route.fulfill({ status: 503, json: {} });
        const value = structuredClone(saved.get(scope) ?? {});
        await delay(loadDelay);
        return reply({ state: value, schemaVersion: 1 });
      }
      assert.equal(request.method(), 'PUT');
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      const body = request.postDataJSON(); writes.push({ scope, state: body.state });
      await delay(saveDelay);
      if (failSave) { failSave = false; return route.fulfill({ status: 503, json: {} }); }
      saved.set(scope, structuredClone(body.state));
      if (loseAck) { loseAck = false; return route.fulfill({ status: 503, json: {} }); }
      return reply({ state: saved.get(scope), schemaVersion: 1 });
    }
    if (path === '/api/v1/workspace-state/system/learning-mode') {
      const key = actor();
      if (request.method() === 'PUT') {
        if (failLearningSave) { failLearningSave = false; return route.fulfill({status:503,json:{}}); }
        learning.set(key, request.postDataJSON().state);
      }
      return reply({ state: learning.get(key) ?? { version: 1, active: false, visible: true, step: 3 }, schemaVersion: 1 });
    }
    if (path.startsWith('/api/v1/workspace-state/')) return reply({ state: request.method() === 'PUT' ? request.postDataJSON().state : {}, schemaVersion: 1 });
    if (path === '/api/v1/exchange-rates/daily') return reply({ ratesPerUsd: rates, metadata: { sourceDate: '2026-10-18', updatedAt: new Date().toISOString() }, sources: [{ currencyCode: 'MXN', ratePerUsd: 18.5, observedDate: '2026-10-16', institution: 'Synthetic source', dataset: 'Synthetic reference', status: 'official' }] });
    if (path === '/api/v1/auth/me') return reply(currentSession);
    if (path.includes('current-user') || path.endsWith('/config-center/me')) return reply({ primer_nombre: 'Synthetic', apellido_paterno: 'User', email: 'synthetic@example.test' });
    if (path.includes('managed-compan')) return reply({ active: false, authority_mode: 'NONE', companies: [] });
    if (path === '/api/v1/messaging/unread') return reply(0);
    if (path.includes('notifications')) return reply({ items: [], summary: { total_count: 0, unread_count: 0 } });
    return route.fulfill({ status: 403, json: { message: 'Synthetic unavailable feature' } });
  });
  const page = await context.newPage(); page.on('console', message => { if (message.type() === 'error' && /children with the same key/.test(message.text())) errors.push(message.text()); }); page.setDefaultTimeout(12000); page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR', error.stack || error.message); });
  const ready = () => page.waitForFunction(() => document.querySelector('[data-testid="ready"]')?.textContent === 'true');
  const currency = expected => page.getByTestId('currency').filter({ hasText: new RegExp(`^${expected}$`) }).waitFor();
  const openMenu = () => page.getByRole('button', { name: 'Mi perfil', exact: true }).click();
  const openCurrency = async () => { await openMenu(); await page.getByRole('menuitem', { name: /Divisa preferida/ }).click(); await page.getByRole('dialog').waitFor(); await page.getByRole('menu').waitFor({ state: 'hidden' }); await page.waitForTimeout(220); };
  const choose = async code => { await page.getByRole('combobox', { name: 'Divisa preferida' }).click(); await page.getByRole('option', { name: code, exact: true }).click(); };
  const save = () => page.getByRole('button', { name: 'Guardar cambios', exact: true });
  const cancel = () => page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const switchUser = async (id, company = 9001, role = 'admin', modules = ['config_center'], tabs = ['config_center.profile', 'config_center.business-structure']) => {
    currentSession = session(id, company, role, modules, tabs);
    await page.evaluate(({ id, company, role, modules, tabs }) => window.accountFixture.switchUser(id, company, role, modules, tabs), { id, company, role, modules, tabs });
  };
  await page.goto(`${origin}/tests/browser/account-preferences.html`); await ready(); await currency('MXN');
  assert.equal(writes.length, 0, 'an unattributed legacy browser preference must not seed this account');
  await openCurrency(); await choose('CAD'); saveDelay = 350;
  await save().click(); await page.getByRole('button', { name: 'Guardando…' }).waitFor(); await currency('MXN');
  await page.getByRole('dialog').waitFor({ state: 'hidden' }); await currency('CAD'); saveDelay = 0;
  await page.evaluate(() => window.accountFixture.logout()); await page.reload(); await ready(); await currency('CAD');
  console.log(`${engine}: confirmed atomic save survives logout and ignores browser-wide legacy preferences`);
  await openCurrency(); await choose('USD'); failSave = true; await save().click(); await page.getByRole('alert').waitFor();
  await currency('CAD'); assert.equal(saved.get(actor()).preferredCurrency, 'CAD');
  await save().click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); await currency('USD');
  await openCurrency(); await choose('BRL'); await cancel(); assert.equal(saved.get(actor()).preferredCurrency, 'USD');
  await openCurrency(); await choose('COP'); loseAck = true; await save().click(); await page.getByRole('alert').waitFor();
  await currency('USD'); await save().click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); await currency('COP');
  assert.equal(saved.get(actor()).preferredCurrency, 'COP');
  console.log(`${engine}: errors preserve draft; retry, cancellation and lost acknowledgements are safe`);
  await openCurrency(); await page.locator('summary').filter({ hasText: 'Tasa manual' }).click();
  await page.getByRole('spinbutton').first().fill('0'); await save().click();
  await page.getByRole('alert').filter({ hasText: /tasas positivas/ }).waitFor();
  await page.getByRole('spinbutton').first().fill('19'); await save().click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(saved.get(actor()).exchangeRateSettings.metadata.mode, 'manual');
  assert.equal(saved.get(actor()).exchangeRateSettings.ratesPerUsd.MXN, 19);
  await openCurrency(); await page.getByRole('button', { name: 'Cargar tasa del día', exact: true }).click();
  await page.getByText('Tasa diaria', { exact: true }).waitFor(); await cancel();
  assert.equal(saved.get(actor()).exchangeRateSettings.ratesPerUsd.MXN, 19, 'refresh is staged until Save');
  console.log(`${engine}: manual validation and staged daily refresh preserve confirmed references`);
  saved.set('9001:9002', stored('BRL')); saved.set('9002:9002', stored('USD'));
  await switchUser(9002); await ready(); await currency('BRL');
  await switchUser(9002, 9002); await ready(); await currency('USD');
  await openCurrency(); await choose('CAD'); saveDelay = 500; await save().click(); await delay(100);
  await switchUser(9001); await ready(); await currency('COP'); await delay(550); await currency('COP');
  assert.equal(saved.get('9001:9001').preferredCurrency, 'COP');
  assert.equal(saved.get('9002:9002').preferredCurrency, 'CAD'); saveDelay = 0; await cancel();
  loadDelay = 500; await switchUser(9003); await delay(80); loadDelay = 0; await switchUser(9001); await ready(); await currency('COP'); await delay(550); await currency('COP');
  assert.equal(saved.has('9001:9003'), false);
  console.log(`${engine}: user/company isolation and late responses cannot replace the active account`);
  failLoad = true; const beforeFailure = writes.length; await page.reload(); await openCurrency();
  await page.getByRole('alert').filter({ hasText: /No se pudo cargar/ }).waitFor(); assert.equal(await save().isDisabled(), true);
  assert.equal(writes.length, beforeFailure); failLoad = false; await page.getByRole('button', { name: 'Reintentar', exact: true }).click(); await ready(); await cancel();
  const confirmed = saved.get(actor()); saved.set(actor(), { version: 2, preferredCurrency: 'CAD' });
  await page.reload(); await openCurrency(); await page.getByRole('alert').filter({ hasText: /No se pudo cargar/ }).waitFor();
  assert.equal(await save().isDisabled(), true); assert.equal(writes.length, beforeFailure);
  saved.set(actor(), confirmed); await page.getByRole('button', { name: 'Reintentar', exact: true }).click(); await ready(); await cancel();
  console.log(`${engine}: load failures and unsupported data cannot overwrite preferences with defaults`);
  await openMenu(); await page.getByRole('menuitem', { name: 'Configurar Modo aprendiz', exact: true }).click();
  const help = page.getByRole('checkbox', { name: 'Ayuda dentro de los módulos', exact: true });
  const journey = page.getByRole('checkbox', { name: 'Mostrar el recorrido de aprendizaje', exact: true });
  assert.equal(await help.isChecked(), false); assert.equal(await journey.isChecked(), false); assert.equal(await journey.isDisabled(), true);
  await page.getByText('Etapa actual', { exact: true }).waitFor();
  await help.locator('..').click(); assert.equal(await journey.isChecked(), true);
  await cancel(); assert.equal(learning.get(actor())?.active ?? false, false);
  await openMenu(); await page.getByRole('menuitem', { name: 'Configurar Modo aprendiz', exact: true }).click();
  await help.locator('..').click(); failLearningSave = true;
  await page.getByRole('button', {name:'Guardar cambios',exact:true}).click(); await page.getByRole('alert').waitFor();
  assert.equal(learning.get(actor())?.active ?? false, false);
  assert.equal(await help.isChecked(), true, 'a failed learning save keeps the draft');
  await page.getByRole('button', {name:'Guardar cambios',exact:true}).click(); await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.reload(); await ready();
  await openMenu(); await page.getByRole('menuitem', { name: 'Configurar Modo aprendiz', exact: true }).click();
  assert.equal(await help.isChecked(), true); assert.equal(await journey.isChecked(), true);
  await journey.locator('..').click(); await help.locator('..').click();
  await page.getByRole('button', {name:'Guardar cambios',exact:true}).click(); await page.getByRole('dialog').waitFor({state:'hidden'});
  await openMenu(); await page.getByRole('menuitem', { name: 'Configurar Modo aprendiz', exact: true }).click();
  assert.equal(await journey.isChecked(), false); assert.equal(await journey.isDisabled(), true);
  await help.locator('..').click(); assert.equal(await journey.isChecked(), false, 'an intentionally hidden journey stays hidden after reactivation');
  await page.getByRole('button', {name:'Volver a la primera etapa',exact:true}).click();
  await cancel(); assert.equal(learning.get(actor()).step, 3, 'cancelled stage reset must not persist');

  for (const [role, modules, tabs, allowed] of [
    ['admin', ['config_center'], ['config_center.profile', 'config_center.business-structure'], true],
    ['admin', ['config_center'], ['config_center.profile'], false],
    ['admin', [], ['config_center.business-structure'], false],
    ['manager', ['config_center'], ['config_center.profile', 'config_center.business-structure'], false],
    ['user', ['config_center'], ['config_center.profile'], false],
    ['root', [], [], true],
  ]) {
    await switchUser(9001, 9001, role, modules, tabs); await ready(); await openMenu();
    assert.equal(await page.getByRole('menuitem', { name: 'Configuración de empresa', exact: true }).count(), Number(allowed), `role=${role} module/tab access`);
    await page.keyboard.press('Escape');
  }
  console.log(`${engine}: dependent learning state is clear; menu follows module, tab and role permissions`);
  await switchUser(9001); await ready();
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await openCurrency();
    const bounds = await save().boundingBox();
    if (process.env.INDICE_TEST_SCREENSHOTS_DIR) await page.screenshot({animations: 'disabled', path: `${process.env.INDICE_TEST_SCREENSHOTS_DIR}/${engine}-currency-${viewport.width}.png`});
    assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, JSON.stringify({viewport,bounds,dialog:await page.getByRole('dialog').boundingBox()}));
    const overflow = await page.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth + 1); assert.equal(overflow, false);
    await cancel(); await openMenu(); await page.getByRole('menuitem', { name: 'Personalizar navegación', exact: true }).click();
    await page.getByRole('heading', { name: 'Personalizar navegación', exact: true }).waitFor();
    if (process.env.INDICE_TEST_SCREENSHOTS_DIR) await page.screenshot({animations: 'disabled', path: `${process.env.INDICE_TEST_SCREENSHOTS_DIR}/${engine}-navigation-${viewport.width}.png`});
    await page.getByRole('menu').waitFor({state:'hidden'});
    const applyBounds = await page.getByRole('button', { name: 'Aplicar', exact: true }).boundingBox();
    assert(applyBounds && applyBounds.y >= 0 && applyBounds.y + applyBounds.height <= viewport.height + 1);
    await cancel();
    if (viewport.width < 640) { await openMenu(); await page.getByRole('menuitem', { name:'Configurar Modo aprendiz', exact:true }).click(); }
    else await page.getByRole('button', {name:'Configurar Modo aprendiz', exact:true}).click();
    const learningSave = page.getByRole('button', {name:'Guardar cambios',exact:true});
    await learningSave.waitFor(); await page.waitForTimeout(220);
    const learningBounds = await learningSave.boundingBox();
    assert(learningBounds && learningBounds.y >= 0 && learningBounds.y + learningBounds.height <= viewport.height + 1);
    if (process.env.INDICE_TEST_SCREENSHOTS_DIR) await page.screenshot({animations:'disabled',path:`${process.env.INDICE_TEST_SCREENSHOTS_DIR}/${engine}-learning-${viewport.width}.png`});
    await cancel();
  }
  await page.getByRole('button', { name: 'Usar modo oscuro', exact: true }).click();
  await openCurrency();
  if (process.env.INDICE_TEST_SCREENSHOTS_DIR) await page.screenshot({animations: 'disabled', path: `${process.env.INDICE_TEST_SCREENSHOTS_DIR}/${engine}-currency-dark.png`});
  await cancel();
  assert.deepEqual(errors, []);
  console.log(`${engine}: compact mobile, landscape and desktop retain visible actions with no horizontal modal overflow`);
  await context.close(); await browser.close();
}
try { await server.listen(); for (const engine of (process.env.INDICE_TEST_ENGINES || 'chromium,webkit').split(',')) await flow(engine); }
finally { await server.close(); }
