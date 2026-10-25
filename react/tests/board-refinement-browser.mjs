import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5221',dir='/tmp/indice-board-refinement-review';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/tmp/indice-board-refinement-vite',server:{host:'127.0.0.1',port:5221,strictPort:true,hmr:false,watch:null}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
await context.addInitScript(()=>{try{localStorage.setItem('frontend-indice-language','es-MX');}catch{}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(16000);
const library=page.locator('[data-idea-projects]'),cards=library.locator('.workspace-project-card');
const select=async(label,option)=>{await library.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();};
const idle=()=>page.waitForFunction(()=>document.querySelector('[data-idea-board] .idea-board-status')?.getAttribute('data-state')==='saved');
try{
 await mkdir(dir,{recursive:true});
 await page.goto(origin+'/tests/fixtures/personal-ideas-board.html?fixture=projects');
 await library.getByRole('heading',{name:'Filtros',exact:true}).waitFor();await cards.first().waitFor();assert.equal(await cards.count(),2);await cards.first().locator('[data-preview-state=ready]').waitFor();assert.ok(await cards.first().locator('[data-thumbnail-node]').count()>0);
 await select('Tipo de proyecto','Diagnóstico empresarial');await page.waitForFunction(()=>document.querySelectorAll('[data-idea-projects] .workspace-project-card').length===1);assert.match(await cards.first().innerText(),/Diagnóstico de cafetería/);
 await select('Ordenar por','Nombre: A a Z');await library.getByRole('searchbox',{name:'Buscar proyecto',exact:true}).fill('Diagnóstico');
 await page.waitForTimeout(1200);await page.reload();await page.waitForFunction(()=>document.querySelector('[data-idea-projects] input[type=search]')?.value==='Diagnóstico');
 assert.match(await library.getByRole('combobox',{name:'Tipo de proyecto',exact:true}).innerText(),/Diagnóstico empresarial/);await cards.first().waitFor();assert.equal(await cards.count(),1);
 await library.getByRole('searchbox',{name:'Buscar proyecto',exact:true}).fill('No existe');await library.getByText('No hay proyectos con estos filtros',{exact:true}).waitFor();
 await library.locator('[data-slot=indice-filter-bar]').getByRole('button',{name:'Limpiar filtros',exact:true}).click();await cards.first().waitFor();assert.equal(await cards.count(),2);
 await library.getByRole('button',{name:'Compartidos conmigo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-idea-projects] .workspace-project-card h3')?.textContent==='Plan de atención al cliente');
 await library.getByRole('button',{name:'Papelera',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-idea-projects] .workspace-project-card h3')?.textContent==='Sesión anterior');
 await library.getByRole('button',{name:'Mis proyectos',exact:true}).click();await cards.first().waitFor();
 await page.screenshot({path:dir+'/projects-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);await library.locator('[data-slot=indice-filter-bar]').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/projects-mobile.png',animations:'disabled'});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:dir+'/projects-mobile-dark.png',animations:'disabled'});await page.evaluate(()=>document.documentElement.classList.remove('dark'));
 await page.setViewportSize({width:1440,height:1000});await library.getByRole('button',{name:'Abrir mi pizarra',exact:true}).first().click();
 const free=page.locator('[data-idea-board]'),nav=page.locator('[data-module=ideas-board] .indice-workbar');await idle();await free.getByRole('button',{name:'Agregar al tablero',exact:true}).click();assert.equal(await free.locator('.system-domain-add').count(),5);assert.equal(await free.locator('[data-area]').count(),0);
 const names=await free.locator('.system-domain-add').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
 for(const [i,label] of names.entries()){
  await free.getByRole('button',{name:label,exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Nombre del elemento 1',exact:true}).fill(['Ana · ventas','Atender pedidos','Canal digital','Asesoría empresarial','Resultados del mes'][i]);
  if(i===1){await dialog.locator('summary').filter({hasText:'Detalles'}).click();await dialog.getByRole('button',{name:'Agregar paso',exact:true}).click();await dialog.getByRole('textbox',{name:'Paso 1',exact:true}).fill('Recibir solicitud');await dialog.getByRole('button',{name:'Agregar paso',exact:true}).click();await dialog.getByRole('textbox',{name:'Paso 2',exact:true}).fill('Confirmar entrega');}
  await dialog.locator('.board-editor-save').click();await dialog.waitFor({state:'hidden'});await idle();
 }
 const content=await page.evaluate(()=>window.boardFixture.stats().board.content);assert.equal(content.nodes.length,5);assert.ok(content.nodes.every(n=>n.catalog));assert.equal(content.nodes.find(n=>n.catalog.category==='PROCESS').catalog.steps.length,2);
 await free.getByRole('button',{name:'Ver todo',exact:true}).last().click();await idle();await page.screenshot({path:dir+'/freeform-desktop.png',animations:'disabled'});
 await free.getByRole('button',{name:'Guardar proyecto',exact:true}).click();let dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Nombre del proyecto',exact:true}).fill('Mi proyecto con catálogos');await dialog.getByRole('button',{name:'Guardar proyecto',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await nav.getByRole('button',{name:'Mis proyectos',exact:true}).click();await library.getByRole('button',{name:'Abrir: Mi proyecto con catálogos',exact:true}).click();
 const preview=library.locator('[data-readonly=true]');await preview.waitFor();assert.equal(await preview.locator('.system-node').count(),5);await preview.getByRole('button',{name:'Ver pasos: Atender pedidos',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByText('Confirmar entrega',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Cerrar',exact:true}).last().click();
 await nav.getByRole('button',{name:'Diagnóstico empresarial',exact:true}).click();const diagnosis=page.locator('[data-system-board]');await diagnosis.waitFor();await diagnosis.getByRole('button',{name:'Agregar al tablero',exact:true}).click();assert.deepEqual(await diagnosis.locator('.system-domain-add').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),names);assert.equal(await diagnosis.locator('[data-area]').count(),4);
 await page.setViewportSize({width:390,height:844});await nav.getByRole('button',{name:'Mi pizarra',exact:true}).click();await idle();assert.equal(await free.locator('[data-idea-node]').count(),5);await free.getByRole('button',{name:'Agregar al tablero',exact:true}).click();await free.getByRole('button',{name:'Agregar persona',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Nombre del elemento 1',exact:true}).fill('Prueba móvil');await dialog.locator('.board-editor-save').click();await dialog.waitFor({state:'hidden'});await idle();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:dir+'/freeform-mobile.png',animations:'disabled'});
 await page.reload();await nav.getByRole('button',{name:'Mi pizarra',exact:true}).click();await idle();assert.equal(await free.locator('[data-idea-node]').count(),6);assert.equal(await page.evaluate(()=>window.personalFixture.salesRequests()),0);assert.deepEqual(errors,[]);
 console.log('PASS: five freeform construction catalogs, steps, snapshots, renamed diagnosis, filters/sort/scopes, filter memory, mobile/dark layout and Sales isolation.');
}catch(failure){await page.screenshot({path:dir+'/failure.png',animations:'disabled'});throw failure;}
finally{await browser.close();await server.close();}
