import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';
const runtime=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5201';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/private/tmp/indice-company-settings-vite',server:{host:'127.0.0.1',port:5201,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9uoAAAAASUVORK5CYII=','base64');
const session=(id,company,role='admin')=>({user:{id,name:'Synthetic User',role,module_slugs:['config_center'],tab_permissions_configured:true,tab_permission_keys:['config_center.profile','config_center.business-structure']},company:{id:company,name:'Synthetic company',role,active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
const initial=id=>({id,nombre_empresa:`Synthetic Company ${id}`,industria:'retail',descripcion:'Original description',estructura:'multi',address:{street:'Synthetic Street',country:'MX',state:'CMX',city:'Synthetic City',zip:'01000'},latitude:null,longitude:null,map:[{name:'Corporate office',legacy_unit_id:101,is_corporate_office:true,businesses:[{name:'Corporate headquarters',legacy_business_id:201}]},{name:'North Unit',legacy_unit_id:102,is_corporate_office:false,businesses:[{name:'North headquarters',legacy_business_id:202},{name:'North Store',legacy_business_id:203}]}]});
async function flow(engine){
 const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
 let id=9001,company=9001,role='admin',canEdit=true,failLoad='',failSave=false,loseAck=false,loadDelay=0,saveDelay=0,coordinateDelay=0,sequence=300;
 const saved=new Map([[9001,initial(9001)],[9002,initial(9002)]]),writes=[],errors=[],unexpected=[];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(url.origin!==origin)return route.abort();
  if(!path.startsWith('/api/'))return route.continue();
  const reply=json=>route.fulfill({json});
  if(['/api/v1/config-center/company','/api/v1/config-center/config','/api/v1/config-center/business-structure','/api/v1/config-center/locations/extract-coordinates'].includes(path)){
    assert.equal(req.headers()['x-company-actor'],`${company}:${id}`);
    if(req.method()==='GET'){
      const value=structuredClone(saved.get(company));await delay(loadDelay);
      if(failLoad&&(path.endsWith(failLoad)))return route.fulfill({status:503,json:{message:'SQL synthetic private detail'}});
      return reply(path.endsWith('/company')?value:{estructura:value.estructura,map:value.map,can_edit:canEdit});
    }
    assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
    if(path.endsWith('extract-coordinates')){await delay(coordinateDelay);return reply({latitude:19.4326,longitude:-99.1332,resolved_url:'https://maps.example.invalid/synthetic'});}
    assert.equal(path,'/api/v1/config-center/business-structure','identity and organization use one atomic request');
    const ownCompany=company,body=req.postDataJSON();writes.push({company:ownCompany,body});await delay(saveDelay);
    if(failSave){failSave=false;return route.fulfill({status:503,json:{message:'SQL synthetic private detail'}});}
    const map=body.map.map(unit=>({...unit,legacy_unit_id:unit.legacy_unit_id??++sequence,businesses:unit.businesses.map(business=>({...business,legacy_business_id:business.legacy_business_id??++sequence}))}));
    const value={...saved.get(ownCompany),...body.company,estructura:body.estructura,map};saved.set(ownCompany,value);
    if(loseAck){loseAck=false;return route.fulfill({status:503,json:{message:'Synthetic lost confirmation'}});}
    return reply({estructura:body.estructura,map,company:value});
  }
  if(path==='/api/v1/auth/me')return reply(session(id,company,role));
  if(path.includes('/current-user'))return reply({id,nombres:'Synthetic',apellidos:'User',preferred_language:'es-MX'});
  if(path.startsWith('/api/v1/workspace-state/'))return reply({state:req.method()==='PUT'?req.postDataJSON().state:{},schemaVersion:1});
  if(path.includes('managed-compan'))return reply({active:false,authority_mode:'NONE',companies:[]});
  if(path==='/api/v1/exchange-rates/daily')return reply({ratesPerUsd:{USD:1,MXN:18.5,CAD:1.36,COP:4000,BRL:5.5},metadata:{sourceDate:'2026-10-19',updatedAt:new Date().toISOString()},sources:[]});
  if(path==='/api/v1/messaging/unread')return reply(0);
  if(path.includes('notifications'))return reply({items:[],summary:{total_count:0,unread_count:0}});
  unexpected.push(`${req.method()} ${path}`);return route.fulfill({status:503,json:{}});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const name=()=>page.getByRole('textbox',{name:'Nombre de la empresa',exact:true});
 const ready=()=>page.waitForFunction(()=>[...document.querySelectorAll('input')].some(el=>el.getAttribute('aria-label')==='Nombre de la empresa'&&!el.disabled));
 const save=()=>page.getByRole('button',{name:/^(Guardar cambios|Reintentar)$/});
 const status=()=>page.getByRole('status').filter({hasText:'Cambios guardados'}).waitFor();
 const dialog=()=>page.getByRole('dialog');
 const switchActor=async(next,nextCompany=9001,nextRole='admin')=>{id=next;company=nextCompany;role=nextRole;await page.evaluate(({id,company,role})=>window.companyFixture.switchUser(id,company,role),{id,company,role});};
 const fit=async()=>{const overflow=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,main:document.querySelector('[data-company-scroll]').scrollWidth,items:[...document.querySelectorAll('body *')].filter(el=>{const b=el.getBoundingClientRect();return b.width&&b.right>innerWidth+1}).slice(-18).map(el=>({tag:el.tagName,text:el.textContent?.slice(0,85),class:el.className,right:el.getBoundingClientRect().right}))}));if(overflow.body>overflow.width||overflow.main>overflow.width){console.log('OVERFLOW',JSON.stringify(overflow));if(process.env.INDICE_COMPANY_OUTPUT_DIR)await page.screenshot({path:join(process.env.INDICE_COMPANY_OUTPUT_DIR,engine+'-overflow.png')});}assert(overflow.body<=overflow.width&&overflow.main<=overflow.width);};
 await page.goto(`${origin}/tests/browser/company-settings.html`);await ready();assert.equal(writes.length,0);
 await name().fill('');await save().click();await page.getByRole('alert').filter({hasText:'Escribe un nombre'}).waitFor();assert.equal(writes.length,0);
 await page.getByRole('button',{name:'Descartar cambios',exact:true}).click();assert.equal(await name().inputValue(),'Synthetic Company 9001');
 saveDelay=450;await name().fill('First confirmed name');await save().evaluate(el=>{el.click();el.click();});await page.getByRole('status').filter({hasText:'Guardando'}).waitFor();
 await name().fill('Latest typed name');await status();await delay(1300);await status();assert.equal(saved.get(9001).nombre_empresa,'Latest typed name');assert.equal(writes.length,2);saveDelay=0;
 await page.reload();await ready();assert.equal(await name().inputValue(),'Latest typed name');
 console.log(`${engine}: complete load, atomic company/organization save, duplicate-click guard, pending typing and reload pass`);
 failSave=true;await name().fill('Retained draft');await save().click();await page.getByRole('alert').filter({hasText:'No se guardaron'}).waitFor();assert.equal(await name().inputValue(),'Retained draft');assert.equal(await page.getByText('SQL synthetic private detail').count(),0);
 await page.getByRole('button',{name:'Reintentar',exact:true}).click();await status();assert.equal(saved.get(9001).nombre_empresa,'Retained draft');
 loseAck=true;await name().fill('Uncertain confirmation');await save().click();await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Reintentar',exact:true}).click();await status();
 // Coordinate validation is visible and cannot write half a location.
 const latitude=()=>page.getByRole('spinbutton',{name:'Latitud',exact:true});
 const longitude=()=>page.getByRole('spinbutton',{name:'Longitud',exact:true});
 const beforeCoordinates=writes.length;await latitude().fill('19.43');await save().click();await page.getByRole('alert').filter({hasText:'Completa latitud y longitud'}).waitFor();assert.equal(writes.length,beforeCoordinates);
 await longitude().fill('-99.13');await save().click();await status();
 coordinateDelay=450;await page.getByRole('textbox',{name:'Enlace de Google Maps',exact:true}).fill('https://maps.example.invalid/request');await page.getByRole('button',{name:'Obtener coordenadas',exact:true}).click();await latitude().fill('20');await latitude().evaluate(el=>el.blur());await delay(550);assert.equal(await latitude().inputValue(),'20');await save().click();await status();coordinateDelay=0;
 console.log(`${engine}: save failures retain draft; retry, uncertain acknowledgement and late coordinate responses are safe`);
 // Validate logos without replacing the previous preview on failure.
 await page.locator('summary').click();const logoInput=page.locator('input[type=file]').first();
 await logoInput.setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(1024*1024+1)});await page.getByRole('alert').filter({hasText:'1 MB'}).waitFor();
 await logoInput.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg onload="alert(1)"/>')});await page.getByRole('alert').filter({hasText:'imagen válida'}).waitFor();
 await logoInput.setInputFiles({name:'valid.png',mimeType:'image/png',buffer:png});await delay(100);await save().click();await status();assert(saved.get(9001).logo_url.startsWith('data:image/png;base64,'));
 // The organization dialogs keep their stable persisted IDs and surface failures inside the dialog.
 await page.getByRole('button',{name:'Configurar grupo',exact:true}).first().click();await dialog().waitFor();const unitName=dialog().getByRole('textbox',{name:'Nombre de la unidad',exact:true});
 await unitName.fill('Renamed Unit');failSave=true;await dialog().getByRole('button',{name:'Guardar cambios',exact:true}).click();await dialog().getByRole('alert').filter({hasText:'No se guardaron'}).waitFor();assert.equal(await unitName.inputValue(),'Renamed Unit');
 saveDelay=400;await dialog().getByRole('button',{name:'Guardar cambios',exact:true}).click();await delay(50);assert.equal(await dialog().getByRole('button',{name:'Cancelar',exact:true}).isDisabled(),true);await dialog().waitFor({state:'hidden'});saveDelay=0;
 const renamed=saved.get(9001).map.find(unit=>unit.name==='Renamed Unit');assert.equal(renamed.legacy_unit_id,102);assert.equal(renamed.businesses.find(b=>b.name==='North Store').legacy_business_id,203);
 await page.getByRole('button',{name:/Agregar otra unidad/}).click();await dialog().getByRole('textbox',{name:'Nombre de la unidad',exact:true}).fill('New Unit');await dialog().getByRole('button',{name:'Guardar cambios',exact:true}).click();await dialog().waitFor({state:'hidden'});assert(saved.get(9001).map.find(unit=>unit.name==='New Unit').legacy_unit_id>300);
 await page.getByRole('button',{name:/Agregar negocio/}).last().click();await dialog().getByRole('textbox',{name:'Nombre del negocio',exact:true}).fill('New Store');await dialog().getByRole('button',{name:'Crear negocio',exact:true}).click();await dialog().waitFor({state:'hidden'});assert(saved.get(9001).map.some(unit=>unit.businesses.some(b=>b.name==='New Store'&&b.legacy_business_id>300)));
 // Failed deletion keeps the unit visible until the retry is acknowledged.
 const newUnitArticle=page.locator('article').filter({has:page.getByRole('heading',{name:'New Unit',exact:true})});
 await newUnitArticle.getByRole('button',{name:'Eliminar: New Unit',exact:true}).click();failSave=true;await dialog().getByRole('button',{name:'Eliminar',exact:true}).click();await dialog().getByRole('alert').waitFor();assert(saved.get(9001).map.some(unit=>unit.name==='New Unit'));
 await dialog().getByRole('button',{name:'Eliminar',exact:true}).click();await dialog().waitFor({state:'hidden'});assert(!saved.get(9001).map.some(unit=>unit.name==='New Unit'));
 console.log(`${engine}: validated logos, inline modal errors, pending cancellation guard, unit rename and new unit/business persistence pass`);
 for(const failed of ['company','config']){failLoad=failed;await page.reload();await page.getByRole('alert').filter({hasText:'No pudimos cargar todos los datos'}).waitFor();assert.equal(await name().isDisabled(),true);const before=writes.length;await delay(1100);assert.equal(writes.length,before);failLoad='';await page.getByRole('button',{name:'Reintentar',exact:true}).click();await ready();}
 canEdit=false;await page.reload();await page.getByText('No tienes permiso para editar la configuración de esta empresa.',{exact:true}).waitFor();assert.equal(await name().isDisabled(),true);canEdit=true;await page.reload();await ready();
 saved.set(9003,{...initial(9003),map:[]});await switchActor(9003,9003);await ready();
 await page.getByRole('button',{name:/Agregar otra unidad/}).click();await dialog().getByRole('textbox',{name:'Nombre de la unidad',exact:true}).fill('First Operational Unit');await dialog().getByRole('button',{name:'Guardar cambios',exact:true}).click();await dialog().waitFor({state:'hidden'});
 assert(saved.get(9003).map.some(unit=>unit.is_corporate_office));assert(saved.get(9003).map.some(unit=>unit.name==='First Operational Unit'&&!unit.is_corporate_office));await switchActor(9001,9001);await ready();
 loadDelay=450;await switchActor(9002,9002);await delay(70);loadDelay=0;await switchActor(9001,9001);await ready();await delay(500);assert.equal(await name().inputValue(),'Uncertain confirmation');
 saveDelay=450;await name().fill('Previous company save');await save().click();await delay(70);await switchActor(9002,9002);await ready();await delay(500);assert.equal(await name().inputValue(),'Synthetic Company 9002');saveDelay=0;
 console.log(`${engine}: partial loads fail closed; permissions and late load/save responses respect account/company changes`);
 await switchActor(9001,9001);await ready();
 const out=process.env.INDICE_COMPANY_OUTPUT_DIR;if(out)mkdirSync(out,{recursive:true});
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>document.querySelector('[data-company-scroll]').scrollTo(0,0));await fit();
  assert(Number.parseFloat(await name().evaluate(el=>getComputedStyle(el).fontSize))>= (viewport.width<640?16:14));
  if(out)await page.screenshot({path:join(out,`${engine}-company-${viewport.width}.png`)});
  await page.getByRole('button',{name:/Agregar otra unidad/}).click();await dialog().waitFor();
  assert.equal(await dialog().evaluate(el=>el.scrollWidth>el.clientWidth),false);const submit=dialog().getByRole('button',{name:'Guardar cambios',exact:true});await submit.scrollIntoViewIfNeeded();const box=await submit.boundingBox();assert(box.y>=0&&box.y+box.height<=viewport.height+1);
  await dialog().getByRole('button',{name:'Cancelar',exact:true}).click();
 }
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.setViewportSize({width:390,height:844});await fit();if(out)await page.screenshot({path:join(out,`${engine}-company-dark.png`)});
 for(const code of ['en-US','en-CA','es-CO','fr-CA','pt-BR','ko-CA','zh-CA','es-MX']){await page.evaluate(code=>window.companyFixture.language(code),code);await fit();assert.equal(await page.getByText('undefined',{exact:true}).count(),0);}
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log(`${engine}: 320/390 mobile, landscape, desktop, modal footer, dark mode and all 8 locales fit without horizontal overflow`);
 await context.close();
 }finally{await browser.close();}
}
await server.listen();try{for(const engine of (process.env.INDICE_TEST_ENGINES||'chromium,webkit').split(','))await flow(engine);}finally{await server.close();}
