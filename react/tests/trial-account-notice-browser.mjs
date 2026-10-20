import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5201';
const virtual = '/__trial-notice-test.tsx';
// Actual Billing notice/router/client; synthetic sessions, no external requests or payment writes.
const server = await createServer({ root: resolve(import.meta.dirname, '..'),
  server: { host: '127.0.0.1', port: 5201, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  plugins: [{ name: 'isolated-trial-notice-test', resolveId: id => id === virtual ? id : null,
    load: id => id === virtual ? `import React, {useState, useEffect} from 'react'; import {createRoot} from 'react-dom/client';
      import {MemoryRouter, useLocation} from 'react-router'; import {LanguageProvider} from '/src/app/shared/context';
      import {TrialAccountNotice} from '/src/app/Billing/components/TrialAccountNotice'; import '/src/styles/index.css';
      function Host() {
        const [config, setConfig] = useState({session: {user: {id: 1}, company: {id: 1, subscription: {access_allowed: true, lock_reason: ''}}}, revision: 1, recovery: false});
        useEffect(() => { const change = event => setConfig(event.detail); window.addEventListener('trial-test-context', change);
          return () => window.removeEventListener('trial-test-context', change); }, []);
        return <div className="mx-auto max-w-6xl p-4"><TrialAccountNotice session={config.session} authorizationRevision={config.revision}
          recovery={config.recovery} fallback={<p data-testid="fallback">Native subscription recovery</p>}/>
          <output data-testid="path">{useLocation().pathname}</output></div>;
      }
      createRoot(document.getElementById('root')).render(<LanguageProvider><MemoryRouter><Host/></MemoryRouter></LanguageProvider>);` : null,
    configureServer: server => { server.middlewares.use((req, res, next) => {
      if (req.url !== '/__trial-notice') return next();
      res.setHeader('Content-Type', 'text/html');
      server.transformIndexHtml('/__trial-notice', `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="${virtual}"></script></body></html>`)
        .then(html => res.end(html)).catch(next);
    }); },
  }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date('2026-10-09T22:00:00Z'));
  await page.addInitScript(() => {
    if (!localStorage.getItem('frontend-indice-language')) localStorage.setItem('frontend-indice-language', 'es-MX');
  });
  let data = { cohort: true, converted: false, paymentReady: true, countryCode: 'CA',
    trialEndsAt: '2026-10-23T22:00:00Z', setupStatus: 'NONE', checkoutUrl: null, offers: [] };
  let status = 200, revision = 1, holdNext = false, held = null;
  const errors = [], unexpected = [], writes = [], sessionReads = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (request.method() !== 'GET') { writes.push(request.method()); return route.abort(); }
    if (url.pathname === '/api/v1/auth/me') {
      sessionReads.push(url.pathname);
      // Native apiClient revalidates session after a denied owner/delegated-context read.
      return route.fulfill({ json: { user: { id: 2, name: 'Synthetic', role: 'user' },
        company: { id: 1, name: 'Synthetic', active: true, scope: { type: 'corporate_office' } },
        companies: [], csrfToken: 'synthetic-unused' } });
    }
    if (url.pathname !== '/api/v1/billing/subscription/trial-payment') {
      unexpected.push(url.pathname); return route.fulfill({ status: 500, json: {} });
    }
    if (holdNext) { holdNext = false; held = { route, data: { ...data } }; return; }
    return route.fulfill({ status, json: status === 200 ? data : { code: 'OWNER_PAYMENT_CONTEXT_REQUIRED' } });
  });
  const context = async ({ company = 1, user = 1, blocked = false, recovery = false, reason = 'trial_expired' } = {}) => {
    await page.evaluate(config => window.dispatchEvent(new CustomEvent('trial-test-context', { detail: config })), {
      session: { user: { id: user }, company: { id: company, subscription: { access_allowed: !blocked, lock_reason: blocked ? reason : '' } } },
      revision: ++revision, recovery,
    });
  };
  await page.goto(`${origin}/__trial-notice`);
  await page.getByText('Quedan 14 días', { exact: true }).waitFor();
  const notice = page.locator('[data-trial-account-notice]');
  await page.getByRole('button', { name: 'Elegir plan y registrar tarjeta' }).focus();
  await page.screenshot({ path: '/tmp/indice-trial-notice-desktop-20261008.png', fullPage: true });
  await page.getByRole('button', { name: 'Elegir plan y registrar tarjeta' }).press('Enter');
  await page.getByTestId('path').filter({ hasText: '/billing' }).waitFor();
  assert.deepEqual(writes, []);
  console.log('PASS: visible original deadline, 14-day badge and keyboard CTA only navigate to native billing');

  data = { ...data, setupStatus: 'METHOD_REGISTERED' }; await context();
  await page.getByText('Método de pago registrado.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Elegir plan y registrar tarjeta' }).count(), 0);
  await page.getByRole('button', { name: 'Revisar plan y pago' }).waitFor();
  data = { ...data, setupStatus: 'SETUP_PENDING' }; await context();
  await page.getByText('El registro de pago está pendiente.', { exact: false }).waitFor();
  console.log('PASS: saved method and pending setup remain review-only, not paid conversion');

  data = { ...data, setupStatus: 'NONE' };
  await page.clock.setFixedTime(new Date('2026-10-23T21:59:59Z')); await context();
  await page.getByText('Quedan menos de 24 horas', { exact: true }).waitFor();
  await page.clock.setFixedTime(new Date('2026-10-23T22:00:00Z'));
  await context({ blocked: true, recovery: true });
  await page.getByRole('heading', { level: 1, name: 'Tu demo terminó' }).waitFor();
  await page.getByRole('button', { name: 'Activar mi cuenta' }).waitFor();
  await page.getByText('Los datos de tu empresa se conservan.', { exact: false }).waitFor();
  data = { ...data, paymentReady: false }; await context({ blocked: true, recovery: true });
  await page.getByText('Contacta a Índice para revisar la activación;', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Activar mi cuenta' }).count(), 0);
  console.log('PASS: cutoff recovery preserves data and payment-disabled state does not promise activation');

  await context({ blocked: true, recovery: true, reason: 'past_due' });
  await page.getByTestId('fallback').waitFor();
  for (const override of [{ cohort: false }, { converted: true }]) {
    const original = data; data = { ...data, ...override }; await context();
    await notice.waitFor({ state: 'hidden' }); data = original;
  }
  status = 403; await context({ user: 2 }); await notice.waitFor({ state: 'hidden' });
  await context({ user: 2, recovery: true, blocked: true }); await page.getByTestId('fallback').waitFor();
  status = 503; await context(); await notice.waitFor({ state: 'hidden' });
  status = 200; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await notice.waitFor();
  console.log('PASS: historical, converted, delegated/non-owner and errors hide notice; native fallback and focus retry remain');

  holdNext = true; data = { ...data, trialEndsAt: '2026-11-23T22:00:00Z' };
  await context({ company: 11 });
  await page.waitForFunction(() => document.querySelector('[data-trial-account-notice]') === null);
  for (let attempts = 0; !held && attempts < 40; attempts++) await new Promise(resolve => setTimeout(resolve, 25));
  assert.ok(held, 'old-company request is held');
  data = { ...data, cohort: false }; await context({ company: 12 });
  await held.route.fulfill({ json: held.data });
  await notice.waitFor({ state: 'hidden' });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await notice.waitFor({ state: 'hidden' });
  console.log('PASS: late company response cannot restore the old owner notice');

  data = { ...data, cohort: true, trialEndsAt: '2026-10-23T22:00:00Z' };
  await context({ blocked: true, recovery: true }); await notice.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/indice-trial-notice-mobile-dark-20261008.png', fullPage: true });
  await page.evaluate(() => localStorage.setItem('frontend-indice-language', 'fr-CA')); await page.reload();
  await page.getByRole('heading', { name: 'Votre essai est terminé' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); assert.deepEqual(writes, []);
  assert.equal(sessionReads.length, 2);
  console.log('PASS: 390px neutral-dark layout and French localized recovery, no external requests or writes');
} finally { await browser?.close(); await server.close(); }
