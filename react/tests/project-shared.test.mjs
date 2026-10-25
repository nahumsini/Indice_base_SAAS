import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),root=new URL('../src/app/ComplementaryModules/IdeasBoard/',import.meta.url);
const loadCopy=name=>loadTypescript(new URL(name,root).pathname,()=>{throw Error('Unexpected import');});
const management=loadCopy('projectManagementCopy.ts'),cards=loadCopy('projectCardCopy.ts'),workspace=loadCopy('workspaceCopy.ts'),filters=loadCopy('projectLibraryModel.ts');
globalThis.window={setTimeout,clearTimeout};
const locale='es-MX',m=management.projectManagementCopy(locale),c=cards.projectCardCopy(locale);
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
const source={id:'00000000-0000-4000-8000-000000000003',name:'Plan compartido',kind:'SYSTEM',owned:false,ownerId:42,ownerName:'Andrea Equipo',version:7,nodeCount:2,connectionCount:1,createdAt:'2026-10-24T10:00:00Z'};
function library({failure=false,trash=false}={}){
 const runtime=hookRuntime(),requests=[],navigations=[];let copied;
 const sharedBy=loadTypescript(new URL('ProjectSharedBy.tsx',root).pathname,id=>id==='react/jsx-runtime'?require(id):cards);
 const module=loadTypescript(new URL('ProjectLibrary.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);
  if(id==='react-router')return{useSearchParams:()=>{const [params,setParams]=runtime.hooks.useState(()=>new URLSearchParams());return[params,next=>{navigations.push(new URLSearchParams(next));setParams(next);}];}};
  if(id==='lucide-react')return Object.fromEntries(['ArrowLeft','FolderOpen','RefreshCw','X','Lock','Trash2'].map(k=>[k,()=>null]));
  if(id.endsWith('/frontend-os'))return Object.fromEntries(['IndiceTitleBar','IndiceFilterBar','IndiceFilterSearch','IndiceFilterSelect','IndiceViewState'].map(k=>[k,k]));
  if(id.endsWith('/button'))return{Button:'button'};if(id.endsWith('/DataTablePagination'))return{DataTablePagination:'pagination'};
  if(id.endsWith('/useWorkspaceNavigationMemory'))return{useWorkspaceNavigationMemory(){}};
  if(id.endsWith('/ModuleTabEmoji'))return{IndiceEmoji:'emoji'};
  if(id==='./ideaWorkspaceApi')return{ideaWorkspaceApi:{list:async(q,page,signal,pageSize,scope,kind,sort)=>{requests.push({q,page,signal,pageSize,scope,kind,sort});return{items:scope==='TRASH'&&trash?[removedSource]:scope==='SHARED'?[source]:copied?[copied.summary]:[],total:scope==='TRASH'&&trash||scope==='SHARED'||copied?1:0,page,pageSize};},get:async(id,signal,ownerId)=>{requests.push({id,signal,ownerId});if(failure)throw{status:403};return copied?.summary.id===id?copied:id===source.id?{summary:source,system:{elements:[]},freeform:null}:undefined;}}};
  if(id==='./systemBoardModel')return{fromSystemDocument:value=>value};if(id==='./WorkspaceCanvas')return{WorkspaceCanvas:'canvas'};
  if(id==='./ProjectActions')return{ProjectActions:'project-actions',projectActionError:()=>m.missing};
  if(id==='./projectManagementApi')return{projectManagementApi:{assetUrl:()=> 'private-url'}};
  if(id==='./ProjectThumbnail')return{ProjectThumbnail:'thumbnail'};
  if(id==='./ProjectTrashDetails')return{ProjectTrashDetails:'trash-details'};
  if(id==='./ProjectSharedBy')return sharedBy;
  if(id==='./workspaceCopy')return workspace;if(id==='./projectManagementCopy')return management;if(id==='./projectCardCopy')return cards;
  if(id==='./projectWorkspaceCopy')return loadCopy('projectWorkspaceCopy.ts');if(id==='./projectLibraryModel')return filters;throw Error(id);
 });
 const render=()=>runtime.render(()=>module.IdeaProjects({locale,active:true,revision:0,onUseProject(){},onOpenBoard(){}}));
 render();return{runtime,requests,navigations,render,all:()=>elements(runtime.result),setCopy:value=>{copied=value;}};
}
async function flush(d){await d.runtime.flush();await new Promise(resolve=>setTimeout(resolve,5));await d.runtime.flush();}
async function sharedLibrary(options){const d=library(options);d.all().find(e=>e.type==='button'&&[e.props.children].flat().includes(m.shared)).props.onClick();await flush(d);return d;}
function action(d){return d.all().find(e=>e.type==='project-actions');}

test('received library has clear scope instructions and a dedicated sender beside real snapshot actions',async()=>{
 const d=await sharedLibrary();const title=d.all().find(e=>e.type==='IndiceTitleBar');assert.equal(title.props.title,m.shared);assert.equal(title.props.subtitle,c.sharedHint);
 const sender=d.all().find(e=>e.type?.name==='ProjectSharedBy');assert.equal(sender.props.name,source.ownerName);
 const card=d.all().find(e=>e.type==='article');assert.equal(card.props['data-project-access'],'received');assert.equal(action(d).props.item,source);assert.equal(typeof action(d).props.onOpen,'function');
 const request=d.requests.find(r=>r.scope==='SHARED');assert.equal(request.kind,'ALL');assert.equal(request.pageSize,12);assert.equal(request.page,1);d.runtime.unmount();
});
test('opening a received project uses its exact source owner and leaves its content unchanged',async()=>{
 const d=await sharedLibrary(),before=JSON.stringify(source);action(d).props.onOpen();await flush(d);
 const route=d.navigations.at(-1);assert.equal(route.get('project'),source.id);assert.equal(route.get('owner'),'42');assert.equal(d.requests.at(-1).ownerId,42);
 const view=d.all().find(e=>e.type?.name==='ProjectPreview');assert.equal(view.props.project.summary,source);
 const title=d.all().find(e=>e.type==='IndiceTitleBar');assert.equal(title.props.subtitle,'Compartido por Andrea Equipo');assert.equal(elements(title.props.actions).find(e=>e.type==='button').props.children[1],c.backToShared);assert.equal(JSON.stringify(source),before);d.runtime.unmount();
});
test('copying from the received list switches to My projects with a private independent copy',async()=>{
 const d=await sharedLibrary(),copy={summary:{...source,id:'00000000-0000-4000-8000-000000000007',owned:true,ownerId:7,ownerName:'Tú',shareCount:0,name:'Mi plan'},system:{elements:[]},freeform:null};d.setCopy(copy);
 action(d).props.onChanged(m.copied,copy);await flush(d);assert.equal(d.all().find(e=>e.type==='button'&&e.props['aria-pressed']===true).props.children[1],m.mine);
 assert.equal(action(d).props.item,copy.summary);assert.ok(d.all().some(e=>e.props?.role==='status'));assert.equal(d.requests.at(-1).scope,'OWNED');assert.equal(source.owned,false);d.runtime.unmount();
});
test('copying while viewing a received project opens the new copy, confirms success and returns to My projects',async()=>{
 const d=await sharedLibrary();action(d).props.onOpen();await flush(d);
 const copy={summary:{...source,id:'00000000-0000-4000-8000-000000000008',owned:true,ownerId:7,shareCount:0,name:'Mi copia'},system:{elements:[]},freeform:null};d.setCopy(copy);
 const title=d.all().find(e=>e.type==='IndiceTitleBar'),previewActions=elements(title.props.actions).find(e=>e.type==='project-actions');previewActions.props.onChanged(m.copied,copy);await flush(d);
 assert.equal(d.navigations.at(-1).get('project'),copy.summary.id);assert.equal(d.navigations.at(-1).get('owner'),'7');assert.equal(d.all().find(e=>e.type?.name==='ProjectPreview').props.project,copy);assert.ok(d.all().some(e=>e.props?.role==='status'));
 const nextTitle=d.all().find(e=>e.type==='IndiceTitleBar');elements(nextTitle.props.actions).find(e=>e.type==='button').props.onClick();await flush(d);assert.equal(d.requests.at(-1).scope,'OWNED');assert.equal(action(d).props.item,copy.summary);d.runtime.unmount();
});
test('revoked received access produces the existing unavailable state without retaining old content',async()=>{
 const d=await sharedLibrary({failure:true});action(d).props.onOpen();await flush(d);assert.equal(d.all().some(e=>e.type?.name==='ProjectPreview'),false);const error=d.all().find(e=>e.type==='IndiceViewState');assert.equal(error.props.variant,'error');assert.equal(error.props.title,m.missing);d.runtime.unmount();
});
test('sender display trims names, handles absent names and localizes copy ownership consistently',()=>{
 const runtime=hookRuntime(),module=loadTypescript(new URL('ProjectSharedBy.tsx',root).pathname,id=>id==='react/jsx-runtime'?require(id):cards);
 runtime.render(()=>module.ProjectSharedBy({name:'  Andrea Equipo  ',locale}));assert.equal(module.sharedProjectOwnerName('Andrea · Equipo',locale),'Andrea · Equipo');
 runtime.render(()=>module.ProjectSharedBy({name:'Andrea · Equipo',locale}));assert.equal(elements(runtime.result).find(e=>e.props?.className==='project-shared-avatar').props.children,'AE');
 runtime.render(()=>module.ProjectSharedBy({name:'  Andrea Equipo  ',locale}));const strong=elements(runtime.result).find(e=>e.type==='strong');assert.equal(strong.props.children,'Andrea Equipo');assert.equal(strong.props.title,'Andrea Equipo');
 for(const lang of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const text=cards.projectCardCopy(lang);assert.equal(module.sharedProjectOwnerName('   ',lang),text.ownerFallback);assert.ok(text.sharedBy);assert.ok(text.sharedHint);assert.ok(text.copy);}
});


test('a new received copy is immediately findable even when the received list was filtered or sorted',async()=>{
 const d=await sharedLibrary();d.all().find(e=>e.type==='IndiceFilterSearch').props.onValueChange('Plan compartido');d.all().find(e=>e.type==='IndiceFilterSelect'&&e.props.value==='ALL').props.onValueChange('SYSTEM');d.all().find(e=>e.type==='IndiceFilterSelect'&&e.props.value==='NEWEST').props.onValueChange('NAME_DESC');await d.runtime.flush();await new Promise(resolve=>setTimeout(resolve,310));await d.runtime.flush();
 const copy={summary:{...source,id:'00000000-0000-4000-8000-000000000009',owned:true,ownerId:7,shareCount:0,name:'Trabajo propio'},system:{elements:[]},freeform:null};d.setCopy(copy);action(d).props.onChanged(m.copied,copy);await flush(d);
 const request=d.requests.at(-1);assert.equal(request.scope,'OWNED');assert.equal(request.q,'');assert.equal(request.kind,'ALL');assert.equal(request.sort,'NEWEST');assert.equal(request.page,1);assert.equal(request.pageSize,12);assert.equal(action(d).props.item,copy.summary);d.runtime.unmount();
});


const removedSource={...source,owned:true,ownerId:7,shareCount:0,deletedAt:'2026-10-23T12:00:00Z',createdAt:'2026-09-01T12:00:00Z'};
async function trashLibrary(){const d=library({trash:true});d.all().find(e=>e.type==='button'&&[e.props.children].flat().includes(m.trash)).props.onClick();await flush(d);return d;}
test('trash uses its own heading and date, with private restoration explained on each card',async()=>{
 const d=await trashLibrary(),ui=cards.projectCardCopy(locale),title=d.all().find(e=>e.type==='IndiceTitleBar');assert.equal(title.props.title,m.trash);assert.equal(title.props.subtitle,ui.trashHint);
 assert.equal(d.all().find(e=>e.type==='article').props['data-project-access'],'trash');assert.equal(d.all().find(e=>e.type==='trash-details').props.deletedAt,removedSource.deletedAt);assert.ok(!d.all().some(e=>e.type==='time'&&e.props.dateTime===removedSource.createdAt));assert.ok(d.all().some(e=>e.props?.className==='project-trash-return'));assert.equal(action(d).props.item,removedSource);d.runtime.unmount();
});
test('restoration returns to My projects with a direct link to the restored private project despite old dates and filters',async()=>{
 const d=await trashLibrary(),ui=cards.projectCardCopy(locale);d.all().find(e=>e.type==='IndiceFilterSearch').props.onValueChange('Plan');await d.runtime.flush();await new Promise(r=>setTimeout(r,310));await d.runtime.flush();
 const restored={summary:{...removedSource,deletedAt:null,shareCount:0,version:8},system:{elements:[]},freeform:null};d.setCopy(restored);action(d).props.onChanged(m.restored,restored);await flush(d);
 assert.equal(d.requests.at(-1).scope,'OWNED');assert.equal(d.requests.at(-1).q,'');assert.equal(d.requests.at(-1).sort,'NEWEST');assert.ok(d.all().some(e=>e.type==='button'&&[e.props.children].flat().includes(ui.openRestored)));
 d.all().find(e=>e.type==='button'&&[e.props.children].flat().includes(ui.openRestored)).props.onClick();await flush(d);assert.equal(d.navigations.at(-1).get('project'),restored.summary.id);assert.equal(d.navigations.at(-1).get('owner'),'7');assert.equal(d.all().find(e=>e.type?.name==='ProjectPreview').props.project.summary.owned,true);assert.equal(d.all().find(e=>e.type?.name==='ProjectPreview').props.project.summary.shareCount,0);assert.ok(!d.all().some(e=>e.type==='button'&&[e.props.children].flat().includes(ui.openRestored)));d.runtime.unmount();
});
test('an empty trash offers the shared native empty state and no misleading private or shared project cards',async()=>{
 const d=library();d.all().find(e=>e.type==='button'&&[e.props.children].flat().includes(m.trash)).props.onClick();await flush(d);const empty=d.all().find(e=>e.type==='IndiceViewState');assert.equal(empty.props.variant,'empty');assert.equal(empty.props.title,c.trashEmpty);assert.equal(empty.props.description,c.trashEmptyHint);assert.ok(!d.all().some(e=>e.type==='article'));d.runtime.unmount();
});
test('trash dates use deletion rather than creation, remain localized and omit invalid or absent dates',()=>{
 const component=loadTypescript(new URL('ProjectTrashDetails.tsx',root).pathname,id=>id==='react/jsx-runtime'?require(id):cards);
 for(const lang of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const result=component.ProjectTrashDetails({deletedAt:removedSource.deletedAt,locale:lang});assert.equal(elements(result).find(e=>e.type==='time').props.dateTime,removedSource.deletedAt);assert.ok(elements(result).find(e=>e.type==='span').props.children);assert.equal(elements(result).find(e=>e.type==='time').props.children,new Intl.DateTimeFormat(lang,{dateStyle:'medium'}).format(new Date(removedSource.deletedAt)));}
 for(const deletedAt of [null,undefined,'','invalid'])assert.equal(component.ProjectTrashDetails({deletedAt,locale}),null);
});
