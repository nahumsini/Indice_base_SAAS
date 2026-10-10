import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server:{ host:'127.0.0.1', port:5199, strictPort:true }, define:{ 'import.meta.env.VITE_API_BASE_URL':'""' } });
const card = { id: 401, tool_key: 'employee.attendance@1', name: 'Recursos Humanos', module: 'HUMAN_RESOURCES', module_slug: 'human_resources', kiosk_type: 'employee_attendance', workspace_kind: 'ATTENDANCE', purpose: 'Registra asistencia y consulta comunicados, actas y permisos.', availability: 'AVAILABLE', primary_action: 'OPEN' };
const bootstrap = { name: 'Kiosco del equipo', description: 'Herramientas operativas para colaboradores.', company_name: 'Empresa Demo Spring', theme_key: 'indice-blue', locale: 'es-MX', access_methods: ['PIN'], csrf_token: 'visual-csrf', audience_type: 'EMPLOYEE', allow_provider_registration: false };
const session = { session_id: 'employee-session', session_token: 'employee-session-token', expires_at: '2099-01-01T00:00:00Z', identity: { type: 'EMPLOYEE', id: 7, name: 'Mariana Rodríguez' }, employee: { name: 'Mariana Rodríguez' }, multi_kiosk: { id: 2, name: bootstrap.name, description: bootstrap.description, company_name: bootstrap.company_name, theme_key: bootstrap.theme_key }, kiosks: [card] };
const capabilities = ['attendance.photo.presign@1', 'attendance.punch.create@1', 'human-resources.announcements.read@1', 'human-resources.records.read@1', 'human-resources.permissions.read@1', 'human-resources.permission.create@1'];
const workspace = {
  kiosk: card,
  session: { id: 'child-session', expires_at: '2099-01-01T00:00:00Z', capabilities },
  experience_status: 'READY',
  bootstrap: {
    kiosk_device: { id: 401, code: 'HR', name: 'Recursos Humanos' }, kiosk_type: 'employee_attendance', scope_label: 'Recursos Humanos', inactivity_timeout_seconds: 1800,
    user: { id: 7, full_name: 'Mariana Rodríguez', position_title: 'Supervisora de ruta', department: 'Operaciones' },
    today_activity: { attendance_date: '2026-09-10', status: 'present', first_check_in_at: '2026-09-10T08:03:00', has_check_in: true, has_check_out: false, has_active_check_in: true },
    locations: [], summary: {},
    hr_portal: {
      announcements: { available: true, items: [
        { id: 1, title: 'Entrega de uniformes', type: 'notice', published_at: '2026-09-09T10:00:00', author_name: 'Recursos Humanos', content: 'La entrega será el viernes en la oficina central. Lleva tu gafete.', is_read: false },
        { id: 2, title: 'Actualización de seguridad', type: 'important', published_at: '2026-09-08T09:00:00', author_name: 'Seguridad', content: 'Revisa el protocolo actualizado antes de iniciar tu ruta.', is_read: true },
      ], summary: { total: 2 } },
      records: { available: true, items: [
        { id: 11, record_number: 'ACT-2026-0011', record_type: 'recognition', severity: 'low', status: 'reviewed', title: 'Reconocimiento por servicio', description: 'Registro de reconocimiento por atención al cliente.', actions_taken: 'Se agregó al expediente.', event_date: '2026-09-04' },
        { id: 12, record_number: 'ACT-2026-0012', record_type: 'administrative', severity: 'medium', status: 'pending', title: 'Seguimiento de equipo', description: 'Acta de entrega de equipo de protección.', event_date: '2026-09-08' },
      ], summary: { total_count: 2, pending_count: 1 } },
      permissions: { available: true, items: [
        { id: 21, folio: 'PER-2026-0021', type: 'personal', startDate: '2026-09-15', endDate: '2026-09-15', days: 1, halfDay: false, status: 'pending', reason: 'Cita personal' },
        { id: 20, folio: 'PER-2026-0020', type: 'vacation', startDate: '2026-08-20', endDate: '2026-08-22', days: 3, halfDay: false, status: 'approved', reason: 'Descanso programado' },
      ], summary: { total: 2, pending: 1, approved: 1 } },
    },
  },
};

workspace.bootstrap.today_activity = { attendance_date:'2026-10-09', status:'pending', has_check_in:false, has_check_out:false, has_active_check_in:false };
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'], ...(process.env.INDICE_CHROME_PATH ? { executablePath:process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(20000);
  const errors=[], unexpected=[], punches=[];
  let releasePunch, punchStarted;
  let holdPunch;
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  await page.route('**/synthetic-photo-upload',route=>route.fulfill({status:200,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(!url.pathname.startsWith('/api/'))return route.continue();
    const base='/api/v2/multi-kiosks/public/synthetic-link';
    const reply=data=>route.fulfill({json:{data,meta:{}}});
    if(!url.pathname.startsWith(base)){unexpected.push(`${method} ${url.pathname}`);return route.fulfill({status:500,json:{}});}
    const path=decodeURIComponent(url.pathname.slice(base.length));
    if(!path)return reply(bootstrap);
    if(method!=='GET')assert.equal(req.headers()['x-csrf-token'],bootstrap.csrf_token);
    if(path==='/sessions')return reply(session);
    assert.equal(req.headers()['x-multi-kiosk-session-token'],session.session_token);
    if(path==='/session')return reply(method==='DELETE'?{signed_out:true}:session);
    if(path==='/today')return reply({date:'2026-10-09',attendance:null,tasks:null});
    if(path==='/messaging/unread')return reply(0);
    if(path==='/kiosks/401/sessions')return reply({kiosk_session_id:'child-session',kiosk_session_token:'child-token',experience_status:'READY'});
    if(path==='/kiosks/401/workspace')return reply(workspace);
    assert.equal(req.headers()['x-kiosk-session-token'],'child-token');
    assert.ok(req.headers()['idempotency-key']);
    if(path.endsWith('/attendance.photo.presign@1'))return reply({object_key:'synthetic-photo',upload_url:'http://127.0.0.1:5199/synthetic-photo-upload'});
    if(path.endsWith('/attendance.punch.create@1')){
      const payload=req.postDataJSON();punches.push(payload);
      assert.equal(payload.photo_url,'synthetic-photo');
      assert.equal(payload.latitude,45);assert.equal(payload.longitude,-73);
      punchStarted?.(); if(holdPunch)await holdPunch;
      workspace.bootstrap.today_activity={attendance_date:'2026-10-09',status:'on_time',has_check_in:true,has_check_out:payload.event_type==='check_out',has_active_check_in:payload.event_type==='check_in',first_check_in_at:'2026-10-09T08:00:00'};
      return reply({today_activity:workspace.bootstrap.today_activity});
    }
    unexpected.push(`${method} ${path}`);return route.fulfill({status:500,json:{}});
  });
  await page.goto('http://127.0.0.1:5199/tests/browser/kiosk-employee.html');
  await page.locator('input[inputmode="numeric"]').fill('11111').catch(async error=>{console.error(await page.locator('body').innerText(),errors,unexpected);throw error;});
  await page.getByRole('button',{name:'Entrar a mis kioscos',exact:true}).click();
  await page.getByRole('button',{name:'Herramientas',exact:true}).click();
  await page.getByRole('button',{name:'Abrir: Recursos Humanos',exact:true}).click();
  const hr=page.locator('[data-human-resources-kiosk]');
  const tabs=hr.getByRole('tablist',{name:'Secciones de Recursos Humanos'});
  for(const width of [320,360,390,430,480,768,1024,1440]){
    await page.setViewportSize({width,height:844});
    const metrics=await tabs.getByRole('tab').evaluateAll(nodes=>nodes.map(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,clipped:el.scrollWidth>el.clientWidth})));
    assert.ok(metrics.every(item=>item.height>=44&&item.width>=44&&!item.clipped));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:390,height:844});
  await tabs.getByRole('tab',{name:'Asistencia',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await hr.getByRole('heading',{name:'Comunicados para ti'}).waitFor();
  await hr.getByRole('button',{name:/Entrega de uniformes/}).click();
  await page.getByRole('dialog').getByText('La entrega será el viernes en la oficina central. Lleva tu gafete.').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
  await tabs.getByRole('tab',{name:'Actas',exact:true}).click();
  await hr.getByRole('button',{name:/Reconocimiento por servicio/}).click();
  await page.getByRole('dialog').getByText('Registro de reconocimiento por atención al cliente.').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
  await tabs.getByRole('tab',{name:'Permisos',exact:true}).click();
  await hr.getByRole('button',{name:'Solicitar permiso',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Motivo',{exact:true}).fill('Solicitud sintética');
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
  await tabs.getByRole('tab',{name:'Asistencia',exact:true}).click();
  assert.equal(await hr.getByRole('tab',{name:'Foto',exact:true}).count(),0,'no redundant photo selector without face capability');
  assert.equal(await hr.getByRole('button',{name:'Registrar ingreso',exact:true}).count(),0);
  const capture=async()=>{
    await hr.getByRole('button',{name:'Tomar foto',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('video')?.videoWidth>0);
    await hr.getByRole('button',{name:'Capturar foto',exact:true}).click();
    await hr.getByText('Foto capturada.',{exact:true}).waitFor();
  };
  await capture();
  await tabs.getByRole('tab',{name:'Comunicados',exact:true}).click();
  await page.getByRole('button',{name:'Seguir aquí',exact:true}).click();
  await hr.getByText('Foto capturada.',{exact:true}).waitFor();
  await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_ok,error)=>error({code:1})}}));
  await hr.getByRole('button',{name:'Permitir ubicación',exact:true}).click();
  await hr.getByRole('alert').filter({hasText:'Permite la ubicación'}).waitFor();
  assert.equal(punches.length,0);
  await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:ok=>ok({coords:{latitude:45,longitude:-73}})}}));
  await hr.getByRole('button',{name:'Permitir ubicación',exact:true}).click();
  const punch=hr.getByRole('button',{name:'Registrar ingreso',exact:true});
  await punch.scrollIntoViewIfNeeded();
  for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(100);
    const actionBottom=await punch.evaluate(el=>el.getBoundingClientRect().bottom);
    const navTop=await page.locator('[data-employee-navigation]').evaluate(el=>el.getBoundingClientRect().top);
    assert.ok(actionBottom<=navTop,'attendance action stays above personal navigation');
  }
  await page.setViewportSize({width:390,height:844});
  holdPunch=new Promise(resolve=>{releasePunch=resolve;});
  const started=new Promise(resolve=>{punchStarted=resolve;});
  await punch.click();await started;
  await tabs.getByRole('tab',{name:'Permisos',exact:true}).click();
  assert.equal(await tabs.getByRole('tab',{name:'Asistencia',exact:true}).getAttribute('aria-selected'),'true','sending prevents section change');
  assert.equal(await hr.getByRole('button',{name:'Reiniciar',exact:true}).isDisabled(),true);
  releasePunch();holdPunch=null;
  await hr.getByText('Ingreso registrado correctamente.',{exact:true}).waitFor();
  assert.equal(punches.length,1);
  await capture();
  await hr.getByRole('button',{name:'Permitir ubicación',exact:true}).click();
  await hr.getByRole('button',{name:'Registrar salida',exact:true}).waitFor();
  await tabs.getByRole('tab',{name:'Permisos',exact:true}).click();
  await page.getByRole('button',{name:'Descartar y continuar',exact:true}).click();
  await hr.getByRole('heading',{name:'Mis permisos',exact:true}).waitFor();
  await tabs.getByRole('tab',{name:'Asistencia',exact:true}).click();
  assert.equal(await hr.getByText('Foto capturada.',{exact:true}).count(),0,'discard clears pending evidence');
  capabilities.splice(2);
  await page.reload();
  await page.getByRole('button',{name:'Herramientas',exact:true}).click();
  await page.getByRole('button',{name:'Abrir: Recursos Humanos',exact:true}).click();
  await hr.getByRole('button',{name:'Tomar foto',exact:true}).waitFor();
  assert.equal(await tabs.getByRole('tab').count(),1,'only granted HR sections are visible');
  assert.equal(await tabs.getByRole('tab',{name:'Permisos',exact:true}).count(),0);
  capabilities.push('attendance.face.verification.begin@1','attendance.face.verification.capture.presign@1','attendance.face.verification.complete@1');
  await page.reload();
  await page.getByRole('button',{name:'Herramientas',exact:true}).click();
  await page.getByRole('button',{name:'Abrir: Recursos Humanos',exact:true}).click();
  await hr.getByRole('tab',{name:'Reconocimiento facial',exact:true}).waitFor();
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  console.log('HR kiosk: responsive menus, keyboard, detail modals, photo, GPS denial/recovery, punch, protected navigation and sticky action passed (synthetic media and APIs).');
} finally {await browser?.close();await server.close();}
