import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { host: '127.0.0.1', port: 5197, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser, page;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
  const errors = [], unexpected = [], saves = new Map();
  let companyId = 1, userId = 1, role = 'ROOT', failMove = false, failCatalogue = false, delayMemory = 0, removedFlow = false, moveStarted = false, finishMove;
  const records = new Map([[1, [
    { id: 101, opportunityName: 'Contrato de prueba A', companyName: 'Empresa de prueba', flowId: 2, stage: 'new', lifecycleStatus: 'OPEN', ownerName: 'Operador de prueba', ownerUserCompanyId: 1 },
    { id: 102, opportunityName: 'Contrato de prueba B', companyName: 'Empresa de prueba', flowId: 2, stage: 'new', lifecycleStatus: 'OPEN', ownerName: 'Operador de prueba', ownerUserCompanyId: 1 },
  ]], [2, [{ id: 201, opportunityName: 'Contrato de otra empresa', companyName: 'Otra empresa', flowId: 12, stage: 'new', lifecycleStatus: 'OPEN', ownerUserCompanyId: 1, ownerName: 'Operador de prueba' }]]]);
  const stages = [
    { key: 'new', label: 'New', type: 'OPEN', colorToken: 'BLUE', defaultProbabilityPercent: 10, position: 0, required: false, opportunityCount: 0 },
    { key: 'won', label: 'Won', type: 'WON', colorToken: 'GREEN', defaultProbabilityPercent: 100, position: 1, required: true, opportunityCount: 0 },
    { key: 'lost', label: 'Lost', type: 'LOST', colorToken: 'CORAL', defaultProbabilityPercent: 0, position: 2, required: true, opportunityCount: 0 },
  ];
  const catalogue = () => [{ id: companyId === 1 ? 1 : 11, key: 'factory', name: 'Factory flow', factory: true, defaultFlow: true, stages },
    ...removedFlow ? [] : [{ id: companyId === 1 ? 2 : 12, key: 'custom', name: 'Flujo comercial', factory: false, defaultFlow: false, stages }]];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:5197') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = json => route.fulfill({ json });
    if (url.pathname === '/api/v1/auth/me') return reply({ user: { id: userId, name: 'Operador de prueba', role }, company: { id: companyId, role, active: true } });
    if (url.pathname.startsWith('/api/v1/workspace-state/')) {
      const scope = `${companyId}:${userId}`;
      if (request.method() === 'PUT') {
        assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
        saves.set(scope, request.postDataJSON().state);
      } else {
        const state = saves.get(scope) ?? {};
        await new Promise(resolve => setTimeout(resolve, delayMemory));
        return reply({ state, schemaVersion: 1, updatedAt: '2026-10-06T00:00:00Z' });
      }
      return reply({ state: saves.get(scope), schemaVersion: 1 });
    }
    if (url.pathname === '/api/v1/sales/opportunity-flow') {
      if (failCatalogue) return route.fulfill({ status: 503, json: { message: 'Synthetic catalogue failure' } });
      return reply({ defaultFlowId: companyId === 1 ? 1 : 11, canManage: true, flows: catalogue() });
    }
    const positions = url.pathname.match(/\/sales\/opportunity-flow\/(\d+)\/positions$/);
    if (positions) return reply({ flowId: Number(positions[1]), positions: records.get(companyId).filter(row => row.flowId === Number(positions[1])).map(row => ({ opportunityId: row.id, stageKey: row.stage, probabilityPercent: 10 })) });
    if (url.pathname === '/api/v1/sales/context') return reply({ currentUserCompanyId: 1, users: [{ userCompanyId: 1, userId, name: 'Operador de prueba', role: 'ROOT', status: 'ACTIVE' }], units: [], businesses: [] });
    const mutation = url.pathname.match(/\/sales\/opportunities\/(\d+)$/);
    if (mutation && request.method() === 'PUT') {
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      assert.deepEqual(Object.keys(request.postDataJSON()), ['flowId']);
      moveStarted = true;
      if (failMove) { failMove = false; return route.fulfill({ status: 503, json: { message: 'Synthetic save failure' } }); }
      await new Promise(resolve => { finishMove = resolve; });
      const row = records.get(companyId).find(row => row.id === Number(mutation[1]));
      row.flowId = request.postDataJSON().flowId;
      return reply(row);
    }
    const collection = url.pathname.match(/\/sales\/(contacts|opportunities|products|quotes|sales|post-sales|contracts|inventory-warehouses)$/);
    if (collection && request.method() === 'GET') return reply({ items: collection[1] === 'opportunities' ? records.get(companyId) : [], collection: collection[1] });
    if (url.pathname === '/api/v1/kpis/monetary-aggregate/batch') return reply({ results: {} });
    if (url.pathname.includes('/exchange-rates/')) return reply({ ratesPerUsd: { USD: 1, MXN: 18 }, metadata: { mode: 'manual' } });
    unexpected.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 500, json: { message: 'Unexpected synthetic request' } });
  });
  const url = 'http://127.0.0.1:5197/tests/browser/opportunity-flows.html';
  const active = () => page.getByRole('combobox', { name: 'Flujo activo', exact: true });
  const select = async name => {
    await active().click();
    await page.getByRole('option', { name: new RegExp(name) }).click();
    await page.waitForFunction(name => document.querySelector('[aria-label="Flujo activo"]')?.textContent.includes(name), name);
  };
  const selected = async (name, count) => { await page.waitForFunction(({ name, count }) => {
    const text = document.querySelector('[aria-label="Flujo activo"]')?.textContent ?? '';
    return text.includes(name) && text.includes(`${count} oportunidad`);
  }, { name, count }); };
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await selected('Factory flow', 0);
  await page.getByText('No hay oportunidades asignadas a “Factory flow”.', { exact: true }).waitFor();
  await page.screenshot({ path: '/tmp/indice-opportunity-flow-empty-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/indice-opportunity-flow-empty-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/indice-opportunity-flow-empty-dark.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Ver Flujo comercial · 2 oportunidades', exact: true }).click();
  await selected('Flujo comercial', 2);
  await page.getByRole('row').filter({ hasText: 'Contrato de prueba A' }).waitFor();
  console.log('PASS: zero is explained as a flow scope, with an actionable destination and live counts');

  await page.getByRole('button', { name: 'Otra pestaña', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a oportunidades', exact: true }).click();
  await selected('Flujo comercial', 2);
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  delayMemory = 500;
  await page.reload();
  await page.getByText('Abriendo Ventas', { exact: true }).waitFor();
  assert.equal(await page.getByRole('row').filter({ hasText: 'Contrato de prueba A' }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Crear oportunidad', exact: true }).count(), 0);
  await selected('Flujo comercial', 2);
  assert.equal(await page.getByText('No hay oportunidades asignadas a “Factory flow”.', { exact: true }).count(), 0);
  delayMemory = 0;
  console.log('PASS: tab return and slow reload keep the remembered flow; loading cannot create in the wrong default');

  failCatalogue = true;
  await page.reload();
  await page.getByText('No se pudo cargar el flujo de la empresa. Se muestra temporalmente el flujo estándar.', { exact: true }).waitFor();
  assert.equal(await active().isDisabled(), true);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('indice:workspace:1:1:sales:prospects')).state.flowId), 2);
  failCatalogue = false;
  await page.reload();
  await selected('Flujo comercial', 2);
  console.log('PASS: catalogue failures do not overwrite the remembered choice or present a false zero');

  const firstRow = () => page.getByRole('row').filter({ hasText: 'Contrato de prueba A' });
  const reassign = async () => { await firstRow().getByRole('combobox').first().click(); await page.getByRole('option', { name: 'Factory flow', exact: true }).click(); };
  failMove = true;
  await reassign();
  await page.getByText('No se pudo guardar el flujo.', { exact: true }).waitFor();
  await selected('Flujo comercial', 2);
  assert.equal(await page.getByRole('button', { name: 'Ver flujo de destino', exact: true }).count(), 0);
  assert.equal(records.get(1)[0].flowId, 2);
  moveStarted = false;
  await reassign();
  await page.waitForFunction(() => document.querySelector('table [data-state="closed"][disabled]') !== null);
  assert.equal(moveStarted, true);
  assert.equal(await page.getByRole('button', { name: 'Ver flujo de destino', exact: true }).count(), 0);
  finishMove();
  await page.getByText('“Contrato de prueba A” se movió a “Factory flow”.', { exact: true }).waitFor();
  await selected('Flujo comercial', 1);
  assert.equal(await firstRow().count(), 0);
  await page.screenshot({ path: '/tmp/indice-opportunity-flow-moved-desktop.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/indice-opportunity-flow-moved-dark.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.getByRole('button', { name: 'Ver flujo de destino', exact: true }).click();
  await selected('Factory flow', 1);
  await firstRow().waitFor();
  assert.equal(records.get(1).length, 2);
  console.log('PASS: failed and pending saves show no false success; confirmed moves keep identity and offer a destination');

  await page.getByPlaceholder('Oportunidad, empresa o contacto', { exact: true }).fill('Sin coincidencia');
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await selected('Factory flow', 1);
  await select('Flujo comercial');
  await page.goto(`${url}?flow=1`);
  await selected('Factory flow', 1);
  await select('Flujo comercial');
  console.log('PASS: clearing filters preserves flow, while explicit URLs override remembered choices');
  await active().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('listbox').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Flujo activo');
  console.log('PASS: the flow selector supports keyboard navigation and returns focus after Escape');

  companyId = 2;
  await page.evaluate(() => window.opportunityFixture.switchSession(2, 1));
  await selected('Factory flow', 0);
  assert.equal(await page.getByRole('row').filter({ hasText: 'Contrato de prueba B' }).count(), 0);
  await select('Flujo comercial');
  await selected('Flujo comercial', 1);
  companyId = 1; userId = 2;
  await page.evaluate(() => window.opportunityFixture.switchSession(1, 2));
  await selected('Factory flow', 1);
  userId = 1;
  await page.evaluate(() => window.opportunityFixture.switchSession(1, 1));
  await selected('Flujo comercial', 1);
  console.log('PASS: another user or company does not inherit a previous selection');

  records.get(1)[1].ownerUserCompanyId = 2;
  userId = 3; role = 'SALES_REP';
  await page.evaluate(() => window.opportunityFixture.switchSession(1, 3, 'SALES_REP'));
  await selected('Factory flow', 1);
  await select('Flujo comercial');
  await selected('Flujo comercial', 0);
  assert.equal(await page.getByRole('row').filter({ hasText: 'Contrato de prueba B' }).count(), 0);
  userId = 1; role = 'ROOT';
  await page.evaluate(() => window.opportunityFixture.switchSession(1, 1));
  await selected('Flujo comercial', 1);
  console.log('PASS: owner-restricted navigation counts exclude another owner’s opportunities');

  await page.setViewportSize({ width: 390, height: 844 });
  await select('Factory flow');
  await page.screenshot({ path: process.env.INDICE_FLOW_SCREENSHOT || '/tmp/indice-opportunity-flow-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile workspace must not overflow');
  await select('Flujo comercial');
  removedFlow = true;
  await page.reload();
  await selected('Factory flow', 1);
  assert.equal(new URL(page.url()).searchParams.get('flow'), '1');
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log('PASS: mobile layout is bounded; unavailable remembered flows normalize to the active catalogue');
} catch (error) {
  console.error((await page?.locator('body').innerText())?.slice(0, 4500));
  throw error;
} finally { await browser?.close(); await server.close(); }
