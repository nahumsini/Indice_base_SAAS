/** Separated administration/create/edit workflow, with synthetic in-memory APIs only. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {startPreview} from './scheduling-preview.mjs';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const dir=resolve(process.env.INDICE_BROWSER_ARTIFACTS||tmpdir(),'scheduling-public-editor');mkdirSync(dir,{recursive:true});
const origin=`http://127.0.0.1:${process.env.INDICE_SCHEDULING_PREVIEW_PORT||5197}`;
const server=await startPreview();let browser,page,visitor;
const errors=[],external=[],writes=[];
try{
  browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==origin){external.push(url.origin);return route.abort();}if(/\/scheduling\/pages(?:\/\d+)?$/.test(url.pathname)&&['POST','PUT'].includes(req.method()))writes.push({path:url.pathname,method:req.method(),body:req.postDataJSON()});return route.continue();});
  const dialog=()=>page.getByRole('dialog');
  const action=name=>dialog().getByRole('button',{name,exact:true});
  const fit=async()=>{assert.equal(await dialog().count(),1);const rect=await dialog().evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,client:el.clientWidth,scroll:el.scrollWidth};});assert.ok(rect.x>=-1&&rect.y>=-1&&rect.x+rect.w<=rect.vw+1&&rect.y+rect.h<=rect.vh+1,JSON.stringify(rect));assert.ok(rect.scroll<=rect.client+1);};
  const manager=()=>dialog().getByRole('heading',{name:'Agendas públicas',exact:true}).waitFor();
  await page.goto(`${origin}/scheduling/calendar`);await page.getByRole('button',{name:'Agenda pública',exact:true}).click();await manager();
  assert.equal(await dialog().getByRole('heading',{name:'Reserva tu diagnóstico empresarial',exact:true}).count(),1);
  assert.equal(await dialog().getByLabel('Nombre de la agenda *',{exact:true}).count(),0);
  await action('Nueva agenda').click();await dialog().getByRole('heading',{name:'Crear una agenda',exact:true}).waitFor();
  await action('Continuar').click();assert.equal(writes.length,0);
  await dialog().getByLabel('Nombre de la agenda *',{exact:true}).fill('Seguimiento empresarial');
  const generated=await dialog().getByLabel('Enlace para tus clientes',{exact:true}).inputValue();assert.notEqual(generated,`${origin}/book/piloto`);
  await dialog().getByLabel('Descripción',{exact:true}).fill('Revisa avances y próximos pasos.');await action('Continuar').click();await action('Natural').click();await dialog().getByRole('button',{name:/^Editorial/}).click();await fit();await action('Continuar').click();
  assert.equal(await dialog().getByText('Compartir agenda',{exact:true}).count(),0);
  await action('Guardar borrador').click();await manager();assert.equal(writes[0].method,'POST');assert.equal(writes[0].body.published,false);
  await dialog().getByRole('button',{name:'Editar: Seguimiento empresarial',exact:true}).click();await action('Continuar').click();await action('Continuar').click();
  await dialog().getByRole('switch',{name:'Recibir solicitudes de citas',exact:true}).check();await action('Guardar y publicar').click();await manager();
  assert.equal(writes[1].method,'PUT');assert.notEqual(writes[1].path,'/api/v1/scheduling/pages/7');assert.equal(writes[1].body.appearance.layout,'showcase');
  await dialog().getByRole('button',{name:'Compartir agenda: Seguimiento empresarial',exact:true}).click();const publicPath=await dialog().getByRole('link',{name:'Abrir agenda',exact:true}).getAttribute('href');assert.equal(`${origin}${publicPath}`,generated);
  visitor=await browser.newPage({viewport:{width:390,height:844}});await visitor.goto(`${origin}${publicPath}`);await visitor.getByRole('heading',{name:'Seguimiento empresarial',exact:true}).waitFor();assert.equal(await visitor.locator('[data-public-scheduling]').evaluate(el=>getComputedStyle(el).getPropertyValue('--scheduling-accent').trim()),'#047857');
  await dialog().getByRole('button',{name:'Ocultar agenda: Reserva tu diagnóstico empresarial',exact:true}).click();await dialog().getByRole('heading',{name:'¿Ocultar esta agenda?',exact:true}).waitFor();await action('Despublicar').click();await manager();assert.equal(writes[2].path,'/api/v1/scheduling/pages/7');assert.equal(writes[2].body.published,false);
  await visitor.reload();await visitor.getByRole('heading',{name:'Seguimiento empresarial',exact:true}).waitFor();
  await dialog().getByRole('searchbox',{name:'Buscar agenda',exact:true}).fill('Seguimiento');assert.equal(await dialog().getByRole('heading',{name:'Reserva tu diagnóstico empresarial',exact:true}).count(),0);
  await dialog().getByRole('searchbox',{name:'Buscar agenda',exact:true}).fill('');await page.screenshot({path:resolve(dir,'agendas-manager-desktop.png')});
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:568}]){await page.setViewportSize(viewport);await fit();await action('Nueva agenda').click();await fit();await action('Cancelar').click();await manager();}
  await page.screenshot({path:resolve(dir,'agendas-manager-mobile.png')});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS separated public agenda manager/wizard: create without replacing, selected edit/version, per-page publication/design/link, unpublish sibling independence, search and narrow viewports.');
}catch(error){if(page){console.error(await page.locator('body').innerText());await page.screenshot({path:resolve(dir,'failure.png')}).catch(()=>{});}throw error;}
finally{await browser?.close();await server.close();}
