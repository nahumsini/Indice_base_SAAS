import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5200';
const virtual = '/__trial-payment-test.tsx';
// Actual native billing wrapper/components and API client; synthetic responses, no external access.
const server = await createServer({ root: resolve(import.meta.dirname, '..'),
  server: { host: '127.0.0.1', port: 5200, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  plugins: [{ name: 'isolated-regional-payment-test', resolveId: id => id === virtual ? id : null,
    load: id => id === virtual ? `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {MemoryRouter} from 'react-router'; import {LanguageProvider} from '/src/app/shared/context';
      import SubscriptionManagementPage from '/src/app/Billing/SubscriptionManagementPage'; import '/src/styles/index.css';
      createRoot(document.getElementById('root')).render(<LanguageProvider><MemoryRouter><SubscriptionManagementPage/></MemoryRouter></LanguageProvider>);` : null,
    configureServer: server => { server.middlewares.use((req, res, next) => {
      if (req.url !== '/__trial-payment') return next();
      res.setHeader('Content-Type', 'text/html');
      server.transformIndexHtml('/__trial-payment', `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="${virtual}"></script></body></html>`)
        .then(html => res.end(html)).catch(next);
    }); },
  }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
  let ready = true, timing = 'AFTER_TRIAL', setupStatus = 'NONE';
  const keys = [], errors = [], unexpected = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Synthetic browser error:', error.message); });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/v1/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    if (url.pathname === '/api/v1/auth/managed-companies') return route.fulfill({ json: { active: false } });
    if (url.pathname === '/api/v1/billing/subscription/invoices') return route.fulfill({ json: { invoices: [] } });
    if (url.pathname === '/api/v1/billing/subscription') return route.fulfill({ status: 404, json: {} });
    if (url.pathname === '/api/v1/billing/subscription/trial-payment') {
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        assert.equal(body.acceptedAutomaticPayment, true); assert.equal(body.termsVersion, 'AUTOPAY_REGIONAL_15D_V1');
        assert.equal('companyId' in body, false); assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
        keys.push(request.headers()['idempotency-key']);
        return route.fulfill({ status: 503, json: { code: 'REGIONAL_PAYMENT_UNAVAILABLE' } });
      }
      const interval = url.searchParams.get('interval') || 'MONTH';
      return route.fulfill({ json: { cohort: true, converted: false, paymentReady: ready, countryCode: 'CA',
        trialEndsAt: '2026-10-23T22:00:00Z', setupStatus, checkoutUrl: null, offers: ready ? [{
          productCode: 'ca_controla', displayName: 'Controla · CA', billingInterval: interval, currency: 'CAD',
          amountBeforeTaxCents: interval === 'MONTH' ? 19900 : 191040, includedSeats: 10,
          quoteHash: `${interval}-${timing}`, termsVersion: 'AUTOPAY_REGIONAL_15D_V1', chargeTiming: timing,
          originalTrialEndsAt: '2026-10-23T22:00:00Z', capabilities: ['hr', 'process_tasks'],
        }] : [] } });
    }
    unexpected.push(`${request.method()} ${url.pathname}`); return route.fulfill({ status: 500, json: {} });
  });
  await page.goto(`${origin}/__trial-payment`);
  await page.getByRole('heading', { name: 'Tu demo, plan y pago' }).waitFor();
  await page.getByRole('radio').check();
  const submit = page.getByRole('button', { name: 'Registrar método de pago seguro' });
  assert.equal(await submit.isDisabled(), true);
  await page.getByRole('checkbox').check();
  await page.screenshot({ path: '/tmp/indice-regional-payment-desktop-20261008.png', fullPage: true });
  await submit.click(); await page.getByRole('alert').waitFor(); await submit.click();
  await page.waitForFunction(() => document.querySelector('[role="alert"]') !== null);
  assert.equal(keys.length, 2); assert.match(keys[0], /^[a-f0-9]{64}$/); assert.equal(keys[0], keys[1]);
  await page.getByRole('combobox').selectOption('YEAR');
  await page.getByRole('radio').check(); assert.equal(await page.getByRole('checkbox').isChecked(), false);
  console.log('PASS: explicit mandate, native CSRF, same retry key, quote change resets consent');
  setupStatus = 'METHOD_REGISTERED'; await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.getByText('Método de pago registrado.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('radio').isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Registrar método de pago seguro' }).count(), 0);
  console.log('PASS: card registration is not displayed as paid conversion');
  setupStatus = 'NONE'; timing = 'IMMEDIATE'; await page.reload(); await page.getByRole('radio').check();
  await page.getByText('Mi demo terminó.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('checkbox').isChecked(), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(await page.locator('[data-indice-admin-workspace-header]').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/indice-regional-payment-mobile-dark-20261008.png' });
  ready = false; await page.reload(); await page.getByText('El pago regional aún no está disponible.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('radio').count(), 0);
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log('PASS: late payment needs new explicit mandate, unavailable gate and mobile/dark layout');
} finally { await browser?.close(); await server.close(); }
