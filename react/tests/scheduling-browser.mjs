import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5196';
const server = await createServer({ root: resolve(import.meta.dirname, '..'),cacheDir:resolve(import.meta.dirname,'../node_modules/.vite-scheduling-browser'), server: { host: '127.0.0.1', port: 5196, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
let browser, page;
try {
  await server.listen(); browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });page.setDefaultTimeout(20000);
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language','es-MX'));
  const errors=[], unexpected=[], calls=[], requests=[];let failOnce=true,salesEnabled=true;
  page.on('pageerror',e=>errors.push(e.message));
  const service={id:1,name:'Diagnóstico empresarial',description:'Una sesión para conocer tu negocio.',durationMinutes:60,bufferMinutes:15,noticeHours:24,active:true,version:1};
  const staff={id:2,userId:42,publicName:'Consultor sintético',timezone:'America/Toronto',active:true,version:1,days:[{dayOfWeek:1,startTime:'09:00:00',endTime:'17:00:00'}]};
  let savedPage={id:3,alias:'piloto',title:'Reserva tu diagnóstico',description:'Agenda con nuestro equipo.',published:true,version:1,publicUrl:'/book/piloto'};
  const start = new Date(Date.now()+2*86400000);start.setUTCHours(14,0,0,0);const instant=start.toISOString(), date=instant.slice(0,10);
  const event={id:4,staffId:2,title:'Webinar de prueba',description:'Conoce Índice.',startAt:instant,durationMinutes:60,capacity:20,confirmedCount:0,published:true,status:'ACTIVE',version:1};
  const services=[service], events=[event], staffList=[staff,{...staff,id:3,userId:43,publicName:'Segundo consultor sintético'}];
  const salesContacts=[{id:1,contactCode:'CLI-TEST',companyName:'Cliente maestro sintético',contactPerson:'Contacto maestro',email:'master@example.com',status:'ACTIVE'}];
  const catalog=()=>({title:savedPage.title,description:savedPage.description,appearance:savedPage.appearance,services,staff:staffList,events:events.filter(e=>e.status==='ACTIVE').map(e=>({...e,availablePlaces:e.capacity-e.confirmedCount})),csrfToken:'synthetic-csrf'});
  let reservation={id:5,reference:'SCH-synthetic',staffId:2,serviceId:1,eventId:null,serviceName:service.name,staffName:staff.publicName,attendeeName:'Participante sintético',attendeeEmail:'participant@example.com',attendeeCompany:'Empresa sintética',startAt:instant,durationMinutes:60,status:'REQUESTED',version:1};
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(url.origin!==origin)return route.abort();
    if(!path.startsWith('/api/'))return route.continue();
    calls.push(`${req.method()} ${path}`);
    const ok=json=>route.fulfill({json});
    if(path==='/api/v1/public/scheduling/piloto')return ok({token:'synthetic-public-address'});
    if(path.endsWith('/synthetic-public-address/bootstrap'))return ok({data:catalog()});
    if(path.includes('/actions/scheduling.slots.read@1')){assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');return ok({data:{timezone:staff.timezone,starts:[instant]}});}
    if(path.includes('/actions/scheduling.reservation.request@1')){
      assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');requests.push({key:req.headers()['idempotency-key'],body:req.postDataJSON()});
      if(failOnce){failOnce=false;return route.fulfill({status:503,json:{message:'Synthetic retry'}});}return ok({data:{status:'REQUESTED',submissionPolicy:'REVIEW_REQUIRED'}});
    }
    if(path==='/api/v1/auth/me')return ok({user:{id:42,name:'Consultor sintético',role:'superadmin'},company:{id:8,name:'Empresa sintética',role:'superadmin',active:true},csrfToken:'synthetic-csrf'});
    if(path.startsWith('/api/v1/workspace-state/'))return ok({state:{},schemaVersion:1});
    if(path==='/api/v1/modules')return ok([{slug:'scheduling',name:'Agenda y eventos'},...(salesEnabled?[{slug:'crm',name:'Ventas',locked:false}]:[])]);
    if(path==='/api/v1/sales/context')return ok({users:[],units:[],businesses:[]});
    if(path==='/api/v1/hr/users')return ok({items:[]});
    if(path==='/api/v1/sales/contacts/1'&&req.method()==='PUT'){
      assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
      salesContacts[0]={...salesContacts[0],...req.postDataJSON()};return ok(salesContacts[0]);
    }
    if(req.method()==='GET'&&/^\/api\/v1\/sales\/(contacts|opportunities|products|quotes|sales|post-sales|contracts)$/.test(path)){
      const collection=path.split('/').at(-1);
      return ok({items:collection==='contacts'?salesContacts:[],count:collection==='contacts'?salesContacts.length:0,collection});
    }
    if(path.startsWith('/api/v1/scheduling/')){
      if(['POST','PUT'].includes(req.method()))assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
      const tail=path.slice('/api/v1/scheduling/'.length);
      if(tail==='services'&&req.method()==='POST'){services.push({...req.postDataJSON(),id:10,version:1});return route.fulfill({status:204});}
      if(tail==='page'&&req.method()==='PUT'){savedPage={...savedPage,...req.postDataJSON(),version:savedPage.version+1};return ok(savedPage);}
      if(tail==='staff/2'&&req.method()==='PUT'){staffList[0]={...staffList[0],...req.postDataJSON(),version:2};return route.fulfill({status:204});}
      if(tail==='events/4/cancel'){events[0]={...events[0],status:'CANCELLED',published:false,version:2};return route.fulfill({status:204});}
      if(tail==='reservations/5/status'){reservation={...reservation,...req.postDataJSON(),version:reservation.version+1};return ok(reservation);}
      if(tail==='reservations/5/assignment'){
        const body=req.postDataJSON();assert.equal(body.version,reservation.version);const target=staffList.find(item=>item.id===body.staffId);
        reservation={...reservation,staffId:target.id,staffName:target.publicName,version:reservation.version+1};return ok(reservation);
      }
      if(tail==='reservations/5/management'){
        const body=req.postDataJSON();assert.equal(body.version,reservation.version);assert.ok(body.reason);
        if(body.action==='PAUSE')reservation={...reservation,pausedFromStatus:reservation.status,status:'PAUSED'};
        if(body.action==='RESUME')reservation={...reservation,status:reservation.pausedFromStatus,pausedFromStatus:null};
        if(body.action==='ARCHIVE')reservation={...reservation,status:'CANCELLED',archivedAt:new Date().toISOString()};
        reservation.version++;return ok(reservation);
      }
      const matches=(!reservation.archivedAt||url.searchParams.get('includeArchived')==='true')&&(!url.searchParams.get('staffId')||Number(url.searchParams.get('staffId'))===reservation.staffId)&&(!url.searchParams.get('status')||url.searchParams.get('status')===reservation.status);
      if(tail==='calendar-grid')return ok({items:matches?[reservation]:[],total:matches?1:0,events,eventsTotal:events.length});
      if(tail==='reservations'||tail==='calendar')return ok({items:matches?[reservation]:[],total:matches?1:0,page:1,pageSize:25});
      const payloads={services,staff:staffList,'staff-options':staffList,clients:{items:[{id:1,companyName:'Cliente maestro sintético',contactPerson:'Contacto maestro',email:'master@example.com',phone:'',status:'ACTIVE'}],total:1,page:1,pageSize:25},members:[{id:42,name:staff.publicName}],page:savedPage,events,catalog:catalog(),links:{publicUrl:savedPage.publicUrl},readiness:{publicAccessEnabled:true},metrics:{requests:1,confirmed:0,completed:0,noShow:0,cancelled:0,attendanceRate:null}};
      if(tail in payloads)return ok(payloads[tail]);
    }
    unexpected.push(`${req.method()} ${path}`);return route.fulfill({status:500,json:{message:'Unexpected synthetic API'}});
  });
  const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Scheduling must fit viewport');
  const selectFilter=async(label,option)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();};
  const openServices=async()=>{await page.getByRole('button',{name:'Acciones',exact:true}).click();await page.getByRole('menuitem',{name:'Servicios',exact:true}).click();};
  const coralModal=async()=>{
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('[data-slot="dialog-header"]').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 107, 94)');
    assert.equal(await page.locator('[data-slot="dialog-footer"]').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 107, 94)');
  };
  await page.goto(`${origin}/book/piloto?consultant=2`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('heading',{name:'Reserva tu diagnóstico',exact:true}).waitFor();
  assert.equal(await page.getByRole('combobox',{name:/^Consultor/}).inputValue(),'2');
  await page.getByRole('combobox',{name:/^Servicio \/ Eventos/}).selectOption('service:1');await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByLabel('Fecha',{exact:true}).fill(date);await page.getByRole('button',{name:/10:00|10:00 a/}).click();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByLabel('Participante',{exact:true}).fill('Participante sintético');await page.getByLabel('Correo',{exact:true}).fill('participant@example.com');
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enviar solicitud',exact:true}).click();
  await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Enviar solicitud',exact:true}).click();await page.getByRole('heading',{name:'Solicitud recibida',exact:true}).waitFor();
  assert.equal(requests.length,2);assert.equal(requests[0].key,requests[1].key);assert.deepEqual(requests[0].body,requests[1].body);
  assert.equal('companyId' in requests[0].body,false);assert.equal(calls.some(c=>/\/auth\/|\/platform-admin\/|\/finance\//.test(c)),false);
  await fits();await page.screenshot({path:'/tmp/indice-scheduling-public-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'/tmp/indice-scheduling-public-mobile.png',fullPage:true});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'/tmp/indice-scheduling-public-dark.png',fullPage:true});
  console.log('PASS public: real router, personalized consultant, slots, consent, manual-review acknowledgement, CSRF, stable retry, no ERP data providers, mobile/dark');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${origin}/tests/browser/scheduling.html`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Agenda y reservas',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Reservas',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Configuración',exact:true}).count(),0);
  await page.getByRole('tab',{name:'Calendario',exact:true}).waitFor();
  await page.getByRole('button',{name:'Nueva solicitud',exact:true}).evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  assert.equal(await page.getByRole('button',{name:'Nueva solicitud',exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 107, 94)');
  assert.equal(await page.getByRole('button',{name:'Nueva solicitud',exact:true}).evaluate(element=>getComputedStyle(element).color),'rgb(34, 40, 49)');
  assert.equal(await page.getByRole('tab',{name:'Calendario',exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 107, 94)');
  const agendaHeading=page.getByRole('heading',{name:'Agenda y reservas',exact:true});
  assert.equal(await agendaHeading.evaluate(element=>element.closest('section').querySelectorAll('button').length),4);
  assert.ok(await agendaHeading.evaluate(element=>element.closest('section').classList.contains('bg-[#FF6B5E]/5')));
  assert.ok(await agendaHeading.evaluate(element=>element.closest('section').innerText.includes('📅')));
  const filterCard=page.getByRole('region',{name:'Filtros',exact:true});
  assert.equal(await filterCard.getByRole('combobox').count(),2);
  for(const field of [page.getByLabel('Desde',{exact:true}),page.getByLabel('Hasta',{exact:true}),page.getByRole('combobox',{name:'Estado',exact:true}),page.getByRole('combobox',{name:'Colaborador',exact:true})]){
    assert.equal(await field.evaluate(element=>getComputedStyle(element).height),'44px');
    assert.equal(await field.evaluate(element=>getComputedStyle(element).borderRadius),'12px');
  }
  await page.getByLabel('Desde',{exact:true}).focus();
  await page.waitForFunction(()=>getComputedStyle(document.activeElement).borderColor==='rgb(255, 107, 94)');
  await selectFilter('Colaborador','Segundo consultor sintético');
  await page.getByRole('button',{name:'Revisar: Participante sintético',exact:true}).waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
  assert.match(await page.getByRole('combobox',{name:'Colaborador',exact:true}).innerText(),/Todos/);
  await page.getByRole('button',{name:'Revisar: Participante sintético',exact:true}).waitFor();
  await selectFilter('Colaborador','Segundo consultor sintético');await selectFilter('Colaborador','Todos los colaboradores');
  await page.getByRole('button',{name:'Semana',exact:true}).click();await page.getByRole('button',{name:'Día',exact:true}).click();await page.getByRole('button',{name:'Mes',exact:true}).click();
  await page.getByRole('button',{name:'Nueva solicitud',exact:true}).click();await coralModal();
  assert.equal(await page.getByRole('tab',{name:'Servicio',exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 107, 94)');
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
  await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),1);await coralModal();
  await page.locator('[data-slot="dialog-footer"]').getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Agenda pública',exact:true}).click();await page.getByRole('dialog').waitFor();
  await coralModal();
  await page.getByRole('dialog').getByRole('link',{name:'Abrir página pública',exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog').getByRole('link',{name:'Abrir página pública',exact:true}).getAttribute('href'),'/book/piloto');
  await page.getByRole('dialog').getByRole('button',{name:'Copiar enlace: Consultor sintético',exact:true}).waitFor();
  await page.getByLabel('Nombre del negocio',{exact:true}).fill('Negocio sintético');
  await page.getByLabel('Color de acciones',{exact:true}).fill('#008577');await page.getByLabel('Fondo del encabezado',{exact:true}).fill('#fff4d4');
  await page.getByLabel('Diseño público',{exact:true}).selectOption('compact');await page.getByLabel('Texto del botón de solicitud',{exact:true}).fill('Solicitar sesión');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(savedPage.appearance.accentColor,'#008577');assert.equal(savedPage.appearance.layout,'compact');
  await openServices();await page.getByRole('button',{name:'Nuevo servicio',exact:true}).waitFor();await coralModal();
  const agendaUrl=page.url();assert.match(agendaUrl,/\/scheduling\/calendar/);
  await page.getByRole('button',{name:'Nuevo servicio',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),1);
  await coralModal();
  await page.getByLabel('Nombre',{exact:true}).fill('Sesión de seguimiento');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByText('Sesión de seguimiento',{exact:true}).waitFor();assert.equal(page.url(),agendaUrl);assert.equal(await page.getByRole('dialog').count(),1);
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
  await page.getByRole('button',{name:'Equipo y disponibilidad',exact:true}).click();
  await coralModal();
  await page.getByText('America/Toronto',{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Editar: Consultor sintético',exact:true}).click();await page.getByLabel('Zona horaria',{exact:true}).fill('America/Toronto');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
  await page.getByRole('button',{name:'Agenda pública',exact:true}).click();
  await page.getByLabel('Título de la página',{exact:true}).fill('Diagnóstico y próximos eventos');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Eventos',exact:true}).click();await page.getByRole('button',{name:'Cancelar evento',exact:true}).click();
  await page.getByLabel('Motivo de cancelación',{exact:true}).fill('Cancelación sintética');await page.getByRole('button',{name:'Guardar',exact:true}).click();await page.getByText('Cancelada',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Agenda y reservas',exact:true}).click();await page.getByRole('tab',{name:'Tabla',exact:true}).click();await page.getByRole('button',{name:'Revisar: Participante sintético',exact:true}).click();
  await page.getByRole('button',{name:'Guardar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.locator('tbody').getByText('Confirmada',{exact:true}).waitFor();
  const action=async(label)=>{await page.getByRole('button',{name:'Acciones: Participante sintético',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();};
  await action('Cambiar responsable');await page.getByRole('dialog').getByLabel('Colaborador',{exact:true}).selectOption('3');await page.getByLabel('Motivo del cambio',{exact:true}).fill('Prueba de reasignación');await page.getByRole('dialog').getByRole('button',{name:'Cambiar responsable',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(reservation.staffId,3);
  await action('Apagar / pausar');await page.getByLabel('Motivo del cambio',{exact:true}).fill('Pausa de prueba');await page.getByRole('dialog').getByRole('button',{name:'Apagar / pausar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.locator('tbody').getByText('Pausada',{exact:true}).waitFor();
  await action('Reactivar');await page.getByLabel('Motivo del cambio',{exact:true}).fill('Reactivación de prueba');await page.getByRole('dialog').getByRole('button',{name:'Reactivar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await action('Eliminar de la operación');await page.getByLabel('Motivo del cambio',{exact:true}).fill('Retiro de prueba');
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Eliminar de la operación',exact:true}).getAttribute('data-modal-destructive'),'true');
  await page.getByRole('dialog').getByRole('button',{name:'Eliminar de la operación',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Más filtros',exact:true}).click();
  await page.getByRole('checkbox',{name:'Incluir reservas retiradas',exact:true}).check();await page.locator('tbody').getByText('Retirada',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Clientes',exact:true}).click();await page.getByText('Cliente maestro sintético',{exact:true}).waitFor();
  assert.ok(calls.includes('GET /api/v1/sales/contacts'));assert.equal(calls.includes('GET /api/v1/scheduling/clients'),false);
  await page.getByRole('button',{name:/Agregar cliente|Agregar contacto/,exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar Contacto maestro',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),1);
  await page.getByPlaceholder('Nombre de la persona',{exact:true}).fill('Contacto compartido');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('Contacto compartido',{exact:true}).waitFor();
  assert.equal(salesContacts[0].contactPerson,'Contacto compartido');assert.ok(calls.includes('PUT /api/v1/sales/contacts/1'));
  await page.getByRole('button',{name:'Eventos',exact:true}).click();await page.getByRole('button',{name:'Clientes',exact:true}).click();await page.getByText('Contacto compartido',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Eventos',exact:true}).click();salesEnabled=false;
  const ownerReads=calls.filter(call=>call==='GET /api/v1/sales/contacts').length;
  await page.getByRole('button',{name:'Clientes',exact:true}).click();await page.getByText('Clientes es la misma pestaña de Ventas. Necesitas acceso a Ventas y su permiso de Clientes; la agenda no los concede.',{exact:true}).waitFor();
  assert.equal(calls.filter(call=>call==='GET /api/v1/sales/contacts').length,ownerReads);salesEnabled=true;
  await page.getByRole('button',{name:'Indicadores',exact:true}).click();await page.getByText('Sin asistencia registrada',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Ver reservas',exact:true}).first().click();await page.getByRole('combobox',{name:/^Estado/}).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-scheduling-workspace] [role="combobox"]')].some(control=>control.innerText==='Por revisar'));
  assert.equal(await page.getByRole('combobox',{name:/^Estado/}).innerText(),'Por revisar');
  await page.evaluate(()=>window.schedulingFixture.layout('left'));await page.locator('[data-workbar-position="left"]').waitFor();await fits();
  await page.screenshot({path:'/tmp/indice-scheduling-private-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'/tmp/indice-scheduling-private-mobile.png',fullPage:true});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'/tmp/indice-scheduling-private-dark.png',fullPage:true});
  for(const [locale,title] of [['en-CA','Scheduling & events'],['en-US','Scheduling & events'],['es-CO','Agenda y eventos'],['fr-CA','Agenda et événements'],['pt-BR','Agenda e eventos'],['ko-CA','일정 및 이벤트'],['zh-CA','预约与活动'],['es-MX','Agenda y eventos']]){
    await page.evaluate(code=>window.schedulingFixture.language(code),locale);await page.getByText(title,{exact:true}).first().waitFor();await fits();
  }
  await page.evaluate(()=>window.schedulingFixture.role('user'));await page.waitForTimeout(200);
  assert.equal(await page.getByRole('button',{name:'Servicios',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Equipo y disponibilidad',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Agenda pública',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Clientes',exact:true}).count(),0);
  await page.evaluate(()=>window.schedulingFixture.role('user',['scheduling.reservations']));
  await page.getByRole('button',{name:'Agenda y reservas',exact:true}).waitFor();
  await page.getByRole('tab',{name:'Tabla',exact:true}).click();await page.getByRole('button',{name:'Nueva solicitud',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Servicios',exact:true}).count(),0);
  await page.evaluate(()=>window.schedulingFixture.role('user',['scheduling.calendar']));await page.getByRole('button',{name:'Nueva solicitud',exact:true}).waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Agenda y reservas',exact:true}).waitFor();await page.getByRole('tab',{name:'Calendario',exact:true}).click();await fits();
  await page.evaluate(()=>window.schedulingFixture.role('admin',['scheduling.configuration']));
  await page.getByRole('button',{name:'Servicios',exact:true}).waitFor();
  assert.equal(await page.getByRole('tab',{name:'Calendario',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Nueva solicitud',exact:true}).count(),0);
  await page.getByRole('button',{name:'Servicios',exact:true}).click();await page.getByRole('button',{name:'Nuevo servicio',exact:true}).waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
  await page.goto(`${origin}/book/piloto?consultant=3`,{waitUntil:'domcontentloaded'});
  await page.getByText('Negocio sintético',{exact:true}).waitFor();await page.getByRole('heading',{name:'Diagnóstico y próximos eventos',exact:true}).waitFor();
  assert.equal(await page.locator('[data-public-scheduling]').evaluate(element=>getComputedStyle(element).getPropertyValue('--scheduling-accent').trim()),'#008577');
  await page.getByRole('combobox',{name:/^Servicio \/ Eventos/}).selectOption('service:1');await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByLabel('Fecha',{exact:true}).fill(date);await page.getByRole('button',{name:/10:00|10:00 a/}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();
  const themedButton=page.getByRole('button',{name:'Solicitar sesión',exact:true});await themedButton.waitFor();
  await themedButton.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  assert.equal(await themedButton.evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(0, 133, 119)');
  await fits();await page.screenshot({path:'/tmp/indice-scheduling-public-customized.png',fullPage:true});
  assert.equal(calls.some(c=>c.includes('/platform-admin/')),false);assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  console.log('PASS private: coral identity/emoji, canonical 44px filters and focus, title action hierarchy, clear/disclosure, single-frame Services/Team/Public agenda modals, shared Sales Clients, reassignment/pause/resume/archive, KPI drilldown, 8 locales, role scope, responsive/dark; public custom theme preserved');
} catch(error){console.error(error);if(page){console.error('Failure at',page.url(),await page.locator('body').innerText());await page.screenshot({path:'/tmp/indice-scheduling-failure.png',fullPage:true,timeout:10000}).catch(()=>{});}throw error;}
finally{await browser?.close();await server.close();}
