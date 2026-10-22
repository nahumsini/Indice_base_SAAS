/** Isolated service setup flow. All API data stays in memory. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startPreview } from './scheduling-preview.mjs';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const dir = resolve(process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(),'scheduling-service-wizard');mkdirSync(dir,{recursive:true});
const origin = `http://127.0.0.1:${process.env.INDICE_SCHEDULING_PREVIEW_PORT || 5197}`;
const server = await startPreview();let browser,page;
const writes = [], errors = [], external = [];
try {
  browser = await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH ? {executablePath:process.env.INDICE_CHROME_PATH} : {})});
  page = await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
  page.on('pageerror',error => errors.push(error.message));
  const inventory = [
    {id:501,name:'Consulta de seguimiento',description:'Servicio del catálogo de prueba',sku:'SRV-501',active:true},
    {id:502,name:'Evaluación inicial',description:'Evaluación del negocio',sku:'SRV-502',active:true},
    {id:503,name:'Servicio inactivo',description:'No permite nuevas reservas',sku:'SRV-503',active:false},
    ...Array.from({length:25},(_,index) => ({id:600+index,name:`Servicio adicional ${String(index+1).padStart(2,'0')}`,description:'Servicio sintético',sku:`SRV-${600+index}`,active:true})),
  ];
  let mode = 'empty', inventoryAccess = true, failSave = true, release;
  await page.route('**/*',async route => {
    const req = route.request(),url = new URL(req.url());
    if (url.origin !== origin) { external.push(url.origin);return route.abort(); }
    if (url.pathname === '/api/v1/modules') return route.fulfill({json:[{slug:'scheduling',name:'Agenda'},{slug:'inventory',name:'Inventarios',locked:!inventoryAccess}]});
    if (url.pathname === '/api/v1/scheduling/inventory-services') {
      if (mode === 'error') return route.fulfill({status:503,json:{message:'Synthetic catalog error'}});
      const term = (url.searchParams.get('search') || '').toLowerCase(),currentPage = Number(url.searchParams.get('page') || 1);
      const items = mode === 'empty' ? [] : inventory.filter(item => `${item.name} ${item.sku}`.toLowerCase().includes(term));
      return route.fulfill({json:{items:items.slice((currentPage-1)*25,currentPage*25),total:items.length,page:currentPage,pageSize:25}});
    }
    if (/^\/api\/v1\/scheduling\/services(?:\/\d+)?$/.test(url.pathname) && ['POST','PUT'].includes(req.method())) {
      writes.push({method:req.method(),path:url.pathname,body:req.postDataJSON()});
      if (failSave) { failSave = false;await new Promise(resolve => release = resolve);return route.fulfill({status:503,json:{message:'Synthetic save error'}}); }
    }
    return route.continue();
  });
  const dialog = () => page.getByRole('dialog');
  const button = name => dialog().getByRole('button',{name,exact:true});
  const next = () => button('Continuar').click();
  const openServices = async (french = false) => {
    await page.getByRole('button',{name:french ? 'Actions' : 'Acciones',exact:true}).click();
    await page.getByRole('menuitem',{name:french ? 'Services' : 'Servicios',exact:true}).click();
  };
  const capture = name => page.screenshot({path:resolve(dir,name),animations:'disabled'});
  const fit = async () => {
    assert.equal(await dialog().count(),1);
    await dialog().evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(()=>{}))));
    const data = await dialog().evaluate(el => ({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,vw:innerWidth,vh:innerHeight,scroll:el.scrollWidth,client:el.clientWidth}));
    assert.ok(data.x >= -1 && data.y >= -1 && data.x+data.w <= data.vw+1 && data.y+data.h <= data.vh+1,JSON.stringify(data));assert.ok(data.scroll <= data.client+1);
    for (const action of await page.locator('[data-slot="dialog-footer"] button').all()) {
      const box = await action.boundingBox();assert.ok(box && box.y >= -1 && box.y+box.height <= data.vh+1,'Footer action stays visible');
    }
  };
  await page.goto(`${origin}/scheduling/calendar`);await openServices();await button('Nuevo servicio').click();
  await dialog().getByText('Todavía no tienes servicios en Inventarios',{exact:true}).waitFor();
  const inventoryLink = dialog().getByRole('link',{name:'Abrir Inventarios',exact:true});await inventoryLink.waitFor();
  assert.equal(await inventoryLink.getAttribute('href'),'/inventory/products');assert.equal(await inventoryLink.getAttribute('target'),'_blank');assert.equal(await button('Continuar').isDisabled(),true);
  await fit();await capture('service-empty-desktop.jpg');
  mode = 'error';await button('Actualizar servicios').click();await dialog().getByRole('alert').waitFor();assert.equal(await dialog().getByText('Todavía no tienes servicios en Inventarios',{exact:true}).count(),0);
  mode = 'available';await button('Reintentar').click();await dialog().getByRole('radio',{name:'Seleccionar servicio: Consulta de seguimiento',exact:true}).waitFor();
  assert.equal(await dialog().getByRole('radio',{name:'Seleccionar servicio: Servicio inactivo',exact:true}).isDisabled(),true);
  await dialog().getByRole('searchbox').fill('x'.repeat(200));assert.equal((await dialog().getByRole('searchbox').inputValue()).length,180);
  await dialog().getByRole('searchbox').fill('sin coincidencias');await dialog().getByText('Ningún servicio coincide con tu búsqueda',{exact:true}).waitFor();
  await button('Limpiar búsqueda').first().click();await dialog().getByRole('radio',{name:'Seleccionar servicio: Consulta de seguimiento',exact:true}).waitFor();
  await button('Cancelar').click();await page.getByRole('heading',{name:'Servicios',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).count(),0);
  await button('Nuevo servicio').click();await dialog().getByRole('radio',{name:'Seleccionar servicio: Consulta de seguimiento',exact:true}).check();
  await button('Página siguiente').click();await dialog().getByText('Página 2 de 2',{exact:true}).waitFor();assert.equal(await button('Continuar').isDisabled(),false);
  await button('Página anterior').click();await dialog().getByRole('radio',{name:'Seleccionar servicio: Consulta de seguimiento',exact:true}).waitFor();assert.equal(await dialog().getByRole('radio',{name:'Seleccionar servicio: Consulta de seguimiento',exact:true}).isChecked(),true);
  await fit();await capture('service-choice-desktop.jpg');await next();
  const duration = () => dialog().getByLabel('Duración (minutos)',{exact:true});
  await duration().fill('14');await next();assert.match(await dialog().innerText(),/Paso 2 de 3/);assert.equal(await duration().evaluate(el => el.checkValidity()),false);await duration().fill('60');
  await dialog().locator('summary').click();await dialog().getByLabel('Nombre para las reservas *',{exact:true}).fill('');
  await dialog().locator('summary').click();await next();await dialog().getByRole('alert').waitFor();assert.equal(await dialog().locator('details').getAttribute('open'),'');
  await dialog().getByLabel('Nombre para las reservas *',{exact:true}).fill('Consulta de pruebas');
  await dialog().getByLabel('Descripción para las reservas',{exact:true}).fill('Descripción pública personalizada');
  await dialog().getByRole('checkbox',{name:'Limitar este servicio a ciertos horarios',exact:true}).check();
  await dialog().getByLabel('Fin · lunes · 1',{exact:true}).fill('12:00');await button('Agregar horario · lunes').click();
  await dialog().getByLabel('Inicio · lunes · 2',{exact:true}).fill('11:00');await dialog().getByLabel('Fin · lunes · 2',{exact:true}).fill('17:00');
  await next();await dialog().getByRole('alert').waitFor();assert.equal(writes.length,0);
  await dialog().getByLabel('Inicio · lunes · 2',{exact:true}).fill('13:00');
  await dialog().getByRole('checkbox',{name:'Limitar este servicio a ciertos horarios',exact:true}).uncheck();await dialog().getByRole('checkbox',{name:'Limitar este servicio a ciertos horarios',exact:true}).check();
  assert.equal(await dialog().getByLabel('Inicio · lunes · 2',{exact:true}).inputValue(),'13:00');
  await button('Volver').click();await next();assert.equal(await dialog().getByLabel('Nombre para las reservas *',{exact:true}).inputValue(),'Consulta de pruebas');
  await fit();await capture('service-settings-desktop.jpg');await next();assert.equal(writes.length,0);
  assert.match(await dialog().innerText(),/09:00 – 12:00/);assert.match(await dialog().innerText(),/13:00 – 17:00/);assert.match(await dialog().innerText(),/Descripción pública personalizada/);
  await button('Cancelar').click();await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).waitFor();await page.keyboard.press('Escape');
  await fit();await capture('service-review-desktop.jpg');await button('Guardar configuración').click();await button('Cargando…').waitFor();
  assert.equal(await button('Volver').isDisabled(),true);assert.equal(await button('Cerrar').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await dialog().getAttribute('aria-busy'),'true');
  release();await dialog().getByRole('alert').waitFor();await button('Guardar configuración').click();await button('Editar: Consulta de pruebas').waitFor();
  assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(writes[1].body.productId,501);assert.equal(writes[1].body.days.length,6);assert.equal(writes[1].body.name,'Consulta de pruebas');
  await button('Nuevo servicio').click();await button('Editar configuración: Consulta de seguimiento').waitFor();assert.equal(await dialog().getByRole('radio',{name:'Seleccionar servicio: Consulta de seguimiento',exact:true}).count(),0);
  await dialog().getByRole('radio',{name:'Seleccionar servicio: Evaluación inicial',exact:true}).check();await next();await duration().fill('30');await button('Volver').click();
  await button('Editar configuración: Consulta de seguimiento').click();await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).waitFor();await button('Seguir editando').click();
  assert.match(await dialog().innerText(),/Evaluación inicial/);await button('Editar configuración: Consulta de seguimiento').click();await button('Descartar cambios').click();
  await page.getByRole('heading',{name:'Editar servicio',exact:true}).waitFor();assert.equal(await dialog().getByRole('radio').count(),0);assert.match(await dialog().innerText(),/Consulta de pruebas/);
  await next();await duration().fill('45');await next();await button('Guardar configuración').click();await button('Editar: Consulta de pruebas').waitFor();
  assert.equal(writes.length,3);assert.equal(writes[2].method,'PUT');assert.equal(writes[2].body.productId,501);assert.equal(writes[2].body.version,1);assert.equal(writes[2].body.durationMinutes,45);
  await button('Cerrar').last().click();
  await page.getByRole('combobox',{name:'Idioma de la prueba',exact:true}).selectOption('fr-CA');await page.getByRole('button',{name:'Cambiar tema de prueba',exact:true}).click();
  for (const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:360}]) {
    await page.setViewportSize(viewport);await openServices(true);await button('Nouveau service').click();
    await dialog().getByRole('radio',{name:'Choisir le service: Evaluación inicial',exact:true}).check();await fit();await capture(`service-choice-dark-fr-${viewport.width}.jpg`);
    await button('Continuer').click();await fit();await button('Continuer').click();await fit();assert.match(await dialog().innerText(),/Utiliser les horaires du collaborateur/);
    await capture(`service-review-dark-fr-${viewport.width}.jpg`);await button('Annuler').click();await button('Abandonner les modifications').click();await button('Fermer').last().click();
  }
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('combobox',{name:'Idioma de la prueba',exact:true}).selectOption('es-MX');
  mode = 'empty';inventoryAccess = false;await openServices();await button('Nuevo servicio').click();await dialog().getByText('Todavía no tienes servicios en Inventarios',{exact:true}).waitFor();
  assert.equal(await dialog().getByRole('link',{name:'Abrir Inventarios',exact:true}).count(),0);assert.equal(writes.length,3);
  await dialog().getByRole('radio',{name:'Crear en Agenda',exact:true}).check();
  await dialog().getByLabel('Nombre para las reservas *',{exact:true}).fill('Demo sin costo');
  await dialog().getByLabel('Descripción para las reservas',{exact:true}).fill('Presentación individual de prueba');
  await dialog().getByRole('radio',{name:'Elegir de Inventarios',exact:true}).check();await dialog().getByText('Todavía no tienes servicios en Inventarios',{exact:true}).waitFor();
  await dialog().getByRole('radio',{name:'Crear en Agenda',exact:true}).check();assert.equal(await dialog().getByLabel('Nombre para las reservas *',{exact:true}).inputValue(),'Demo sin costo');
  await fit();await capture('service-independent-choice-desktop.jpg');await next();
  await dialog().getByLabel('Condición de cobro',{exact:true}).selectOption('NO_CHARGE');await duration().fill('30');await next();
  assert.match(await dialog().innerText(),/Sin cobro/);assert.match(await dialog().innerText(),/Servicio de Agenda/);await fit();await capture('service-independent-review-desktop.jpg');
  await button('Guardar configuración').click();await button('Editar: Demo sin costo').waitFor();
  assert.equal(writes.length,4);assert.equal(writes[3].body.productId,undefined);assert.equal(writes[3].body.chargePolicy,'NO_CHARGE');
  const visitor = await browser.newPage({viewport:{width:390,height:844}});
  visitor.on('pageerror',error=>errors.push(error.message));
  const visitorWrites=[];
  await visitor.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin){external.push(url.origin);return route.abort();}
    if(url.pathname.endsWith('/actions/scheduling.reservation.request@1'))visitorWrites.push(request.postDataJSON());
    return route.continue();
  });
  await visitor.goto(`${origin}/book/piloto?consultant=2`);
  await visitor.getByRole('radio',{name:'Servicio: Demo sin costo',exact:true}).check();
  await visitor.getByText('Condición de cobro: Sin cobro',{exact:true}).waitFor();
  await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  const date=new Date();date.setDate(date.getDate()+2);
  await visitor.getByLabel('Fecha',{exact:true}).fill(date.toISOString().slice(0,10));
  await visitor.getByRole('button',{name:/10:00|10:00 a/}).click();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  await visitor.getByRole('textbox',{name:'Participante',exact:true}).fill('Visitante sintético');await visitor.getByLabel('Correo',{exact:true}).fill('synthetic@example.com');
  await visitor.getByRole('checkbox').check();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  await visitor.getByRole('heading',{name:'Revisar solicitud',exact:true}).waitFor();await visitor.getByText('Sin cobro',{exact:true}).waitFor();
  await visitor.screenshot({path:resolve(dir,'service-independent-public-review-mobile.jpg'),fullPage:true,animations:'disabled'});
  await visitor.getByRole('button',{name:'Enviar solicitud',exact:true}).click();await visitor.getByRole('heading',{name:'Solicitud recibida',exact:true}).waitFor();
  assert.equal(visitorWrites.length,1);assert.equal('chargePolicy' in visitorWrites[0],false);assert.equal('productId' in visitorWrites[0],false);
  await visitor.close();
  await button('Editar: Demo sin costo').click();await next();assert.equal(await dialog().getByLabel('Condición de cobro',{exact:true}).inputValue(),'NO_CHARGE');
  await button('Volver').click();mode='available';await dialog().getByRole('radio',{name:'Elegir de Inventarios',exact:true}).check();
  await dialog().getByRole('radio',{name:'Seleccionar servicio: Evaluación inicial',exact:true}).check();await next();await next();
  assert.match(await dialog().innerText(),/Demo sin costo/);assert.match(await dialog().innerText(),/Sin cobro/);await button('Guardar configuración').click();await button('Editar: Demo sin costo').waitFor();
  assert.equal(writes.length,5);assert.equal(writes[4].method,'PUT');assert.equal(writes[4].body.version,1);assert.equal(writes[4].body.productId,502);assert.equal(writes[4].body.name,'Demo sin costo');assert.equal(writes[4].body.chargePolicy,'NO_CHARGE');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS independent free creation without Inventory access; source draft retention; later Inventory link preserves booking name and terms; three-step service create/edit; empty/search/error/retry; Inventory permission; inactive/duplicate prevention; pagination; draft/Back/discard; ranges/overlap; complete review; pending/503/retry; source/version payload; desktop/mobile/landscape/short screen; French/dark.');
} catch (error) {
  if (page) {console.error(await page.locator('body').innerText());await page.screenshot({path:resolve(dir,'failure.jpg'),animations:'disabled'}).catch(()=>{});}throw error;
} finally {await browser?.close();await server.close();}
