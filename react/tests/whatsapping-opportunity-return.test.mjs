import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { hookRuntime } from './helpers/hook-runtime.mjs';
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const base = resolve(import.meta.dirname, '../src/app/BasicModules/Sales/Whatsapping');
function setup() {
  const window = new EventTarget(), document = new EventTarget(); document.visibilityState = 'visible';
  const runtime = hookRuntime(), calls=[]; let available=true;
  const load = createTypeScriptLoader({react:runtime.hooks},{window,document,AbortController});
  const { useOpportunityReturn } = load(resolve(base,'useOpportunityReturn.ts'));
  let callback=async (id,signal)=>{calls.push({id,signal})};
  const render=()=>runtime.render(()=>useOpportunityReturn(callback,available)); render();
  return {runtime,window,document,calls,render,setAvailable:value=>{available=value;render()},setCallback:value=>{callback=value;render()}};
}
test('ordinary focus does not read, explicit opportunity return reads once across duplicate browser events',async()=>{
  const s=setup();s.window.dispatchEvent(new Event('focus'));await s.runtime.flush();assert.equal(s.calls.length,0);
  s.runtime.result.markOpened(7);s.window.dispatchEvent(new Event('focus'));s.document.dispatchEvent(new Event('visibilitychange'));await s.runtime.flush();assert.deepEqual(s.calls.map(c=>c.id),[7]);
  s.window.dispatchEvent(new Event('focus'));await s.runtime.flush();assert.equal(s.calls.length,1);s.runtime.unmount();
});
test('hidden return waits for visibility and a busy campaign defers without losing the pending contact',async()=>{
  const s=setup();s.runtime.result.markOpened(7);s.setAvailable(false);s.window.dispatchEvent(new Event('focus'));await s.runtime.flush();assert.equal(s.calls.length,0);
  s.document.visibilityState='hidden';s.setAvailable(true);await s.runtime.flush();assert.equal(s.calls.length,0);
  s.document.visibilityState='visible';s.document.dispatchEvent(new Event('visibilitychange'));await s.runtime.flush();assert.equal(s.calls.length,1);s.runtime.unmount();
});
test('return uses the current workspace callback rather than captured selection or stale draft state',async()=>{
  const s=setup();let draft='original';s.runtime.result.markOpened(7);draft='latest edit';s.setCallback(async id=>s.calls.push({id,draft}));
  s.window.dispatchEvent(new Event('focus'));await s.runtime.flush();assert.deepEqual(s.calls,[{id:7,draft:'latest edit'}]);s.runtime.unmount();
});
test('unmount cancels a pending read and removes focus listeners',async()=>{
  const s=setup();s.runtime.result.markOpened(7);s.window.dispatchEvent(new Event('focus'));await s.runtime.flush();const signal=s.calls[0].signal;assert.equal(signal.aborted,false);
  s.runtime.unmount();assert.equal(signal.aborted,true);s.window.dispatchEvent(new Event('focus'));assert.equal(s.calls.length,1);
});
test('retry is explicit and another link can be opened after a completed refresh',async()=>{
  const s=setup();s.runtime.result.retry(7);await s.runtime.flush();assert.equal(s.calls.length,1);
  s.runtime.result.markOpened(8);await s.runtime.flush();assert.equal(s.calls.length,1);
  s.window.dispatchEvent(new Event('focus'));await s.runtime.flush();assert.deepEqual(s.calls.map(c=>c.id),[7,8]);s.runtime.unmount();
});
const load=createTypeScriptLoader();const {mergeOpportunityReturn}=load(resolve(base,'contactOpportunities.ts'));
const original={campaign:{id:'a',version:1,status:'ACTIVE',outcomes:{contacted:1,positive:0,negative:0,withOpportunity:1}},recipients:[{contact:{id:7,name:'Before'},eligibility:'READY',version:1,stepIndex:0,state:'PENDING',message:'base message',notes:'base notes',nextActionAt:'2026-10-27T15:00:00Z'}],events:[{action:'NOTE'}],opportunities:[{contactId:7,id:10,name:'Before'}],resultContacts:{contacted:[7],positive:[],negative:[],withOpportunity:[7]}};
function fresh(){return {...structuredClone(original),campaign:{...original.campaign,version:9,status:'COMPLETED'},recipients:[{...original.recipients[0],contact:{id:7,name:'Updated contact'},version:9,stepIndex:1,message:'remote message',notes:'remote notes',nextActionAt:null}],opportunities:[{contactId:7,id:10,name:'Updated opportunity',flowId:30},{contactId:7,id:11,name:'Second'}]}}
test('refresh changes contact and opportunity references while preserving operational baselines for unsaved inputs',()=>{
  const result=mergeOpportunityReturn(original,fresh());assert.equal(result.recipients[0].contact.name,'Updated contact');assert.equal(result.opportunities[0].name,'Updated opportunity');assert.equal(result.opportunities[0].flowId,30);
  for(const field of ['version','stepIndex','state','message','notes','nextActionAt'])assert.equal(result.recipients[0][field],original.recipients[0][field]);
  assert.equal(result.campaign.version,1);assert.equal(result.campaign.status,'ACTIVE');assert.equal(result.events,original.events);assert.deepEqual(Array.from(result.resultContacts.withOpportunity),[7]);assert.equal(result.campaign.outcomes.withOpportunity,1);
});
test('an authoritative removal or permission revocation clears presence without a false positive or zero-access fallback',()=>{
  const removed=mergeOpportunityReturn(original,{...fresh(),opportunities:[]});assert.equal(removed.opportunities.length,0);assert.equal(removed.campaign.outcomes.withOpportunity,0);
  const denied=mergeOpportunityReturn(original,{...fresh(),opportunities:null});assert.equal(denied.opportunities,null);assert.equal(denied.resultContacts.withOpportunity,null);assert.equal(denied.campaign.outcomes.withOpportunity,null);
});
test('invalid or stale-scope response is rejected before replacing workspace data',()=>{
  assert.throws(()=>mergeOpportunityReturn(original,{...fresh(),campaign:{id:'other'}}));assert.throws(()=>mergeOpportunityReturn(original,{...fresh(),opportunities:undefined}));
  assert.equal(original.opportunities[0].name,'Before');assert.equal(original.recipients[0].notes,'base notes');
});
