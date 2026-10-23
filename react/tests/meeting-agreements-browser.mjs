import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdirSync} from 'node:fs';
import {createServer} from 'vite';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const port=Number(process.env.INDICE_MEETING_BROWSER_PORT || 5242),origin=`http://127.0.0.1:${port}`;
const artifacts=resolve(process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(),'indice-meeting-agreements');mkdirSync(artifacts,{recursive:true});
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:resolve(import.meta.dirname,'../node_modules/.vite-meeting-agreements'),server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null,proxy:{}},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
let browser, page;
try{
  await server.listen();browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
  page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'America/Toronto'});page.setDefaultTimeout(20000);
  await page.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  const errors=[],unexpected=[],delegations=[];page.on('pageerror',error=>errors.push(error.message));
  const people=[{id:42,name:'Responsable sintético'},{id:43,name:'Participante sintético'}];
  const now=new Date(),meeting={id:1,title:'Junta de resultados',meetingType:'WORKING',status:'IN_PROGRESS',startAt:now.toISOString(),endAt:new Date(+now+3600000).toISOString(),timezone:'America/Toronto',ownerId:42,ownerName:people[0].name,participantCount:1,hasMinutes:true,version:1};
  const record={meeting,agenda:'Revisar entrega y acordar responsables',location:'Sala sintética',minutes:'Se revisaron los resultados.',decisions:'Preparar entrega.',participants:[people[1]],history:[],planning:{objective:'Resolver entrega',expectedResult:'Confirmar responsables',minutesOwner:people[0],reminderMinutes:0,seriesId:null,occurrenceNumber:null,remindersPaused:false,seriesVersion:0}};
  const agreement={id:1,meetingId:1,meetingTitle:meeting.title,title:'Entregar reporte de resultados',assigneeId:43,assigneeName:people[1].name,dueDate:'2026-10-25',status:'OPEN',resolution:'',version:1,meetingOwnerId:42,followupEnabled:true};let task=null,failDelegation=true;
  const project=()=>({agreement,history:[],task,canLinkTask:!task&&agreement.status==='OPEN'});
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,body=req.postData()?req.postDataJSON():{};
    if(url.origin!==origin)return route.abort();if(!path.startsWith('/api/'))return route.continue();
    const ok=json=>route.fulfill({json});
    if(path==='/api/v1/auth/me')return ok({user:{id:42,name:people[0].name,role:'superadmin',tab_permissions_configured:true,tab_permission_keys:[]},company:{id:8,name:'Empresa sintética',active:true,role:'superadmin'},csrfToken:'synthetic-csrf'});
    if(path==='/api/v1/learning/progress')return ok({catalogVersion:'synthetic',currentChapterId:null,stages:[],chapters:[],nextMission:null});
    if(path.startsWith('/api/v1/workspace-state/'))return ok({state:req.method()==='PUT'?body.state:{},schemaVersion:1});
    if(path==='/api/v1/modules')return ok([{slug:'control_minutas',name:'Control de juntas',category:'complementary',locked:false}]);
    if(path.startsWith('/api/v1/meetings')){
      const tail=path.slice('/api/v1/meetings'.length);
      if(req.method()!=='GET')assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
      if(tail==='/1')return ok(record);
      if(tail==='/1/attendance')return ok({people:people.map(p=>({userId:p.id,name:p.name,status:'UNMARKED'})),version:1});
      if(tail==='/1/ballots')return ok({items:[],total:0,page:1,pageSize:10});
      if(tail==='/1/agreement-performance')return ok({total:13,eligible:10,onTime:7,late:2,overdue:1,upcoming:1,cancelled:1,historicalUnknown:1,onTimePercent:70,calculatedAt:now.toISOString(),timezone:meeting.timezone});
      if(tail==='/agreements/1/evidence')return ok({originalDueDate:'2026-10-25',deadlineBasis:'CREATED',fulfilledAt:agreement.status==='DONE'?now.toISOString():null,outcome:agreement.status==='DONE'?'ON_TIME':'UPCOMING',revisions:[]});
      if(tail==='/agreements/1')return ok(project());
      if(tail==='/agreements/1/task-delegation'){
        delegations.push(body);assert.equal(body.expectedVersion,agreement.version);
        if(failDelegation){failDelegation=false;return route.fulfill({status:503,json:{code:'temporary_unavailable'}});}
        Object.assign(agreement,{assigneeId:body.assigneeId,assigneeName:people.find(p=>p.id===body.assigneeId).name,dueDate:body.dueDate,version:2});task={id:7,folio:'TASK-7',title:agreement.title,status:'completed',dueDate:agreement.dueDate};return ok(project());
      }
      if(tail==='/agreements/1/status'){assert.equal(body.expectedVersion,agreement.version);assert.equal(body.status,'DONE');assert.ok(body.reason.length>=3);Object.assign(agreement,{status:body.status,resolution:body.reason,version:3});return ok(agreement);}
      if(tail==='/members'||tail==='/agreement-assignees')return ok({items:people,total:2});
      if(tail==='/agreement-meetings/search')return ok({items:[{id:1,title:meeting.title,participants:people}],total:1,page:1,pageSize:25});
      if(tail==='/flows')return ok([]);if(tail==='/series')return ok({items:[],total:0,page:1,pageSize:25});
      if(['','/calendar','/agreements'].includes(tail))return ok({items:tail==='/agreements'?[agreement]:[meeting],total:1,page:1,pageSize:25});
    }
    unexpected.push(req.method()+' '+path);return route.fulfill({status:500,json:{code:'unexpected_synthetic_api'}});
  });
  await page.goto(origin+'/tests/browser/meeting-control.html?meeting=1',{waitUntil:'domcontentloaded',timeout:120000});
  let dialog=page.getByRole('dialog');await dialog.getByRole('heading',{name:meeting.title,exact:true}).waitFor();
  await dialog.getByText(/70\s*%/).waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Iniciar junta',exact:true}).count(),0);
  await dialog.getByRole('button',{name:'Continuar junta',exact:true}).click();await page.waitForURL('**/minutes-control/session?meeting=1');
  await page.getByRole('tab',{name:/Acuerdos y resultados/}).click();
  await page.getByRole('button',{name:agreement.title,exact:true}).click();
  await page.getByRole('button',{name:'Crear tarea y delegar',exact:true}).click();
  await page.getByLabel('Responsable',{exact:true}).selectOption('42');
  await page.getByLabel('Fecha compromiso',{exact:true}).fill('2026-10-30');
  await page.getByLabel('Motivo del cambio de responsable o plazo',{exact:true}).fill('Delegación revisada durante la junta');
  await page.getByRole('button',{name:'Crear tarea y delegar',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Fecha compromiso',{exact:true}).inputValue(),'2026-10-30');
  await page.getByRole('button',{name:'Crear tarea y delegar',exact:true}).click();
  await page.getByRole('link',{name:'Ver tarea',exact:true}).waitFor();assert.deepEqual(delegations[0],delegations[1]);assert.equal(agreement.status,'OPEN');
  assert.match(await page.getByRole('link',{name:'Ver tarea',exact:true}).getAttribute('href'),/processes-tasks\/calendar\?period=all&search=TASK-7/);
  const settle=async()=>{await page.evaluate(()=>new Promise(requestAnimationFrame));await page.evaluate(()=>Promise.all(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{}))));};
  await settle();await page.screenshot({path:resolve(artifacts,'agreement-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Validar cumplimiento del acuerdo',exact:true}).click();
  await page.getByLabel('Motivo / evidencia del resultado',{exact:true}).fill('Reporte entregado y verificado por el coordinador');
  await page.getByRole('button',{name:'Validar cumplimiento',exact:true}).click();await page.getByRole('button',{name:'Validar cumplimiento del acuerdo',exact:true}).waitFor({state:'hidden'});assert.equal(agreement.status,'DONE');
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>document.documentElement.classList.add('dark'));await settle();
  await page.screenshot({path:resolve(artifacts,'agreement-phone-dark.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone must fit viewport');
  const bounds=await page.getByRole('dialog').boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=390,JSON.stringify(bounds));
  const footer=await page.getByRole('dialog').locator('[data-slot="dialog-footer"]').boundingBox();assert.ok(footer&&footer.y+footer.height<=844);
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);console.log('Passed: compact modal, native room, 70% score, delegation review/retry, unique task, independent fulfilment, phone/dark. Artifacts: '+artifacts);
}catch(error){if(page){console.error(await page.locator("body").innerText());await page.screenshot({path:resolve(artifacts,"failure.png"),fullPage:true});}throw error;}finally{await browser?.close();await server.close();}
