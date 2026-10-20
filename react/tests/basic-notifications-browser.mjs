import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const runtime=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),origin='http://127.0.0.1:5197';
const server=await createServer({root,cacheDir:'/private/tmp/indice-basic-notifications-vite',server:{host:'127.0.0.1',port:5197,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const examples=[
  ['human_resources','hr_permission_pending','permission_request','Permiso por revisar','/human-resources/permissions'],
  ['processes_tasks','process_run_attention','process_run','Proceso con pendientes','/processes-tasks/processes'],
  ['sales','sales_call_reminder','opportunity','Llamada programada','/sales/opportunities'],
  ['expenses','expense_due','expense','Pago de gasto pendiente','/expenses'],
  ['point_of_sale','pos_shift_difference','cash_shift','Diferencia en el corte','/point-of-sale/cortes'],
  ['inventory','pos_stock_low','inventory_balance','Inventario bajo','/inventory/inventory'],
  ['petty_cash','petty_cash_receipt_pending','fund_receipt','Comprobante por revisar','/petty-cash/control?fundId=11'],
  ['receivables','receivable_overdue','receivable_installment','Cobro vencido','/receivables/accounts-receivable'],
  ['kpis','kpi_report_attention','automated_report_rule','Reporte automático por revisar','/kpis/automated-reports'],
];
async function flow(engine) {
  const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[],unexpected=[];let allowed=null;
  const settings={version:0,quietMode:false,items:examples.map(([module,eventType])=>({module,eventType,enabled:true}))};
  let rows=examples.map(([module_slug,source_subtype,source_type,,action_url],i)=>({id:-500-i,source_id:11,source_type,module_slug,source_subtype,title:'Owner event',description:'REF-TEST',status:'delivered',is_unread:true,created_at:'2026-10-18T18:00:00',action_url}));
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.origin!==origin){unexpected.push(url.origin);return route.abort();}
    if(!path.startsWith('/api/'))return route.continue();
    const reply=json=>route.fulfill({json});
    if(path==='/api/v1/notifications/preferences') {
      if(request.method()==='PUT') {
        assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');
        const patch=request.postDataJSON();assert.equal(patch.version,settings.version);
        for(const item of patch.items||[])Object.assign(settings.items.find(saved=>saved.module===item.module&&saved.eventType===item.eventType),item);
        settings.version++;
      }
      return reply({...settings,items:settings.items.filter(item=>!allowed||allowed.includes(item.module))});
    }
    if(path==='/api/v1/notifications') {
      const items=rows.filter(row=>(!allowed||allowed.includes(row.module_slug))&&settings.items.some(item=>item.module===row.module_slug&&item.eventType===row.source_subtype&&item.enabled));
      return reply({items,summary:{total_count:items.length,unread_count:items.filter(item=>item.is_unread).length}});
    }
    const read=path.match(/^\/api\/v1\/notifications\/(-\d+)\/read$/);
    if(read){const row=rows.find(row=>row.id===Number(read[1]));row.is_unread=false;return reply(row);}
    if(path==='/api/v1/messaging/unread')return reply(0);
    unexpected.push(`${request.method()} ${path}`);return route.fulfill({status:500,json:{}});
  });
  const center=()=>page.getByRole('dialog',{name:'Centro de notificaciones',exact:true});
  const open=async()=>{await page.getByRole('button',{name:/^Notificaciones/}).tap();await page.getByRole('button',{name:'Abrir centro de notificaciones',exact:true}).tap();};
  const settingsTab=()=>center().getByRole('tab',{name:'Configuración',exact:true});
  try {
    await page.goto(origin+'/tests/browser/notifications.html');await open();
    for(const [,,,title] of examples)await center().getByRole('heading',{name:title,exact:true}).waitFor();
    await center().getByText(/El efectivo contado no coincide/).waitFor();
    await center().getByText(/Una cuota ya venció/).waitFor();
    await center().getByText(/Ya se adjuntó el comprobante/).waitFor();
    console.log(`PASS ${engine}: all operational basic modules show localized, practical notices`);
    await settingsTab().tap();await center().getByRole('switch',{name:'Comprobante por revisar',exact:true}).waitFor();
    assert.equal(await center().locator('section').count(),9);
    for(const [,,,label] of examples) {
      await center().getByRole('switch',{name:label,exact:true}).tap();
      await center().getByText('Preferencias guardadas',{exact:true}).waitFor();
    }
    assert.equal(settings.version,9);
    await center().getByRole('tab',{name:'Bandeja',exact:true}).tap();
    await page.waitForFunction(()=>document.querySelectorAll('[data-notification-id]').length===0);
    console.log(`PASS ${engine}: nine module switches save and immediately update the inbox`);
    await center().getByRole('button',{name:'Cerrar',exact:true}).last().tap();await page.reload();await open();await settingsTab().tap();
    for(const [,,,label] of examples)assert.equal(await center().getByRole('switch',{name:label,exact:true}).getAttribute('aria-checked'),'false');
    for(const size of [{width:320,height:480},{width:844,height:390},{width:1440,height:900}]) {
      await page.setViewportSize(size);
      await page.waitForFunction(()=>{const box=document.querySelector('[role="dialog"]').getBoundingClientRect();return box.x>=-.5&&box.y>=-.5&&box.right<=innerWidth+.5&&box.bottom<=innerHeight+.5&&document.documentElement.scrollWidth<=innerWidth+1;});
      const control=center().getByRole('switch',{name:'Reporte automático por revisar',exact:true});await control.scrollIntoViewIfNeeded();assert.equal(await control.isDisabled(),false);
    }
    console.log(`PASS ${engine}: saved choices survive reload and work on small phones, landscape and desktop`);
    await center().getByRole('button',{name:'Cerrar',exact:true}).last().tap();allowed=['expenses','petty_cash'];await page.reload();await open();await settingsTab().tap();
    await center().getByRole('switch',{name:'Comprobante por revisar',exact:true}).waitFor();assert.equal(await center().locator('section').count(),2);
    assert.equal(await center().getByRole('switch',{name:'Cobro vencido',exact:true}).count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    console.log(`PASS ${engine}: only currently permitted basic-module groups are offered`);
  } finally {await context.close();await browser.close();}
}
await server.listen();try{for(const engine of ['chromium','webkit'])await flow(engine);}finally{await server.close();}
