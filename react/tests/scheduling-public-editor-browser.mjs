/** Agenda publication UI against isolated in-memory APIs, never the functional database. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startPreview } from './scheduling-preview.mjs';
const {chromium} = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const dir = resolve(process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(),'scheduling-public-editor');mkdirSync(dir,{recursive:true});
const origin = `http://127.0.0.1:${process.env.INDICE_SCHEDULING_PREVIEW_PORT || 5197}`;
const server = await startPreview();let browser,page,visitor;
const writes = [],errors = [],external = [],visitorCalls = [],submissions = [];
try {
  browser = await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH ? {executablePath:process.env.INDICE_CHROME_PATH} : {})});
  page = await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
  page.on('pageerror',error => errors.push(error.message));
  let failSave = true,release;
  await page.route('**/*',async route => {
    const req = route.request(),url = new URL(req.url());
    if (url.origin !== origin) {external.push(url.origin);return route.abort();}
    if (url.pathname === '/api/v1/scheduling/page' && req.method() === 'PUT') {
      writes.push(req.postDataJSON());
      if (failSave) {failSave=false;await new Promise(resolve => release=resolve);return route.fulfill({status:503,json:{message:'Synthetic save failure'}});}
    }
    return route.continue();
  });
  const dialog = () => page.getByRole('dialog');
  const button = name => dialog().getByRole('button',{name,exact:true});
  const open = async () => {await page.getByRole('button',{name:'Agenda pública',exact:true}).click();await dialog().getByLabel('Nombre público del negocio',{exact:true}).waitFor();};
  const next = () => button('Continuar').click();
  const review = async () => {await next();await next();};
  const fit = async () => {
    assert.equal(await dialog().count(),1);
    await dialog().evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
    const data=await dialog().evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,scroll:el.scrollWidth,client:el.clientWidth};});
    assert.ok(data.x>=-1&&data.y>=-1&&data.x+data.w<=data.vw+1&&data.y+data.h<=data.vh+1,JSON.stringify(data));assert.ok(data.scroll<=data.client+1,'No modal horizontal overflow');
    for(const action of await page.locator('[data-slot="dialog-footer"] button').all()){const r=await action.boundingBox();assert.ok(r&&r.y>=-1&&r.y+r.height<=data.vh+1,'Footer action stays reachable');}
  };
  const capture = name => page.screenshot({path:resolve(dir,name),animations:'disabled'});
  await page.goto(`${origin}/scheduling/calendar`);await open();
  assert.equal(await dialog().getByLabel('Nombre público del negocio',{exact:true}).inputValue(),''); // empty saved brand remains intentional
  await dialog().getByLabel('Título de la página *',{exact:true}).fill('');await next();assert.equal(await dialog().getByLabel('Título de la página *',{exact:true}).evaluate(el=>el.checkValidity()),false);assert.equal(writes.length,0);
  await dialog().getByLabel('Nombre público del negocio',{exact:true}).fill('Clínica Horizonte');
  await dialog().getByLabel('Título de la página *',{exact:true}).fill('Tu bienestar empieza aquí');
  await dialog().getByLabel('Descripción',{exact:true}).fill('Elige tu consulta y solicita un horario.\nTe contactaremos para confirmar.');
  await dialog().getByLabel('Texto del botón de solicitud',{exact:true}).fill('Solicitar mi cita');await fit();await capture('public-content-desktop.jpg');await next();
  await button('Natural').click();await dialog().getByRole('textbox',{name:'Color principal',exact:true}).fill('#BAD');await next();assert.equal(await dialog().getByRole('textbox',{name:'Color principal',exact:true}).evaluate(el=>el.checkValidity()),false);
  await dialog().getByRole('textbox',{name:'Color principal',exact:true}).fill('#6D28D9');await dialog().getByRole('textbox',{name:'Fondo del encabezado',exact:true}).fill('#FFF7ED');
  await dialog().getByRole('button',{name:/^Compacto/}).click();await dialog().getByRole('button',{name:/^Tarjetas/}).click();await fit();await capture('public-design-desktop.jpg');
  await button('Volver').click();assert.equal(await dialog().getByLabel('Título de la página *',{exact:true}).inputValue(),'Tu bienestar empieza aquí');await review();assert.equal(writes.length,0);
  await button('Vista móvil').click();await fit();await capture('public-review-mobile-preview.jpg');await button('Vista de escritorio').click();
  await button('Cancelar').click();await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).waitFor();await page.keyboard.press('Escape');
  await button('Guardar y publicar').click();await button('Cargando…').waitFor();assert.equal(await button('Volver').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await dialog().getAttribute('aria-busy'),'true');
  release();await dialog().getByRole('alert').waitFor();await button('Guardar y publicar').click();await dialog().getByText('Configuración guardada. Los enlaces de abajo usan la versión guardada.',{exact:true}).waitFor();
  assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(writes[1].alias,'piloto');assert.equal(writes[1].version,1);assert.equal(writes[1].appearance.brandName,'Clínica Horizonte');assert.equal(writes[1].appearance.accentColor,'#6D28D9');
  assert.equal(await dialog().getByRole('link',{name:'Abrir página pública',exact:true}).getAttribute('href'),'/book/piloto');await button('Cancelar').click();assert.equal(await dialog().count(),0);
  await open();assert.equal(await dialog().getByLabel('Título de la página *',{exact:true}).inputValue(),'Tu bienestar empieza aquí');await next();assert.equal(await dialog().getByRole('textbox',{name:'Fondo del encabezado',exact:true}).inputValue(),'#FFF7ED');await next();
  visitor = await browser.newPage({viewport:{width:390,height:844}});visitor.setDefaultTimeout(15000);visitor.on('pageerror',error=>errors.push(error.message));
  await visitor.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());if(url.origin!==origin){external.push(url.origin);return route.abort();}
    if(url.pathname.startsWith('/api/'))visitorCalls.push(url.pathname);
    if(url.pathname.endsWith('/actions/scheduling.reservation.request@1'))submissions.push({body:req.postDataJSON(),key:req.headers()['idempotency-key']});
    return route.continue();
  });
  await visitor.goto(`${origin}/book/piloto?consultant=2`);await visitor.getByRole('heading',{name:'Tu bienestar empieza aquí',exact:true}).waitFor();
  assert.match(await visitor.locator('body').innerText(),/Clínica Horizonte/);assert.equal(await visitor.getByRole('combobox',{name:/^Colaborador/}).inputValue(),'2');
  assert.equal(await visitor.locator('[data-public-scheduling]').evaluate(el=>getComputedStyle(el).getPropertyValue('--scheduling-accent').trim()),'#6D28D9');
  await visitor.getByRole('radio',{name:'Servicio: Diagnóstico empresarial',exact:true}).check();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  const date=new Date();date.setDate(date.getDate()+2);await visitor.getByLabel('Fecha',{exact:true}).fill(date.toISOString().slice(0,10));await visitor.getByRole('button',{name:/10:00|10:00 a/}).click();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  await visitor.getByRole('textbox',{name:'Participante',exact:true}).fill('Visitante sintético');await visitor.getByLabel('Correo',{exact:true}).fill('synthetic@example.com');await visitor.getByRole('checkbox').check();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  await visitor.getByRole('button',{name:'Solicitar mi cita',exact:true}).waitFor();await visitor.screenshot({path:resolve(dir,'public-custom-booking-mobile.jpg'),fullPage:true});await visitor.getByRole('button',{name:'Solicitar mi cita',exact:true}).click();await visitor.getByRole('heading',{name:'Solicitud recibida',exact:true}).waitFor();
  assert.equal(submissions.length,1);assert.ok(submissions[0].key);assert.equal('companyId' in submissions[0].body,false);assert.equal('chargePolicy' in submissions[0].body,false);assert.equal(visitorCalls.some(path=>/\/auth\/|\/scheduling\/(page|staff|services|booking-clients)|\/finance\//.test(path)),false);
  await button('Volver').click();await dialog().getByRole('button',{name:/^Compacto/}).click();await next();await button('Guardar y publicar').click();await dialog().getByText('Configuración guardada. Los enlaces de abajo usan la versión guardada.',{exact:true}).waitFor();assert.equal(writes[2].version,2);
  await visitor.goto(`${origin}/book/piloto?consultant=3`);await visitor.getByRole('combobox',{name:/^Servicio \/ Eventos/}).waitFor();assert.equal(await visitor.getByRole('radio').count(),0);assert.equal(await visitor.getByRole('combobox',{name:/^Colaborador/}).inputValue(),'3');await visitor.getByRole('combobox',{name:/^Servicio \/ Eventos/}).selectOption('service:6');
  await visitor.evaluate(()=>document.documentElement.classList.add('dark'));await visitor.screenshot({path:resolve(dir,'public-custom-compact-dark-mobile.jpg'),fullPage:true});
  // Maximum supported CTA length must still fit on the public mobile surface.
  await button('Volver').click();await button('Volver').click();await dialog().getByLabel('Texto del botón de solicitud',{exact:true}).fill('X'.repeat(80));await review();await button('Guardar y publicar').click();await dialog().getByText('Configuración guardada. Los enlaces de abajo usan la versión guardada.',{exact:true}).waitFor();
  await visitor.setViewportSize({width:320,height:640});await visitor.goto(`${origin}/book/piloto?consultant=3`);await visitor.getByRole('combobox',{name:/^Servicio \/ Eventos/}).selectOption('service:6');await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  await visitor.getByLabel('Fecha',{exact:true}).fill(date.toISOString().slice(0,10));await visitor.getByRole('button',{name:/10:00|10:00 a/}).click();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();
  await visitor.getByRole('textbox',{name:'Participante',exact:true}).fill('Visitante sintético');await visitor.getByLabel('Correo',{exact:true}).fill('synthetic@example.com');await visitor.getByRole('checkbox').check();await visitor.getByRole('button',{name:'Continuar',exact:true}).click();await visitor.getByRole('button',{name:'X'.repeat(80),exact:true}).waitFor();
  assert.equal(await visitor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Long CTA stays inside a 320px page');
  await button('Volver').click();await button('Volver').click();await dialog().getByLabel('Texto del botón de solicitud',{exact:true}).fill('Solicitar mi cita');await review();await button('Guardar y publicar').click();await dialog().getByText('Configuración guardada. Los enlaces de abajo usan la versión guardada.',{exact:true}).waitFor();
  await button('Cancelar').click();await page.getByRole('combobox',{name:'Idioma de la prueba',exact:true}).selectOption('fr-CA');await page.getByRole('button',{name:'Cambiar tema de prueba',exact:true}).click();
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:360}]){
    await page.setViewportSize(viewport);await page.getByRole('button',{name:'Agenda public',exact:true}).click();await dialog().getByLabel('Nom public de l’entreprise',{exact:true}).waitFor();await fit();
    await button('Continuer').click();await fit();await capture(`public-design-dark-fr-${viewport.width}.jpg`);await button('Continuer').click();await fit();
    assert.equal(await dialog().getByRole('link',{name:'Ouvrir la page publique',exact:true}).getAttribute('href'),'/book/piloto');await button('Annuler').click();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS public agenda: three-stage editor; editable identity/content/CTA; palettes/custom colours; real cards/compact selection; desktop/mobile preview; final-only save; stable alias; persisted version/reopen; native validation; discard; pending/503/retry; public mobile booking and personalized staff; no ERP data fetch; French/dark; 320px/portrait/landscape containment.');
}catch(error){if(page){console.error(await page.locator('body').innerText());await page.screenshot({path:resolve(dir,'failure.jpg'),animations:'disabled'}).catch(()=>{});}throw error;}
finally{await browser?.close();await server.close();}
