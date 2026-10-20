import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
const runtime = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5199';
const root = resolve(import.meta.dirname, '..');
const server = await createServer({root,cacheDir:'/private/tmp/indice-workbar-navigation-vite',
  plugins:[{name:'workbar-fixture',configureServer(fixtureServer){fixtureServer.middlewares.use(async(req,res,next)=>{
    const path=req.url?.split('?')[0];if(path!=='/dashboard'&&!path?.startsWith('/workbar-demo/'))return next();
    const html=await readFile(resolve(root,'tests/browser/workbar-navigation.html'),'utf8');
    res.setHeader('Content-Type','text/html');res.end(await fixtureServer.transformIndexHtml(path,html));
  });}}],server:{host:'127.0.0.1',port:5199,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
let activeBrowser;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pref=(position='top',enabled=false)=>({version:1,position,dualScreenEnabled:enabled});
async function flow(engine){
  const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
  activeBrowser=browser;
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem('frontend-indice-language','es-MX');localStorage.setItem('indice:workspace:9999:9999:system:workbar-layout',JSON.stringify({state:{position:'left',dualScreenEnabled:true},savedAt:'2099-01-01T00:00:00Z'}));}catch{/* Browser error documents cannot access storage. */}});
  let user=9001,company=9001,failLoad=false,failSave=false,loseAck=false,loadDelay=0,saveDelay=0,failFrame=false;
  const saved=new Map(),legacyExpiry=new Set(),writes=[],errors=[],framePreferences=[];
  const actor=()=>`${company}:${user}`;
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.origin!==origin)return route.abort();
    if(path==='/dashboard'&&url.searchParams.has('workspacePane')&&failFrame)return route.abort();
    if(!path.startsWith('/api/'))return route.continue();
    const reply=data=>route.fulfill({json:data});
    if(path==='/api/v1/auth/me')return reply({user:{id:user,role:'admin',name:'Synthetic'},company:{id:company,name:'Synthetic company',role:'admin',active:true},companies:[],csrfToken:'synthetic-csrf'});
    if(path==='/api/v1/workspace-state/system/workbar-layout'){
      if(request.frame().parentFrame())framePreferences.push(request.method());
      const scope=actor();
      assert.equal(request.headers()['x-workspace-actor'],scope);
      if(request.method()==='GET'){
        if(failLoad)return route.fulfill({status:503,json:{}});
        const snapshot=structuredClone(saved.get(scope)??{});
        await pause(loadDelay);return reply({state:snapshot,schemaVersion:1,expiresAt:legacyExpiry.has(scope)?'2026-12-01T00:00:00Z':null});
      }
      assert.equal(request.method(),'PUT');assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');
      const state=request.postDataJSON().state;writes.push({scope,state});await pause(saveDelay);
      if(failSave){failSave=false;return route.fulfill({status:503,json:{}});}
      saved.set(scope,structuredClone(state));legacyExpiry.delete(scope);
      if(loseAck){loseAck=false;return route.fulfill({status:503,json:{}});}
      return reply({state:saved.get(scope),schemaVersion:1});
    }
    return route.fulfill({status:500,json:{message:`Unexpected fixture API: ${path}`}});
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  const ready=()=>page.getByTestId('ready').filter({hasText:'true'}).waitFor();
  const position=value=>page.getByTestId('position').filter({hasText:new RegExp(`^${value}$`)}).waitFor();
  const open=async()=>{await page.getByRole('button',{name:'Personalizar navegación',exact:true}).click();await page.getByRole('dialog').waitFor();};
  const apply=()=>page.getByRole('button',{name:'Aplicar',exact:true});
  const cancel=()=>page.getByRole('button',{name:'Cancelar',exact:true}).click();
  const choose=choice=>page.getByRole('radio',{name:choice==='left'?/Izquierda/:/Arriba/}).locator('..').click();
  const switchUser=async(nextUser,nextCompany=9001)=>{user=nextUser;company=nextCompany;await page.evaluate(({user,company})=>window.workbarFixture.switchUser(user,company),{user,company});};
  const go=()=>page.goto(`${origin}/tests/browser/workbar-navigation.html`);
  const frame=()=>page.frameLocator('iframe[title="Pantalla 2"]');
  const close=()=>page.getByRole('button',{name:'Cerrar pantalla doble',exact:true});
  await go();await ready();await position('top');assert.equal(writes.length,0);
  await open();await choose('left');await cancel();await position('top');assert.equal(writes.length,0);
  await open();await choose('left');saveDelay=350;await apply().click();await page.getByRole('button',{name:'Aplicando…'}).waitFor();await position('top');
  await page.getByRole('dialog').waitFor({state:'hidden'});await position('left');saveDelay=0;
  await page.evaluate(()=>window.workbarFixture.logout());await page.reload();await ready();await position('left');
  assert.deepEqual(saved.get(actor()),pref('left'));
  console.log(`${engine}: atomic apply and cancel; preference survives logout and browser-cache cleanup`);
  await open();await choose('top');failSave=true;await apply().click();await page.getByRole('alert').waitFor();await position('left');
  assert.equal(await page.getByRole('radio',{name:/Arriba/}).isChecked(),true);
  await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});await position('top');
  await open();await choose('left');loseAck=true;await apply().click();await page.getByRole('alert').waitFor();await position('top');
  await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});await position('left');
  console.log(`${engine}: save errors retain the draft; retries and lost confirmations are safe`);
  await page.getByRole('textbox',{name:'Nota de trabajo'}).fill('Trabajo principal sin guardar');
  await open();await page.getByRole('checkbox').locator('..').click();await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await frame().getByTestId('route').filter({hasText:'/dashboard'}).waitFor();
  await open();await page.getByText('La pantalla doble usa la navegación arriba. Al cerrarla volverá a la distribución que elegiste.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('checkbox').isDisabled(),true);
  await choose('top');await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});await position('top');assert.equal(await page.locator('iframe').count(),1);
  await open();await choose('left');await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});await position('left');
  assert.equal(await page.getByTestId('global-header').count(),1);assert.equal(await frame().getByTestId('global-header').count(),0);assert.equal(await frame().locator('iframe').count(),0);
  const primary=await page.getByTestId('primary-scroll').boundingBox(),secondary=await page.locator('iframe').boundingBox();assert(Math.abs(primary.width-secondary.width)<3);
  await page.getByRole('link',{name:'Módulo uno',exact:true}).click();await frame().getByRole('link',{name:'Módulo dos',exact:true}).click();
  await page.getByTestId('route').filter({hasText:'/workbar-demo/one'}).waitFor();
  await frame().getByTestId('route').filter({hasText:'/workbar-demo/two'}).waitFor();
  assert.equal(await page.getByTestId('route').innerText(),'/workbar-demo/one');assert.equal(await frame().getByTestId('route').innerText(),'/workbar-demo/two');
  await frame().getByRole('textbox',{name:'Nota de trabajo'}).fill('Trabajo secundario sin guardar');
  await page.getByTestId('primary-scroll').evaluate(el=>{el.scrollTop=300;});
  await frame().getByTestId('primary-scroll').evaluate(el=>{el.scrollTop=500;});
  assert.equal(await page.getByTestId('primary-scroll').evaluate(el=>el.scrollTop),300);
  assert.equal(await frame().getByTestId('primary-scroll').evaluate(el=>el.scrollTop),500);
  await page.setViewportSize({width:900,height:760});await page.locator('iframe').waitFor({state:'hidden'});
  assert.equal(await page.locator('iframe').count(),1);assert.equal(saved.get(actor()).dualScreenEnabled,true);
  await page.setViewportSize({width:1440,height:900});await page.locator('iframe').waitFor({state:'visible'});
  assert.equal(await frame().getByTestId('route').innerText(),'/workbar-demo/two');
  assert.equal(await frame().getByRole('textbox',{name:'Nota de trabajo'}).inputValue(),'Trabajo secundario sin guardar');
  assert.equal(await page.getByRole('textbox',{name:'Nota de trabajo'}).inputValue(),'Trabajo principal sin guardar');
  console.log(`${engine}: equal panes, one header, independent histories/scroll; resizing preserves both drafts`);
  failSave=true;await close().click();await page.getByRole('alert').filter({hasText:/guardar el cierre/}).waitFor();
  assert.equal(await page.locator('iframe').count(),1);assert.equal(saved.get(actor()).dualScreenEnabled,true);
  await close().click();await page.locator('iframe').waitFor({state:'detached'});await position('left');assert.equal(saved.get(actor()).dualScreenEnabled,false);
  await page.reload();await ready();await position('left');assert.equal(await page.locator('iframe').count(),0);
  await open();await page.getByRole('checkbox').locator('..').click();await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});await frame().getByTestId('ready').filter({hasText:'true'}).waitFor();
  loseAck=true;await close().click();await page.getByRole('alert').filter({hasText:/guardar el cierre/}).waitFor();assert.equal(await page.locator('iframe').count(),1);
  await close().click();await page.locator('iframe').waitFor({state:'detached'});
  console.log(`${engine}: close waits for server acknowledgement and retries without losing the bar selection`);
  await page.setViewportSize({width:390,height:844});saved.set(actor(),pref('left',true));await go();await ready();
  assert.equal(await page.locator('iframe').count(),0,'mobile must never preload a saved desktop workspace');
  await open();assert.equal(await page.getByRole('checkbox').isDisabled(),true);assert.equal(await page.getByRole('checkbox').isChecked(),false);
  await page.getByText('Pantalla doble guardada para una ventana más amplia',{exact:true}).waitFor();
  await choose('top');await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.deepEqual(saved.get(actor()),pref('top',true));
  for(const viewport of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(viewport);await open();await page.waitForTimeout(220);const bounds=await apply().boundingBox();assert(bounds&&bounds.y>=0&&bounds.y+bounds.height<=viewport.height+1);
    assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
    if(process.env.INDICE_TEST_SCREENSHOTS_DIR)await page.screenshot({animations:'disabled',path:`${process.env.INDICE_TEST_SCREENSHOTS_DIR}/${engine}-navigation-${viewport.width}.png`});await cancel();
  }
  await page.setViewportSize({width:1440,height:900});await frame().getByTestId('route').waitFor();
  const beforeFrameWrite=writes.length;
  const denied=await frame().locator('body').evaluate(async()=>{try{await window.workbarFixture.preferences.setPosition('left');return false;}catch{return true;}});
  assert.equal(denied,true);assert.equal(writes.length,beforeFrameWrite);assert.deepEqual(framePreferences,[]);
  await page.evaluate(()=>window.workbarFixture.setBlocked(true));await page.locator('iframe').waitFor({state:'detached'});
  await page.evaluate(()=>window.workbarFixture.setBlocked(false));await frame().getByTestId('route').filter({hasText:'/dashboard'}).waitFor();
  await close().click();await page.locator('iframe').waitFor({state:'detached'});
  console.log(`${engine}: mobile preserves desktop intent, frame cannot write preferences, blocked access destroys the frame`);
  saved.set('9001:9002',pref('left',true));saved.set('9002:9002',pref('top'));
  await switchUser(9002);await ready();await position('left');await frame().getByTestId('actor').filter({hasText:'9001:9002'}).waitFor();
  await switchUser(9002,9002);await ready();await position('top');assert.equal(await page.locator('iframe').count(),0);
  await open();await choose('left');saveDelay=500;await apply().click();await pause(80);
  await switchUser(9001);await ready();await position('top');await pause(550);await position('top');saveDelay=0;
  assert.equal(saved.get('9002:9002').position,'left');assert.equal(saved.get('9001:9001').position,'top');await cancel();
  loadDelay=500;await switchUser(9003);await pause(60);loadDelay=0;await switchUser(9001);await ready();await position('top');await pause(550);await position('top');
  assert.equal(saved.has('9001:9003'),false);
  console.log(`${engine}: user/company isolation, frame remount and stale response protection`);
  failLoad=true;const beforeFailure=writes.length;await go();await open();await page.getByRole('alert').filter({hasText:/cargar tu navegación/}).waitFor();
  assert.equal(await apply().isDisabled(),true);assert.equal(writes.length,beforeFailure);failLoad=false;await page.getByRole('button',{name:'Reintentar',exact:true}).click();await ready();await cancel();
  const confirmed=saved.get(actor());saved.set(actor(),{version:2,position:'left',dualScreenEnabled:true});await page.reload();await open();await page.getByRole('alert').filter({hasText:/cargar tu navegación/}).waitFor();assert.equal(await apply().isDisabled(),true);assert.equal(writes.length,beforeFailure);
  saved.set(actor(),confirmed);await page.getByRole('button',{name:'Reintentar',exact:true}).click();await ready();await cancel();
  // Server wins even when an old local timestamp claims to be newer.
  await page.evaluate(()=>localStorage.setItem('indice:workspace:9001:9001:system:workbar-layout',JSON.stringify({state:{position:'left',dualScreenEnabled:true},savedAt:'2099-01-01T00:00:00Z'})));
  await page.reload();await ready();await position('top');assert.equal(await page.locator('iframe').count(),0);
  // Legacy values retain their exact owner and gain the durable format once.
  saved.set(actor(),{position:'left',dualScreenEnabled:false});const beforeMigration=writes.length;await page.reload();await ready();await position('left');assert.equal(writes.length,beforeMigration+1);assert.equal(saved.get(actor()).version,1);
  await page.reload();await ready();assert.equal(writes.length,beforeMigration+1);
  legacyExpiry.add(actor());const beforeExpiryMigration=writes.length;
  await page.reload();await ready();assert.equal(writes.length,beforeExpiryMigration+1);assert.equal(legacyExpiry.has(actor()),false);
  saved.delete(actor());await page.evaluate(()=>localStorage.setItem('indice:workspace:9001:9001:system:workbar-layout',JSON.stringify({state:{position:'left',dualScreenEnabled:false},savedAt:'2026-10-01T00:00:00Z'})));
  const beforeCacheMigration=writes.length;await page.reload();await ready();await position('left');assert.equal(writes.length,beforeCacheMigration+1);assert.deepEqual(saved.get(actor()),pref('left'));
  await page.addInitScript(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(key){if(key.includes('workbar-layout'))throw new DOMException('Blocked','SecurityError');return get.call(this,key);};Storage.prototype.setItem=function(key,value){if(key.includes('workbar-layout'))throw new DOMException('Blocked','SecurityError');return set.call(this,key,value);};});
  await page.reload();await ready();await position('left');await open();await choose('top');await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.reload();await ready();await position('top');
  console.log(`${engine}: load errors are safe; server wins; legacy format/expiry/cache migrate; account persists without browser storage`);
  failFrame=true;await open();await page.getByRole('checkbox').locator('..').click();await apply().click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Volver a cargar',exact:true}).waitFor({timeout:20000});assert.equal(await close().isEnabled(),true);failFrame=false;
  await page.getByRole('button',{name:'Volver a cargar',exact:true}).click();await frame().getByTestId('route').filter({hasText:'/dashboard'}).waitFor();
  await close().click();await page.locator('iframe').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Tema',exact:true}).click();await open();
  if(process.env.INDICE_TEST_SCREENSHOTS_DIR)await page.screenshot({animations:'disabled',path:`${process.env.INDICE_TEST_SCREENSHOTS_DIR}/${engine}-navigation-dark.png`});await cancel();
  assert.deepEqual(errors,[]);assert.deepEqual(framePreferences,[]);
  console.log(`${engine}: secondary load recovery and dark-mode modal; no frame preference traffic or runtime errors`);
  await context.close();await browser.close();
}
try{await server.listen();for(const engine of (process.env.INDICE_TEST_ENGINES||'chromium,webkit').split(','))await flow(engine);}finally{await activeBrowser?.close();await server.close();}
