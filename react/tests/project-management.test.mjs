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
  if(id==='lucide-react')return Object.fromEntries(['Copy','Link','MoreHorizontal','Pencil','RotateCcw','Share2','Trash2','FolderOpen','Search','UserPlus','Lock'].map(name=>[name,()=>null]));
  if(id.includes('/dropdown-menu'))return{};if(id.includes('/indice-modal'))return{IndiceModalFrame:'modal'};if(id.endsWith('/button'))return{Button:'button'};if(id.includes('ModuleTabEmoji'))return{IndiceEmoji:()=>null};
  if(id==='./ProjectTrashDetails')return{ProjectTrashDetails:'trash-details'};
  if(id==='./ProjectSharedBy')return{ProjectSharedBy:'shared-by'};
  if(id==='./projectSharingCopy')return loadTypescript(new URL('projectSharingCopy.ts',root).pathname,()=>{});
  if(id==='./projectCardCopy')return loadTypescript(new URL('projectCardCopy.ts',root).pathname,()=>{});
  if(id==='./projectManagementCopy')return copy;if(id==='./projectManagementApi')return{projectManagementApi:api,captureProjectActor:()=> 'captured-card-actor',validProjectName:name=>!!name.trim()&&name.length<=120&&!/[\x00-\x1f]/.test(name)};throw Error(id);
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
 const remove=d.all().find(e=>e.props?.['aria-label']==='Quitar acceso a Luis');assert.equal(remove.props.disabled,false);
 remove.props.onClick();d.all().find(e=>e.props?.['aria-label']==='Agregar a Ana').props.onClick();await d.runtime.flush();const modal=d.runtime.result,save=elements(modal.props.footer).find(e=>e.type==='button'&&e.props.children===c.saveAccess);save.props.onClick();await d.runtime.flush();
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
  if(id.endsWith('/boardWorkbenchCopy'))return{boardWorkbenchCopy:()=>({fileMenu:'Archivo'})};
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


test('owned cards expose Open, Duplicate and Share through the existing handlers and captured actor',async()=>{
 let opened=0;const d=dialog();
 d.runtime.render(()=>d.module.ProjectActions({item,locale:'es-MX',onChanged(){},onOpen:()=>opened++}));
 d.all().find(v=>v.props?.['aria-label']==='Abrir: Trabajo').props.onClick();assert.equal(opened,1);
 d.all().find(v=>v.props?.['aria-label']==='Duplicar proyecto: Trabajo').props.onClick();await d.runtime.flush();
 const copyDialog=d.all().find(v=>v.props?.action==='copy');assert.ok(copyDialog);assert.equal(copyDialog.props.item,item);assert.equal(copyDialog.props.actor,'captured-card-actor');assert.equal(d.calls.length,0);
 copyDialog.props.onClose();await d.runtime.flush();d.all().find(v=>v.props?.['aria-label']==='Compartir con el equipo: Trabajo').props.onClick();await d.runtime.flush();assert.ok(d.all().some(v=>v.type===d.module.ProjectSharingDialog));assert.equal(d.calls.length,0);
});
test('received cards cannot share or manage ownership; trash cards only expose restore',()=>{
 const d=dialog();d.runtime.render(()=>d.module.ProjectActions({item:{...item,owned:false},locale:'es-MX',onChanged(){},onOpen(){}}));
 const labels=d.all().map(v=>v.props?.['aria-label']).filter(Boolean);assert.ok(labels.includes('Abrir: Trabajo'));assert.ok(labels.includes('Crear mi copia: Trabajo'));assert.ok(!labels.some(v=>v.startsWith('Compartir')));
 d.runtime.unmount();const trash=dialog();trash.runtime.render(()=>trash.module.ProjectActions({item:{...item,deletedAt:'2026-10-24'},locale:'es-MX',onChanged(){},onOpen(){}}));const actions=trash.all().filter(v=>v.type==='button').map(v=>v.props['aria-label']).filter(Boolean);assert.ok(actions.includes('Restaurar proyecto: Trabajo'));assert.ok(!actions.some(v=>/^(Abrir|Duplicar|Compartir)/.test(v)));
});

const shareCopy=loadTypescript(new URL('projectSharingCopy.ts',root).pathname,()=>{}),shareUi=shareCopy.projectSharingCopy('es');
function openSharing(d,callbacks={}){d.runtime.render(()=>d.module.ProjectSharingDialog({item,locale:'es-MX',actor:'captured',onClose(){},onSaved(){},...callbacks}));}
async function ready(d,ms=5){await new Promise(resolve=>setTimeout(resolve,ms));await d.runtime.flush();}
function byLabel(d,label){return d.all().find(e=>e.props?.['aria-label']===label);}
function saveAccess(d){return elements(d.runtime.result.props.footer).find(e=>e.type==='button'&&e.props.children!==c.cancel);}
function textOf(e){if(e==null||typeof e==='boolean')return '';if(typeof e==='string'||typeof e==='number')return String(e);return[e?.props?.children].flat(Infinity).map(textOf).join(' ');}

test('sharing keeps selected employees visible across searches and cancel never submits',async()=>{
 let closed=0;const d=dialog({members:async q=>q==='Beto'?[{id:12,name:'Beto',available:true}]:[{id:8,name:'Ana',available:true}]});openSharing(d,{onClose(){closed++;}});await ready(d);
 assert.equal(saveAccess(d).props.disabled,true);assert.ok(textOf(d.runtime.result).includes(c.shareHint));
 byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();
 assert.ok(d.all().some(e=>e.props?.['data-access-state']==='added'&&textOf(e).includes('Ana')));
 byLabel(d,c.teamSearch).props.onChange({target:{value:'Beto'}});await d.runtime.flush();await ready(d,270);
 assert.ok(byLabel(d,'Agregar a Beto'));assert.ok(byLabel(d,'Quitar acceso a Ana'));assert.ok(byLabel(d,'Quitar acceso a Luis'));
 elements(d.runtime.result.props.footer).find(e=>e.type==='button'&&e.props.children===c.cancel).props.onClick();assert.equal(closed,1);assert.equal(d.calls.length,0);d.runtime.unmount();
});
test('removal is explicit, reversible and applied only at Save',async()=>{
 const d=dialog();openSharing(d);await ready(d);byLabel(d,'Quitar acceso a Luis').props.onClick();await d.runtime.flush();
 assert.equal(d.calls.length,0);assert.ok(d.all().some(e=>e.props?.['data-access-state']==='removed'));assert.equal(saveAccess(d).props.disabled,false);
 byLabel(d,'Deshacer cambio de acceso de Luis').props.onClick();await d.runtime.flush();assert.equal(saveAccess(d).props.disabled,true);
 byLabel(d,'Quitar acceso a Luis').props.onClick();await d.runtime.flush();saveAccess(d).props.onClick();await d.runtime.flush();assert.deepEqual(d.calls[0][3],[]);
});
test('sharing waits for authoritative access before adding or saving',async()=>{
 let resolve;const d=dialog({sharing:()=>new Promise(r=>resolve=r)});openSharing(d);await ready(d);
 assert.equal(saveAccess(d).props.disabled,true);assert.equal(byLabel(d,'Agregar a Ana').props.disabled,true);byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();assert.equal(d.calls.length,0);
 resolve({version:18,members:[]});await d.runtime.flush();byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();saveAccess(d).props.onClick();await d.runtime.flush();assert.equal(d.calls[0][1],18);assert.deepEqual(d.calls[0][3],[8]);d.runtime.unmount();
});
test('search failure and retry preserve changes and current access',async()=>{
 let fail=false;const d=dialog({members:async()=>{if(fail)throw Error('offline');return[{id:8,name:'Ana',available:true}];}});openSharing(d);await ready(d);byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();
 fail=true;byLabel(d,c.teamSearch).props.onChange({target:{value:'Else'}});await d.runtime.flush();await ready(d,270);
 assert.ok(textOf(d.runtime.result).includes(shareUi.searchError));assert.ok(byLabel(d,'Quitar acceso a Ana'));assert.ok(byLabel(d,'Quitar acceso a Luis'));assert.equal(saveAccess(d).props.disabled,false);
 fail=false;d.all().find(e=>e.type==='button'&&e.props.children===c.refresh).props.onClick();await d.runtime.flush();await ready(d,270);assert.ok(byLabel(d,'Quitar acceso a Ana'));d.runtime.unmount();
});
test('uncertain sharing retry freezes exact recipients and reuses identity and version',async()=>{
 const requests=[];let saved=0;const d=dialog({share:async(...args)=>{requests.push(args);if(requests.length===1)throw Error('lost response');return{};}});openSharing(d,{onSaved(){saved++;}});await ready(d);
 byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();saveAccess(d).props.onClick();await d.runtime.flush();
 assert.equal(byLabel(d,'Quitar acceso a Ana').props.disabled,true);assert.equal(byLabel(d,c.teamSearch).props.disabled,true);assert.equal(saveAccess(d).props.children,shareUi.retrySave);
 assert.ok(!d.all().some(e=>e.type==='button'&&e.props.children===shareUi.reloadAccess));saveAccess(d).props.onClick();await d.runtime.flush();assert.equal(saved,1);assert.deepEqual(requests[0],requests[1]);assert.deepEqual(requests[0][3],[8,9]);assert.equal(requests[0][4],'captured');
});
test('stale access requires a fresh review, while validation errors unlock selection',async()=>{
 let version=4,readMembers=[{id:9,name:'Luis',available:false}];const d=dialog({sharing:async()=>({version,members:readMembers}),share:async()=>{throw{status:409};}});openSharing(d);await ready(d);byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();saveAccess(d).props.onClick();await d.runtime.flush();
 assert.equal(saveAccess(d).props.disabled,true);assert.ok(textOf(d.runtime.result).includes(shareUi.conflict));version=7;readMembers=[];d.all().find(e=>e.type==='button'&&e.props.children===shareUi.reloadAccess).props.onClick();await d.runtime.flush();await ready(d);assert.ok(!byLabel(d,'Quitar acceso a Ana'));assert.equal(saveAccess(d).props.disabled,true);
 const invalid=dialog({share:async()=>{throw{status:400};}});openSharing(invalid);await ready(invalid);byLabel(invalid,'Agregar a Ana').props.onClick();await invalid.runtime.flush();saveAccess(invalid).props.onClick();await invalid.runtime.flush();assert.equal(byLabel(invalid,'Quitar acceso a Ana').props.disabled,false);assert.equal(byLabel(invalid,c.teamSearch).props.disabled,false);
});
test('sharing caps recipients at fifty and excludes unavailable new employees',async()=>{
 const team=Array.from({length:50},(_,i)=>({id:i+100,name:`Persona ${i}`,available:true}));const d=dialog({sharing:async()=>({version:4,members:team}),members:async()=>[{id:8,name:'Ana',available:true},{id:12,name:'No disponible',available:false}]});openSharing(d);await ready(d);
 assert.equal(byLabel(d,'Agregar a Ana').props.disabled,true);assert.ok(!byLabel(d,'Agregar a No disponible'));
 byLabel(d,'Quitar acceso a Persona 0').props.onClick();await d.runtime.flush();byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();assert.equal(byLabel(d,'Deshacer cambio de acceso de Persona 0').props.disabled,true);
 saveAccess(d).props.onClick();await d.runtime.flush();assert.equal(d.calls[0][3].length,50);assert.ok(d.calls[0][3].includes(8));assert.ok(!d.calls[0][3].includes(100));
});
test('sharing read errors block grants, support retry and labels cover every supported language',async()=>{
 let failed=true;const d=dialog({sharing:async()=>{if(failed)throw Error('offline');return{version:4,members:[]};}});openSharing(d);await ready(d);assert.equal(saveAccess(d).props.disabled,true);assert.equal(byLabel(d,'Agregar a Ana').props.disabled,true);
 failed=false;d.all().find(e=>e.type==='button'&&e.props.children===c.refresh).props.onClick();await d.runtime.flush();await ready(d);assert.equal(byLabel(d,'Agregar a Ana').props.disabled,false);
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const localized=shareCopy.projectSharingCopy(locale);assert.deepEqual(Object.keys(localized),Object.keys(shareUi));assert.ok(Object.values(localized).every(v=>v.length));}
});

test('late search responses cannot replace the latest employees or erase chosen access',async()=>{
 const pending=[];const d=dialog({members:(q,signal)=>new Promise(resolve=>pending.push({q,signal,resolve}))});openSharing(d);await ready(d);
 pending[0].resolve([{id:8,name:'Ana',available:true}]);await d.runtime.flush();byLabel(d,'Agregar a Ana').props.onClick();await d.runtime.flush();
 byLabel(d,c.teamSearch).props.onChange({target:{value:'Old'}});await d.runtime.flush();await ready(d,270);
 byLabel(d,c.teamSearch).props.onChange({target:{value:'New'}});await d.runtime.flush();await ready(d,270);
 assert.equal(pending[1].signal.aborted,true);pending[2].resolve([{id:13,name:'Nueva',available:true}]);await d.runtime.flush();pending[1].resolve([{id:12,name:'Anterior',available:true}]);await d.runtime.flush();
 assert.ok(byLabel(d,'Agregar a Nueva'));assert.ok(!byLabel(d,'Agregar a Anterior'));assert.ok(byLabel(d,'Quitar acceso a Ana'));d.runtime.unmount();
});


test('received copy dialog identifies its source and keeps the source owner in the captured copy request',async()=>{
 const shared={...item,owned:false,ownerId:42,ownerName:'Andrea Equipo'},before=JSON.stringify(item);const d=dialog();
 d.runtime.render(()=>d.module.ProjectMutationDialog({action:'copy',item:shared,locale:'es-MX',actor:'ideas_board:9:7',onClose(){},onSaved(){}}));
 const sender=d.all().find(e=>e.type==='shared-by');assert.equal(sender.props.name,'Andrea Equipo');assert.ok(d.all().some(e=>e.props?.className==='project-copy-source'));
 d.all().find(e=>e.type==='form').props.onSubmit({preventDefault(){}});await d.runtime.flush();assert.equal(d.calls[0][0],shared);assert.equal(d.calls[0][0].ownerId,42);assert.equal(d.calls[0][3],'ideas_board:9:7');assert.equal(JSON.stringify(item),before);
});


test('restore confirmation identifies the project and private destination without changing data on cancel',async()=>{
 const removed={...item,deletedAt:'2026-10-20T12:00:00Z'},ui=loadTypescript(new URL('projectCardCopy.ts',root).pathname,()=>{}).projectCardCopy('es');let closed=0;const d=dialog();
 d.runtime.render(()=>d.module.ProjectMutationDialog({action:'restore',item:removed,locale:'es-MX',actor:'captured',onClose(){closed++;},onSaved(){}}));
 assert.equal(d.runtime.result.props.description,c.restoreHint);assert.ok(textOf(d.runtime.result).includes(ui.restoreDestination));assert.ok(textOf(d.runtime.result).includes(c.private));assert.ok(textOf(d.runtime.result).includes(item.name));assert.equal(d.all().find(e=>e.type==='trash-details').props.deletedAt,removed.deletedAt);
 elements(d.runtime.result.props.footer).find(e=>e.props?.children===c.cancel).props.onClick();assert.equal(closed,1);assert.equal(d.calls.length,0);assert.equal(removed.deletedAt,'2026-10-20T12:00:00Z');
});
test('restore sends the existing reversible payload and preserves actor/version/request on an uncertain retry',async()=>{
 const requests=[];let saved=0;const removed={...item,deletedAt:'2026-10-20T12:00:00Z'};const d=dialog({change:async(...args)=>{requests.push(args);if(requests.length===1)throw Error('lost response');return{summary:{...item,deletedAt:null,shareCount:0}};}});
 d.runtime.render(()=>d.module.ProjectMutationDialog({action:'restore',item:removed,locale:'es-MX',actor:'captured',onClose(){},onSaved(){saved++;}}));
 const submit=()=>d.all().find(e=>e.type==='form').props.onSubmit({preventDefault(){}});submit();await d.runtime.flush();assert.equal(saved,0);assert.ok(d.all().some(e=>e.props?.role==='alert'));submit();await d.runtime.flush();assert.equal(saved,1);assert.deepEqual(requests[0],requests[1]);assert.equal(requests[0][1].trashed,false);assert.equal(requests[0][1].version,4);assert.ok(requests[0][1].mutationId);assert.equal(requests[0][2],'captured');
});
