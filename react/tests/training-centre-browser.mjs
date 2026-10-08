import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';

// Uses the real application entrypoint, router and training UI. Every API is synthetic,
// and non-local network is blocked: this never reads or writes a functional/production DB.
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5198';
const server = await createServer({ root: resolve(import.meta.dirname, '..'),
  server: { host: '127.0.0.1', port: 5198, strictPort: true },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
});
let browser, page;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true,
    ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}),
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
  const errors = [], unexpected = [], calls = [], saved = new Set();
  let mode = 'distributor', testingDashboard = false;
  page.on('pageerror', error => errors.push(error.message));
  const actor = () => ({
    user: { id: 42, name: 'Alumno de prueba', role: mode === 'root' ? 'root' : mode === 'denied' ? 'user' : 'superadmin' },
    company: { id: 8, name: 'Distribuidor de prueba', commercial_account_type: mode === 'root' ? 'SUPER_ADMIN' : 'DISTRIBUTOR',
      user_company_id: 64, role: mode === 'root' ? 'root' : 'superadmin', active: true,
      scope: { type: 'corporate_office', unit_id: null, business_id: null } },
    companies: [], csrfToken: 'synthetic-csrf',
  });
  const workspace = () => ({ program_code: 'INDICE_FOUNDATIONS', program_version: '2026.2',
    completed_item_codes: [...saved],
    ...(mode === 'root' ? { audience_summary: { active_learners: 2, completed_checks: 3 } } : {}),
  });
  const exam = code => ({ code, question_count: 15, duration_minutes: 20, pass_score: 12,
    attempts: 0, passed: false, best_score: null, active_attempt_id: null, cooldown_until: null, ready: false });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    // The redirect destination is not under test; retain the real route loaders but
    // stub the ERP render so rejection does not require unrelated domain fixtures.
    if (url.pathname === '/src/app/App.tsx') return route.fulfill({ contentType: 'application/javascript', body:
      `import React from '/node_modules/.vite/deps/react.js'; export default function App() { return React.createElement('h1', null, 'ERP de prueba'); }`,
    });
    if (!url.pathname.startsWith('/api/')) return route.continue();
    calls.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === '/api/v1/auth/me') return route.fulfill({ json: actor() });
    const basePath = mode === 'root' ? '/api/v1/platform-admin/training' : '/api/v1/distributor-portal/training';
    if (url.pathname === basePath) return mode === 'denied'
      ? route.fulfill({ status: 403, json: { message: 'Training permission denied' } })
      : route.fulfill({ json: workspace() });
    if (url.pathname === `${basePath}/exams`) return route.fulfill({ json: {
      program_code: 'INDICE_FOUNDATIONS', program_version: '2026.2', server_time: new Date().toISOString(),
      modules: ['indice', 'rh', 'procesos', 'finanzas', 'ventas', 'kpis', 'comercial'].map(exam),
      final_exam: exam('final'), all_modules_passed: false, certificate: null,
    } });
    if (url.pathname === `${basePath}/progress` && request.method() === 'PATCH') {
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      const { itemCode, completed } = request.postDataJSON();
      completed ? saved.add(itemCode) : saved.delete(itemCode);
      return route.fulfill({ json: workspace() });
    }
    if (testingDashboard && url.pathname === '/api/v1/platform-admin/context') {
      return route.fulfill({ status: 403, json: { message: 'Platform administration permission denied' } });
    }
    if (testingDashboard && url.pathname === '/api/v1/finance/petty-cash') {
      return route.fulfill({ json: { funds: [], movements: [], statements: [], settlementLines: [], count: 0 } });
    }
    if (testingDashboard && url.pathname === '/api/v1/workspace-state/system/workbar-layout') {
      return route.fulfill({ json: { state: { position: 'top', dualScreenEnabled: false }, schemaVersion: 1 } });
    }
    if (testingDashboard && url.pathname.startsWith('/api/v1/exchange-rates/')) {
      return route.fulfill({ json: { ratesPerUsd: { USD: 1, MXN: 18, CAD: 1.4, EUR: 0.9 }, metadata: { mode: 'manual' } } });
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 500, json: { message: 'Unexpected synthetic API request' } });
  });
  const ready = () => page.getByRole('heading', { name: 'Centro de capacitación', exact: true }).waitFor();
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'training must fit the viewport');
  const navigation = () => page.getByRole('tablist', { name: 'Contenido de capacitación' });
  await page.goto(`${origin}/training`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await ready();
  await page.getByText('Academia Índice · versión 2026.2', { exact: true }).waitFor();
  assert.equal(await page.getByText('Participantes activos', { exact: true }).count(), 0);
  assert.equal(calls.some(call => call.includes('/platform-admin/')), false);
  await noOverflow();
  await page.screenshot({ path: '/tmp/indice-training-centre-desktop.png', fullPage: true });
  console.log('PASS: production router opens distributor training without platform or financial API requests');

  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: '/tmp/indice-training-centre-mobile.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/indice-training-centre-dark.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('PASS: independent shell fits mobile, desktop and dark mode');

  await navigation().getByRole('tab', { name: /Conoce Índice/ }).click();
  await page.getByRole('tablist', { name: 'Pilares de Índice', exact: true }).waitFor();
  await navigation().getByRole('tab', { name: 'Ruta de certificación', exact: true }).click();
  const learn = page.getByRole('button', { name: 'Marcar aprendido: Explicar qué es Índice', exact: true });
  await learn.click();
  await page.getByRole('button', { name: 'Marcar pendiente: Explicar qué es Índice', exact: true }).waitFor();
  assert.deepEqual([...saved], ['indice.propuesta']);
  await page.reload(); await ready();
  await navigation().getByRole('tab', { name: 'Ruta de certificación', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar pendiente: Explicar qué es Índice', exact: true }).waitFor();
  await navigation().getByRole('tab', { name: /Proceso de venta/ }).click();
  await page.getByRole('heading', { name: 'De prospecto a relación de largo plazo', exact: true }).waitFor();
  assert.ok(calls.some(call => call === 'PATCH /api/v1/distributor-portal/training/progress'));
  assert.equal(calls.some(call => call.includes('/platform-admin/')), false);
  console.log('PASS: induction, certification and commercial content work; progress uses CSRF and survives reload');

  await page.getByRole('combobox', { name: 'Idioma', exact: true }).selectOption('fr-CA');
  await page.getByRole('heading', { name: 'Centre de formation', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Retour à l’ERP', exact: true }).count(), 1);
  await page.getByRole('combobox', { name: 'Langue', exact: true }).selectOption('es-MX');
  console.log('PASS: changing language localizes the standalone shell and existing learning content');

  calls.length = 0;
  await page.goto(`${origin}/platform-admin?section=training`, { waitUntil: 'domcontentloaded' });
  await ready(); await page.waitForURL(`${origin}/training`);
  assert.equal(calls.some(call => call.includes('/platform-admin/')), false);
  calls.length = 0;
  await page.goto(`${origin}/distributor-portal?tab=training`, { waitUntil: 'domcontentloaded' });
  await ready(); await page.waitForURL(`${origin}/training`);
  assert.equal(calls.some(call => call.includes('/context')), false);
  console.log('PASS: real legacy loaders redirect before loading platform or distributor portfolio context');

  mode = 'root'; calls.length = 0;
  await page.reload(); await ready();
  await page.getByText('Participantes activos', { exact: true }).waitFor();
  assert.ok(calls.some(call => call === 'GET /api/v1/platform-admin/training'));
  assert.equal(calls.some(call => call.includes('/distributor-portal/')), false);
  assert.equal(calls.some(call => call.includes('/context')), false);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
  console.log('PASS: authorized platform viewers retain learning summaries without mounting platform management');

  testingDashboard = true; mode = 'denied'; calls.length = 0;
  await page.reload();
  await page.waitForURL(`${origin}/dashboard`);
  await page.getByRole('heading', { name: 'ERP de prueba', exact: true }).waitFor();
  assert.equal(await page.locator('[data-training-centre]').count(), 0);
  assert.equal(calls.some(call => call.includes('/platform-admin/')), false);
  assert.equal(calls.filter(call => call === 'GET /api/v1/distributor-portal/training').length, 1);
  console.log('PASS: a denied learner is redirected before training renders, with no platform fallback');

  mode = 'distributor'; calls.length = 0;
  await page.goto(`${origin}/platform-admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(`${origin}/dashboard`);
  await page.getByRole('heading', { name: 'ERP de prueba', exact: true }).waitFor();
  assert.ok(calls.some(call => call === 'GET /api/v1/platform-admin/context'));
  assert.equal(await page.locator('[data-training-centre]').count(), 0);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
  console.log('PASS: distributor training access does not unlock the real platform-admin route');
} catch (error) {
  if (page) {
    console.error('Synthetic browser failure at', page.url(), await page.locator('body').innerText());
    await page.screenshot({ path: '/tmp/indice-training-centre-failure.png', fullPage: true });
  }
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
