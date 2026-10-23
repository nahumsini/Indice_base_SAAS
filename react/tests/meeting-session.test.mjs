import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const base='src/app/ComplementaryModules/MinutesControl/';
class ApiClientError extends Error {constructor(status){super('request failed');this.status=status;}}
const detail={meeting:{id:7,version:9,status:'IN_PROGRESS',ownerId:42,title:'Synthetic',hasMinutes:true,startAt:'2026-10-22T10:00:00Z',timezone:'UTC'},minutes:'Saved minutes',decisions:'Saved decisions',agenda:'Topics',participants:[],history:[]};
function harness({editable=true,write=async()=>({})}={}){
 const r=hookRuntime(),writes=[],saved=[];let authorization=0;
 const {useMeetingMinutesDraft}=loadTypescript(resolve(base+'components/useMeetingMinutesDraft.ts'),id=>{
  if(id==='react')return r.hooks;
  if(id.endsWith('/authSessionStore'))return {getAuthorizationRevision:()=>authorization};
  if(id.endsWith('/useAuthorizationRevision'))return {useAuthorizationRevision:()=>authorization};
  if(id.endsWith('/apiClient'))return {ApiClientError};
  if(id.endsWith('/meetingApi'))return {meetingApi:{minutes:async(id,body)=>{writes.push({id,body});return write();}}};
  throw new Error(id);
 });
 r.render(()=>useMeetingMinutesDraft(detail,editable,()=>saved.push(true)));
 return {r,writes,saved,flush:()=>r.flush(),auth:value=>{authorization=value;r.render();}};
}
test('inline minutes save the exact selected meeting/version and decisions only after explicit Save',async()=>{
 const h=harness();h.r.result.update('minutes','Discussion');h.r.result.update('decisions','Next action');await h.flush();assert.equal(h.writes.length,0);assert.equal(h.r.result.dirty,true);await h.r.result.save();await h.flush();assert.deepEqual(h.writes,[{id:7,body:{minutes:'Discussion',decisions:'Next action',expectedVersion:9}}]);assert.equal(h.saved.length,1);h.r.unmount();
});
test('pending guard prevents duplicate writes and editing while saving',async()=>{
 let release;const h=harness({write:()=>new Promise(resolve=>release=resolve)});h.r.result.update('minutes','One');await h.flush();const save=h.r.result.save;const first=save();void save();h.r.result.update('minutes','Two');await h.flush();assert.equal(h.writes.length,1);assert.equal(h.r.result.minutes,'One');release();await first;h.r.unmount();
});
test('network failure retains both fields and permits an unchanged retry with the original version',async()=>{
 let n=0;const h=harness({write:async()=>{if(++n===1)throw new Error('offline');}});h.r.result.update('minutes','Draft');h.r.result.update('decisions','Decision');await h.flush();await h.r.result.save();await h.flush();assert.equal(h.r.result.error,'error');assert.equal(h.r.result.minutes,'Draft');assert.equal(h.r.result.decisions,'Decision');assert.equal(h.saved.length,0);await h.r.result.save();await h.flush();assert.deepEqual(h.writes[0],h.writes[1]);assert.equal(h.saved.length,1);h.r.unmount();
});
test('conflict retains the draft and prevents a blind retry or silent rebasing after edits',async()=>{
 const h=harness({write:async()=>{throw new ApiClientError(409);}});h.r.result.update('minutes','Draft');await h.flush();await h.r.result.save();await h.flush();assert.equal(h.r.result.error,'conflict');h.r.result.update('decisions','Still mine');await h.flush();await h.r.result.save();assert.equal(h.writes.length,1);assert.equal(h.r.result.minutes,'Draft');assert.equal(h.r.result.error,'conflict');h.r.unmount();
});
test('readonly users cannot edit or save; authorization replacement hides private drafts and ignores pending completion',async()=>{
 const reader=harness({editable:false});reader.r.result.update('minutes','Forbidden');await reader.flush();await reader.r.result.save();assert.equal(reader.r.result.minutes,'Saved minutes');assert.equal(reader.writes.length,0);reader.r.unmount();
 let release;const h=harness({write:()=>new Promise(resolve=>release=resolve)});h.r.result.update('minutes','Private');await h.flush();const pending=h.r.result.save();h.auth(1);await h.flush();assert.equal(h.r.result.minutes,'');assert.equal(h.r.result.decisions,'');release();await pending;assert.equal(h.saved.length,0);h.r.unmount();
});
test('unmounted editor ignores completion and keeps field limits',async()=>{
 let release;const h=harness({write:()=>new Promise(resolve=>release=resolve)});h.r.result.update('minutes','m'.repeat(21000));h.r.result.update('decisions','d'.repeat(11000));await h.flush();assert.equal(h.r.result.minutes.length,20000);assert.equal(h.r.result.decisions.length,10000);const pending=h.r.result.save();h.r.unmount();release();await pending;assert.equal(h.saved.length,0);
});
test('room inherits meetings permission without granting agreements or unconfigured access',()=>{
 const scope=loadTypescript(resolve('src/app/access/tabScopeCatalog.ts'),()=>({}));const actor=keys=>({user:{role:'user',tab_permissions_configured:true,tab_permission_keys:keys}});
 assert.equal(scope.tabPermissionKey('minutes-control','session'),'control_minutas.meetings');assert.equal(scope.canAccessModuleTab('minutes-control','session',actor(['control_minutas.meetings'])),true);assert.equal(scope.canAccessModuleTab('minutes-control','agreements',actor(['control_minutas.meetings'])),false);assert.equal(scope.canAccessModuleTab('minutes-control','session',actor(['control_minutas.agreements'])),false);assert.equal(scope.canAccessModuleTab('minutes-control','session',null),false);
});
test('all eight locales supply complete room labels with explicit fallback',()=>{
 const {meetingSessionCopyLocales:locales,getMeetingSessionCopy:get}=loadTypescript(resolve(base+'translations/meetingSessionCopy.ts'),()=>({}));const keys=Object.keys(get('en-CA'));assert.equal(Object.keys(locales).length,8);for(const locale of Object.values(locales)){assert.deepEqual(Object.keys(locale),keys);assert.ok(Object.values(locale).every(value=>typeof value==='string'&&value.trim()));}assert.equal(get('unknown'),get('en-CA'));
});

const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},stub=new Proxy({},{get:(_,key)=>key});
const nodes=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
function roomHarness(options={}){
 let building=true;const runtime=hookRuntime();const record={...detail,...options.detail,meeting:{...detail.meeting,...options.detail?.meeting}};
 const notes={minutes:record.minutes,decisions:record.decisions,dirty:false,busy:false,error:'',current:true,update(){},save(){},...options.notes};
 let shouldBlock;const navigation={state:'unblocked',reset(){navigation.state='unblocked';},proceed(){navigation.proceeded=true;navigation.state='proceeding';}};
 const {MeetingSessionWorkspace}=loadTypescript(resolve(base+'components/MeetingSessionWorkspace.tsx'),id=>{
  if(id==='react')return {...runtime.hooks,useState:initial=>building?[initial,()=>{}]:runtime.hooks.useState(initial),useCallback:(fn,deps)=>building?fn:runtime.hooks.useCallback(fn,deps),useId:()=> 'room-form'};
  if(id==='react/jsx-runtime')return jsx;
  if(id==='react-router')return {useBlocker:predicate=>{shouldBlock=predicate;return navigation;}};
  if(id.endsWith('/useMeetingMinutesDraft'))return {useMeetingMinutesDraft:()=>notes};
  if(id.endsWith('/MeetingPrimitives'))return {Action:'Action',Feedback:'Feedback',Field:'Field',Status:'Status',panel:'panel',control:'control',useMeetingQuery:()=>({data:record,loading:false,error:false,reload(){}})};
  if(id.includes('/translations/'))return loadTypescript(resolve(base+'translations/'+id.split('/').pop()+'.ts'),()=>({}));
  return stub;
 });
 const windowBefore=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}};
 const props={id:7,copy:loadTypescript(resolve(base+'translations/meetingCopy.ts'),()=>({})).getMeetingCopy('es-MX'),locale:'es-MX',userId:options.userId??42,administrator:false,onChangeMeeting(){},...(options.agreements?{onAgreements(){}}:{})};
 runtime.render(()=>MeetingSessionWorkspace(props));const content=nodes(runtime.result).find(n=>typeof n.type==='function'&&n.type.name==='LoadedMeetingSession');building=false;runtime.render(()=>content.type(content.props));
 return {runtime,notes,navigation,shouldBlock:()=>shouldBlock(),flush:()=>runtime.flush(),close(){runtime.unmount();globalThis.window=windowBefore;}};
}
test('room exposes agreements only with their independent permission; delegated writers gain no lifecycle action',()=>{
 const h=roomHarness({userId:43,detail:{planning:{minutesOwner:{id:43,name:'Writer'}}}});const tree=nodes(h.runtime.result);const navigation=tree.find(n=>n.type==='IndiceWorkspaceNavigation');assert.equal(navigation.props.items.some(i=>i.id==='agreements'),false);assert.equal(tree.some(n=>n.type==='MeetingAgreementsSummary'),false);assert.equal(tree.some(n=>n.type==='Action'&&String(n.props.children).includes('Concluir')),false);assert.equal(tree.find(n=>n.type==='textarea').props.readOnly,false);h.close();
 const reader=roomHarness({userId:44});assert.equal(nodes(reader.runtime.result).find(n=>n.type==='textarea').props.readOnly,true);reader.close();
});
test('native router confirmation preserves draft on cancel and proceeds only after explicit discard',async()=>{
 const h=roomHarness({notes:{dirty:true,minutes:'Keep this'}});assert.equal(h.shouldBlock(),true);h.navigation.state='blocked';h.runtime.render();let confirm=nodes(h.runtime.result).find(n=>n.type==='IndiceConfirmationDialog');assert.ok(confirm);confirm.props.onCancel();await h.flush();assert.equal(h.navigation.state,'unblocked');assert.equal(h.notes.minutes,'Keep this');h.navigation.state='blocked';h.runtime.render();confirm=nodes(h.runtime.result).find(n=>n.type==='IndiceConfirmationDialog');confirm.props.onConfirm();assert.equal(h.navigation.proceeded,true);h.close();
});
test('pending work blocks navigation without stacking a discard confirmation',async()=>{
 const h=roomHarness({notes:{dirty:true,busy:true}});assert.equal(h.shouldBlock(),true);h.navigation.state='blocked';h.runtime.render();await h.flush();assert.equal(h.navigation.state,'unblocked');assert.equal(nodes(h.runtime.result).some(n=>n.type==='IndiceConfirmationDialog'),false);h.close();
});

test('all eight locales supply actionable delegation, independent fulfilment and punctuality labels',()=>{
 const {meetingOutcomeLocales:locales,getMeetingOutcomeCopy:get}=loadTypescript(resolve(base+'translations/meetingOutcomeCopy.ts'),()=>({}));
 const keys=Object.keys(get('en-CA'));assert.equal(Object.keys(locales).length,8);
 for(const value of Object.values(locales)){assert.deepEqual(Object.keys(value),keys);assert.ok(Object.values(value).every(text=>typeof text==='string'&&text.trim()));}
 assert.equal(get('unknown'),get('en-CA'));assert.equal(get('es-MX').delegate,'Crear tarea y delegar');
});
