/** Native UI regression against isolated, in-memory fixtures. No functional backend or database. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { startPreview } from './scheduling-preview.mjs';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const artifactDir = resolve(process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(), 'scheduling-staff-modals');
mkdirSync(artifactDir, { recursive: true });
const origin = `http://127.0.0.1:${process.env.INDICE_SCHEDULING_PREVIEW_PORT || 5197}`;
const server = await startPreview();
let browser, page;
const errors = [], writes = [], external = [], serviceReads = [];
try {
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  let failNext = true, release;
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
    if (url.pathname === '/api/v1/scheduling/services' && request.method() === 'GET') serviceReads.push(url.pathname);
    if (/^\/api\/v1\/scheduling\/staff(?:\/\d+)?$/.test(url.pathname) && ['POST','PUT'].includes(request.method())) {
      writes.push({ method: request.method(), path: url.pathname, body: request.postDataJSON() });
      if (failNext) {
        failNext = false; await new Promise(resolve => release = resolve);
        return route.fulfill({ status: 503, json: { message: 'Synthetic failure' } });
      }
    }
    return route.continue();
  });
  const dialog = () => page.getByRole('dialog');
  const button = name => dialog().getByRole('button', { name, exact: true });
  const next = async () => button('Continuar').click();
  const capture = name => page.screenshot({ path: resolve(artifactDir, name), animations: 'disabled' });
  const fit = async () => {
    assert.equal(await dialog().count(), 1);
    const geometry = await dialog().evaluate(el => ({ x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,scroll:el.scrollWidth,client:el.clientWidth,vw:innerWidth,vh:innerHeight }));
    assert.ok(geometry.x >= -1 && geometry.y >= -1 && geometry.x+geometry.width <= geometry.vw+1 && geometry.y+geometry.height <= geometry.vh+1, JSON.stringify(geometry));
    assert.ok(geometry.scroll <= geometry.client+1, 'No horizontal modal overflow');
    for (const action of await page.locator('[data-slot="dialog-footer"] button').all()) {
      const rect = await action.boundingBox();
      assert.ok(rect && rect.y >= 0 && rect.y+rect.height <= geometry.vh+1, 'Footer actions stay visible');
    }
  };
  await page.goto(`${origin}/scheduling/calendar`);
  const initialServiceReads = serviceReads.length;
  await page.getByRole('button', { name:'Equipo y disponibilidad',exact:true }).click();
  await button('Editar: Consultor demo 1').waitFor();
  assert.equal(await dialog().getByRole('list', {name:'Tu equipo',exact:true}).getByRole('listitem').count(),2);
  assert.equal(serviceReads.length,initialServiceReads,'The directory does not fetch service details');
  assert.ok((await dialog().boundingBox()).height < 600,'A short directory does not fill the screen');
  await fit(); await capture('team-desktop.jpg');
  await dialog().getByLabel('Buscar colaborador', { exact:true }).fill('demo 2');
  await button('Editar: Consultor demo 2').waitFor();
  assert.equal(await button('Editar: Consultor demo 1').count(),0);
  await dialog().getByLabel('Buscar colaborador', { exact:true }).fill('sin coincidencias');
  await dialog().getByText('Ningún colaborador coincide con estos filtros.', { exact:true }).waitFor();
  await dialog().getByLabel('Buscar colaborador', { exact:true }).fill('');
  await dialog().getByRole('combobox', {name:'Estado',exact:true}).click();
  await page.getByRole('option', {name:'Inactivo',exact:true}).click();
  await dialog().getByText('Ningún colaborador coincide con estos filtros.', { exact:true }).waitFor();
  await dialog().getByRole('combobox', {name:'Estado',exact:true}).click();
  await page.getByRole('option', {name:'Todos los estados',exact:true}).click();
  await button('Agregar colaborador').click();
  await next(); assert.match(await dialog().innerText(), /Paso 1 de 4/); assert.equal(writes.length,0);
  await dialog().getByLabel(/^Empleado de Recursos Humanos/).selectOption('44');
  await dialog().getByLabel(/^Nombre público/).fill('Colaboradora de pruebas');
  await fit(); await capture('staff-step-1-desktop.jpg');
  await next(); await dialog().getByLabel(/^Zona horaria/).selectOption('America/Mexico_City');
  await dialog().getByLabel('Descanso entre sesiones (minutos)', {exact:true}).selectOption('15');
  await dialog().getByLabel('Fin · lunes · 1', {exact:true}).fill('12:00');
  await button('Agregar horario · lunes').click();
  await dialog().getByLabel('Inicio · lunes · 2', {exact:true}).fill('08:00');
  await dialog().getByLabel('Fin · lunes · 2', {exact:true}).fill('10:00');
  await next(); await dialog().getByRole('alert').waitFor(); assert.match(await dialog().innerText(),/Paso 2 de 4/);
  await dialog().getByLabel('Inicio · lunes · 2', {exact:true}).fill('13:00');
  await dialog().getByLabel('Fin · lunes · 2', {exact:true}).fill('17:00');
  await next();
  await dialog().getByRole('checkbox', {name:'Diagnóstico empresarial',exact:true}).check();
  await dialog().getByLabel('Fecha', {exact:true}).fill('2027-01-08'); await button('Bloquear fecha').click();
  await button('Atrás').click(); assert.equal(await dialog().getByLabel('Inicio · lunes · 2', {exact:true}).inputValue(), '13:00');
  await button('Atrás').click(); assert.equal(await dialog().getByLabel(/^Nombre público/).inputValue(), 'Colaboradora de pruebas');
  await next(); await next(); await next();
  assert.equal(writes.length,0); assert.equal(await button('Continuar').count(),0);
  assert.match(await dialog().innerText(),/09:00 – 12:00/); assert.match(await dialog().innerText(),/13:00 – 17:00/);
  assert.match(await dialog().innerText(),/2027-01-08/); assert.match(await dialog().innerText(),/Diagnóstico empresarial/);
  await button('Cancelar').click(); await page.getByRole('heading',{name:'¿Descartar cambios sin guardar?',exact:true}).waitFor();
  await page.keyboard.press('Escape'); await page.getByRole('heading',{name:'Todo listo para revisar',exact:true}).waitFor();
  await fit(); await capture('staff-review-desktop.jpg');
  await button('Guardar').click(); await button('Cargando…').waitFor();
  assert.equal(await button('Cancelar').isDisabled(),true); assert.equal(await button('Cerrar').isDisabled(),true);
  await page.keyboard.press('Escape'); assert.equal(await dialog().getAttribute('aria-busy'),'true');
  release(); await dialog().getByRole('alert').waitFor(); assert.equal(writes.length,1);
  assert.match(await dialog().innerText(),/Colaboradora de pruebas/);
  await button('Guardar').click(); await button('Editar: Colaboradora de pruebas').waitFor();
  assert.equal(writes.length,2); assert.deepEqual(writes[0],writes[1]);
  assert.equal(writes[1].body.userId,44); assert.equal(writes[1].body.days.length,6);
  assert.equal(writes[1].body.timezone,'America/Mexico_City'); assert.equal(writes[1].body.bufferMinutes,15);
  assert.deepEqual(writes[1].body.serviceIds,[1]); assert.deepEqual(writes[1].body.unavailableDates,['2027-01-08']);
  await button('Cerrar').last().click();
  await page.getByRole('combobox',{name:'Idioma de la prueba',exact:true}).selectOption('fr-CA');
  await page.getByRole('button',{name:'Cambiar tema de prueba',exact:true}).click();
  for (const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:360}]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'Équipe et disponibilités',exact:true}).click();
    await button('Modifier: Colaboradora de pruebas').waitFor(); await capture(`team-dark-fr-${viewport.width}.jpg`); await fit();
    await button('Modifier: Colaboradora de pruebas').click();
    assert.equal(await dialog().getByLabel(/^Employé des Ressources humaines/).isDisabled(),true);
    await fit(); await capture(`staff-dark-fr-${viewport.width}.jpg`);
    await button('Continuer').click(); await fit();
    await dialog().getByLabel(/^Fuseau horaire/).waitFor();
    assert.equal(await dialog().getByLabel(/^Fuseau horaire/).inputValue(),'America/Mexico_City');
    await button('Continuer').click(); await button('Continuer').click(); await fit();
    await capture(`staff-review-dark-fr-${viewport.width}.jpg`);
    await button('Annuler').click(); await button('Fermer').last().click();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
  console.log('PASS compact directory/search/status/direct edit; four-step create/edit; current-step validation; Back; complete review; discard/Escape; pending/failure/retry; saved payload; desktop/mobile/landscape/short viewport; French/dark; no external traffic.');
} catch (error) {
  if (page) { console.error(await page.locator('body').innerText()); await page.screenshot({path:resolve(artifactDir,'failure.jpg'),animations:'disabled'}).catch(()=>{}); }
  throw error;
} finally { await browser?.close(); await server.close(); }
