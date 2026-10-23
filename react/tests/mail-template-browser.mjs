import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5213';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/tmp/indice-mail-template-vite',server:{host:'127.0.0.1',port:5213,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{try{localStorage.setItem('frontend-indice-language','es-MX');}catch{}});
const templates=new Map(),assets=new Map(),drafts=new Map(),draftFiles=new Map();const saves=[],campaigns=[],errors=[],unexpected=[];let loseSave=true;
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method(),reply=json=>route.fulfill({json});
 if(url.origin!==origin)return route.abort();
 if(path.startsWith('/synthetic-upload/'))return route.fulfill({status:200,body:''});
 if(!path.startsWith('/api/'))return route.continue();
 assert.ok(!/\/(send|launch|test)$/.test(path),'must not send real email');
 if(path==='/api/v1/auth/csrf')return reply({csrfToken:'synthetic-csrf'});
 if(method!=='GET')assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');
 if(path==='/api/v1/mailing/templates')return reply({items:[...templates.values()],total:templates.size,page:1,pageSize:25,canManage:true});
 if(path==='/api/v1/mailing/template-files/upload'){
  const input=request.postDataJSON();assets.set(input.requestId,{id:input.requestId,...input});return reply({id:input.requestId,url:origin+'/synthetic-upload/'+input.requestId,headers:{'Content-Type':input.contentType,'Content-Length':String(input.sizeBytes)}});
 }
 if(/^\/api\/v1\/mailing\/template-files\/[^/]+\/register$/.test(path))return reply(assets.get(path.split('/').at(-2)));
 if(/^\/api\/v1\/mailing\/templates\/[^/]+$/.test(path)){
  const id=path.split('/').at(-1);if(method==='GET')return reply(templates.get(id));
  const input=request.postDataJSON();saves.push(input);let value=templates.get(id);
  if(value?.requestId!==input.requestId){assert.equal(input.version,value?.version??0);value={...input,id,version:input.version+1,status:'ACTIVE',updatedAt:new Date().toISOString(),attachments:input.attachmentIds.map(id=>assets.get(id))};templates.set(id,value);}
  if(loseSave){loseSave=false;return route.abort('failed');}return reply(value);
 }
 if(path==='/api/v1/mailing/senders')return reply([]);
 if(path==='/api/v1/mailing/audience/options')return reply({sources:[],owners:[],tags:[]});
 if(path==='/api/v1/mailing/audience/lists')return reply([]);
 if(path==='/api/v1/mailing/audience')return reply({items:[],total:0,page:1,pageSize:10});
 if(/^\/api\/v1\/mailing\/campaigns\/[^/]+$/.test(path)&&method==='PUT'){const input=request.postDataJSON();campaigns.push(input);return reply({...input,id:path.split('/').at(-1),status:'DRAFT',version:input.version+1,recipients:[],attachments:input.attachmentIds.map(id=>assets.get(id))});}
 if(path.endsWith('/preferences'))return reply({backgroundEnabled:false,sentFolder:null,version:1,signature:''});
 if(path.includes('/drafts/')&&method==='PUT'){const id=path.split('/').at(-1),input=request.postDataJSON();assert.equal(input.version,drafts.get(id)?.version??0);const value={...input,id,state:'DRAFT',version:input.version+1,hasAttachments:(draftFiles.get(id)??[]).length>0};drafts.set(id,value);return reply(value);}
 if(/\/messages\/[^/]+\/template-files$/.test(path)){const input=request.postDataJSON(),id=path.split('/').at(-2),draft=drafts.get(id),template=templates.get(input.templateId);assert.equal(input.version,draft.version);assert.equal(input.templateVersion,template.version);const files=template.attachments.map(f=>({...f,remote:false}));draftFiles.set(id,files);const value={...draft,version:draft.version+1,hasAttachments:true};drafts.set(id,value);return reply(value);}
 if(/\/messages\/[^/]+\/attachments$/.test(path))return reply(draftFiles.get(path.split('/').at(-2))??[]);
 if(/\/messages\/[^/]+$/.test(path))return reply(drafts.get(path.split('/').at(-1)));
 unexpected.push(method+' '+path);return route.fulfill({status:500,json:{}});
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
const button=name=>page.getByRole('button',{name,exact:true});
try{
 await mkdir('/tmp/indice-mail-template-review',{recursive:true});
 await page.goto(origin+'/tests/browser/mail-template.html');
 await button('Nueva plantilla').click();
 await page.getByLabel('Nombre de plantilla',{exact:true}).fill('Presentación con brochure');
 await page.getByLabel('Asunto',{exact:true}).fill('Nuestra presentación');
 const body=page.getByRole('textbox',{name:'Mensaje',exact:true});await body.fill('Conoce nuestros servicios');
 await page.locator('input[type="file"][accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx"]').setInputFiles({name:'brochure.txt',mimeType:'text/plain',buffer:Buffer.from('Información de prueba')});
 await page.getByText('brochure.txt',{exact:false}).first().waitFor();
 await button('Guardar plantilla').click();
 await page.getByRole('alert').filter({hasText:'No se pudo confirmar el guardado'}).waitFor();
 assert.equal(await body.innerText(),'Conoce nuestros servicios');
 await button('Guardar plantilla').click();
 await page.getByText('Plantilla guardada',{exact:false}).waitFor();
 assert.equal(templates.size,1);assert.equal(saves[0].requestId,saves[1].requestId);assert.equal(saves[1].attachmentIds.length,1);
 await page.reload();await page.getByRole('row').filter({hasText:'Presentación con brochure'}).getByRole('button').click();await button('Editar').click();
 assert.equal(await body.innerText(),'Conoce nuestros servicios');await page.getByText('brochure.txt',{exact:false}).first().waitFor();
 await body.fill('Presentación actualizada');await button('Guardar plantilla').click();await page.getByText('Plantilla guardada',{exact:false}).waitFor();assert.equal([...templates.values()][0].version,2);
 await page.screenshot({path:'/tmp/indice-mail-template-review/templates-desktop.png'});
 await page.goto(origin+'/tests/browser/mail-template.html?mode=email');
 await button('Plantillas de Ventas').click();await button(/Presentación con brochure/).click();await button('Insertar').click();
 await page.getByRole('textbox',{name:'Mensaje',exact:true}).filter({hasText:'Presentación actualizada'}).waitFor();
 await page.getByText('brochure.txt',{exact:false}).first().waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>{const box=document.querySelector('[role=dialog]')?.getBoundingClientRect();return box&&box.x>=-1&&box.y>=-1&&box.right<=innerWidth+1&&box.bottom<=innerHeight+1;});
 await page.screenshot({path:'/tmp/indice-mail-template-review/email-mobile.png',animations:'disabled'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(origin+'/tests/browser/mail-template.html?mode=campaign');
 await page.locator('input[name="name"]').fill('Campaña con brochure');await button('Continuar').click();await button('Continuar').click();
 await page.getByRole('combobox').filter({has:page.locator('option[value="welcome"]')}).selectOption([...templates.keys()][0]);
 await button('Aplicar plantilla').click();await page.getByText('brochure.txt',{exact:false}).last().waitFor();
 await button('Guardar borrador').click();await page.getByText('done',{exact:true}).waitFor();
 assert.equal(campaigns.at(-1).attachmentIds.length,1);assert.equal(campaigns.at(-1).bodyText,'Presentación actualizada');
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 console.log('PASS: template creation, file reuse, lost-save retry, reload/edit, Email import, Mailing snapshot and mobile layout; no email sent.');
}finally{await browser.close();await server.close();}
