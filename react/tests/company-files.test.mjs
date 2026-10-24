import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const base='src/app/SystemTools/Files/';
const model=loadTypescript(resolve(base+'filesModel.ts'),id=>{throw Error(id)});
const {filesCopy}=loadTypescript(resolve(base+'filesCopy.ts'),id=>{throw Error(id)});
const entry={id:'file',parentId:null,kind:'FILE',name:'Notes.txt',contentType:'text/plain',sizeBytes:10,ownerName:'Example',owned:true,permission:3,trashed:false,version:5,updatedAt:new Date().toISOString()};
test('upload batches enforce size, count and safe names before upload',()=>{
 const file={name:'Notes.txt',size:10};assert.equal(model.validFileBatch([file]),true);
 for(const files of [[],Array(21).fill(file),[{...file,size:0}],[{...file,size:104857601}],[{...file,name:'../file'}],[{...file,name:'a\u0000b'}],[{...file,name:'x'.repeat(181)}]])assert.equal(model.validFileBatch(files),false);
 assert.equal(model.validFileBatch([{...file,size:104857600}]),true);
});
test('opaque files use download-only previews and known media use their own player',()=>{
 assert.equal(model.fileCategory({...entry,contentType:'application/octet-stream'}),'DOCUMENT');assert.equal(model.fileCategory({...entry,kind:'FOLDER'}),'FOLDER');
 for(const [type,kind] of [['video/mp4','VIDEO'],['audio/mpeg','AUDIO'],['image/png','IMAGE'],['text/plain','TEXT']])assert.equal(model.fileCategory({...entry,contentType:type}),kind);
});
test('all supported locales have complete user-facing copy',()=>{
 const keys=Object.keys(filesCopy('en-CA')).sort();for(const locale of ['es-MX','en-CA','en-US','fr-CA','fr-FR','pt-BR','ko-KR','zh-CN']){const c=filesCopy(locale);assert.deepEqual(Object.keys(c).sort(),keys);for(const value of Object.values(c))assert.ok(value.trim());}assert.equal(filesCopy('es-MX').title,'Archivos');
});
function apiHarness(reply){const calls=[];const {filesApi}=loadTypescript(resolve(base+'filesApi.ts'),()=>({apiClient:async(url,options={})=>{calls.push({url,...options});return reply(url,options)},buildApiUrl:p=>p,ApiClientError:class extends Error{}}));return{filesApi,calls};}
test('retrying a completed upload returns saved metadata without another object write',async()=>{
 const {filesApi,calls}=apiHarness(()=>({ready:entry}));const original=global.fetch;global.fetch=()=>{throw Error('unexpected PUT')};try{assert.equal(await filesApi.upload({name:'Notes.txt',size:10},'file',null,'actor',new AbortController().signal),entry);assert.equal(calls.length,1);assert.equal(calls[0].headers['X-Files-Actor'],'actor');}finally{global.fetch=original;}
});
test('failed object upload never registers and does not send session cookies to storage',async()=>{
 const {filesApi,calls}=apiHarness(()=>({url:'http://storage.example.test/upload',headers:{'Content-Length':'10','Content-Type':'text/plain'}}));const original=global.fetch;let request;global.fetch=async(url,options)=>{request={url,...options};return{ok:false}};try{await assert.rejects(filesApi.upload({name:'Notes.txt',size:10},'file',null,'actor',new AbortController().signal));assert.equal(request.credentials,'omit');assert.equal(request.headers['Content-Length'],undefined);assert.equal(calls.length,1);}finally{global.fetch=original;}
});
test('rename and sharing retain server versions, actor binding and mutation IDs',async()=>{
 const {filesApi,calls}=apiHarness(()=>entry);await filesApi.change(entry,'RENAME',{name:'New'},'retry-id','company-user');await filesApi.share(entry,[{userId:2,permission:1}],'share-id','company-user');assert.deepEqual(JSON.parse(calls[0].body),{version:5,mutationId:'retry-id',action:'RENAME',name:'New'});assert.equal(JSON.parse(calls[1].body).version,5);assert.equal(calls[1].headers['X-Files-Actor'],'company-user');
});
const el=(type,props)=>({type,props});const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children),...nodes(v.props?.footer)];
class ApiError extends Error{constructor(status){super('Synthetic');this.status=status;}}
function editHarness(action,api){const runtime=hookRuntime();const {FileEditDialog}=loadTypescript(resolve(base+'FileDialogs.tsx'),id=>{if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:el,jsxs:el};if(id.endsWith('/apiClient'))return{ApiClientError:ApiError};if(id==='./filesApi')return{filesApi:api};if(id==='./filesModel')return model;return new Proxy({},{get:(_,key)=>key});});let closed=0,saved=0;runtime.render(()=>FileEditDialog({action,entry:action==='folder'?undefined:entry,parentId:null,actor:'actor',c:filesCopy('es-MX'),onClose:()=>closed++,onSaved:()=>saved++}));return{runtime,get closed(){return closed},get saved(){return saved},find:type=>nodes(runtime.result).find(n=>n.type===type),button:text=>nodes(runtime.result).find(n=>n.type==='Button'&&n.props.children===text)};}
test('dirty folder close asks to discard and keeps edits when cancelled',async()=>{
 const oldWindow=global.window;global.window={addEventListener(){},removeEventListener(){}};try{const h=editHarness('folder',{});h.find('Input').props.onChange({target:{value:'Draft folder'}});await h.runtime.flush();h.button('Cancelar').props.onClick();await h.runtime.flush();assert.equal(h.runtime.result.type,'IndiceConfirmationDialog');h.runtime.result.props.onCancel();await h.runtime.flush();assert.equal(h.find('Input').props.value,'Draft folder');assert.equal(h.closed,0);h.runtime.unmount();}finally{global.window=oldWindow;}
});
test('stale edits stay open and cannot overwrite the newer server version',async()=>{
 const oldWindow=global.window;global.window={addEventListener(){},removeEventListener(){}};let calls=0;try{const h=editHarness('rename',{change:async()=>{calls++;throw new ApiError(409)}});h.find('Input').props.onChange({target:{value:'My edit'}});await h.runtime.flush();h.button('Guardar').props.onClick();await h.runtime.flush();assert.equal(h.saved,0);assert.equal(h.find('Input').props.value,'My edit');assert.equal(h.button('Guardar').props.disabled,true);h.button('Guardar').props.onClick();await h.runtime.flush();assert.equal(calls,1);h.runtime.unmount();}finally{global.window=oldWindow;}
});
test('Files is available to active internal accounts without granting other module tools',()=>{
 const {getSystemToolVisibility}=loadTypescript(resolve('src/app/Dashboard/systemToolAccess.ts'),id=>id.endsWith('/accessRules')?{isAdminAccessRole:()=>false,normalizeAccessRole:()=>''}:id.endsWith('/tabScopeCatalog')?{canAccessKioskCenter:()=>false,canAccessModuleTab:()=>false}:{canDiscoverTraining:()=>false});
 const session={user:{role:'user'},company:{subscription:{access_allowed:true}},demoMode:false};assert.equal(getSystemToolVisibility(session).files,true);assert.equal(getSystemToolVisibility(session).subscription,false);assert.equal(getSystemToolVisibility(null).files,false);assert.equal(getSystemToolVisibility({...session,demoMode:true}).files,false);assert.equal(getSystemToolVisibility({...session,company:{subscription:{access_allowed:false}}}).files,false);
});
test('canonical module navigation stays locked while a file is uploading',async()=>{
 const oldWindow=global.window;global.window={addEventListener(){},removeEventListener(){}};
 const runtime=hookRuntime();let finish,exits=0,params=new URLSearchParams();const uploaded=new Promise(resolve=>finish=resolve);
 const {default:Workspace}=loadTypescript(resolve(base+'FilesWorkspace.tsx'),id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:el,jsxs:el};
  if(id==='react-router')return{useSearchParams:()=>[params,update=>{params=update(params)}]};
  if(id.endsWith('/LanguageContext'))return{useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id.endsWith('/useAuthorizationRevision'))return{useAuthorizationRevision:()=>1};
  if(id==='./filesApi')return{filesApi:{list:async()=>({items:[],total:0,page:1,pageSize:25,breadcrumbs:[],folderPermission:3,actorKey:'actor'}),upload:()=>uploaded}};
  if(id==='./filesCopy')return{filesCopy};if(id==='./filesModel')return model;
  if(id.endsWith('/apiClient'))return{ApiClientError:ApiError};return new Proxy({},{get:(_,key)=>key});
 });
 try{
  const browser=Workspace({}).type;runtime.render(()=>browser({onNavigate:()=>exits++}));await runtime.flush();
  const input=nodes(runtime.result).find(n=>n.type==='input'&&n.props.type==='file');input.props.onChange({target:{files:[{name:'Notes.txt',size:10}],value:'notes'}});await runtime.flush();
  assert.equal(runtime.result.type,'IndiceModuleShell');assert.ok(runtime.result.props.tabs.every(tab=>tab.disabled));runtime.result.props.onNavigate('dashboard');runtime.result.props.onTabChange('TRASH');assert.equal(exits,0);assert.equal(params.get('view'),null);
  finish(entry);await runtime.flush();assert.ok(runtime.result.props.tabs.every(tab=>!tab.disabled));runtime.result.props.onNavigate('dashboard');assert.equal(exits,1);
 }finally{runtime.unmount();global.window=oldWindow;}
});
