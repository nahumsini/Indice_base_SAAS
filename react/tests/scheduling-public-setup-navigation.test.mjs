import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Scheduling/',import.meta.url);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
const data={pages:[{id:7,version:4,alias:'first'}],readiness:{bookingReady:true,publicAccessEnabled:true},staff:[{id:2}],services:[{id:1}]};
function harness() {
  const runtime=hookRuntime(); const writes=[];let auth=1,closed=0,reloads=0,query={data,loading:false,error:false};
  const {PublicAgendaModal}=loadTypescript(new URL('components/PublicAgendaModal.tsx',root).pathname,id=>{
    if(id==='react')return runtime.hooks;
    if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('/useAuthorizationRevision'))return {useAuthorizationRevision:()=>auth};
    if(id.endsWith('/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
    if(id.endsWith('/useSchedulingQuery'))return {useSchedulingQuery:()=>({...query,reload:()=>reloads++})};
    if(id.endsWith('/publicAgendaManagerCopy'))return loadTypescript(new URL('translations/publicAgendaManagerCopy.ts',root).pathname);
    if(id.endsWith('/schedulingApi'))return {schedulingApi:{createPage:async body=>{writes.push({type:'create',body});return {...body,id:8,version:1};},updatePage:async(id,body)=>{writes.push({type:'edit',id,body});return {...body,id,version:5};}}};
    if(id.endsWith('/PageEditor'))return {PageEditor:'PageEditor'};
    if(id.endsWith('/AgendaConfigurationModal'))return {AgendaConfigurationModal:'AgendaConfigurationModal'};
    if(id.endsWith('/schedulingIdentity'))return {schedulingEmoji:{publicAgenda:'🌐'},schedulingTone:'coral'};
    return new Proxy({}, {get:(_,key)=>key});
  });
  runtime.render(()=>PublicAgendaModal({copy:{},onClose:()=>closed++}));
  return {runtime,writes,setQuery:value=>{query=value;runtime.render();},setAuth:value=>{auth=value;runtime.render();},closed:()=>closed,reloads:()=>reloads};
}
test('configuration replaces one frame, preserves draft and survives recheck without unmounting the editor',async()=>{
  const h=harness(),snapshot={draft:{title:'Unsaved'},savedPage:{version:4},step:2,appearance:{layout:'showcase'},baseline:'old'};
  assert.equal(h.runtime.result.type,'IndiceModalFrame');
  const find=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(find):[value,...find(value.props?.children)];
  find(h.runtime.result).find(node=>node.type==='PublicAgendaManager').props.onEdit(data.pages[0]);await h.runtime.flush();
  assert.equal(h.runtime.result.type,'PageEditor');
  h.runtime.result.props.onConfigure('services',snapshot);await h.runtime.flush();
  assert.equal(h.runtime.result.type,'AgendaConfigurationModal');
  h.runtime.result.props.onChanged();assert.equal(h.reloads(),1);
  h.setQuery({data:undefined,loading:true,error:false});
  h.runtime.result.props.onClose();await h.runtime.flush();
  assert.equal(h.runtime.result.type,'PageEditor');assert.equal(h.runtime.result.props.initialSnapshot,snapshot);assert.equal(h.runtime.result.props.checking,true);
  h.setQuery({data:undefined,loading:false,error:true});
  assert.equal(h.runtime.result.type,'PageEditor');assert.equal(h.runtime.result.props.checkError,true);assert.equal(h.runtime.result.props.page.version,4);
});
test('company or permission replacement clears the editor and its memory snapshot',()=>{
  const h=harness();h.setAuth(2);
  assert.equal(h.runtime.result,null);assert.equal(h.closed(),1);
});

test('administration opens before creation; new aliases and owner commands never replace an existing agenda',async()=>{
  const h=harness();assert.equal(h.runtime.result.type,'IndiceModalFrame');
  const manager=nodes(h.runtime.result).find(node=>node.type==='PublicAgendaManager');assert.equal(manager.props.pages,data.pages);
  manager.props.onCreate();await h.runtime.flush();
  assert.equal(h.runtime.result.type,'PageEditor');assert.equal(h.runtime.result.props.managed,true);assert.equal(h.runtime.result.props.page,null);
  const alias=h.runtime.result.props.readiness.suggestedAlias;assert.match(alias,/^agenda-[a-f0-9]{8}$/);
  await h.runtime.result.props.onPersist({alias,title:'Second',published:false});
  assert.equal(h.writes[0].type,'create');assert.equal(h.writes[0].body.alias,alias);
  h.runtime.result.props.onSaved();await h.runtime.flush();assert.equal(h.runtime.result.type,'IndiceModalFrame');assert.equal(h.reloads(),1);
  nodes(h.runtime.result).find(node=>node.type==='PublicAgendaManager').props.onEdit(data.pages[0]);await h.runtime.flush();
  await h.runtime.result.props.onPersist({alias:'first',title:'Changed',version:4,published:false});
  assert.equal(h.writes[1].type,'edit');assert.equal(h.writes[1].id,7);assert.equal(h.writes[1].body.version,4);
});
test('unpublishing uses one confirmation and only the selected agenda',async()=>{
  const h=harness();const selected={...data.pages[0],title:'First',description:'',published:true};
  nodes(h.runtime.result).find(node=>node.type==='PublicAgendaManager').props.onUnpublish(selected);await h.runtime.flush();
  assert.equal(h.runtime.result.type,'EditorFrame');assert.equal(h.runtime.result.props.modalType,'confirmation');
  await h.runtime.result.props.onSave();assert.equal(h.writes[0].id,7);assert.equal(h.writes[0].body.published,false);assert.equal(h.writes[0].body.version,4);
  h.runtime.result.props.onSaved();await h.runtime.flush();assert.equal(h.runtime.result.type,'IndiceModalFrame');
});
