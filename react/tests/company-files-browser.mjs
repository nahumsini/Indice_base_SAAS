import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const root=resolve(import.meta.dirname,'..'),evidence='/tmp/indice-files-navigation-review';
const require=createRequire(root+'/package.json');
const {createServer}=await import(require.resolve('vite'));
const {default:react}=await import(require.resolve('@vitejs/plugin-react'));
const {default:tailwind}=await import(root+'/node_modules/@tailwindcss/vite/dist/index.mjs');
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const entry=`import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router';import {LanguageProvider} from '/src/app/context/LanguageContext';import {WorkbarLayoutProvider} from '/src/app/components/workbar/WorkbarLayoutContext';import {setCachedAuthSession,setCachedCsrfToken} from '/src/app/api/authSessionStore';import FilesWorkspace from '/src/app/SystemTools/Files/FilesWorkspace';import '/src/styles/index.css';
setCachedAuthSession({user:{id:9001,role:'admin',name:'Synthetic'},company:{id:9001,name:'Synthetic',active:true,role:'admin',commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});setCachedCsrfToken('synthetic-csrf');createRoot(document.getElementById('root')).render(<LanguageProvider><BrowserRouter><WorkbarLayoutProvider><div style={{height:'100dvh'}}><FilesWorkspace/></div></WorkbarLayoutProvider></BrowserRouter></LanguageProvider>);`;
const fixture={name:'private-files-fixture',resolveId(id){if(id==='/__files-review.tsx')return id;},load(id){if(id==='/__files-review.tsx')return entry;},configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]!=='/files-review.html')return next();res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/files-review.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/__files-review.tsx"></script></body></html>'));});}};
const origin='http://127.0.0.1:5227';
const server=await createServer({root,configFile:false,cacheDir:'/tmp/indice-files-review-vite',plugins:[fixture,react(),tailwind()],resolve:{alias:{'@':root+'/src'}},define:{'import.meta.env.VITE_API_BASE_URL':'""'},server:{host:'127.0.0.1',port:5227,strictPort:true,hmr:false,watch:null}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const make=(n,name,kind='FOLDER',parentId=null,extra={})=>({id:id(n),name,kind,parentId,contentType:kind==='FILE'?'image/png':'application/octet-stream',sizeBytes:kind==='FILE'?1500:0,ownerName:'Usuario de prueba',owned:true,permission:3,trashed:false,version:1,updatedAt:'2026-10-24T12:00:00Z',...extra});
const entries=[make(1,'Campañas'),make(2,'Clientes'),make(3,'Octubre','FOLDER',id(1)),make(4,'Portada.png','FILE'),make(5,'No disponible.png','FILE'),make(6,'Imagen grande.png','FILE',null,{sizeBytes:11*1024*1024}),make(7,'Documento.svg','FILE',null,{contentType:'image/svg+xml'}),make(8,'Compartida.png','FILE',null,{owned:false,permission:1})];
const chain=folder=>{const result=[];let row=entries.find(e=>e.id===folder);while(row){result.unshift({id:row.id,name:row.name});row=entries.find(e=>e.id===row.parentId);}return result;};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAAAz0lEQVR4nO3QUQ3CUABFsZnBFL/MPSJAxtl9aVIFvV6f79l+9/sJrjxC9CHyYtGiRS/Ki0WLFr0oLxYtWvSivFi0aNGL8mLRokUvyotFixa9KC8WLVr0orxYtGjRi/Ji0aJFL8qLRYsWvSgvFi1a9KK8WLRo0YvyYtGiRS/Ki0WLFr0oLxYtWvSivFi0aNGL8mLRokUvyotFixa9KC8WLVr0orxYtGjRi/Ji0aJFL8qLRYsWvSgvFi1a9KK8WLRo0YvyYtGiRS/Ki0WLPjH6D8QIbIdB9IkzAAAAAElFTkSuQmCC','base64');
const calls=[],contentRequests=[],unexpected=[],errors=[];let failMove=true;
await context.route('**/*',async route=>{
 const request=route.request(),u=new URL(request.url());if(u.origin!==origin){unexpected.push('external');return route.abort();}if(!u.pathname.startsWith('/api/'))return route.continue();
 if(u.pathname==='/api/v1/workspace-state/system/workbar-layout')return route.fulfill({json:{version:0,state:{}}});
 if(u.pathname==='/api/v1/company')return route.fulfill({json:{nombre_empresa:'Empresa de prueba',map:[]}});
 if(u.pathname==='/api/v1/files'&&request.method()==='GET'){
  const scope=u.searchParams.get('scope'),folder=u.searchParams.get('folder')||null,q=u.searchParams.get('q')||'',type=u.searchParams.get('type');
  let rows=entries.filter(e=>!e.trashed&&(scope==='SHARED'?!e.owned:scope==='OWNED'?e.owned:false));rows=rows.filter(e=>q?e.name.toLowerCase().includes(q.toLowerCase()):e.parentId===folder);if(type&&type!=='ALL')rows=rows.filter(e=>type==='FOLDER'?e.kind==='FOLDER':type==='IMAGE'?e.contentType.startsWith('image/'):true);
  return route.fulfill({json:{items:rows,total:rows.length,page:1,pageSize:25,breadcrumbs:chain(folder),folderPermission:3,actorKey:'synthetic-actor'}});
 }
 if(u.pathname==='/api/v1/files/destinations')return route.fulfill({json:entries.filter(e=>e.kind==='FOLDER'&&!chain(e.id).some(c=>c.id===u.searchParams.get('exclude'))).map(e=>({id:e.id,name:chain(e.id).map(c=>c.name).join(' / ')}))});
 if(u.pathname.endsWith('/content')){
  const entryId=u.pathname.split('/').at(-2);contentRequests.push(entryId);assert.equal(request.method(),'GET');assert.equal(u.searchParams.get('preview'),'true');
  return entryId===id(5)?route.fulfill({status:403,json:{code:'files_access_denied'}}):route.fulfill({contentType:'image/png',headers:{'Cache-Control':'no-store'},body:png});
 }
 if(u.pathname.startsWith('/api/v1/files/')&&request.method()==='PATCH'){
  const body=request.postDataJSON();calls.push(body);assert.equal(body.action,'MOVE');assert.equal(request.headers()['x-files-actor'],'synthetic-actor');assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');
  if(failMove){failMove=false;return route.fulfill({status:503,json:{code:'files_unavailable'}});}
  const row=entries.find(e=>e.id===u.pathname.split('/').at(-1));assert.equal(body.version,row.version);row.parentId=body.parentId;row.version++;return route.fulfill({json:row});
 }
 unexpected.push(u.pathname);return route.fulfill({status:500,json:{}});
});
const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
const card=name=>page.locator('.files-grid article').filter({has:page.getByRole('button',{name,exact:true})});
const openFolder=async name=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.files-empty[role=status]'));};
try{
 await mkdir(evidence,{recursive:true});await page.goto(origin+'/files-review.html');
 console.log('Checking thumbnails');await card('Portada.png').waitFor();const image=card('Portada.png').locator('img');await image.scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.files-artwork img')].some(i=>i.complete&&i.naturalWidth===120));assert.equal(await image.evaluate(i=>getComputedStyle(i).objectFit),'contain');
 await card('No disponible.png').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector(`img[src*="000000000005"]`));
 assert.equal(await card('Imagen grande.png').locator('img').count(),0);assert.equal(await card('Documento.svg').locator('img').count(),0);
 console.log('Checking folder navigation');await openFolder('Campañas');await openFolder('Octubre');assert.equal(new URL(page.url()).searchParams.get('folder'),id(3));assert.equal(await page.locator('.files-breadcrumbs [aria-current=page]').innerText(),'Octubre');
 await page.getByRole('button',{name:'Subir un nivel',exact:true}).click();await page.getByRole('button',{name:'Octubre',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('folder'),id(1));
 await page.getByRole('button',{name:'Inicio',exact:true}).click();await card('Portada.png').waitFor();assert.equal(new URL(page.url()).searchParams.has('folder'),false);await page.goBack();await page.getByRole('button',{name:'Octubre',exact:true}).waitFor();await page.getByRole('button',{name:'Inicio',exact:true}).click();await card('Portada.png').waitFor();
 console.log('Checking move retry');await card('Portada.png').getByRole('button',{name:'Mover: Portada.png',exact:true}).click();const dialog=page.getByRole('dialog');const save=dialog.getByRole('button',{name:'Mover aquí',exact:true});assert.equal(await save.isDisabled(),true);
 await dialog.getByLabel('Carpeta de destino',{exact:true}).selectOption(id(3));await dialog.getByLabel('Buscar carpeta de destino',{exact:true}).fill('no-match');assert.equal(await dialog.getByLabel('Carpeta de destino',{exact:true}).inputValue(),id(3));await save.click();await dialog.getByRole('alert').waitFor();await save.click();await dialog.waitFor({state:'hidden'});assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].parentId,id(3));assert.equal(await card('Portada.png').count(),0);
 await openFolder('Campañas');await openFolder('Octubre');await card('Portada.png').waitFor();await card('Portada.png').getByRole('button',{name:'Mover: Portada.png',exact:true}).click();await dialog.getByLabel('Carpeta de destino',{exact:true}).selectOption('');await save.click();await dialog.waitFor({state:'hidden'});assert.equal(calls.at(-1).parentId,null);
 await page.getByRole('button',{name:'Inicio',exact:true}).click();await card('Portada.png').waitFor();await page.getByRole('tab',{name:'Lista',exact:true}).click();await page.locator('.files-entry-row img').first().waitFor();assert.equal(await page.locator('.files-artwork-compact').first().evaluate(n=>n.getBoundingClientRect().width),48);assert.ok(await page.getByRole('button',{name:'Mover: Portada.png',exact:true}).isVisible());
 await page.getByRole('tab',{name:'Cuadrícula',exact:true}).click();await card('Portada.png').getByRole('button',{name:'Abrir: Portada.png',exact:true}).click();await dialog.locator('.files-preview img').waitFor();await dialog.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:width===1440?1000:844});await page.screenshot({path:evidence+'/files-'+width+'.png',animations:'disabled'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:evidence+'/files-dark.png',animations:'disabled'});
 await page.goto(origin+'/files-review.html?view=SHARED');await card('Compartida.png').waitFor();assert.equal(await page.getByRole('button',{name:'Mover: Compartida.png',exact:true}).count(),0);
 assert.ok(!contentRequests.includes(id(6))&&!contentRequests.includes(id(7)));assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 await writeFile(evidence+'/files-flow-proof.json',JSON.stringify({result:'PASS',privateThumbnails:true,failedImageFallback:true,largeAndOpaqueNoAutomaticRead:true,folderUpHomeHistory:true,moveNestedAndRoot:true,stableFailedSaveRetry:true,actorAndCsrfPreserved:true,readonlyHasNoMove:true,viewportWidths:[1440,390,320],dark:true,realBusinessMutations:0},null,2));
 console.log('PASS native Files: private thumbnails/fallback, grid/list, Up/Home/history, nested/root moves with safe retry, permissions, mobile/dark; synthetic API only.');
}catch(error){await page.screenshot({path:evidence+'/failure.png',fullPage:true});console.error({errors,unexpected,calls});throw error;}finally{await context.close();await browser.close();await server.close();}
