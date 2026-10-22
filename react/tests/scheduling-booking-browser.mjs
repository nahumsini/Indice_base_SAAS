/** Private request workflow. All reads/mutations use the isolated in-memory preview. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {startPreview} from './scheduling-preview.mjs';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const dir=resolve(process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(),'scheduling-new-request');mkdirSync(dir,{recursive:true});
const origin=`http://127.0.0.1:${process.env.INDICE_SCHEDULING_PREVIEW_PORT || 5197}`;
const server=await startPreview();let browser,page;
const writes=[],clientWrites=[],slotCalls=[],errors=[],external=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10),eventAt=`${date}T16:00:00Z`;
 let catalogMode='error',clientAccess=true,failSlots=true,failSave=true,failClient=true,conflict=false,existing=false,releaseSave,releaseClient;
 const catalog=()=>({title:'',description:'',clientSelectionEnabled:clientAccess,
  services:[{id:1,name:'Diagnóstico empresarial',description:'Sesión inicial',durationMinutes:60,noticeHours:0,chargePolicy:'NO_CHARGE'},{id:6,name:'Sesión de seguimiento',description:'Revisión de avances',durationMinutes:30,noticeHours:0,chargePolicy:'TO_BE_AGREED'}],
  staff:[{id:2,publicName:'Consultor demo 1',timezone:'America/Toronto',serviceIds:[1]},{id:3,publicName:'Consultor demo 2',timezone:'America/Toronto',serviceIds:[6]}],
  events:[{id:4,staffId:3,title:'Webinar de prueba',description:'Presentación grupal',startAt:eventAt,durationMinutes:60,availablePlaces:2,location:'Sala de prueba'}]});
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin){external.push(url.origin);return route.abort();}
  if(url.pathname==='/api/v1/scheduling/catalog'){
   if(catalogMode==='error')return route.fulfill({status:503,json:{message:'Synthetic catalog failure'}});
   return route.fulfill({json:catalogMode==='empty'?{services:[],staff:[],events:[]}:catalog()});
  }
  if(url.pathname==='/api/v1/scheduling/slots'){
   const body=request.postDataJSON();slotCalls.push(body);
   if(failSlots){failSlots=false;return route.fulfill({status:503,json:{message:'Synthetic slots failure'}});}
   return route.fulfill({json:{timezone:'America/Toronto',starts:[`${body.date}T14:00:00Z`,`${body.date}T16:00:00Z`]}});
  }
  if(url.pathname==='/api/v1/scheduling/booking-clients'&&request.method()==='POST'){
   clientWrites.push({body:request.postDataJSON(),key:request.headers()['idempotency-key']});
   if(failClient){failClient=false;await new Promise(resolve=>releaseClient=resolve);return route.fulfill({status:503,json:{message:'Synthetic client failure'}});}
  }
  if(url.pathname==='/api/v1/scheduling/reservations'&&request.method()==='POST'){
   assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');writes.push({body:request.postDataJSON(),key:request.headers()['idempotency-key']});
   if(existing)return route.fulfill({json:{reference:'SCH-existing-registration',status:'CONFIRMED',submissionPolicy:'REVIEW_REQUIRED'}});
   if(conflict){conflict=false;return route.fulfill({status:409,json:{code:'scheduling_conflict',message:'Synthetic slot conflict'}});}
   if(failSave){failSave=false;await new Promise(resolve=>releaseSave=resolve);return route.fulfill({status:503,json:{message:'Synthetic save failure'}});}
  }
  return route.continue();
 });
 const dialog=()=>page.getByRole('dialog'),button=name=>dialog().getByRole('button',{name,exact:true});
 const next=()=>button('Continuar').click();
 const open=async()=>{await page.getByRole('button',{name:'Nueva solicitud',exact:true}).first().click();await dialog().waitFor();};
 const choose=async(id='service:1',staff='2')=>{await dialog().getByRole('combobox',{name:/^Servicio/}).selectOption(id);await dialog().getByRole('combobox',{name:'Colaborador',exact:true}).selectOption(staff);await next();};
 const slot=async()=>{await dialog().getByLabel('Fecha',{exact:true}).fill(date);await dialog().getByRole('group',{name:'Horario',exact:true}).getByRole('button').first().click();await next();};
 const contact=async()=>{await dialog().locator('input[autocomplete="name"]').fill('Visitante sintético');await dialog().locator('input[autocomplete="email"]').fill('visitor@example.com');await dialog().getByRole('checkbox').check();};
 const fit=async()=>{
  assert.equal(await dialog().count(),1);await dialog().evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  const d=await dialog().evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,scroll:el.scrollWidth,client:el.clientWidth};});
  assert.ok(d.x>=-1&&d.y>=-1&&d.x+d.w<=d.vw+1&&d.y+d.h<=d.vh+1,JSON.stringify(d));assert.ok(d.scroll<=d.client+1,'No horizontal modal overflow');
  for(const action of await page.locator('[data-slot="dialog-footer"] button').all()){const r=await action.boundingBox();assert.ok(r&&r.y>=-1&&r.y+r.height<=d.vh+1,'Every footer action stays visible');}
 };
 const capture=name=>page.screenshot({path:resolve(dir,name),animations:'disabled'});
 await page.goto(`${origin}/scheduling/calendar`);await open();await dialog().getByRole('alert').waitFor();assert.equal(await button('Registrar solicitud').count(),0);
 catalogMode='empty';await button('Reintentar').click();await button('Configurar servicios').waitFor();assert.equal(await button('Continuar').count(),0);await button('Cancelar').click();
 catalogMode='ready';await open();assert.equal(await button('Continuar').isDisabled(),true);
 await dialog().getByRole('combobox',{name:/^Servicio/}).selectOption('service:1');await dialog().getByRole('combobox',{name:'Colaborador',exact:true}).selectOption('2');
 await dialog().getByRole('combobox',{name:/^Servicio/}).selectOption('service:6');assert.equal(await dialog().getByRole('combobox',{name:'Colaborador',exact:true}).inputValue(),'');assert.equal(await button('Continuar').isDisabled(),true);
 await dialog().getByRole('combobox',{name:/^Servicio/}).selectOption('service:1');await dialog().getByRole('combobox',{name:'Colaborador',exact:true}).selectOption('2');await fit();await capture('request-selection-desktop.jpg');await next();
 await dialog().getByLabel('Fecha',{exact:true}).fill(date);await dialog().getByRole('alert').waitFor();assert.equal(await button('Continuar').isDisabled(),true);await button('Reintentar').click();await dialog().getByRole('group',{name:'Horario',exact:true}).getByRole('button').first().click();await fit();await capture('request-time-desktop.jpg');await next();
 await dialog().getByRole('button',{name:/Cliente demo 1 · client1@example.com/}).click();assert.equal(await dialog().locator('input[autocomplete="email"]').inputValue(),'client1@example.com');assert.equal(await dialog().getByRole('checkbox').isChecked(),false);
 await button('Crear cliente').click();await dialog().getByLabel('Participante',{exact:true}).fill('Cliente nuevo sintético');await dialog().getByLabel('Correo',{exact:true}).fill('created@example.com');await dialog().getByLabel('Empresa',{exact:true}).fill('Empresa de prueba');await dialog().getByRole('checkbox').check();
 await button('Volver').click();await next();assert.equal(await dialog().getByLabel('Correo',{exact:true}).inputValue(),'created@example.com');assert.equal(await button('Continuar').isDisabled(),true);
 await button('Guardar y seleccionar cliente').click();await button('Cargando…').first().waitFor();assert.equal(await button('Volver').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await dialog().getAttribute('aria-busy'),'true');releaseClient();await dialog().getByRole('alert').waitFor();
 await button('Guardar y seleccionar cliente').click();await dialog().getByText('Cliente vinculado',{exact:true}).waitFor();assert.deepEqual(clientWrites[0],clientWrites[1]);assert.equal(writes.length,0);assert.equal(await dialog().getByRole('checkbox').isChecked(),false);
 await dialog().getByRole('checkbox').check();await fit();await capture('request-contact-desktop.jpg');await next();assert.equal(writes.length,0);await fit();await capture('request-review-desktop.jpg');
 await button('Cancelar').click();await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).waitFor();assert.equal(await dialog().count(),1);await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Revisar solicitud',exact:true}).waitFor();
 await button('Registrar solicitud').click();await button('Cargando…').waitFor();assert.equal(await button('Volver').isDisabled(),true);assert.equal(await button('Cancelar').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await dialog().getAttribute('aria-busy'),'true');releaseSave();await dialog().getByRole('alert').waitFor();
 await button('Registrar solicitud').click();await dialog().getByRole('heading',{name:'Solicitud registrada',exact:true}).waitFor();assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.ok(writes[1].body.clientId);assert.equal(writes[1].body.contactConsent,true);assert.equal(writes[1].body.serviceId,1);assert.equal('companyId' in writes[1].body,false);assert.equal('chargePolicy' in writes[1].body,false);
 assert.match(await dialog().innerText(),/SCH-DEMO-/);assert.match(await dialog().innerText(),/Por revisar/);await fit();await capture('request-registered-desktop.jpg');await button('Cerrar').last().click();
 // Manual contact and a real 409 response: reselect time, retain contact and rotate the request key.
 clientAccess=false;await open();await choose();await slot();await contact();await next();conflict=true;await button('Registrar solicitud').click();await dialog().getByRole('heading',{name:'Fecha y horario',exact:true}).waitFor();await dialog().getByRole('alert').waitFor();
 await dialog().getByRole('group',{name:'Horario',exact:true}).getByRole('button').last().click();await next();assert.equal(await dialog().locator('input[autocomplete="email"]').inputValue(),'visitor@example.com');await next();await button('Registrar solicitud').click();await dialog().getByRole('heading',{name:'Solicitud registrada',exact:true}).waitFor();assert.notEqual(writes[2].key,writes[3].key);assert.equal('clientId' in writes[3].body,false);await button('Cerrar').last().click();
 // Refresh of the owner catalogue retains entered contact details.
 await open();await choose();await slot();await contact();await next();await button('Volver').click();await button('Volver').click();await button('Volver').click();await button('Actualizar servicios y equipo').click();await next();await slot();assert.equal(await dialog().locator('input[autocomplete="email"]').inputValue(),'visitor@example.com');
 await button('Cancelar').click();await button('Descartar solicitud').click();
 existing=true;await open();await dialog().getByRole('combobox').first().selectOption('event:4');await next();await next();await contact();await next();await button('Registrar solicitud').click();await dialog().getByRole('heading',{name:'Solicitud registrada',exact:true}).waitFor();await dialog().getByText('Confirmada',{exact:true}).waitFor();assert.match(await dialog().innerText(),/Esta inscripción al evento ya existía/);await button('Cerrar').last().click();existing=false;
 await page.getByRole('combobox',{name:'Idioma de la prueba',exact:true}).selectOption('fr-CA');await page.getByRole('button',{name:'Cambiar tema de prueba',exact:true}).click();
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:360}]){
  await page.setViewportSize(viewport);await page.getByRole('button',{name:'Nouvelle demande',exact:true}).first().click();await dialog().waitFor();await dialog().getByRole('combobox').first().selectOption('event:4');assert.equal(await dialog().getByRole('combobox').nth(1).inputValue(),'3');assert.equal(await dialog().getByRole('combobox').nth(1).isDisabled(),true);await fit();
  await button('Continuer').click();await fit();assert.equal(await dialog().locator('input[type="date"]').count(),0);await button('Continuer').click();await fit();
  await dialog().locator('input[autocomplete="name"]').fill('Participant synthétique');await dialog().locator('input[autocomplete="email"]').fill('french@example.com');await dialog().getByRole('checkbox').check();await button('Continuer').click();await fit();await capture(`request-review-dark-fr-${viewport.width}.jpg`);
  await button('Enregistrer la demande').click();await dialog().getByRole('heading',{name:'Demande enregistrée',exact:true}).waitFor();await fit();await button('Fermer').last().click();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS private request: catalogue retry/empty setup; service/staff eligibility; slots error/retry; retained time/contact/client draft across Back; client creation stable retry; one-frame discard/Escape; final-only send; pending locks; 503 stable retry; 409 recovery; catalogue refresh; private reference/pending status; manual capture without CRM; events/host; French/dark; 320px/portrait/landscape.');
}catch(error){if(page){console.error(await page.locator('body').innerText());await page.screenshot({path:resolve(dir,'failure.jpg'),animations:'disabled'}).catch(()=>{});}throw error;}
finally{await browser?.close();await server.close();}
