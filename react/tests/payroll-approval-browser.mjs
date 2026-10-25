import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

// Real payroll workspace and modal engine; only the parent mutation is synthetic.
// No credentials, real APIs, notifications, payroll approvals or payments are used.
const root = resolve(import.meta.dirname, '..');
const evidence = '/tmp/indice-payroll-approval-review';
const require = createRequire(root + '/package.json');
const { createServer } = await import(require.resolve('vite'));
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5228';
const entry = `
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {LanguageProvider} from '/src/app/context/LanguageContext';
import {PayrollRunWorkspaceDialog} from '/src/app/BasicModules/HumanResources/Payroll/components/payroll-run-workspace/PayrollRunWorkspaceDialog';
import {buildPayrollLineDraft} from '/src/app/BasicModules/HumanResources/Payroll/components/payroll-run-workspace/payrollRunWorkspaceModel';
import {getPayrollTranslations} from '/src/app/BasicModules/HumanResources/Payroll/translations';
import '/src/styles/index.css';
const initial = {run:{id:501,status:'draft',grouping_mode:'single',pay_period:'monthly',period_start_date:'2026-10-01',period_end_date:'2026-10-31',users_count:1,gross_amount:1000,deductions_amount:100,net_amount:900,currency_code:'MXN',native_totals_by_currency:{MXN:900}},lines:[{id:101,user_name:'Colaborador de prueba',user_code:'TEST-1',position_title:'Analista',department:'Operaciones',unit_name:'Unidad de prueba',business_name:'Negocio de prueba',currency_code:'MXN',country_code:'MX',days_payable:30,regular_hours:160,overtime_hours:0,late_count:0,leave_days:0,absence_days:0,salary_type:'daily',gross_amount:1000,deductions_amount:100,net_amount:900,payroll_treatment:'operational_payroll',include_in_fiscal:false,items:[],attendance_warnings:[],calculation_warnings:[]}]};
window.approvals = 0;
function Fixture(){
 const [detail,setDetail]=useState(initial), [dirty,setDirty]=useState(false), [allowed,setAllowed]=useState(true), [busy,setBusy]=useState(false), [notice,setNotice]=useState(null);
 window.payrollFixture={setDirty,setAllowed,setDetail,initial};
 const approve=()=>{window.approvals++;setBusy(true);setNotice(null);setTimeout(()=>{if(window.approvals===1)setNotice({tone:'error',message:'No se pudo aprobar. Reintenta.'});else setDetail(current=>({...current,run:{...current.run,status:'approved'}}));setBusy(false);},500);};
 const [draft,setDraft]=useState(()=>buildPayrollLineDraft(initial.lines[0]));
 const noop=()=>{};
 return <LanguageProvider><PayrollRunWorkspaceDialog isOpen detail={detail} copy={getPayrollTranslations('es-MX')} locale="es-MX" canApproveAction={allowed} canPrepareAction={allowed} canCancelAction={allowed} canManageReporting={false} canPrint={false} isSaving={busy} activeBusyKind={busy?'approve-run':null} notice={notice} dirtyLineIds={new Set(dirty?[101]:[])} lineDraft={draft} selectedLine={detail.lines[0]} selectedLineId={101} onApprove={approve} onCancel={noop} onChangeDraft={(next)=>{setDraft(next);setDirty(true);}} onClose={noop} onDiscardDrafts={()=>setDirty(false)} onDownloadCsv={noop} onDownloadPdf={noop} onIncentiveApplied={noop} onOpenGovernmentReporting={noop} onProcess={noop} onPrintLine={noop} onSaveLine={noop} onSelectLine={noop}/></LanguageProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);`;
const flowEntry = `
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '/src/app/context/LanguageContext';
import {BusinessCurrencyProvider} from '/src/app/BasicModules/shared/BusinessCurrencyContext';
import {setCachedAuthSession,setCachedCsrfToken} from '/src/app/api/authSessionStore';
import Payroll from '/src/app/BasicModules/HumanResources/Payroll/Payroll';
import '/src/styles/index.css';
setCachedAuthSession({user:{id:9001,role:'admin',name:'Synthetic'},company:{id:9001,name:'Synthetic',active:true,role:'admin'},companies:[],csrfToken:'synthetic-csrf'});
setCachedCsrfToken('synthetic-csrf');
createRoot(document.getElementById('root')).render(<LanguageProvider><BusinessCurrencyProvider><Payroll/></BusinessCurrencyProvider></LanguageProvider>);`;
const fixture = {
  name: 'payroll-approval-fixture',
  resolveId(id) { if (['/__payroll-review.tsx', '/__payroll-flow.tsx'].includes(id)) return id; },
  load(id) { if (id === '/__payroll-review.tsx') return entry; if (id === '/__payroll-flow.tsx') return flowEntry; },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!['/payroll-review.html', '/payroll-flow.html'].includes(req.url)) return next();
      res.setHeader('Content-Type', 'text/html');
      const script = req.url === '/payroll-flow.html' ? 'flow' : 'review';
      res.end(await server.transformIndexHtml(req.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__payroll-' + script + '.tsx"></script></body></html>'));
    });
  },
};
const server = await createServer({ root, configFile: root + '/vite.config.ts', cacheDir: '/tmp/indice-payroll-review-vite', plugins: [fixture], server: { host: '127.0.0.1', port: 5228, strictPort: true, hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
const unexpected = [], errors = [];
const run = { id: 501, status: 'draft', grouping_mode: 'single', grouping_label: 'Equipo de prueba', pay_period: 'monthly', period_start_date: '2026-10-01', period_end_date: '2026-10-31', users_count: 1, gross_amount: 1000, deductions_amount: 100, employer_contributions_amount: 0, net_amount: 900, currency_code: 'MXN', native_totals_by_currency: { MXN: 900 }, jurisdiction_label: 'MX', statutory_compliance: true, unsupported_country_count: 0 };
const line = { id: 101, run_id: 501, user_company_id: 9001, user_name: 'Colaborador de prueba', pay_period: 'monthly', salary_type: 'fixed', currency_code: 'MXN', country_code: 'MX', gross_amount: 1000, deductions_amount: 100, net_amount: 900, payroll_treatment: 'operational_payroll', include_in_fiscal: false, items: [], attendance_warnings: [], calculation_warnings: [] };
const preferences = { grouping_mode: 'single', default_daily_hours: 8, pay_leave_days: true, weekly_start_day: 1, biweekly_first_day: 1, biweekly_second_day: 16, monthly_start_day: 1, isr_rate: 0.1, imss_user_rate: 0.04, infonavit_user_rate: 0.03, imss_employer_rate: 0.07, infonavit_employer_rate: 0.05, sar_employer_rate: 0.02 };
let fullFlow = false, created = false, createCalls = 0, processCalls = 0, approvalCalls = 0;
let holdOverview = false, releaseOverview;
let checkRequestOrder = false, releaseOldList;
const mutations = [];
const preferencePayloads = [];
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  const request = route.request(), path = url.pathname;
  if (fullFlow && url.origin === origin && path.startsWith('/api/')) {
    if (path === '/api/v1/hr/payroll/preferences' && request.method() === 'PUT') {
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      preferencePayloads.push(JSON.parse(request.postData()));
      if (preferencePayloads.length === 1) return route.fulfill({ status: 422, json: { message: 'No se pudieron guardar las preferencias. Reintenta.' } });
      Object.assign(preferences, preferencePayloads.at(-1));
      await new Promise(resolve => setTimeout(resolve, 350));
      return route.fulfill({ json: preferences });
    }
    if (path.startsWith('/api/v1/workspace-state/')) return route.fulfill({ json: { version: 0, state: {} } });
    if (path === '/api/v1/config-center/company') return route.fulfill({ json: { nombre_empresa: 'Empresa de prueba', map: [] } });
    if (path === '/api/v1/exchange-rates/daily') return route.fulfill({ json: { ratesPerUsd: { USD: 1, MXN: 20 }, sources: [], warnings: [] } });
    if (path === '/api/v1/org/units' || path === '/api/v1/org/businesses') return route.fulfill({ json: { data: [] } });
    if (path === '/api/v1/kpis/monetary-aggregate/query') return route.fulfill({ json: { preferredCurrency: 'MXN', preferredTotal: created ? 900 : 0, nativeTotals: [], exchangeRate: {}, partial: false, excludedRecords: 0, excludedCurrencies: [] } });
    if (path === '/api/v1/hr/payroll/overview') {
      if (holdOverview) { holdOverview = false; await new Promise(resolve => { releaseOverview = resolve; }); }
      return route.fulfill({ json: { summary: { runs_count: created ? 1 : 0, draft_count: created ? 1 : 0, processed_count: 0, approved_count: 0, paid_count: 0, cancelled_count: 0, total_gross_amount: 1000, total_net_amount: 900, net_totals_by_currency: { MXN: 900 } }, preferences, capabilities: { can_prepare: true, can_approve: true, can_cancel: true, can_configure: true, can_manage_reporting: false }, recent_runs: created ? [run] : [] } });
    }
    if (path.startsWith('/api/v1/hr/payroll/') && request.method() !== 'GET') {
      assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
      mutations.push({ path, body: request.postData() });
      if (path === '/api/v1/hr/payroll/runs') {
        createCalls++;
        if (createCalls === 1) return route.fulfill({ status: 422, json: { message: 'Revisa el periodo seleccionado.' } });
        created = true;
        return route.fulfill({ json: { items: [run] } });
      }
      if (path.endsWith('/process')) {
        processCalls++;
        if (processCalls === 1) return route.fulfill({ status: 422, json: { message: 'Revisa la asistencia del periodo.' } });
        return route.fulfill({ json: { run } });
      }
      if (path.endsWith('/approve')) {
        approvalCalls++;
        if (approvalCalls === 1) return route.fulfill({ status: 422, json: { message: 'Falta revisión del responsable.' } });
        run.status = 'approved';
        return route.fulfill({ json: { run } });
      }
    }
    if (path === '/api/v1/hr/payroll/runs') {
      const oldRequest = checkRequestOrder && url.searchParams.get('status') === 'approved';
      const nextAmount = oldRequest ? 1901 : 1902;
      const items = created ? [checkRequestOrder ? { ...run, net_amount: nextAmount, native_totals_by_currency: { MXN: nextAmount } } : run] : [];
      if (oldRequest) await new Promise(resolve => { releaseOldList = resolve; });
      return route.fulfill({ json: { items } });
    }
    if (path === '/api/v1/hr/payroll/runs/501') return route.fulfill({ json: { run, lines: [line] } });
  }
  if (url.origin !== origin || url.pathname.startsWith('/api/')) {
    unexpected.push(url.pathname);
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', (error) => errors.push(error.message));
const dialog = page.getByRole('dialog');
const approve = () => dialog.getByRole('button', { name: 'Aprobar', exact: true });
const back = () => dialog.getByRole('button', { name: 'Volver', exact: true });
const openConfirmation = async () => {
  await approve().click();
  await dialog.getByRole('heading', { name: 'Aprobar nómina #501', exact: true }).waitFor();
  assert.equal(await dialog.count(), 1);
};
try {
  await mkdir(evidence, { recursive: true });
  await page.goto(origin + '/payroll-review.html');
  await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).waitFor();
  await page.screenshot({ path: evidence + '/workspace-desktop.png', animations: 'disabled' });
  assert.ok((await dialog.boundingBox()).height < 800, 'One employee should not force a nearly empty full-height modal');
  // Pending fiscal rules block approval; displaying/printing is not CFDI issuance.
  await page.evaluate(() => {
    const f = window.payrollFixture;
    f.setDetail({ ...f.initial, lines: [{ ...f.initial.lines[0], payroll_treatment: 'fiscal_payroll', include_in_fiscal: true, statutory_compliance: false, calculation_warnings: ['Revisa los datos fiscales.'] }] });
  });
  await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).click();
  await dialog.getByText('Recibo interno sin timbrar.', { exact: false }).waitFor();
  await back().click();
  await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).waitFor();
  assert.ok(await approve().count() === 0 || await approve().isDisabled());
  await page.evaluate(() => window.payrollFixture.setDetail(window.payrollFixture.initial));
  // Filtering and pagination operate on real data, without claiming employees are reviewed.
  await page.evaluate(() => {
    const f = window.payrollFixture;
    f.setDetail({ ...f.initial, run: { ...f.initial.run, users_count: 2 }, lines: [f.initial.lines[0], { ...f.initial.lines[0], id: 102, user_name: 'Colaborador con alerta', attendance_warnings: ['Falta registro de asistencia'] }] });
  });
  await dialog.getByRole('button', { name: 'Alertas 1', exact: true }).click();
  assert.equal(await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).count(), 0);
  await dialog.getByRole('button', { name: 'Revisar: Colaborador con alerta', exact: true }).waitFor();
  await dialog.getByRole('textbox', { name: 'Buscar colaborador', exact: true }).fill('no existe');
  await dialog.getByText('No hay colaboradores que coincidan con esta vista.', { exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Todos', exact: true }).click();
  assert.equal(await dialog.getByRole('textbox', { name: 'Buscar colaborador', exact: true }).inputValue(), '');
  await page.evaluate(() => {
    const f = window.payrollFixture;
    f.setDetail({ ...f.initial, run: { ...f.initial.run, users_count: 25 }, lines: Array.from({ length: 25 }, (_, i) => ({ ...f.initial.lines[0], id: 101 + i, user_name: 'Colaborador ' + (i + 1) })) });
  });
  await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await dialog.getByRole('button', { name: 'Revisar: Colaborador 21', exact: true }).waitFor();
  assert.equal(await dialog.getByRole('button', { name: /^Revisar: Colaborador / }).count(), 5);
  await page.evaluate(() => window.payrollFixture.setDetail(window.payrollFixture.initial));
  // Review navigation preserves an unsaved adjustment, including the return to the roster.
  await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).click();
  await dialog.getByRole('tab', { name: 'Ajustes', exact: true }).click();
  await dialog.locator('textarea').fill('Nota pendiente de revisión');
  await dialog.getByRole('tab', { name: 'Desglose', exact: true }).click();
  await dialog.getByRole('tab', { name: 'Ajustes', exact: true }).click();
  assert.equal(await dialog.locator('textarea').inputValue(), 'Nota pendiente de revisión');
  await back().click();
  assert.equal(await approve().count(), 0);
  await dialog.getByRole('button', { name: 'Revisar cambios', exact: true }).click();
  assert.equal(await dialog.locator('textarea').inputValue(), 'Nota pendiente de revisión');
  await back().click();
  await page.evaluate(() => window.payrollFixture.setDirty(false));
  // Card layout on phones, short-window scrolling, and visible primary actions.
  for (const [width, height] of [[390, 844], [320, 844], [1024, 480]]) {
    await page.setViewportSize({ width, height });
    await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await approve().scrollIntoViewIfNeeded();
    const box = await approve().boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= height);
    await page.screenshot({ path: evidence + '/workspace-' + width + '.png', animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole('button', { name: 'Acciones', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Cancelar nómina', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await openConfirmation();
  assert.equal(await page.evaluate(() => window.approvals), 0);
  assert.match(await dialog.innerText(), /cuentas por pagar.*Gastos/);
  assert.match(await dialog.innerText(), /MXN\s*900\.00/);
  await back().click();
  assert.equal(await page.evaluate(() => window.approvals), 0);
  await page.evaluate(() => window.payrollFixture.setAllowed(false));
  await approve().waitFor({ state: 'hidden' });
  await page.evaluate(() => { window.payrollFixture.setAllowed(true); window.payrollFixture.setDirty(true); });
  await dialog.getByRole('button', { name: 'Revisar cambios', exact: true }).waitFor();
  assert.equal(await approve().count(), 0);
  await page.evaluate(() => window.payrollFixture.setDirty(false));
  await openConfirmation();
  await approve().click();
  assert.equal(await approve().isDisabled(), true);
  assert.equal(await back().isDisabled(), true);
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('alert').innerText(), 'No se pudo aprobar. Reintenta.');
  assert.equal(await page.evaluate(() => window.approvals), 1);
  assert.match(await dialog.innerText(), /MXN\s*900\.00/);
  await approve().click();
  await dialog.getByText('Aprobada', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.approvals), 2);
  assert.equal(await approve().count(), 0);
  await page.evaluate(() => {
    const fixture = window.payrollFixture;
    fixture.setDetail({ ...fixture.initial, run: { ...fixture.initial.run, currency_code: null, gross_amount: 9000, net_amount: 7900, native_totals_by_currency: { MXN: 900, CAD: 7000 } } });
  });
  assert.equal(await dialog.getByText(/USD\s*7,900/).count(), 0);
  await openConfirmation();
  assert.match(await dialog.innerText(), /MXN\s*900\.00.*CAD\s*7,000\.00/);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.screenshot({ path: evidence + '/approval-' + width + '.png', animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const box = await approve().boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height);
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: evidence + '/approval-dark.png', animations: 'disabled' });
  await back().click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: evidence + '/workspace.png', animations: 'disabled' });
  console.log('Checking full preparation/review/approval with real Payroll handlers');
  fullFlow = true;
  await page.goto(origin + '/payroll-flow.html');
  await page.getByRole('button', { name: 'Crear primera nómina', exact: true }).waitFor();
  // Guided preferences: existing real owner, real mutation handler; transport stays isolated.
  const openPreferences = async () => {
    await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Cómo se organiza la nómina', exact: true }).waitFor();
  };
  const preferencesNext = () => dialog.getByRole('button', { name: 'Siguiente', exact: true });
  await openPreferences();
  await dialog.getByRole('radio', { name: 'Por negocio', exact: true }).check();
  assert.equal(await dialog.getByRole('radio', { name: 'Por negocio', exact: true }).isChecked(), true);
  await page.screenshot({ path: evidence + '/preferences-organization.png', animations: 'disabled' });
  await preferencesNext().click();
  await dialog.getByRole('combobox', { name: 'Inicio semanal', exact: true }).selectOption('7');
  await dialog.getByRole('combobox', { name: 'Primer inicio quincenal', exact: true }).selectOption('27');
  assert.equal(await dialog.getByRole('combobox', { name: 'Segundo inicio quincenal', exact: true }).inputValue(), '28');
  assert.notEqual(await dialog.getByRole('combobox', { name: 'Segundo inicio quincenal', exact: true }).locator('option[value="27"]').getAttribute('disabled'), null);
  await dialog.getByRole('combobox', { name: 'Inicio mensual', exact: true }).selectOption('31');
  await page.screenshot({ path: evidence + '/preferences-calendar.png', animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
  assert.equal(await dialog.getByRole('radio', { name: 'Por negocio', exact: true }).isChecked(), true);
  await preferencesNext().click();
  assert.equal(await dialog.getByRole('combobox', { name: 'Inicio mensual', exact: true }).inputValue(), '31');
  await preferencesNext().click();
  await dialog.getByRole('heading', { name: 'Revisa tu configuración', exact: true }).waitFor();
  assert.equal(preferencePayloads.length, 0);
  assert.match(await dialog.innerText(), /Domingo → Sábado/);
  assert.match(await dialog.innerText(), /27 \/ 28/);
  assert.match(await dialog.innerText(), /No recalcula ni aprueba corridas existentes/);
  await page.screenshot({ path: evidence + '/preferences-review.png', animations: 'disabled' });
  for (const [width, height] of [[390, 844], [320, 844], [1024, 480]]) {
    await page.setViewportSize({ width, height });
    const savePreferences = dialog.getByRole('button', { name: 'Guardar preferencias', exact: true });
    await savePreferences.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const box = await savePreferences.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= height);
    assert.ok(box.height <= 56, 'The save label must fit on a phone without splitting words');
    await page.screenshot({ path: evidence + '/preferences-review-' + width + '.png', animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole('button', { name: 'Guardar preferencias', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.match(await dialog.getByRole('alert').innerText(), /No se pudieron guardar las preferencias/);
  await dialog.getByRole('heading', { name: 'Revisa tu configuración', exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Guardar preferencias', exact: true }).click();
  assert.equal(await dialog.getByRole('button', { name: 'Guardando...', exact: true }).isDisabled(), true);
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(preferencePayloads.length, 2);
  assert.deepEqual(preferencePayloads[0], preferencePayloads[1]);
  assert.deepEqual(preferencePayloads[1], { grouping_mode: 'business', default_daily_hours: 8, pay_leave_days: true, weekly_start_day: 7, biweekly_first_day: 27, biweekly_second_day: 28, monthly_start_day: 31, isr_rate: 0.1, imss_user_rate: 0.04, infonavit_user_rate: 0.03, imss_employer_rate: 0.07, infonavit_employer_rate: 0.05, sar_employer_rate: 0.02 });
  await openPreferences();
  assert.equal(await dialog.getByRole('radio', { name: 'Por negocio', exact: true }).isChecked(), true);
  await dialog.getByRole('radio', { name: 'Por unidad', exact: true }).check();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await dialog.getByRole('heading', { name: '¿Descartar cambios de preferencias?', exact: true }).waitFor();
  assert.equal(await dialog.count(), 1);
  await dialog.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  assert.equal(await dialog.getByRole('radio', { name: 'Por unidad', exact: true }).isChecked(), true);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await openPreferences();
  assert.equal(await dialog.getByRole('radio', { name: 'Por negocio', exact: true }).isChecked(), true);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(preferencePayloads.length, 2);
  // Let an overview finish behind the preparation form: it must not reset the user's grouping.
  holdOverview = true;
  const overviewStarted = page.waitForRequest(request => request.url().includes('/hr/payroll/overview'));
  await page.getByRole('combobox', { name: 'Estado', exact: true }).click();
  await page.getByRole('option', { name: 'Borrador', exact: true }).click();
  await overviewStarted;
  await page.getByRole('button', { name: 'Crear primera nómina', exact: true }).click();
  await dialog.getByRole('combobox').nth(1).selectOption('business');
  await dialog.getByRole('combobox').nth(0).selectOption('monthly');
  await dialog.locator('input[type=date]').fill('2026-10-01');
  assert.equal(typeof releaseOverview, 'function');
  const overviewFinished = page.waitForResponse(response => response.url().includes('/hr/payroll/overview'));
  releaseOverview();
  await overviewFinished;
  assert.equal(await dialog.getByRole('combobox').nth(1).inputValue(), 'business');
  await dialog.getByRole('button', { name: 'Crear corrida', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('alert').innerText(), 'Revisa el periodo seleccionado.');
  assert.equal(await dialog.locator('input[type=date]').inputValue(), '2026-10-01');
  await dialog.getByRole('button', { name: 'Crear corrida', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(createCalls, 2);
  assert.equal(mutations[0].body, mutations[1].body);
  await page.getByRole('button', { name: 'Revisar nómina', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Revisar: Colaborador de prueba', exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Recalcular', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('alert').innerText(), 'Revisa la asistencia del periodo.');
  await dialog.getByRole('button', { name: 'Recalcular', exact: true }).click();
  await dialog.getByRole('alert').waitFor({ state: 'hidden' });
  await openConfirmation();
  assert.equal(approvalCalls, 0);
  await approve().click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('alert').innerText(), 'Falta revisión del responsable.');
  await approve().click();
  await dialog.getByText('Aprobada', { exact: true }).waitFor();
  assert.equal(await approve().count(), 0);
  assert.equal(processCalls, 2);
  assert.equal(approvalCalls, 2);
  await page.screenshot({ path: evidence + '/flow-approved.png', animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  checkRequestOrder = true;
  const oldListStarted = page.waitForRequest(request => request.url().includes('/payroll/runs?') && new URL(request.url()).searchParams.get('status') === 'approved');
  await page.getByRole('combobox', { name: 'Estado', exact: true }).click();
  await page.getByRole('option', { name: 'Aprobada', exact: true }).click();
  await oldListStarted;
  await page.getByRole('combobox', { name: 'Estado', exact: true }).click();
  await page.getByRole('option', { name: 'Pagada', exact: true }).click();
  await page.locator('tbody').getByText(/1,902\.00/).waitFor();
  assert.equal(typeof releaseOldList, 'function');
  const oldListFinished = page.waitForResponse(response => response.url().includes('/payroll/runs?') && new URL(response.url()).searchParams.get('status') === 'approved');
  releaseOldList();
  await oldListFinished;
  // Allow React to commit the late result if it was mistakenly accepted.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.match(await page.locator('tbody').innerText(), /1,902\.00/);
  assert.doesNotMatch(await page.locator('tbody').innerText(), /1,901\.00/);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  await writeFile(evidence + '/proof.json', JSON.stringify({ result: 'PASS', preferencesWizardReviewSaveRetryAndDiscard: true, preferencesHiddenFieldsPreserved: true, compactWorkspace: true, mobileCards: true, reviewNavigationPreservesDraft: true, warningFilterSearchAndPagination: true, fullPreparationReviewApproval: true, csrf: true, backgroundRefreshPreservesPreparation: true, staleFilterResponseIgnored: true, confirmationBeforeMutation: true, noNestedModal: true, permissionsAndUnsavedChanges: true, busyLock: true, visibleErrorAndRetry: true, approvedStatusLocked: true, separateCurrencies: true, viewportWidths: [1440, 390, 320], dark: true, realBusinessMutations: 0 }, null, 2));
  console.log('PASS payroll approval: confirmation, permissions, dirty changes, busy state, error/retry, approved lock, currencies, mobile/dark; synthetic mutation only.');
} catch (error) {
  await page.screenshot({ path: evidence + '/failure.png', fullPage: true });
  console.error(error, { errors, unexpected });
  throw error;
} finally {
  releaseOverview?.();
  releaseOldList?.();
  server.httpServer?.closeAllConnections();
  await context.close();
  await browser.close();
  await server.close();
}
