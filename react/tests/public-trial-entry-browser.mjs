import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';

// Real entry/router/UI, synthetic backend only. No functional DB, personal data or external requests.
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5199';
const server = await createServer({ root: resolve(import.meta.dirname, '..'),
  server: { host: '127.0.0.1', port: 5199, strictPort: true },
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
  const errors = [], unexpected = [], calls = [];
  let enabled = true, interest = null, lostActivationResponse = true, accountRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    calls.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === '/api/v1/auth/me') return route.fulfill({ status: 401, json: { message: 'Not signed in' } });
    if (url.pathname === '/api/v1/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' } });
    const base = '/api/v1/billing/signup/trial-entry';
    if (url.pathname === `${base}/config`) return route.fulfill({ json: {
      enabled, trialDays: 15, includedSeats: 10, cardRequired: false, paidActivationReady: false, countries: ['MX', 'CA'],
    } });
    if (request.method() === 'POST' && url.pathname.startsWith(base)) {
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      const body = request.postDataJSON();
      if (url.pathname === `${base}/interest`) {
        assert.match(request.headers()['idempotency-key'], /^[a-f0-9]{64}$/);
        interest = body;
        assert.equal(body.countryCode, 'CA'); assert.equal(body.email, body.confirmEmail);
        assert.equal('password' in body, false); assert.equal(body.contactConsent, true);
        return route.fulfill({ status: 201, json: { entryReference: 'a'.repeat(64), expiresAt: '2026-10-09T12:00:00Z' } });
      }
      if (url.pathname.includes('/email-verification/')) {
        assert.equal(body.entryReference, 'a'.repeat(64));
        const verified = url.pathname.endsWith('/verify') && body.otpCode === '123456';
        if (url.pathname.endsWith('/verify') && !verified) return route.fulfill({ json: {
          started: false, verified: false, blocked: false, verificationReference: '', maskedEmail: '',
          expiresInSeconds: 0, resendAvailableInSeconds: 0, verifiedExpiresAt: null, message: 'Invalid code',
        } });
        return route.fulfill({ json: { started: true, verified, blocked: false,
          verificationReference: 'b'.repeat(64), maskedEmail: 't***@example.com', expiresInSeconds: 600,
          resendAvailableInSeconds: 30, verifiedExpiresAt: verified ? '2026-10-08T18:00:00Z' : null, message: '' } });
      }
      if (url.pathname === `${base}/account`) {
        assert.equal(body.emailVerificationReference, 'b'.repeat(64));
        assert.equal(body.acceptedTrialTerms, true); assert.equal(body.entryReference, 'a'.repeat(64));
        accountRequests++;
        if (lostActivationResponse) { lostActivationResponse = false; return route.abort('failed'); }
        return route.fulfill({ json: { provisioned: true, requiresReview: false, replayed: true,
          trialStartsAt: '2026-10-08T12:00:00Z', trialEndsAt: '2026-10-23T12:00:00Z', loginPath: '/login' } });
      }
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 500, json: { message: 'Unexpected synthetic request' } });
  });
  await page.goto(`${origin}/start?market=CA&utm_source=browser-test`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Comienza tu demo de Índice por 15 días' }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'País de tu empresa' }).inputValue(), 'CA');
  await page.screenshot({ path: '/tmp/indice-entry-desktop-20261008.png', fullPage: true });
  await page.getByLabel('Nombre completo', { exact: true }).fill('Trial Test Owner');
  await page.getByLabel('Nombre de la empresa', { exact: true }).fill('Synthetic Trial Company');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('trial-test@example.com');
  await page.getByLabel('Confirmar correo', { exact: true }).fill('trial-test@example.com');
  await page.getByLabel('¿Qué te gustaría mejorar?', { exact: true }).fill('Organize sales and appointments');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Guardar mis datos y continuar' }).click();
  await page.getByLabel('Código de verificación del correo', { exact: true }).fill('999999');
  await page.getByRole('button', { name: 'Verificar correo', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Código incorrecto' }).waitFor();
  assert.equal(await page.getByLabel('Crea una contraseña').count(), 0);
  await page.getByLabel('Código de verificación del correo', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar correo', exact: true }).click();
  await page.getByLabel('Crea una contraseña').fill('Synthetic-Test-Password1');
  assert.equal(await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).isDisabled(), true);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'No pudimos completar' }).waitFor();
  await page.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click();
  await page.getByRole('heading', { name: 'Tu cuenta está lista', exact: true }).waitFor();
  assert.equal(accountRequests, 2);
  assert.equal(calls.filter(call => call.endsWith('/interest')).length, 1);
  assert.equal(interest.utmSource, 'browser-test');
  assert.ok(await page.getByText('Demo disponible hasta', { exact: false }).count());
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log('PASS: real flow saves lead before OTP, rejects invalid OTP, requires terms, and retries activation without another lead');

  await page.setViewportSize({ width: 390, height: 844 });
  enabled = false;
  await page.reload();
  await page.getByText('La activación de la demo aún no está disponible.', { exact: false }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Guardar mis datos y continuar' }).isDisabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '/tmp/indice-entry-mobile-20261008.png', fullPage: true });
  console.log('PASS: disabled entry fails closed and mobile layout has no horizontal overflow');

  await page.getByRole('button', { name: 'Seleccionar idioma de visualización' }).first().click();
  await page.getByRole('menuitem', { name: 'Français (Québec)', exact: false }).click();
  await page.getByRole('heading', { name: 'Commencez votre essai Indice de 15 jours', exact: true }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Pays de l’entreprise' }).inputValue(), 'CA');
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log('PASS: French localization does not change the Canadian business country or fetch tenant administration');
} finally {
  await browser?.close(); await server.close();
}
