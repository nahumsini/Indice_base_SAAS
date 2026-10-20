import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const runtime = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin='http://127.0.0.1:5196';
const server=await createServer({root,cacheDir:'/private/tmp/indice-notification-preferences-vite',server:{host:'127.0.0.1',port:5196,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const defaults=()=>({version:0,quietMode:false,items:[{module:'expenses',eventType:'expense_due',enabled:true},{module:'expenses',eventType:'expense_paid',enabled:true},{module:'inventory',eventType:'pos_stock_low',enabled:true}]});
async function flow(engine) {
  const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[],unexpected=[],writes=[];
  let company=1,failLoad=false,failSave=false,loseAck=false,saveDelay=0;
  const data={1:defaults(),2:defaults()};
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.origin!==origin) {unexpected.push(url.origin);return route.abort();}
    if(!path.startsWith('/api/')) return route.continue();
    const reply=value=>route.fulfill({json:value});
    if(path==='/api/v1/notifications/preferences') {
      const selected=company;
      if(request.method()==='GET') {
        if(failLoad){return route.fulfill({status:503,json:{}});}
        return reply(data[selected]);
      }
      assert.equal(request.method(),'PUT');assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');
      const patch=request.postDataJSON();writes.push({company:selected,patch});
      if(saveDelay) await pause(saveDelay);
      if(failSave){failSave=false;return route.fulfill({status:503,json:{}});}
      const current=data[selected];
      if(patch.version!==current.version) {
        const same=(patch.quietMode===undefined||patch.quietMode===current.quietMode)&&(!patch.items||patch.items.every(item=>current.items.some(saved=>saved.module===item.module&&saved.eventType===item.eventType&&saved.enabled===item.enabled)));
        if(!same)return route.fulfill({status:409,json:{code:'notification_preferences_changed'}});
        return reply(current);
      }
      if(patch.quietMode!==undefined)current.quietMode=patch.quietMode;
      for(const item of patch.items||[]){Object.assign(current.items.find(saved=>saved.module===item.module&&saved.eventType===item.eventType),item);}
      current.version++;
      if(loseAck){loseAck=false;return route.fulfill({status:503,json:{}});}
      return reply(current);
    }
    if(path==='/api/v1/notifications')return reply({items:[],summary:{total_count:0,unread_count:0}});
    if(path==='/api/v1/messaging/unread')return reply(0);
    if(path==='/api/v1/messaging/context')return reply({userId:1,companyId:company,membershipId:company,distributor:null,supportOnly:false});
    unexpected.push(`${request.method()} ${path}`);return route.fulfill({status:500,json:{}});
  });
  const center=()=>page.getByRole('dialog',{name:'Centro de notificaciones',exact:true});
  const open=async()=>{
    await page.getByRole('button',{name:/^Notificaciones/}).tap();
    await page.getByRole('button',{name:'Abrir centro de notificaciones',exact:true}).tap();
    await center().getByRole('tab',{name:'Configuración',exact:true}).tap();
  };
  const close=async()=>{await center().getByRole('button',{name:'Cerrar',exact:true}).last().tap();await center().waitFor({state:'hidden'});};
  const paid=()=>center().getByRole('switch',{name:'Gasto pagado',exact:true});
  const checked=async(locator,expected)=>{await page.waitForFunction(({label,expected})=>document.querySelector(`[role="switch"][aria-label="${label}"]`)?.getAttribute('aria-checked')===String(expected),{label:await locator.getAttribute('aria-label'),expected});};
  try {
    await page.goto(`${origin}/tests/browser/notifications.html`);
    failLoad=true;await open();
    await center().getByRole('alert').getByText(/No pudimos cargar/).waitFor();
    failLoad=false;await center().getByRole('button',{name:'Reintentar',exact:true}).tap();await paid().waitFor();
    assert.equal(await center().getByRole('switch').count(),4,'Only server-authorized types plus quiet mode appear');
    assert.equal(await center().getByText('Recursos Humanos',{exact:true}).count(),0);
    assert.equal(await center().getByText('Inventarios',{exact:true}).count(),2);
    await paid().tap();await center().getByText('Preferencias guardadas',{exact:true}).waitFor();await checked(paid(),false);
    await close();await open();await checked(paid(),false);
    await page.reload();await open();await checked(paid(),false);
    console.log(`PASS ${engine}: load retry, permission-limited groups, save, close/reopen and page reload`);

    failSave=true;await paid().tap();await center().getByRole('alert').getByText(/Este cambio aún/).waitFor();
    assert.equal(await paid().isDisabled(),true);
    await center().getByRole('button',{name:'Reintentar',exact:true}).tap();await center().getByText('Preferencias guardadas',{exact:true}).waitFor();await checked(paid(),true);
    loseAck=true;await paid().tap();await center().getByRole('alert').getByText(/Este cambio aún/).waitFor();
    const before=data[1].version;
    await center().getByRole('button',{name:'Reintentar',exact:true}).tap();await center().getByText('Preferencias guardadas',{exact:true}).waitFor();
    assert.equal(data[1].version,before,'Lost response retries the same patch without duplicate version');await checked(paid(),false);
    console.log(`PASS ${engine}: failed save retains choice and lost acknowledgement retries safely`);

    data[1].version++; // Another browser window changed the settings after this view loaded.
    await paid().tap();await center().getByRole('alert').getByText(/otra ventana/).waitFor();
    await center().getByRole('button',{name:'Recargar preferencias',exact:true}).tap();await checked(paid(),false);
    const quiet=()=>center().getByRole('switch',{name:'Modo silencioso',exact:true});
    await quiet().tap();await center().getByText('Preferencias guardadas',{exact:true}).waitFor();
    await close();await open();await checked(quiet(),true);
    console.log(`PASS ${engine}: concurrent edit conflict and persisted quiet mode`);

    for(const size of [{width:320,height:480},{width:844,height:390},{width:390,height:844}]) {
      await page.setViewportSize(size);
      await page.waitForFunction(()=>{const box=document.querySelector('[role="dialog"]').getBoundingClientRect();return box.x>=-.5&&box.y>=-.5&&box.right<=innerWidth+.5&&box.bottom<=innerHeight+.5&&document.documentElement.scrollWidth<=innerWidth+1;});
      const stock=center().getByRole('switch',{name:'Inventario bajo',exact:true});await stock.scrollIntoViewIfNeeded();
      await stock.tap();await center().getByText('Preferencias guardadas',{exact:true}).waitFor();
    }
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    await close();await open();await paid().waitFor();
    const background=await paid().evaluate(el=>getComputedStyle(el.closest('section')).backgroundColor);
    assert.notEqual(background,'rgb(255, 255, 255)');
    console.log(`PASS ${engine}: small phone, landscape, dark mode and reachable switches`);

    // Leave a request pending and change company; its late acknowledgement cannot populate the new view.
    saveDelay=1500;await paid().tap();
    await close();company=2;await page.getByRole('button',{name:'Cambiar empresa',exact:true}).tap();await open();
    await checked(paid(),true);await checked(quiet(),false);await pause(1700);await checked(paid(),true);
    assert.equal(data[2].version,0);assert.ok(writes.every(write=>!('companyId' in write.patch)&&!('userId' in write.patch)));
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    console.log(`PASS ${engine}: company isolation and stale save response discarded`);
  } finally {await context.close();await browser.close();}
}
await server.listen();
try {for(const engine of ['chromium','webkit'])await flow(engine);}
finally {await server.close();}
