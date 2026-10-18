import test from 'node:test';
import assert from 'node:assert/strict';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/BasicModules/Sales/Postventa/workspace/', import.meta.url);
const model = loadTypescript(new URL('continuityModel.ts', root).pathname, () => { throw Error('Unexpected import'); });
const locales = loadTypescript(new URL('continuityLocales.ts', root).pathname, () => { throw Error('Unexpected import'); });
const copy = loadTypescript(new URL('continuityCopy.ts', root).pathname, () => locales);
const base = {kind:'lost',sourceId:1,reference:'OPP-001',title:'Synthetic prospect',clientName:'Synthetic client',contactName:'Test',phone:'',email:'',workId:null,version:0,flowId:0,stageKey:'unscheduled',ownerId:2,ownerName:'Seller',nextAction:'Review',nextActionDate:null,notes:'',lossReason:'Budget timing',recoveryStatus:'unscheduled',recoveredOpportunityId:null};
const workspace = { flows:[{id:0,name:'Default',stages:[{key:'pending',label:'Pending'},{key:'completed',label:'Completed'}]}],owners:[{id:2,name:'Seller'}],today:'2026-10-18',timezone:'America/Toronto',canReactivate:true };
function setup(overrides={}) {
  const runtime=hookRuntime(); let current={...base,...overrides};const saves=[],activations=[];let fail=false;
  const api={ detail:async()=>({item:current,history:[]}),save:async(_kind,_id,command)=>{saves.push(command);if(fail){fail=false;throw new Error('Connection lost');}current={...current,...command,workId:10,version:1};return {item:current,history:[]};},reactivate:async(_id,command)=>{activations.push(command);current={...current,recoveredOpportunityId:99,recoveryStatus:'recovered',version:2};return {item:current,history:[]};} };
  const {ContinuityWorkModal}=loadTypescript(new URL('ContinuityWorkModal.tsx',root).pathname,id=>{
    if(id==='react')return runtime.hooks;
    if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
    if(id.endsWith('salesModalStyles'))return {getSalesModalActionClassNames:()=>({primary:'primary'})};
    if(id==='react-router')return {useNavigate:()=>()=>{}};
    if(id.endsWith('postSaleWorkspaceApi'))return {postSaleWorkspaceApi:api};
    if(id.endsWith('continuityModel'))return model;
    if(id.endsWith('continuityCopy'))return copy;
    return new Proxy({}, {get:(_,key)=>key});
  });
  const t=copy.continuityCopy('es-MX');runtime.render(()=>ContinuityWorkModal({item:{...base,...overrides},workspace,t,onClose(){},onSaved(){}}));
  return {runtime,saves,activations,t,failNext(){fail=true;}};
}
function nodes(value){ if(!value || typeof value!=='object')return []; if(Array.isArray(value))return value.flatMap(nodes);return [value,...Object.values(value.props??{}).flatMap(nodes)]; }
function find(runtime,predicate){const node=nodes(runtime.result).find(predicate);assert.ok(node,'Expected rendered control');return node;}
function button(runtime,text){return find(runtime,n=>n.type==='Button'&&n.props.children===text).props;}

test('date shortcuts use calendar days across DST, month and year boundaries',()=>{
 assert.equal(model.addCalendarDays('2026-10-30',7),'2026-11-06');assert.equal(model.addCalendarDays('2026-12-25',15),'2027-01-09');
});
test('paused and recovered prospects and completed sales are not overdue',()=>{
 for(const item of [{...base,recoveryStatus:'paused'},{...base,recoveryStatus:'recovered'},{...base,kind:'won',stageKey:'completed'}])assert.equal(model.continuityUrgency({...item,nextActionDate:'2026-01-01'},'2026-10-18'),'done');
 assert.equal(model.continuityUrgency({...base,nextActionDate:'2026-10-17'},'2026-10-18'),'overdue');
});
test('lost recovery requires saved follow-up and explicit separate action',async()=>{
 const {runtime,saves,activations,t}=setup();await runtime.flush();assert.equal(button(runtime,t.reactivate).disabled,true);
 button(runtime,t.save).onClick();await runtime.flush();assert.equal(saves.length,1);assert.equal(activations.length,0);assert.equal(button(runtime,t.reactivate).disabled,false);
 button(runtime,t.reactivate).onClick();await runtime.flush();assert.equal(activations.length,1);assert.equal(button(runtime,t.openOpportunity).disabled,undefined);
});
test('rapid save is guarded and uncertain retry uses exactly the same request key and payload',async()=>{
 const {runtime,saves,t,failNext}=setup();await runtime.flush();failNext();const save=button(runtime,t.save);save.onClick();save.onClick();await runtime.flush();assert.equal(saves.length,1);
 assert.equal(find(runtime,n=>n.type==='fieldset').props.disabled,true);assert.equal(button(runtime,t.close).disabled,true);
 button(runtime,t.save).onClick();await runtime.flush();assert.equal(saves.length,2);assert.equal(saves[0],saves[1]);assert.ok(saves[0].requestKey);
 assert.equal(button(runtime,t.close).disabled,false);
});
test('an unsaved edit blocks reactivation and shortcut sets date without creating an opportunity',async()=>{
 const {runtime,saves,activations,t}=setup({workId:10,version:1});await runtime.flush();assert.equal(button(runtime,t.reactivate).disabled,false);
 const input=find(runtime,n=>n.props?.['aria-label']===t.notes);input.props.onChange({target:{value:'New commitment'}});await runtime.flush();assert.equal(button(runtime,t.reactivate).disabled,true);assert.equal(saves.length,0);assert.equal(activations.length,0);
});
test('draft retains operational data while normalizing lost stage, never includes financial fields',()=>{
 const draft=model.workDraft({...base,notes:'Keep history',recoveryStatus:'paused'});assert.equal(draft.stageKey,'pending');assert.equal(draft.paused,true);assert.equal(draft.notes,'Keep history');assert.equal('totalAmount' in draft,false);
});

test('every supported locale supplies the complete post-sales catalog',()=>{const keys=Object.keys(copy.continuityCopy('en-CA')).sort();for(const locale of ['es-MX','es-CO','en-US','fr-CA','pt-BR','ko-CA','zh-CA']) {const translated=copy.continuityCopy(locale);assert.deepEqual(Object.keys(translated).sort(),keys);assert.ok(Object.values(translated).every(value=>typeof value==='string'&&value.length));}});

test('notification opens once, stays closed after permission refresh, and opens again for a new navigation',async()=>{
 const runtime=hookRuntime();let ready=true;let location={search:'?kind=lost&source=2',key:'first'};let reads=0;
 const previousWindow=globalThis.window;
 globalThis.window={location:{href:'http://localhost/sales/after-sales?kind=lost&source=2'},history:{state:{},replaceState(_state,_title,url){globalThis.window.location.href='http://localhost'+url;}}};
 const data={...workspace,items:[],counts:{total:0,overdue:0,today:0,unscheduled:0,completed:0},page:1,pageSize:50};
 const api={workspace:async()=>data,detail:async()=>{reads++;return {item:{...base,sourceId:2},history:[]};}};
 const {default:Postventa}=loadTypescript(new URL('../Postventa.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
  if(id==='react-router')return {useLocation:()=>location};
  if(id.endsWith('/shared/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id.endsWith('useWorkspaceNavigationMemory'))return {useWorkspaceNavigationMemory:()=>ready};
  if(id.endsWith('postSaleWorkspaceApi'))return {postSaleWorkspaceApi:api};
  if(id.endsWith('continuityCopy'))return copy;
  if(id.endsWith('continuityModel'))return model;
  return new Proxy({}, {get:(_,key)=>key});
 });
 try {
  runtime.render(()=>Postventa());await runtime.flush();assert.equal(reads,1);
  find(runtime,n=>n.type==='ContinuityWorkModal').props.onClose();await runtime.flush();assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityWorkModal'),false);assert.equal(new URL(window.location.href).searchParams.has('source'),false);
  ready=false;runtime.render();await runtime.flush();ready=true;runtime.render();await runtime.flush();assert.equal(reads,1);assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityWorkModal'),false);
  location={...location,key:'second'};runtime.render();await runtime.flush();assert.equal(reads,2);assert.ok(find(runtime,n=>n.type==='ContinuityWorkModal'));
 } finally {runtime.unmount();globalThis.window=previousWindow;}
});
