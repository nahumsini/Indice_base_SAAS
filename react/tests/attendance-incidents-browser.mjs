import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const root = resolve(import.meta.dirname, '..'), evidence = '/tmp/indice-attendance-incident-review';
const require = createRequire(root + '/package.json');
const { createServer } = await import(require.resolve('vite'));
const { default: react } = await import(require.resolve('@vitejs/plugin-react'));
const { default: tailwind } = await import(root + '/node_modules/@tailwindcss/vite/dist/index.mjs');
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const entry = `import {createRoot} from 'react-dom/client';import {LanguageProvider} from '/src/app/shared/context';import {setCachedAuthSession,setCachedCsrfToken} from '/src/app/api/authSessionStore';import {TimeTableModal} from '/src/app/BasicModules/HumanResources/Control/components/TimeTableModal';import '/src/styles/index.css';
setCachedAuthSession({user:{id:9001,role:'admin',name:'Synthetic',module_slugs:['human_resources'],tab_permissions_configured:true,tab_permission_keys:['human_resources.control']},company:{id:9001,name:'Synthetic',active:true,role:'admin',commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});setCachedCsrfToken('synthetic-csrf');
createRoot(document.getElementById('root')).render(<LanguageProvider><TimeTableModal isOpen assignments={[]} date='2026-10-24' locale='es-MX' isSaving={false} onDateChange={()=>{}} onRemoveShift={()=>{}} onClose={()=>{}}/></LanguageProvider>);`;
const fixture = { name: 'private-release-fixture', resolveId(id) { if (id === '/__release-incident.tsx')
        return id; }, load(id) { if (id === '/__release-incident.tsx')
        return entry; }, configureServer(server) { server.middlewares.use(async (req, res, next) => { if (req.url !== '/incident-release.html')
        return next(); res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(req.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/__release-incident.tsx"></script></body></html>')); }); } };
const origin = 'http://127.0.0.1:5226';
const server = await createServer({ root, configFile: false, cacheDir: '/tmp/indice-update-incident-vite', plugins: [fixture, react(), tailwind()], resolve: { alias: { '@': root + '/src' } }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' }, server: { host: '127.0.0.1', port: 5226, strictPort: true, hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { try {
    localStorage.setItem('frontend-indice-language', 'es-MX');
}
catch { } });
const errors = [], unexpected = [];
let fail = false, requests = 0;
const totals = { statuses: { on_time: 1, late: 1 }, daysWithEntry: 2, incompleteDays: 1, minutesLate: 5, recordedMinutes: 500 };
await context.route('**/*', async (route) => { const request = route.request(), u = new URL(request.url()); if (u.origin !== origin) {
    unexpected.push('external');
    return route.abort();
} if (!u.pathname.startsWith('/api/'))
    return route.continue(); assert.equal(request.method(), 'GET', 'No business mutation in native report validation'); if (u.pathname.endsWith('/company'))
    return route.fulfill({ json: { nombre_empresa: 'Empresa sintética', map: [] } }); if (u.pathname === '/api/v1/hr/attendance/incidents') {
    requests++;
    if (fail)
        return route.fulfill({ status: 503, json: {} });
    const employees = [1, 2].map(id => ({ person: { id, code: 'SYN-' + id, name: 'Colaborador sintético ' + id, position: 'Analista', department: 'Operación', unitId: null, unitName: '', businessId: null, businessName: '', hireDate: '2020-01-01', lastWorkingDay: null, employmentStatus: 'active' }, days: [{ date: '2026-10-01', status: 'on_time', systemStatus: 'on_time', correctedStatus: null, checkIn: '2026-10-01T09:00:00', checkOut: '2026-10-01T17:00:00', minutesLate: 0, recordedMinutes: 480, incomplete: false, notes: 'Texto <seguro>' }, { date: '2026-10-02', status: 'late', systemStatus: 'late', correctedStatus: null, checkIn: '2026-10-02T09:05:00', checkOut: null, minutesLate: 5, recordedMinutes: null, incomplete: true, notes: 'Revisar salida' }], totals }));
    return route.fulfill({ json: { from: u.searchParams.get('from'), to: u.searchParams.get('to'), generatedAt: '2026-10-24T12:00:00', calendarDays: 2, employeeCount: 2, employees, totals: { ...totals, statuses: { on_time: 2, late: 2 }, incompleteDays: 2 } } });
} unexpected.push(u.pathname); return route.fulfill({ status: 500, json: {} }); });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
try {
    await mkdir(evidence, { recursive: true });
    await page.goto(origin + '/incident-release.html');
    await page.getByRole('heading', { name: 'Incidencias de nómina', exact: true }).waitFor();
    const print = page.getByRole('button', { name: 'Imprimir / Guardar PDF', exact: true });
    assert.equal(await print.isDisabled(), true);
    await page.getByLabel('Desde', { exact: true }).fill('2026-10-01');
    await page.getByLabel('Hasta', { exact: true }).fill('2026-10-02');
    await page.getByRole('button', { name: 'Consultar informe', exact: true }).click();
    await page.getByText('Colaborador sintético 1', { exact: true }).first().waitFor();
    await print.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Imprimir / Guardar PDF') && !b.disabled));
    await page.getByRole('button', { name: 'Ver días', exact: true }).first().click();
    await page.getByText('Revisar salida', { exact: false }).filter({ visible: true }).first().waitFor();
    await page.getByRole('button', { name: 'Vista de impresión', exact: true }).click();
    const frame = page.frameLocator('iframe');
    await frame.locator('body').filter({ hasText: 'Empresa sintética' }).waitFor();
    assert.ok((await frame.locator('body').innerText()).includes('Colaborador sintético 1'));
    assert.ok(!(await frame.locator('body').innerText()).includes('Colaborador sintético 2'));
    assert.ok((await frame.locator('body').innerText()).includes('Texto <seguro>'));
    await page.getByRole('button', { name: 'Volver al informe', exact: true }).click();
    await page.getByLabel('Hasta', { exact: true }).fill('2026-10-03');
    assert.equal(await print.isDisabled(), true);
    await page.getByRole('status').filter({ hasText: 'Cambiaste la selección' }).waitFor();
    fail = true;
    await page.getByRole('button', { name: 'Consultar informe', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'No se pudo preparar' }).waitFor();
    assert.equal(await print.isDisabled(), true);
    fail = false;
    await page.getByRole('button', { name: 'Consultar informe', exact: true }).click();
    await page.getByText('Colaborador sintético 1', { exact: true }).first().waitFor();
    for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        await page.waitForFunction(() => { const n = document.querySelector('[role=dialog]'); if (!n)
            return false; const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.ok(await page.getByRole('dialog').evaluate(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; }));
        await page.screenshot({ path: evidence + '/incidents-' + width + '.png', animations: 'disabled' });
    }
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: evidence + '/incidents-dark.png', animations: 'disabled' });
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    await writeFile(evidence + '/incident-flow-proof.json', JSON.stringify({ result: 'PASS', requests, summary: true, detail: true, escapedPrintPreview: true, changedFilterAndFailedRequestBlockPrinting: true, viewportWidths: [1440, 390, 320], dark: true, mutations: 0 }, null, 2));
    console.log('PASS native incident report: query, summary/detail, scoped escaped print preview, stale/error print protection, desktop/mobile/dark, no mutation.');
}
catch (error) {
    await page.screenshot({ path: evidence + '/failure.png', animations: 'disabled' });
    await writeFile(evidence + '/failure.json', JSON.stringify({ errors, unexpected, body: await page.locator('body').innerText() }, null, 2));
    throw error;
}
finally {
    await browser.close();
    await server.close();
}
