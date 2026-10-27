import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { loadTypescript } from './helpers/hook-runtime.mjs';

const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..'), origin = 'http://127.0.0.1:5233';
const definitions = loadTypescript(resolve(root, 'src/app/BasicModules/Dashboard/Integrations/constants.ts'), () => ({}));
const scopes = ['openid', 'email', ...definitions.AI_SCOPE_DEFINITIONS.map(scope => scope.code)];
assert.ok(scopes.join(' ').length > 2048);
const query = new URLSearchParams({ response_type: 'code', client_id: 'synthetic-client',
  redirect_uri: origin + '/oauth-test-complete', scope: scopes.join(' '), state: 'synthetic-state',
  code_challenge: 'A'.repeat(43), code_challenge_method: 'S256', resource: origin + '/mcp' });
const server = await createServer({ root, cacheDir: '/tmp/indice-ai-oauth-vite',
  server: { host: '127.0.0.1', port: 5233, strictPort: true, hmr: false, watch: null },
  define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH
  ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const decisions = [], errors = [], external = [];
let mode = 'invalid_scope', approvalFails = true;
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
  if (url.pathname === '/oauth-test-complete') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>Conexión sintética completada</h1>' });
  if (!url.pathname.startsWith('/api/')) return route.continue();
  if (url.pathname === '/api/v1/auth/me') return route.fulfill({ json: {
    user: { id: 1, name: 'Usuario sintético' }, company: { id: 1, name: 'Empresa sintética' },
    companies: [], csrfToken: 'synthetic-csrf',
  } });
  assert.equal(url.pathname, '/api/v1/ai/oauth/consent');
  if (request.method() === 'POST') {
    assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
    decisions.push(request.postDataJSON());
    if (approvalFails) return route.fulfill({ status: 400, json: { error: 'invalid_request', error_description: 'private details' } });
    return route.fulfill({ json: { redirectUrl: origin + '/oauth-test-complete' } });
  }
  assert.equal(url.searchParams.get('scope'), query.get('scope'));
  if (mode === 'network') return route.abort();
  if (mode === 'success') return route.fulfill({ json: { clientName: 'Asistente sintético', scopes, expiresInDays: 30, userName: 'Usuario sintético' } });
  return route.fulfill({ status: mode === 'capacity' ? 409 : mode === 'unauthorized' ? 401 : mode === 'unknown' ? 500 : 400,
    json: { error: mode === 'capacity' ? 'connection_limit_reached' : mode, error_description: 'private details' } });
});
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
const open = async next => { mode = next; await page.goto(origin + '/tests/browser/ai-oauth.html?' + query); };
const has = text => page.getByText(text, { exact: false }).waitFor();
try {
  await open('invalid_scope'); await has('permisos no válidos');
  assert.doesNotMatch(await page.locator('[role=alert]').innerText(), /Request failed|private details/);
  assert.equal(decisions.length, 0);
  mode = 'success'; await page.getByRole('button', { name: 'Volver a comprobar' }).click();
  await has('Asistente sintético'); assert.ok(await page.getByRole('button', { name: /^Autorizar/ }).isEnabled());
  assert.equal(decisions.length, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: /^Autorizar/ }).click(); await has('incompleta o ya no es válida');
  assert.deepEqual(decisions[0], { approved: true, ...Object.fromEntries(query) });
  approvalFails = false; await page.getByRole('button', { name: /^Autorizar/ }).click();
  await has('Conexión sintética completada'); assert.equal(decisions.length, 2);
  await open('capacity'); await page.getByRole('heading', { name: 'No hay espacio para una conexión nueva' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Administrar conexiones' }).count(), 1);
  await open('unauthorized'); await page.getByRole('heading', { name: 'Ingresar de nuevo' }).waitFor();
  for (const next of ['invalid_target', 'unknown', 'network']) {
    await open(next); await page.locator('[role=alert]').waitFor();
    assert.doesNotMatch(await page.locator('[role=alert]').innerText(), /Request failed|private details|Failed to fetch/);
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log('PASS OAuth: full catalog, localized errors, retry, CSRF decision, redirect, capacity, login, mobile; no external requests');
} catch (error) {
  console.error('Synthetic OAuth browser failure:', { path: new URL(page.url()).pathname,
    decisions: decisions.length, errors, text: (await page.locator('body').innerText()).slice(-700) });
  throw error;
} finally { await browser.close(); await server.close(); }
