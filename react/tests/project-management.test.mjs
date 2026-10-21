import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),root=new URL('../src/app/ComplementaryModules/IdeasBoard/',import.meta.url);
const copy=loadTypescript(new URL('projectManagementCopy.ts',root).pathname,()=>{throw Error('Unexpected import');}),c=copy.projectManagementCopy('es-MX');
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function managementApi(){let session={user:{id:7},company:{id:9}},calls=[];const module=loadTypescript(new URL('projectManagementApi.ts',root).pathname,id=>{
 if(id.includes('apiClient'))return{apiClient:async(url,init)=>{calls.push({url,init});return{};},buildApiUrl:url=>url};
 if(id.includes('authSessionStore'))return{getCachedAuthSession:()=>session};throw Error(id);
 });return{...module,calls,switch:next=>{session=next;}};}
test('links identify the source owner without granting access and names reject control characters',()=>{
 const api=managementApi(),url=new URL(api.projectLink({id:'original',ownerId:42},'https://indice.example/ignored?x=1'));
 assert.equal(url.pathname,'/ideas-board/projects');assert.equal(url.searchParams.get('project'),'original');assert.equal(url.searchParams.get('owner'),'42');assert.equal(url.searchParams.has('x'),false);
 for(const name of ['','  ','bad\nname','x'.repeat(121)])assert.equal(api.validProjectName(name),false);
 assert.equal(api.validProjectName('  Café · equipo  '),true);
});
test('requests preserve captured actor, source owner, mutation identity and private media routes',async()=>{
 const api=managementApi(),actor=api.captureProjectActor();api.switch({user:{id:8},company:{id:10}});
 await api.projectManagementApi.copy({id:'source',ownerId:42},'stable-request','Copia',actor);
 assert.equal(api.calls[0].url,'/api/v1/ideas-board/projects/source/copies/stable-request?ownerId=42');assert.equal(api.calls[0].init.headers['X-Idea-Board-Actor'],'ideas_board:9:7');
 await api.projectManagementApi.change('source',{version:3,mutationId:'same',trashed:true},actor);
 assert.deepEqual(JSON.parse(api.calls[1].init.body),{version:3,mutationId:'same',trashed:true});
 assert.equal(api.projectManagementApi.assetUrl({id:'source',ownerId:42},'photo'),'/api/v1/ideas-board/projects/source/assets/photo?ownerId=42');
});
function dialog(apiOverrides={}){
 const runtime=hookRuntime(),calls=[],api={copy:async(...args)=>{calls.push(args);return{summary:{id:'copy'}};},change:async(...args)=>{calls.push(args);return{summary:{id:'source'}};},members:async()=>[{id:8,name:'Ana',available:true}],sharing:async()=>({version:4,members:[{id:9,name:'Luis',available:false}]}),share:async(...args)=>{calls.push(args);return{};},...apiOverrides};
 const module=loadTypescript(new URL('ProjectActions.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return Object.fromEntries(['Copy','Link','MoreHorizontal','Pencil','RotateCcw','Share2','Trash2','FolderOpen','Search'].map(name=>[name,()=>null]));
  if(id.includes('/dropdown-menu'))return{};if(id.includes('/indice-modal'))return{IndiceModalFrame:'modal'};if(id.endsWith('/button'))return{Button:'button'};if(id.includes('ModuleTabEmoji'))return{IndiceEmoji:()=>null};
  if(id==='./projectManagementCopy')return copy;if(id==='./projectManagementApi')return{projectManagementApi:api,validProjectName:name=>!!name.trim()&&name.length<=120&&!/[\x00-\x1f]/.test(name)};throw Error(id);
 });return{module,runtime,calls,all:()=>elements(runtime.result)};
}
const item={id:'source',name:'Trabajo',kind:'SYSTEM',version:4,owned:true,ownerId:7};
test('copy retries reuse the same request after a lost response and do not change the source',async()=>{
 const requests=[];let attempt=0,saved=0;const d=dialog({copy:async(...args)=>{requests.push(args);if(++attempt===1)throw Error('Lost response');return{summary:{id:'copy'}};}});
 d.runtime.render(()=>d.module.ProjectMutationDialog({action:'copy',item,locale:'es-MX',actor:'ideas_board:9:7',onClose(){},onSaved(){saved++;}}));
 const submit=()=>d.all().find(e=>e.type==='form').props.onSubmit({preventDefault(){}});submit();await d.runtime.flush();
 assert.equal(saved,0);assert.ok(d.all().some(e=>e.props?.role==='alert'));assert.equal(d.all().find(e=>e.type==='input').props.disabled,true);
 submit();await d.runtime.flush();assert.equal(saved,1);assert.equal(requests.length,2);assert.equal(requests[0][1],requests[1][1]);assert.equal(requests[0][2],requests[1][2]);assert.equal(requests[0][3],'ideas_board:9:7');assert.equal(item.name,'Trabajo');
});
test('empty names do not reach the server and trash sends a recoverable state change',async()=>{
 const d=dialog();d.runtime.render(()=>d.module.ProjectMutationDialog({action:'rename',item,locale:'es-MX',actor:'captured',onClose(){},onSaved(){}}));
 d.all().find(e=>e.type==='input').props.onChange({target:{value:'  '}});await d.runtime.flush();d.all().find(e=>e.type==='form').props.onSubmit({preventDefault(){}});await d.runtime.flush();assert.equal(d.calls.length,0);assert.ok(d.all().some(e=>e.props?.role==='alert'));
 const t=dialog();t.runtime.render(()=>t.module.ProjectMutationDialog({action:'trash',item,locale:'es-MX',actor:'captured',onClose(){},onSaved(){}}));t.all().find(e=>e.type==='form').props.onSubmit({preventDefault(){}});await t.runtime.flush();assert.equal(t.calls[0][1].trashed,true);assert.equal(t.calls[0][1].version,4);assert.ok(t.calls[0][1].mutationId);
});
test('sharing lets owners remove unavailable people and sends only the chosen recipients',async()=>{
 let saved=0;const d=dialog();d.runtime.render(()=>d.module.ProjectSharingDialog({item,locale:'es-MX',actor:'captured',onClose(){},onSaved(){saved++;}}));
 await new Promise(r=>setTimeout(r,5));await d.runtime.flush();
 const checks=d.all().filter(e=>e.type==='input'&&e.props.type==='checkbox');assert.equal(checks.length,2);assert.equal(checks[0].props.checked,true);assert.equal(checks[0].props.disabled,false);
 checks[0].props.onChange();checks[1].props.onChange();await d.runtime.flush();const modal=d.runtime.result,save=elements(modal.props.footer).find(e=>e.type==='button'&&e.props.children===c.saveAccess);save.props.onClick();await d.runtime.flush();
 assert.equal(saved,1);assert.deepEqual(d.calls[0][3],[8]);assert.equal(d.calls[0][1],4);assert.equal(d.calls[0][4],'captured');
});
test('every supported language has all management labels and errors explain conflicts and revoked access',()=>{
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const localized=copy.projectManagementCopy(locale);assert.deepEqual(Object.keys(localized),Object.keys(c));for(const value of Object.values(localized))assert.ok(value.length);}
 const d=dialog();assert.equal(d.module.projectActionError({status:409},'es'),c.conflict);assert.equal(d.module.projectActionError({status:404},'es'),c.missing);
});
test('using a saved project waits for the canvas and protects existing work before replacing it',async()=>{
 const runtime=hookRuntime(),old={nodes:[{id:'old',text:'Current work'}],connections:[],viewport:{}},next={nodes:[{id:'new'}],connections:[],viewport:{}},events=[];let replacements=0,opened=0;
 const module=loadTypescript(new URL('BoardFileControls.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return{MoreHorizontal:()=>null,FolderOpen:()=>null,Search:()=>null};
  if(id.includes('/dropdown-menu'))return{};if(id.includes('BoardToolEmoji'))return{BoardToolEmoji:()=>null};if(id.includes('/indice-modal'))return{};if(id.endsWith('/button'))return{};
  if(id.includes('ideasBoardModel'))return{emptyBoard:()=>({nodes:[],connections:[]})};if(id==='./IdeaProjects')return{SaveProjectDialog:'save-dialog'};if(id==='./ideaWorkspaceApi')return{ideaWorkspaceApi:{}};
  if(id==='./systemBoardModel')return{sameSystemIdeas:(a,b)=>JSON.stringify(a)===JSON.stringify(b),toSystemDocument:value=>value};
  if(id==='./boardFileCopy')return{boardFileCopy:()=>({openError:'failed',opened:'opened',saveOpen:'save first',openHint:'protect',newFile:'new',save:'save'})};
  if(id==='./workspaceCopy')return{workspaceCopy:()=>({myBoard:'board',savedProject:'saved'})};if(id==='./boardFileModel')return{editableProject:p=>p.freeform,hasBoardWork:c=>c.nodes.length>0,listBoardFiles(){}};throw Error(id);
 });
 let context={active:true,ready:false,capture:()=>({actor:'captured',content:old}),replace:(expected,value)=>{assert.equal(expected.content,old);assert.equal(value,next);replacements++;return true;},notify:text=>events.push(text)};
 const openRequest={key:'request',project:{summary:{kind:'FREEFORM'},freeform:next}};
 const render=()=>module.BoardFileControls({context,locale:'es',kind:'FREEFORM',openRequest,onOpened:()=>opened++,onSaved(){}});
 runtime.render(render);await runtime.flush();assert.equal(opened,0);context={...context,ready:true};runtime.render(render);await runtime.flush();
 assert.equal(opened,1);assert.equal(replacements,0);const protection=elements(runtime.result).find(e=>e.type==='save-dialog');assert.ok(protection);protection.props.onClose();await runtime.flush();assert.equal(replacements,0);
 runtime.render(render);await runtime.flush();assert.equal(opened,1);
});
