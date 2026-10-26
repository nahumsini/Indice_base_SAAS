import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(root + '/package.json');
const { createServer } = require('vite');
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const entry = `
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '/src/app/context/LanguageContext';
import {CreateEmployeeModal} from '/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/CreateEmployeeModal';
import {createEmptyEmployeeFormData} from '/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/model';
import {buildEmployeeSavePayload} from '/src/app/BasicModules/HumanResources/Employees/utils/employees.payloads';
import {humanResourcesApi} from '/src/app/api/humanResources';
import {setCachedCsrfToken} from '/src/app/api/authSessionStore';
import '/src/styles/index.css';
setCachedCsrfToken('synthetic-csrf');
localStorage.setItem('frontend-indice-language','es-MX');
const query=new URLSearchParams(location.search);
const data={...createEmptyEmployeeFormData(),employeeId:9001,firstName:'Colaborador',lastName:'Sintético',email:'fixture@example.invalid',registrationCountry:query.get('country')||'CA',mobilePhone:'+528112345678',department:'Operaciones',position:'Coordinador',businessUnitId:'1',businessId:'2',salary:'6000',payrollTreatment:query.get('treatment')||'fiscal_payroll'};
const units=[{value:'1',label:'Unidad de prueba',tone:'unit'}], businesses=[{value:'2',label:'Negocio de prueba',unitId:'1',tone:'business'}];
function Fixture(){const[open,setOpen]=useState(true);return <><button onClick={()=>setOpen(true)}>Open fixture</button><CreateEmployeeModal isOpen={open} mode="edit" initialData={data} unitOptions={units} businessOptions={businesses} onClose={()=>setOpen(false)} onSave={async value=>{await humanResourcesApi.updateHrUser(9001,buildEmployeeSavePayload(value,'active'));}}/></>}
createRoot(document.getElementById('root')).render(<LanguageProvider><Fixture/></LanguageProvider>);`;
const fixture = { name: 'employee-ca-fixture', resolveId: id => id === '/__employee-ca.tsx' ? id : undefined,
  load: id => id === '/__employee-ca.tsx' ? entry : undefined,
  configureServer(server) { server.middlewares.use(async (req,res,next) => {
    if (req.url?.split('?')[0] !== '/employee-ca.html') return next();
    res.setHeader('Content-Type', 'text/html');
    res.end(await server.transformIndexHtml(req.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__employee-ca.tsx"></script></body></html>'));
  }); },
};
const server = await createServer({ root, configFile: root + '/vite.config.ts', cacheDir: '/tmp/indice-employee-ca-vite', plugins: [fixture],
  server: { host: '127.0.0.1', port: 5231, strictPort: true, hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],saves=[];let gets=0,failSave=true,readOnly=false,failLoad=false;
  const profile={effectiveFrom:'2026-01-01',taxYear:2026,provinceOfEmployment:'ON',payPeriodsPerYear:52,paymentLagDays:0,
    federalClaimMode:'BASIC',federalClaimAmount:0,provincialClaimMode:'BASIC',provincialClaimAmount:0,
    additionalTax:0,additionalQuebecTax:0,ontarioDependants:0,pensionStatus:'CONTRIBUTING',pensionableMonths:12,
    eiExempt:false,qpipExempt:false,declarationReference:'Synthetic TD1',registeredPlanDeduction:0,unionDues:0,
    vacationAccrualPercent:4,employerEiMultiplier:1.4,quebecHealthFundPercent:null,
    openingBalances:{asOf:'2026-01-01',pensionableEarnings:0,cpp:0,qpp:0,cpp2:0,qpp2:0,ei:0,qpip:0,employerQpip:0}};
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(!path.startsWith('/api/'))return route.continue();
    if(path==='/api/v1/hr/payroll/mexico/profiles/9001') return route.fulfill({json:{revision:0,profile:null,canConfigure:true,history:[]}});
    if(path==='/api/v1/auth/me')return route.fulfill({json:{authenticated:true,user:{id:1,companyId:1,role:'root'}}});
    if(path==='/api/v1/hr/payroll/canada/profiles/9001'){
      assert.equal(req.method(),'GET','Fiscal writes must be part of the single employee PUT');gets++;
      return route.fulfill(failLoad?{status:403,json:{message:'Forbidden'}}:{json:{revision:1,profile,canConfigure:!readOnly,history:[{revision:1,profile}]}});
    }
    assert.equal(path,'/api/v1/hr/users/9001');assert.equal(req.method(),'PUT');
    assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');saves.push(req.postDataJSON());
    return route.fulfill(failSave?{status:409,json:{message:'Error sintético: no se guardó ningún cambio'}}:{json:{id:9001}});
  });
  const field=label=>page.getByLabel(label,{exact:true}).or(page.getByLabel(label+' *',{exact:true}));
  const step=async name=>{try{await page.getByRole('button',{name:new RegExp(name)}).first().click({timeout:10000});}catch(error){console.error(errors,await page.locator('body').innerText());throw error;}};
  const fiscal=()=>page.getByRole('region',{name:'Datos fiscales de Canadá'});
  await page.goto('http://127.0.0.1:5231/employee-ca.html');
  await step('Trabajo');
  await field('Retención federal adicional por pago (CAD)').waitFor().catch(async e=>{console.error(errors,await page.locator('body').innerText());throw e;});
  assert.equal(await page.getByRole('dialog').count(),1);
  assert.equal(await page.locator('form').count(),1,'No nested forms');
  assert.equal(await field('Provincia de empleo').locator('option').count(),14);
  await field('Provincia de empleo').selectOption('QC');
  await field('Tasa patronal del fondo de salud de Québec (%)').fill('1.65');
  await field('Retención adicional de Québec por pago (CAD)').fill('10');
  await field('Provincia de empleo').selectOption('ON');
  assert.equal(await field('Retención adicional de Québec por pago (CAD)').count(),0);
  await field('Retención federal adicional por pago (CAD)').fill('1000');
  await step('Documentos');await step('Trabajo');
  assert.equal(await field('Retención federal adicional por pago (CAD)').inputValue(),'1000');
  assert.equal(gets,1,'Step navigation must retain the fiscal draft');
  await page.getByRole('button',{name:'Nómina operativa',exact:false}).click();
  assert.equal(await fiscal().count(),0);
  await page.getByRole('button',{name:'Nómina fiscal',exact:false}).click();
  assert.equal(await field('Retención federal adicional por pago (CAD)').inputValue(),'1000');
  await field('Referencia de declaraciones revisadas (sin SIN)').fill('');
  await step('Documentos');
  await page.getByText('Completa los datos fiscales de Canadá antes de continuar.',{exact:true}).waitFor();
  assert.equal(saves.length,0);
  await field('Referencia de declaraciones revisadas (sin SIN)').fill('A1234567890');
  await fiscal().scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/indice-employee-canada-desktop.png'});
  await step('Documentos');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByText('Error sintético: no se guardó ningún cambio',{exact:true}).waitFor();
  assert.equal(saves[0].canadaPayrollProfile.profile.additionalTax,1000);
  assert.equal(saves[0].canadaPayrollProfile.expectedRevision,1);
  assert.equal(saves[0].canadaPayrollProfile.profile.additionalQuebecTax,0);
  assert.equal(saves[0].canadaPayrollProfile.profile.quebecHealthFundPercent,null);
  failSave=false;
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(saves[0].canadaPayrollProfile.requestId,saves[1].canadaPayrollProfile.requestId,'Retry preserves request identity');
  await page.getByRole('button',{name:'Open fixture'}).click();await step('Trabajo');
  await field('Retención federal adicional por pago (CAD)').fill('1100');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:'Seguir editando',exact:true}).first().click();
  assert.equal(await field('Retención federal adicional por pago (CAD)').inputValue(),'1100');
  await page.getByRole('button',{name:'Nómina operativa',exact:false}).click();
  await step('Documentos');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(saves.at(-1).payroll_treatment,'operational_payroll');
  assert.equal(saves.at(-1).canadaPayrollProfile,undefined,'Hidden fiscal data must not be submitted');
  const beforeGets=gets;
  await page.goto('http://127.0.0.1:5231/employee-ca.html?country=MX');await step('Trabajo');
  assert.equal(await fiscal().count(),0);assert.equal(gets,beforeGets);
  await step('Contacto');
  await page.locator('[name="registrationCountry"]').selectOption('CA');
  await page.locator('[name="mobilePhone"]').fill('+14165550100');
  await page.locator('[name="alternatePhone"]').fill('');
  await page.locator('[name="emergencyContactPhone"]').fill('');
  await step('Trabajo');
  await field('Provincia de empleo').waitFor();
  await step('Documentos');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(saves.at(-1).alternate_phone,'');assert.equal(saves.at(-1).emergency_contact_phone,'');
  const afterCountryChange=gets;
  await page.goto('http://127.0.0.1:5231/employee-ca.html?treatment=no_payroll');await step('Trabajo');
  assert.equal(await fiscal().count(),0);assert.equal(gets,afterCountryChange);
  readOnly=true;
  await page.goto('http://127.0.0.1:5231/employee-ca.html');await step('Trabajo');
  await field('Retención federal adicional por pago (CAD)').waitFor();
  assert.ok(await field('Retención federal adicional por pago (CAD)').isDisabled());
  await step('Documentos');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(saves.at(-1).canadaPayrollProfile,undefined);
  readOnly=false;failLoad=true;
  await page.goto('http://127.0.0.1:5231/employee-ca.html');await step('Trabajo');
  await page.getByRole('button',{name:'Reintentar',exact:true}).waitFor();failLoad=false;
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await field('Retención federal adicional por pago (CAD)').waitFor();
  await page.setViewportSize({width:390,height:844});await fiscal().scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/indice-employee-canada-mobile.png'});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await page.screenshot({path:'/tmp/indice-employee-canada-dark.png'});
  assert.deepEqual(errors,[]);console.log('PASS embedded Canada fiscal profile: eligibility, draft, validation, atomic payload, retries, readonly, recovery, responsive');
} finally {await browser.close();await server.close();}
