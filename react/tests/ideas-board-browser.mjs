import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const dir=resolve(process.env.INDICE_BROWSER_ARTIFACTS||tmpdir(),'indice-ideas-board');mkdirSync(dir,{recursive:true});
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:resolve(tmpdir(),'indice-ideas-board-vite'),server:{host:'127.0.0.1',port:5211,strictPort:true,hmr:false,watch:null}});
let browser;const evidence=[];
try {
 await server.listen();browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1100},hasTouch:true});await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto('http://127.0.0.1:5211/tests/fixtures/campaign-workshop.html');
 const board=page.locator('[data-idea-board]'),surface=board.locator('[data-idea-surface]'),nodes=board.locator('[data-idea-node]');
 async function saved(){await page.waitForFunction(()=>document.querySelector('[data-idea-board] .idea-board-status')?.textContent==='Guardado');}
 async function add(text,x,y,shape){if(shape)await board.getByRole('button',{name:shape,exact:true}).click();await surface.click({position:{x,y}});const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Tu idea',exact:true}).fill(text);await dialog.getByRole('button',{name:'Guardar idea',exact:true}).click();await saved();}
 await add('Nuestra campaña',140,130);await add('Hablar con clientes',620,180,'Círculo');assert.equal(await nodes.count(),2);
 await board.getByRole('button',{name:'Conectar',exact:true}).click(); // Current selected idea becomes the source.
 await nodes.nth(0).click();await saved();assert.equal(await board.locator('[data-idea-line]').count(),1);
 const before=await board.locator('[data-idea-line]').getAttribute('x1');
 const n=await nodes.nth(1).boundingBox();await page.mouse.move(n.x+n.width/2,n.y+n.height/2);await page.mouse.down();await page.mouse.move(n.x+n.width/2-100,n.y+n.height/2+100,{steps:8});await page.mouse.up();await saved();assert.notEqual(await board.locator('[data-idea-line]').getAttribute('x1'),before);
 const handle=board.locator('[data-resize]');const h=await handle.boundingBox();const oldWidth=await nodes.nth(1).evaluate(n=>n.offsetWidth);await page.mouse.move(h.x+22,h.y+22);await page.mouse.down();await page.mouse.move(h.x+70,h.y+65,{steps:6});await page.mouse.up();await saved();assert.ok(await nodes.nth(1).evaluate(n=>n.offsetWidth)>oldWidth);
 await board.getByRole('button',{name:'Deshacer',exact:true}).click();await saved();assert.equal(await nodes.nth(1).evaluate(n=>n.offsetWidth),oldWidth);await board.getByRole('button',{name:'Rehacer',exact:true}).click();await saved();
 await board.getByRole('button',{name:'Editar',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Tu idea',exact:true}).fill('Oferta clara');await dialog.getByRole('combobox',{name:'Forma',exact:true}).selectOption('RECTANGLE');await dialog.getByRole('button',{name:'Color 4',exact:true}).click();await dialog.getByRole('button',{name:'Guardar idea',exact:true}).click();await saved();assert.equal(await nodes.nth(1).getAttribute('data-color'),'MINT');
 await page.evaluate(()=>window.boardFixture.failNext('network'));await board.getByRole('button',{name:'Duplicar',exact:true}).click();await board.getByText('No se guardó. Tus cambios siguen aquí.',{exact:false}).waitFor();assert.equal(await nodes.count(),3);await board.getByRole('button',{name:'Reintentar',exact:true}).click();await saved();
 await page.evaluate(()=>window.boardFixture.failNext('lost'));await board.getByRole('button',{name:'Quitar',exact:true}).click();await board.getByRole('button',{name:'Reintentar',exact:true}).waitFor();await board.getByRole('button',{name:'Reintentar',exact:true}).click();await saved();assert.equal(await nodes.count(),2);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=','base64');
 await page.evaluate(()=>window.boardFixture.failNext('photo'));await board.locator('input[type=file]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});await board.getByRole('button',{name:'Reintentar foto',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-idea-node]').length===3);await saved();await nodes.locator('img').evaluate(img=>img.decode());assert.equal(await nodes.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 // Drop another photo onto the canvas.
 const transfer=await page.evaluateHandle(bytes=>{const t=new DataTransfer();t.items.add(new File([Uint8Array.from(bytes)],'drop.png',{type:'image/png'}));return t;},[...png]);
 const sb=await surface.boundingBox();await surface.dispatchEvent('drop',{dataTransfer:transfer,clientX:sb.x+350,clientY:sb.y+220});await page.waitForFunction(()=>window.boardFixture.stats().board.content.nodes.length===4);await saved();
 await page.reload();await saved();assert.equal(await nodes.count(),4);assert.equal(await board.locator('[data-idea-line]').count(),1);evidence.push('Desktop: create/edit/move/resize, shapes/colors, arrows follow nodes, undo/redo, private autosave/reload, network/lost-response retry and photo picker/drop passed.');
 await board.getByRole('button',{name:'Ampliar pizarra',exact:true}).click();await board.getByRole('button',{name:'Ver todo',exact:true}).click();await saved();await page.screenshot({path:dir+'/desktop.png'});await board.getByRole('button',{name:'Salir de vista ampliada',exact:true}).click();
 for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  await page.setViewportSize(size);await board.getByRole('button',{name:'Ampliar pizarra',exact:true}).click();await board.getByRole('button',{name:'Ver todo',exact:true}).click();await saved();
  const bounds=await board.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom,scroll:el.scrollWidth,width:r.width};});assert.ok(bounds.x>=0&&bounds.right<=size.width+1&&bounds.bottom<=size.height+1&&bounds.scroll<=bounds.width+1,JSON.stringify({size,bounds}));
  for(const name of ['Foto','Salir de vista ampliada','Acercar','Alejar']){const box=await board.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=size.width+1&&box.y>=0&&box.y+box.height<=size.height+1,JSON.stringify({size,name,box}));}
  await board.getByRole('button',{name:'Nota',exact:true}).click();await surface.click({position:{x:35,y:25}});
  const mobileDialog=page.getByRole('dialog');await page.waitForTimeout(250);await mobileDialog.getByRole('textbox',{name:'Tu idea',exact:true}).fill('Idea desde celular');
  const saveButton=mobileDialog.getByRole('button',{name:'Guardar idea',exact:true});const saveBounds=await saveButton.boundingBox();assert.ok(saveBounds&&saveBounds.height>=44&&saveBounds.y>=0&&saveBounds.y+saveBounds.height<=size.height+1,JSON.stringify({size,saveBounds}));await saveButton.click();await saved();await board.getByRole('button',{name:'Quitar',exact:true}).click();await saved();
  await board.getByRole('button',{name:'Acercar',exact:true}).click();await saved();await board.getByRole('button',{name:'Alejar',exact:true}).click();await saved();
  if(size.width===390){await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:dir+'/mobile-dark.png'});await page.evaluate(()=>document.documentElement.classList.remove('dark'));}
  await board.getByRole('button',{name:'Salir de vista ampliada',exact:true}).click();evidence.push(`Mobile ${size.width}x${size.height}: canvas/toolbar containment, zoom/fit and expanded workspace passed.`);
 }
 await page.setViewportSize({width:390,height:844});await board.getByRole('button',{name:'Ver todo',exact:true}).click();await saved();
 // Real touch events move a note without scrolling the page.
 const originalTouchNode=await page.evaluate(()=>window.boardFixture.stats().board.content.nodes[0]);
 const touch=await context.newCDPSession(page),target=await nodes.nth(0).boundingBox();await nodes.nth(0).scrollIntoViewIfNeeded();const t=await nodes.nth(0).boundingBox();const x=t.x+t.width/2,y=t.y+t.height/2;
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y:y+35}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await saved();
 const movedStats=await page.evaluate(()=>window.boardFixture.stats().board.content.nodes[0]);assert.notEqual(movedStats.x,originalTouchNode.x);
 const rect=await surface.boundingBox(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,oldZoom=await page.evaluate(()=>window.boardFixture.stats().board.content.viewport.zoom);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-30,y:cy},{id:2,x:cx+30,y:cy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-60,y:cy},{id:2,x:cx+60,y:cy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await saved();assert.ok((await page.evaluate(()=>window.boardFixture.stats().board.content.viewport.zoom))>oldZoom);
 await board.getByRole('button',{name:'Ver todo',exact:true}).click();await saved();await nodes.nth(0).click();
 await page.evaluate(()=>window.boardFixture.failNext('conflict'));await board.getByRole('button',{name:'Duplicar',exact:true}).click();await board.getByRole('button',{name:'Abrir versión guardada',exact:true}).waitFor();const count=await nodes.count();await board.getByRole('button',{name:'Abrir versión guardada',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await nodes.count(),count);await board.getByRole('button',{name:'Abrir versión guardada',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Descartar cambios y abrir',exact:true}).click();await saved();assert.equal(await nodes.count(),count-1);
 // Original campaign cards remain usable below the private board.
 await page.getByText('Servicio de consultoría · ejemplo',{exact:true}).first().click();await page.getByRole('button',{name:'Preparar para IA',exact:true}).waitFor();
 assert.deepEqual(errors,[]);evidence.push('Touch drag, conflict draft retention/explicit reload and original saved-campaign navigation passed. No uncaught browser errors.');console.log(evidence.join('\n'));
} finally {await browser?.close();await server.close();}
