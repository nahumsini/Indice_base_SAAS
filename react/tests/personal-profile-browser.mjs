import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';
const runtime=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5200';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/private/tmp/indice-personal-profile-vite',plugins:[{name:'profile-fixture-route',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.split('?')[0]==='/home-panel/profile')req.url='/tests/browser/personal-profile.html';next();});}}],server:{host:'127.0.0.1',port:5200,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9uoAAAAASUVORK5CYII=','base64');
const user=id=>({id,email:`synthetic-${id}@example.invalid`,primer_nombre:id===9001?'Synthetic':'Other',apellido_paterno:'User',nombres:'Synthetic',apellidos:'User',country:'MX',preferred_language:'es-MX',telefono:'+525555123456',phone_numbers:[{label:'Mobile',phone:'+525555123456',country:'MX',is_primary:true}],avatar_url:'/synthetic-avatar/original.png',avatar_object_key:'',avatar_content_type:'',role:'admin'});
const session=(id,company)=>({user:{id,name:'Synthetic User',role:'admin',module_slugs:['config_center'],tab_permissions_configured:true,tab_permission_keys:['config_center.profile']},company:{id:company,name:'Synthetic company',role:'admin',active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
async function flow(engine){
 const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{if(!localStorage.getItem('frontend-indice-language'))localStorage.setItem('frontend-indice-language','es-MX');});
 let id=9001,company=9001,failLoad=false,failSave=false,loseAck=false,loadDelay=0,saveDelay=0,uploadDelay=0,failUpload=false,failPresign=false,sequence=0;
 const saved=new Map([[9001,user(9001)],[9002,user(9002)]]),writes=[],uploads=[],errors=[],unexpected=[];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(url.origin!==origin)return route.abort();
  const reply=json=>route.fulfill({json});
  if(path.startsWith('/synthetic-avatar/'))return route.fulfill({body:png,contentType:'image/png'});
  if(path.startsWith('/synthetic-upload/')){assert.equal(req.method(),'PUT');uploads.push(req.postDataBuffer()?.length);await delay(uploadDelay);if(failUpload){failUpload=false;return route.fulfill({status:503});}return route.fulfill({status:200});}
  if(!path.startsWith('/api/'))return route.continue();
  if(path==='/api/v1/config-center/current-user'){
    const ownId=id;if(req.headers()['x-profile-actor']!==`${company}:${id}`)return route.fulfill({status:409,json:{code:'profile_actor_changed',message:'Synthetic account changed'}});
    if(req.method()==='GET'){const value=structuredClone(saved.get(ownId));await delay(loadDelay);if(failLoad)return route.fulfill({status:503,json:{message:'Synthetic private failure'}});return reply(value);}
    assert.equal(req.method(),'PUT');assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
    const body=req.postDataJSON();writes.push({id:ownId,body});await delay(saveDelay);
    if(failSave){failSave=false;return route.fulfill({status:503,json:{message:'SQL synthetic internal detail'}});}
    const value={...saved.get(ownId),...body,id:ownId,nombres:body.primer_nombre,apellidos:body.apellido_paterno};
    delete value.new_password;delete value.confirm_new_password;
    if(body.avatar_object_key)value.avatar_url=`/synthetic-avatar/${sequence}.png`;
    saved.set(ownId,value);if(loseAck){loseAck=false;return route.fulfill({status:503,json:{message:'Synthetic lost confirmation'}});}return reply(value);
  }
  if(path==='/api/v1/config-center/current-user/avatar/presign-upload'){
    assert.equal(req.headers()['x-profile-actor'],`${company}:${id}`);assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
    if(failPresign){failPresign=false;return route.fulfill({status:503,json:{message:'Synthetic storage unavailable'}});}
    const body=req.postDataJSON();assert(body.size_bytes>0&&body.size_bytes<=1024*1024);assert(['image/webp','image/jpeg'].includes(body.content_type));
    sequence++;return reply({object_key:`config-center/user-profiles/${company}/${id}/avatar/${sequence}.webp`,upload_url:`${origin}/synthetic-upload/${sequence}`,content_type:body.content_type,upload_headers:{'Content-Type':body.content_type}});
  }
  if(path==='/api/v1/auth/me')return reply(session(id,company));
  if(path.startsWith('/api/v1/workspace-state/'))return reply({state:req.method()==='PUT'?req.postDataJSON().state:{},schemaVersion:1});
  if(path.includes('managed-compan'))return reply({active:false,authority_mode:'NONE',companies:[]});
  if(path==='/api/v1/exchange-rates/daily')return reply({ratesPerUsd:{USD:1,MXN:18.5,CAD:1.36,COP:4000,BRL:5.5},metadata:{sourceDate:'2026-10-19',updatedAt:new Date().toISOString()},sources:[]});
  if(path==='/api/v1/messaging/unread')return reply(0);
  if(path.includes('notifications'))return reply({items:[],summary:{total_count:0,unread_count:0}});
  unexpected.push(`${req.method()} ${path}`);return route.fulfill({status:503,json:{message:'Unexpected synthetic API'}});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/children with the same key/.test(m.text()))errors.push(m.text());});
 const first=()=>page.getByLabel('Nombre o nombres',{exact:true}),last=()=>page.getByLabel('Apellido o apellidos',{exact:true});
 const save=()=>page.getByRole('button',{name:'Guardar cambios',exact:true}),discard=()=>page.getByRole('button',{name:'Descartar',exact:true});
 const ready=()=>page.waitForFunction(()=>!document.getElementById('profile-first-name')?.matches(':disabled'));
 const value=async(locator,expected)=>assert.equal(await locator.inputValue(),expected);
 const switchUser=async(next,nextCompany=9001)=>{id=next;company=nextCompany;await page.evaluate(({id,company})=>window.profileFixture.switchUser(id,company),{id,company});};
 const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.querySelector('[data-profile-scroll]').scrollWidth>innerWidth),false);
 const status=expected=>page.getByRole('status').filter({hasText:expected}).waitFor();
 await page.goto(`${origin}/home-panel/profile`);await ready();await value(first(),'Synthetic');assert.equal(await save().isDisabled(),true);
 await first().fill('Edited');await discard().click();await value(first(),'Synthetic');assert.equal(writes.length,0);
 await first().fill('');await last().fill('');await save().click();await page.getByRole('alert').filter({hasText:'Escribe al menos un nombre.'}).waitFor();assert.equal(writes.length,0);assert.equal(await first().getAttribute('aria-invalid'),'true');
 await discard().click();await first().fill('A'.repeat(100));await save().click();await page.getByRole('alert').filter({hasText:/100 caracteres/}).waitFor();assert.equal(writes.length,0);await discard().click();
 await page.getByRole('button',{name:'Agregar teléfono',exact:true}).click();const phone2=page.getByRole('textbox',{name:'Número · 2',exact:true});
 await page.getByRole('combobox',{name:'País · 2',exact:true}).selectOption('CA');await phone2.fill('123');await save().click();await page.getByRole('alert').filter({hasText:/teléfono válido/}).waitFor();assert.equal(writes.length,0);
 await page.getByRole('combobox',{name:'País · 2',exact:true}).selectOption('MX');await phone2.fill('+525555123456');await save().click();await page.getByRole('alert').filter({hasText:/ya está en tu perfil/}).waitFor();assert.equal(writes.length,0);
 await page.getByRole('combobox',{name:'País · 2',exact:true}).selectOption('CA');await phone2.fill('+14165551234');
 await page.getByRole('combobox',{name:'País',exact:true}).selectOption('CA');assert.equal(await page.getByRole('combobox',{name:'País · 1',exact:true}).inputValue(),'MX');
 await first().fill('Confirmed');saveDelay=350;await save().evaluate(el=>{el.click();el.click();});await page.getByRole('button',{name:'Guardando...',exact:true}).waitFor();assert.equal(await first().isDisabled(),true);
 await status('Perfil guardado.');saveDelay=0;assert.equal(writes.length,1);assert.equal(saved.get(9001).phone_numbers.length,2);assert.equal(saved.get(9001).phone_numbers[1].country,'CA');await page.reload();await ready();await value(first(),'Confirmed');assert.equal(await page.getByRole('textbox',{name:'Número · 2',exact:true}).count(),1);
 console.log(`${engine}: names and every phone validate; residence keeps phone countries; atomic save, duplicate guard, discard and reload work`);
 await first().fill('Retained draft');failSave=true;await save().click();await page.getByRole('alert').filter({hasText:'No fue posible guardar el perfil.'}).waitFor();await value(first(),'Retained draft');assert.equal(await page.getByText('SQL synthetic internal detail').count(),0);assert.equal(saved.get(id).primer_nombre,'Confirmed');
 await save().click();await status('Perfil guardado.');await first().fill('Lost acknowledgement');loseAck=true;await save().click();await page.getByRole('alert').waitFor();await save().click();await status('Perfil guardado.');await value(first(),'Lost acknowledgement');
 await page.locator('summary').click();const password=page.getByLabel('Nueva contraseña',{exact:true}),confirm=page.getByLabel('Confirmar contraseña',{exact:true});
 const beforePassword=writes.length;await password.fill('short');await confirm.fill('short');await save().click();await page.getByRole('alert').filter({hasText:/8 caracteres/}).waitFor();assert.equal(writes.length,beforePassword);
 await password.fill(' exact synthetic secret ');await confirm.fill('different synthetic secret');await save().click();await page.getByRole('alert').filter({hasText:/deben coincidir/}).waitFor();assert.equal(writes.length,beforePassword);
 await confirm.fill(' exact synthetic secret ');await save().click();await status('Perfil guardado.');assert.equal(writes.at(-1).body.new_password,' exact synthetic secret ');await value(password,'');await value(confirm,'');
 console.log(`${engine}: failed and uncertain saves keep the draft; password validation preserves exact input and clears only after confirmation`);
 const input=page.locator('input[type=file]');const photo=page.getByRole('img',{name:'Foto de perfil',exact:true});
 const upload=()=>input.setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
 await input.setInputFiles({name:'document.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic')});await page.getByRole('alert').filter({hasText:/Elige una foto/}).waitFor();
 failPresign=true;await upload();await page.getByRole('alert').filter({hasText:/No se pudo subir la foto/}).waitFor();assert.equal(await photo.getAttribute('src'),'/synthetic-avatar/original.png');
 await upload();await status('Foto subida.');const pendingPhoto=await photo.getAttribute('src');assert(pendingPhoto.startsWith('blob:'));failUpload=true;await upload();await page.getByRole('alert').waitFor();assert.equal(await photo.getAttribute('src'),pendingPhoto);
 await discard().click();assert.equal(await photo.getAttribute('src'),'/synthetic-avatar/original.png');
 await upload();await status('Foto subida.');await save().click();await status('Perfil guardado.');assert((await photo.getAttribute('src')).startsWith('/synthetic-avatar/'));
 await page.getByRole('button',{name:'Mi perfil',exact:true}).click();await page.getByRole('menu').getByText('Lost acknowledgement User',{exact:true}).waitFor();await page.keyboard.press('Escape');
 console.log(`${engine}: photo compression/upload, staged preview, failure retention and discard work; header refreshes after confirmed save`);
 failLoad=true;await page.reload();await page.getByRole('alert').filter({hasText:'No fue posible cargar el perfil.'}).waitFor();assert.equal(await save().isDisabled(),true);assert.equal(await first().isDisabled(),true);
 failLoad=false;await page.getByRole('button',{name:'Reintentar',exact:true}).click();await ready();
 loadDelay=350;await switchUser(9002);await delay(60);loadDelay=0;await switchUser(9001);await ready();await delay(400);await value(first(),'Lost acknowledgement');
 await first().fill('Old account save');saveDelay=400;await save().click();await delay(50);await switchUser(9002);await ready();await value(first(),'Other');await delay(450);await value(first(),'Other');saveDelay=0;
 await switchUser(9002,9002);await ready();await value(first(),'Other');await first().fill('Other confirmed');await save().click();await status('Perfil guardado.');assert.equal(saved.get(9001).primer_nombre,'Old account save');
 await switchUser(9002,9001);await ready();await value(first(),'Other confirmed');
 console.log(`${engine}: failed loads retry safely; user/company switches discard old UI and ignore late responses; personal identity remains user-owned`);
 for(const viewport of [{width:320,height:568},{width:844,height:390},{width:1440,height:900}]){
  await page.setViewportSize(viewport);await fit();await first().fill('Responsive draft');
  await save().scrollIntoViewIfNeeded();const box=await save().boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,JSON.stringify({viewport,box}));
  if(process.env.INDICE_TEST_SCREENSHOTS_DIR){mkdirSync(process.env.INDICE_TEST_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:join(process.env.INDICE_TEST_SCREENSHOTS_DIR,`${engine}-profile-${viewport.width}.png`),animations:'disabled'});}
  await discard().click();
 }
 await page.getByRole('button',{name:'Usar modo oscuro',exact:true}).click();await fit();
 if(process.env.INDICE_TEST_SCREENSHOTS_DIR)await page.screenshot({path:join(process.env.INDICE_TEST_SCREENSHOTS_DIR,`${engine}-profile-dark.png`),animations:'disabled'});
 for(const locale of ['en-CA','en-US','fr-CA','es-CO','pt-BR','ko-CA','zh-CA','es-MX']){await page.evaluate(code=>window.profileFixture.language(code),locale);await fit();}
 await page.evaluate(()=>window.profileFixture.language('en-CA'));
 await page.getByLabel('First name(s)',{exact:true}).fill('Language choice retained');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-profile-editor]')?.matches('[aria-busy=true]'));
 assert.equal(saved.get(id).preferred_language,'en-CA');await page.getByRole('button',{name:'Save changes',exact:true}).waitFor();
 await page.reload();await page.getByLabel('First name(s)',{exact:true}).waitFor();await page.waitForFunction(()=>!document.getElementById('profile-first-name')?.matches(':disabled'));
 assert.equal(await page.getByLabel('First name(s)',{exact:true}).inputValue(),'Language choice retained');
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log(`${engine}: narrow mobile, landscape, desktop, dark mode and 8 locales fit with accessible actions; no runtime errors`);
 await context.close();
 }finally{await browser.close();}
}
try{await server.listen();for(const engine of (process.env.INDICE_TEST_ENGINES||'chromium,webkit').split(','))await flow(engine);}finally{await server.close();}
