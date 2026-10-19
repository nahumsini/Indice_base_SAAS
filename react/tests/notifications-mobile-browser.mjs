import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const runtime = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:5195';
const server = await createServer({ root, cacheDir:'/private/tmp/indice-notification-flow-vite', server: { host: '127.0.0.1', port: 5195, strictPort: true, hmr: false, watch: null }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
const fixture = `${origin}/tests/browser/notifications.html`;
const fixtureCreatedAt = new Date().toISOString();
const make = (id, title, module, target, subtype='verification') => ({ id, source_type:'record', source_id:Math.abs(id), title, description:`Ejemplo de prueba: ${title}`, module_slug:module, source_subtype:subtype, status:'delivered', is_unread:true, created_at:fixtureCreatedAt, action_url:target });
async function flow(engine) {
  const browser = await runtime[engine].launch({ headless:true, ...(engine==='chromium' && process.env.INDICE_CHROME_PATH ? { executablePath:process.env.INDICE_CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
  await context.addInitScript(() => localStorage.setItem('frontend-indice-language','es-MX'));
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.clock.install();
  const errors=[],unexpected=[],commands=[];
  let company=1, listCount=0;
  let items=[make(-101,'Messages','messaging','/dashboard?conversation=7'),make(-102,'Revisar tarea','processes_tasks','/processes-tasks','task_overdue'),make(103,'Comunicado del equipo','human_resources','/human-resources/announcements'),make(-104,'Agenda','scheduling','/scheduling/calendar?reservation=8&view=table&from=2026-10-18&to=2026-10-18'),make(-105,'Revisar orden','maintenance','/maintenance/orders?order=9'),make(-106,'Aviso informativo','general',null),make(-107,'Destino no disponible','general','https://external.example.invalid/private'),make(-110,'Aviso temporal de prueba','expenses','/expenses')];
  const mode={failList:true,failRead:false,failDismiss:false,loseDismiss:false,failAll:false,readDelay:0,listDelay:0};
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.origin!==origin) { unexpected.push(`External ${url.origin}`);return route.abort(); }
    if(!path.startsWith('/api/')) return route.continue();
    const reply=value=>route.fulfill({json:value});
    if(request.method()!=='GET') assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');
    if(path==='/api/v1/notifications' && request.method()==='GET') {
      listCount++;
      const response={items:structuredClone(company===1?items:[make(-201,'Aviso de otra empresa','human_resources','/human-resources/announcements')])};
      response.summary={total_count:response.items.length,unread_count:response.items.filter(item=>item.is_unread).length};
      if(mode.listDelay) await pause(mode.listDelay);
      if(mode.failList){return route.fulfill({status:503,json:{}});}
      return reply(response);
    }
    const match=path.match(/^\/api\/v1\/notifications\/(-?\d+)(\/read)?$/);
    if(match) {
      const id=Number(match[1]);commands.push({id,method:request.method()});
      if(mode.readDelay) await pause(mode.readDelay);
      if(request.method()==='DELETE') {
        if(mode.failDismiss){mode.failDismiss=false;return route.fulfill({status:503,json:{}});}
        if(!items.some(item=>item.id===id)) return route.fulfill({status:404,json:{}});
        items=items.filter(item=>item.id!==id);
        if(mode.loseDismiss){mode.loseDismiss=false;return route.fulfill({status:503,json:{}});}
        return reply({success:true});
      }
      if(mode.failRead){mode.failRead=false;return route.fulfill({status:503,json:{}});}
      const item=items.find(item=>item.id===id);item.is_unread=false;return reply(item);
    }
    if(path==='/api/v1/notifications/read-all') {
      commands.push({id:'all',method:request.method()});
      if(mode.failAll){mode.failAll=false;return route.fulfill({status:503,json:{}});}
      items.forEach(item=>item.is_unread=false);return reply({updated_count:items.length});
    }
    if(path==='/api/v1/messaging/unread') return reply(0);
    if(path==='/api/v1/messaging/context') return reply({userId:1,companyId:company,membershipId:company,distributor:null,supportOnly:false,initialAttachments:true});
    if(path==='/api/v1/messaging/task-context') return reply({canCreate:false});
    if(path==='/api/v1/messaging/conversations') return reply({items:[],hasMore:false});
    if(path==='/api/v1/messaging/conversations/7/read') return route.fulfill({status:204});
    if(path==='/api/v1/messaging/conversations/7') return reply({conversation:{id:7,companyId:1,kind:'DIRECT',displayName:'Ana · prueba',subject:'',status:'OPEN',version:1},messages:{items:[{id:70,senderUserId:2,senderName:'Ana',visibility:'PUBLIC',body:'Mensaje de prueba recibido',createdAt:new Date().toISOString(),attachments:[]}],hasMore:false},participants:[{userId:1,membershipId:1,name:'Usuario',active:true,lastReadMessageId:0},{userId:2,membershipId:2,name:'Ana',active:true,lastReadMessageId:70}]});
    unexpected.push(`${request.method()} ${path}`);return route.fulfill({status:500,json:{}});
  });
  const bell=()=>page.getByRole('button',{name:/^Notificaciones/});
  const center=()=>page.getByRole('dialog',{name:'Centro de notificaciones',exact:true});
  const openCenter=async()=>{await bell().tap();await page.getByRole('button',{name:'Abrir centro de notificaciones',exact:true}).tap();await center().waitFor();};
  const closeCenter=async()=>{await center().getByRole('button',{name:'Cerrar',exact:true}).last().tap();await center().waitFor({state:'hidden'});};
  const checkBounds=async(locator)=>{
    await page.waitForFunction(()=>{
      const element=document.querySelector('[role="dialog"]') || document.querySelector('[role="menu"]');
      const box=element?.getBoundingClientRect();
      return box && box.x>=-.5 && box.y>=-.5 && box.right<=innerWidth+.5 && box.bottom<=innerHeight+.5 && document.documentElement.scrollWidth<=innerWidth+1;
    });
    const box=await locator.boundingBox(),size=page.viewportSize();
    assert.ok(box && box.x>=-.5 && box.y>=-.5 && box.x+box.width<=size.width+.5 && box.y+box.height<=size.height+.5,`Fits viewport: ${JSON.stringify({box,size})}`);
  };
  try {
    await page.goto(fixture);
    await bell().tap();
    await page.getByRole('alert').getByText(/No se pudieron actualizar/).waitFor();
    mode.failList=false;
    await page.getByRole('button',{name:'Reintentar',exact:true}).tap();
    await page.getByRole('menuitem').filter({hasText:'Mensajes'}).waitFor();
    await checkBounds(page.getByRole('menu'));
    mode.failRead=true;
    await page.getByRole('menuitem').filter({hasText:'Mensajes'}).tap();
    await page.getByRole('alert').getByText(/No se pudo confirmar/).waitFor();
    assert.ok(page.url().includes('notifications.html'),'Failed read retains the original inbox');
    assert.equal(items.find(item=>item.id===-101).is_unread,true);
    await page.getByRole('button',{name:'Reintentar',exact:true}).tap();
    await page.getByRole('dialog',{name:'Mensajes',exact:true}).getByText('Mensaje de prueba recibido').waitFor();
    assert.equal(new URL(page.url()).pathname,'/dashboard');assert.equal(new URL(page.url()).search,'?conversation=7');
    assert.equal(commands.filter(command=>command.id===-101).length,2);
    await page.getByRole('dialog',{name:'Mensajes',exact:true}).getByRole('button',{name:'Cerrar',exact:true}).tap();
    console.log(`PASS ${engine}: receive, badge, list recovery, read failure, retry and real Messages deep link`);

    await openCenter();
    await center().locator('[data-notification-id="-102"]').waitFor();
    await checkBounds(center());
    await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-notification-id="-102"] button')).some(button => button.getBoundingClientRect().height >= 43.9));
    const action=await center().locator('[data-notification-id="-102"]').getByRole('button',{name:'Abrir',exact:true}).boundingBox();
    assert.ok(action.height>=43,'Touch actions are at least 44px');
    const oldDestination=await page.locator('[data-destination]').innerText();
    mode.failRead=true;
    await center().locator('[data-notification-id="-102"]').getByRole('button',{name:'Marcar como leída',exact:true}).tap();
    await center().getByRole('alert').getByText(/No se pudo confirmar/).waitFor();
    await center().getByRole('alert').getByRole('button',{name:'Reintentar'}).tap();
    await center().locator('[data-notification-id="-102"]').getByRole('button',{name:'Marcar como leída',exact:true}).waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-destination]').innerText(),oldDestination,'Mark read does not navigate');
    mode.failDismiss=true;
    const card=()=>center().locator('[data-notification-id="103"]');
    await card().getByRole('button',{name:'Más acciones'}).tap();
    await page.getByRole('menuitem',{name:'Descartar'}).tap();
    await center().getByRole('alert').getByText(/No se pudo confirmar/).waitFor();
    assert.equal(await card().count(),1);
    await center().getByRole('alert').getByRole('button',{name:'Reintentar'}).tap();
    await card().waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-destination]').innerText(),oldDestination,'Dismiss does not bubble into Open');
    mode.loseDismiss=true;
    const temporary=()=>center().locator('[data-notification-id="-110"]');
    await temporary().getByRole('button',{name:'Más acciones'}).tap();
    await page.getByRole('menuitem',{name:'Descartar'}).tap();
    await center().getByRole('alert').getByText(/No se pudo confirmar/).waitFor();
    assert.equal(await temporary().count(),1,'Lost acknowledgement retains the visible item until confirmed');
    await center().getByRole('alert').getByRole('button',{name:'Reintentar'}).tap();
    await temporary().waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-destination]').innerText(),oldDestination);
    console.log(`PASS ${engine}: manual read, failed dismiss and lost DELETE acknowledgement recover without accidental navigation`);

    await center().getByRole('tab',{name:/Sin leer/}).tap();
    await center().getByRole('searchbox').fill('Agenda');
    await center().getByRole('searchbox').press('Enter');
    await center().locator('[data-notification-id="-104"]').waitFor();
    assert.equal(await center().locator('[data-notification-id]').count(),1);
    await center().locator('[data-notification-id="-104"]').getByRole('button',{name:'Abrir',exact:true}).tap();
    await center().waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).pathname,'/scheduling/calendar');
    assert.equal(new URL(page.url()).search,'?reservation=8&view=table&from=2026-10-18&to=2026-10-18');
    await openCenter();
    // Search/status are intentionally preserved within the current company.
    await center().getByRole('button',{name:'Limpiar búsqueda'}).tap();
    await center().getByRole('tab',{name:/Todas/}).tap();
    await center().locator('[data-notification-id="-107"]').getByRole('button',{name:'Abrir',exact:true}).tap();
    await center().getByRole('status').getByText(/no tiene un destino disponible/).waitFor();
    assert.equal(commands.filter(command=>command.id===-107).length,0,'Unavailable links do not become read automatically');
    console.log(`PASS ${engine}: search/status filters, owning module parameters and unavailable destination feedback`);

    mode.failAll=true;
    await center().getByRole('button',{name:/^Filtros/}).tap();
    await center().getByRole('button',{name:'Marcar todo leído',exact:true}).filter({visible:true}).tap();
    await center().getByRole('alert').getByText(/No se pudo confirmar/).waitFor();
    await center().getByRole('alert').getByRole('button',{name:'Reintentar'}).tap();
    await center().getByRole('button',{name:'Marcar todo leído',exact:true}).filter({visible:true}).waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('[role=dialog] button[disabled]')!==null);
    assert.ok(items.every(item=>!item.is_unread));
    await center().getByRole('button',{name:/^Filtros/}).tap();
    mode.failList=true;
    await center().getByRole('button',{name:'Actualizar',exact:true}).tap();
    await center().getByRole('alert').getByText(/No se pudieron actualizar/).waitFor();
    assert.ok(await center().locator('[data-notification-id]').count()>0,'Refresh failure retains existing rows');
    mode.failList=false;
    await center().getByRole('button',{name:'Reintentar',exact:true}).tap();
    await center().getByRole('alert').waitFor({state:'hidden'});
    for(const size of [{width:320,height:480},{width:390,height:420},{width:844,height:390},{width:430,height:844}]) {
      await page.setViewportSize(size);await checkBounds(center());
      const row=center().locator('[data-notification-id="-105"]');await row.scrollIntoViewIfNeeded();
      await row.getByRole('button',{name:'Abrir',exact:true}).waitFor({state:'visible'});
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    await center().locator('[data-notification-id="-105"]').scrollIntoViewIfNeeded();
    if(process.env.INDICE_NOTIFICATION_SCREENSHOTS) {
      await mkdir(process.env.INDICE_NOTIFICATION_SCREENSHOTS,{recursive:true});
      await page.screenshot({path:resolve(process.env.INDICE_NOTIFICATION_SCREENSHOTS,`notificaciones-${engine}.png`)});
    }
    await page.evaluate(()=>document.documentElement.classList.remove('dark'));
    await closeCenter();
    console.log(`PASS ${engine}: read-all retry, preserved rows, small phones, reduced height, landscape and dark mode`);

    // A new notification is received while the workspace stays mounted.
    items.unshift(make(-108,'Nuevo pendiente de prueba','expenses','/expenses'));
    const before=listCount;
    await page.clock.fastForward(30_100);
    await page.clock.resume();
    await page.waitForFunction(()=>document.querySelector('[aria-label^="Notificaciones ("]')!==null);
    assert.ok(listCount>before);
    await openCenter();await center().locator('[data-notification-id="-108"]').waitFor();await closeCenter();
    // Late old-company lists must not reappear or navigate after the switch.
    mode.listDelay=600;
    await page.getByRole('button',{name:'Actualizar señales'}).tap();
    company=2;await page.getByRole('button',{name:'Cambiar empresa'}).tap();
    mode.listDelay=0;
    await openCenter();await center().locator('[data-notification-id="-201"]').waitFor();await pause(700);
    assert.equal(await center().locator('[data-notification-id="-108"]').count(),0);
    assert.equal(await center().locator('[data-notification-id="-102"]').count(),0);
    await closeCenter();
    company=1;await page.getByRole('button',{name:'Cambiar empresa'}).tap();
    await openCenter();await center().locator('[data-notification-id="-108"]').waitFor();
    const priorUrl=page.url();mode.readDelay=650;
    await center().locator('[data-notification-id="-108"]').getByRole('button',{name:'Abrir',exact:true}).tap();
    await closeCenter();company=2;await page.getByRole('button',{name:'Cambiar empresa'}).tap();
    await pause(800);mode.readDelay=0;
    assert.equal(page.url(),priorUrl,'An old-company read acknowledgement cannot navigate the new account');
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    console.log(`PASS ${engine}: receiving new notifications and isolating late responses after an account/company change`);
  } catch (error) {
    console.error('Diagnostics:', JSON.stringify({engine,listCount,commands,errors,unexpected,url:page.url()}));
    console.error((await page.locator('body').innerText()).slice(-7000));
    if(process.env.INDICE_NOTIFICATION_SCREENSHOTS) await page.screenshot({path:resolve(process.env.INDICE_NOTIFICATION_SCREENSHOTS,`failure-${engine}.png`)});
    throw error;
  } finally { await context.close();await browser.close(); }
}
try { await server.listen();for(const engine of (process.env.INDICE_NOTIFICATION_ENGINES||'chromium').split(',')) await flow(engine); }
finally { await server.close(); }
