import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const dir = resolve(process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(), 'indice-content-guide');
mkdirSync(dir, { recursive: true });
const origin = 'http://127.0.0.1:5209';
const server = await createServer({ root: resolve(import.meta.dirname, '..'), cacheDir: resolve(tmpdir(), 'indice-content-guide-vite'), server: { host: '127.0.0.1', port: 5209, strictPort: true, hmr: false, watch: null } });
let browser;
const evidence=[];
try{
 await server.listen();
 browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH ? {executablePath:process.env.INDICE_CHROME_PATH} : {})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/tests/fixtures/campaign-workshop.html');
 await page.getByText('Servicio de consultoría · ejemplo',{exact:true}).first().click();
 await page.getByRole('button',{name:'Preparar para IA',exact:true}).click();
 const dialog=page.getByRole('dialog'),guide=dialog.getByRole('region',{name:'Guía de contenido para tu IA'});
 await guide.getByRole('combobox',{name:'Tipo de contenido',exact:true}).selectOption('TUTORIAL');
 await guide.getByRole('combobox',{name:'Formato',exact:true}).selectOption('SHORT_VIDEO');
 await guide.getByRole('combobox',{name:'Objetivo de la pieza',exact:true}).selectOption('TRUST');
 await guide.getByRole('combobox',{name:'Gancho de entrada',exact:true}).selectOption('CUSTOM');
 await guide.getByRole('textbox',{name:/^Tu propio gancho/}).fill('¿Cómo elegir tu servicio sin gastar de más?');
 await guide.getByRole('textbox',{name:'Tema o idea concreta',exact:true}).fill('Elegir el servicio adecuado para una pequeña empresa');
 await guide.getByRole('combobox',{name:'Variantes para comparar',exact:true}).selectOption('HOOKS');
 await guide.getByRole('combobox',{name:'Cantidad de variantes',exact:true}).selectOption('3');
 const prompt=await dialog.locator('textarea[readonly]').inputValue();
 for(const text of ['Tutorial','Video corto','Generar confianza','¿Cómo elegir tu servicio sin gastar de más?','"variation": "HOOKS"'])assert.ok(prompt.includes(text),text);
 await dialog.getByRole('button',{name:'Copiar prompt',exact:true}).click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),prompt);
 const downloadPromise=page.waitForEvent('download');await dialog.getByRole('button',{name:/Descargar/}).click();const download=await downloadPromise;const path=await download.path();assert.equal(await readFile(path,'utf8'),prompt);
 await dialog.getByRole('button',{name:'Guardar plan',exact:true}).click();
 await page.getByRole('button',{name:'Preparar para IA',exact:true}).click();
 assert.equal(await guide.getByRole('combobox',{name:'Tipo de contenido',exact:true}).inputValue(),'TUTORIAL');
 assert.equal(await guide.getByRole('textbox',{name:/^Tu propio gancho/}).inputValue(),'¿Cómo elegir tu servicio sin gastar de más?');
 assert.equal(await dialog.locator('textarea[readonly]').inputValue(),prompt);
 evidence.push('Manual combination, live prompt, clipboard/download equality and save/reopen passed.');
 await guide.scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/desktop-guide.png'});
 // A mobile viewport keeps the same workspace, with controls contained and the shared footer reachable.
 for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:390,height:400}]){
  await page.setViewportSize(size);await page.waitForTimeout(250);await guide.getByRole('textbox',{name:'Tema o idea concreta',exact:true}).scrollIntoViewIfNeeded();
  const bounds=await guide.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width,scroll:el.scrollWidth};});
  assert.ok(bounds.x>=0&&bounds.right<=size.width+1,JSON.stringify({size,bounds}));assert.ok(bounds.scroll<=bounds.width+1,JSON.stringify({size,bounds}));
  await guide.getByRole('combobox',{name:'Gancho de entrada',exact:true}).selectOption('TEACH');
  assert.ok(!(await dialog.locator('textarea[readonly]').inputValue()).includes('¿Cómo elegir tu servicio sin gastar de más?'));
  await guide.getByRole('combobox',{name:'Gancho de entrada',exact:true}).selectOption('CUSTOM');
  assert.equal(await guide.getByRole('textbox',{name:/^Tu propio gancho/}).inputValue(),'¿Cómo elegir tu servicio sin gastar de más?');
  const save=dialog.getByRole('button',{name:'Guardar plan',exact:true});const b=await save.boundingBox();if(!(b&&b.y+b.height<=size.height)){console.log(await dialog.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),class:el.className,style:el.getAttribute('style'),compact:el.getAttribute('data-dialog-compact-viewport'),body:el.querySelector('[data-slot=indice-modal-body]').getBoundingClientRect().toJSON(),bodyFlex:getComputedStyle(el.querySelector('[data-slot=indice-modal-body]')).flex})));await page.screenshot({path:dir+'/mobile-problem.png'});}assert.ok(b&&b.height>=44&&b.x>=0&&b.x+b.width<=size.width&&b.y>=0&&b.y+b.height<=size.height,JSON.stringify({size,b}));
  evidence.push(`Mobile ${size.width}x${size.height}: fields contained, 44px footer visible, hook switching retains draft.`);
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.evaluate(()=>document.documentElement.classList.add('dark'));await guide.getByRole('combobox',{name:'Tipo de contenido',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/mobile-guide-dark.png'});
 assert.deepEqual(errors,[]);evidence.push('No uncaught browser errors.');console.log(evidence.join('\n'));
}finally{await browser?.close();await server.close();}
