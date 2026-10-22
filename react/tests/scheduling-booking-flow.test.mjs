import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/ComplementaryModules/Scheduling/',import.meta.url);
const load = (file,resolve=()=>({}))=>loadTypescript(new URL(file,root).pathname,resolve);
const utils = load('utils/bookingFlow.ts');
const day = new Date(Date.now()+2*86400000).toISOString().slice(0,10), instant = `${day}T10:00:00Z`;
const source = {staff:[{id:2,publicName:'Ana',timezone:'UTC',serviceIds:[1]},{id:3,publicName:'Zoe',timezone:'UTC',serviceIds:[6]}],services:[{id:1,name:'Demo',durationMinutes:60,chargePolicy:'NO_CHARGE'},{id:6,name:'Consulta',durationMinutes:30,chargePolicy:'TO_BE_AGREED'}],events:[{id:4,staffId:3,title:'Evento',startAt:instant,durationMinutes:60,availablePlaces:2}],clientSelectionEnabled:true};
function harness(overrides={}) {
 const runtime=hookRuntime(),writes=[],slots=[],activity=[],dirty=[];
 const {useBookingFlow}=load('hooks/useBookingFlow.ts',id=>id==='react'?runtime.hooks:utils);
 const options={catalog:source,presetDate:day,loadSlots:async(request,signal)=>{slots.push({request,signal});return {timezone:'UTC',starts:[instant]};},onSubmit:async(body,key)=>{writes.push({body,key});return {reference:'SCH-synthetic',status:'REQUESTED',submissionPolicy:'REVIEW_REQUIRED'};},onBusyChange:value=>activity.push(value),onDirtyChange:value=>dirty.push(value),...overrides};
 runtime.render(()=>useBookingFlow(options));
 return {runtime,writes,slots,activity,dirty,get flow(){return runtime.result;}};
}
const choose=async h=>{h.flow.chooseSelection('service:1');h.flow.changeStaff(2);await h.runtime.flush();};
const next=async h=>{await h.flow.submit();await h.runtime.flush();};
const contacts=async h=>{h.flow.editContact('attendeeName','Synthetic visitor');h.flow.editContact('attendeeEmail','visitor@example.com');h.flow.setConsent(true);await h.runtime.flush();};
const review=async h=>{await choose(h);await next(h);h.flow.chooseTime(instant);await h.runtime.flush();await next(h);await contacts(h);await next(h);};

test('four-stage capture retains suggested date, contact and selected client across Back; writes only after review',async()=>{
 const h=harness();await h.runtime.flush();assert.equal(h.dirty.at(-1),false);assert.equal(h.slots.length,0);
 await choose(h);await next(h);assert.equal(h.flow.date,day);assert.equal(h.flow.timeReady,false);
 h.flow.chooseTime(instant);await h.runtime.flush();await next(h);
 h.flow.selectClient({id:11,contactPerson:'Existing client',email:'client@example.com',companyName:'Company',phone:'123'});h.flow.setConsent(true);await h.runtime.flush();await next(h);
 h.flow.goTo('time');await h.runtime.flush();assert.equal(h.flow.startAt,instant);await next(h);assert.equal(h.flow.clientId,11);assert.equal(h.flow.contact.attendeeEmail,'client@example.com');await next(h);
 assert.equal(h.writes.length,0);await next(h);assert.equal(h.writes.length,1);assert.equal(h.writes[0].body.clientId,11);assert.equal(h.writes[0].body.serviceId,1);assert.equal(h.writes[0].body.eventId,null);assert.equal('chargePolicy' in h.writes[0].body,false);assert.equal(h.flow.receipt.reference,'SCH-synthetic');assert.equal(h.dirty.at(-1),false);
 await next(h);assert.equal(h.writes.length,1);
});
test('immediate duplicate submission is locked; a failed retry keeps its request identity and contact draft',async()=>{
 let release,fail=true;const seen=[];
 const h=harness({onSubmit:async(body,key)=>{seen.push({body,key});await new Promise(resolve=>release=resolve);if(fail)throw new Error('Synthetic failure');return {reference:'SCH-retry',status:'REQUESTED',submissionPolicy:'REVIEW_REQUIRED'};}});
 await review(h);const first=h.flow.submit(),second=h.flow.submit();assert.equal(seen.length,1);assert.equal(h.activity.at(-1),true);release();await Promise.all([first,second]);await h.runtime.flush();assert.equal(h.flow.step,'review');assert.equal(h.flow.error,'submit');assert.equal(h.flow.contact.attendeeName,'Synthetic visitor');
 fail=false;const again=h.flow.submit();assert.equal(seen.length,2);assert.deepEqual(seen[0],seen[1]);release();await again;await h.runtime.flush();assert.equal(h.flow.receipt.reference,'SCH-retry');assert.equal(h.activity.at(-1),false);
});
test('changing service clears ineligible staff and old slots, while changing the payload rotates retry identity',async()=>{
 const seen=[];const h=harness({onSubmit:async(body,key)=>{seen.push({body,key});throw new Error('Synthetic retry');}});await review(h);await next(h);
 h.flow.goTo('choose');await h.runtime.flush();h.flow.chooseSelection('service:6');await h.runtime.flush();assert.equal(h.flow.staffId,0);assert.equal(h.flow.startAt,'');assert.equal(h.flow.slots,undefined);
 h.flow.changeStaff(3);await h.runtime.flush();await next(h);h.flow.chooseTime(instant);await h.runtime.flush();await next(h);await next(h);await next(h);
 assert.equal(seen.length,2);assert.notEqual(seen[0].key,seen[1].key);assert.equal(seen[1].body.serviceId,6);
});
test('late slot responses are ignored and explicit refresh recovers a failed slot lookup',async()=>{
 const pending=[];const h=harness({loadSlots:(request,signal)=>new Promise((resolve,reject)=>pending.push({request,signal,resolve,reject}))});await choose(h);assert.equal(pending.length,1);
 const later=new Date(Date.parse(`${day}T00:00:00Z`)+86400000).toISOString().slice(0,10);h.flow.changeDate(later);await h.runtime.flush();assert.equal(pending[0].signal.aborted,true);pending[0].resolve({timezone:'UTC',starts:[instant]});pending[1].reject(new Error('Synthetic slot failure'));await h.runtime.flush();assert.equal(h.flow.slots,undefined);assert.equal(h.flow.slotError,true);
 h.flow.refreshSlots();await h.runtime.flush();pending[2].resolve({timezone:'UTC',starts:[`${later}T12:00:00Z`]});await h.runtime.flush();assert.equal(h.flow.slotError,false);assert.deepEqual(h.flow.slots.starts,[`${later}T12:00:00Z`]);
});
test('409 returns to time selection with contact retained, catalog refresh preserves contact and invalidates old availability',async()=>{
 let loads=0;const h=harness({onSubmit:async()=>{throw {status:409};},loadCatalog:async()=>{loads++;return {...source,services:[]};}});await review(h);await next(h);assert.equal(h.flow.step,'time');assert.equal(h.flow.error,'conflict');assert.equal(h.flow.startAt,'');assert.equal(h.flow.contact.attendeeEmail,'visitor@example.com');
 await h.flow.refreshCatalog();await h.runtime.flush();assert.equal(loads,1);assert.equal(h.flow.step,'choose');assert.equal(h.flow.chooseReady,false);assert.equal(h.flow.contact.attendeeEmail,'visitor@example.com');
});
test('contact checks and client creation gate review; editing a linked client clears authority and renews consent',async()=>{
 const h=harness();await choose(h);await next(h);h.flow.chooseTime(instant);await h.runtime.flush();await next(h);await next(h);assert.equal(h.flow.error,'contact');assert.equal(h.writes.length,0);
 h.flow.selectClient({id:10,contactPerson:'Client',email:'client@example.com',companyName:'Company',phone:''});h.flow.setConsent(true);await h.runtime.flush();h.flow.editContact('attendeeEmail','manual@example.com');await h.runtime.flush();assert.equal(h.flow.clientId,undefined);assert.equal(h.flow.contact.contactConsent,false);
 h.flow.setConsent(true);h.flow.setCreatingClient(true);await h.runtime.flush();await next(h);assert.equal(h.flow.error,'client');assert.equal(h.flow.step,'contact');h.flow.onClientBusyChange(true);await h.runtime.flush();h.flow.goTo('choose');await h.runtime.flush();assert.equal(h.flow.step,'contact');h.flow.onClientBusyChange(false);h.flow.setCreatingClient(false);await h.runtime.flush();await next(h);assert.equal(h.flow.step,'review');
});
test('events retain their host and fixed start and bypass slot lookup',async()=>{
 const h=harness();h.flow.chooseSelection('event:4');await h.runtime.flush();assert.equal(h.flow.staffId,3);await next(h);assert.equal(h.slots.length,0);await next(h);await contacts(h);await next(h);await next(h);assert.equal(h.writes[0].body.eventId,4);assert.equal(h.writes[0].body.serviceId,null);assert.equal(h.writes[0].body.startAt,instant);
});
test('90-day date bounds follow the collaborator zone; contact limits and all eight locales are explicit',()=>{
 assert.deepEqual(utils.slotDateBounds('America/Toronto',new Date('2026-01-01T01:00:00Z')),{min:'2025-12-31',max:'2026-03-31'});
 assert.equal(utils.validBookingContact({...utils.emptyBookingContact,attendeeName:' ',attendeeEmail:'a@example.com',contactConsent:true}),false);
 assert.equal(utils.validBookingContact({...utils.emptyBookingContact,attendeeName:'A',attendeeEmail:'a@example.com',attendeePhone:'x'.repeat(41),contactConsent:true}),false);
 const {getBookingFlowCopy:get}=load('translations/bookingFlowCopy.ts');const keys=Object.keys(get('en-CA'));
 for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){assert.deepEqual(Object.keys(get(locale)),keys);assert.ok(Object.values(get(locale)).every(value=>value.trim()));}assert.equal(get('unknown'),get('en-CA'));
});

test('private modal blocks synchronous dismissal while busy and Escape restores the retained draft from discard',async()=>{
 const runtime=hookRuntime(),closed=[],calls=[];let revision=1;
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
 const stub=new Proxy({},{get:(_,key)=>key});
 const {getSchedulingCopy}=load('translations/schedulingCopy.ts',()=>load('translations/schedulingWorkspaceCopy.ts'));
 const {InternalBookingModal}=load('components/InternalBookingModal.tsx',id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
  if(id.endsWith('/authSessionStore'))return {getAuthorizationRevision:()=>revision};
  if(id.endsWith('/useSchedulingQuery'))return {useSchedulingQuery:()=>({data:source,loading:false,error:false,reload(){}})};
  if(id.endsWith('/schedulingApi'))return {schedulingApi:{request:async()=>calls.push('request'),slots:async()=>calls.push('slots'),catalog:async()=>calls.push('catalog')}};
  if(id.endsWith('/schedulingSetupCopy'))return load('translations/schedulingSetupCopy.ts');
  if(id.endsWith('/schedulingOperationsCopy'))return load('translations/schedulingOperationsCopy.ts');
  if(id.endsWith('/bookingFlowCopy'))return load('translations/bookingFlowCopy.ts');
  if(id.endsWith('/bookingFlow'))return utils;
  if(id.endsWith('/schedulingIdentity'))return {schedulingTone:'coral',schedulingEmoji:{calendar:'📅'}};
  return stub;
 });
 runtime.render(()=>InternalBookingModal({copy:getSchedulingCopy('es-MX'),locale:'es-MX',onClose:()=>closed.push(true)}));
 const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
 const form=()=>nodes(runtime.result).find(node=>node.type==='BookingForm');
 form().props.onBusyChange(true);runtime.result.props.onOpenChange(false);assert.equal(closed.length,0);await runtime.flush();assert.equal(runtime.result.props.busy,true);
 form().props.onBusyChange(false);form().props.onDirtyChange(true);await runtime.flush();runtime.result.props.onOpenChange(false);await runtime.flush();assert.equal(runtime.result.props.modalType,'confirmation');assert.ok(form());
 runtime.result.props.onOpenChange(false);await runtime.flush();assert.equal(runtime.result.props.modalType,'wizard');assert.equal(closed.length,0);
 revision=2;await assert.rejects(form().props.onSubmit({},'synthetic-key'),/scheduling_scope_changed/);assert.deepEqual(calls,[]);
});

test('missing resources return to selection and server authorization failures never create a local receipt',async()=>{
 for(const status of [401,403,404]){
  const h=harness({onSubmit:async()=>{throw {status};}});await review(h);await next(h);
  assert.equal(h.flow.receipt,undefined);assert.equal(h.flow.contact.attendeeEmail,'visitor@example.com');
  assert.equal(h.flow.error,status===404?'conflict':'scope');if(status===404)assert.equal(h.flow.step,'choose');
 }
});

test('public presentation never mounts the private client picker even if a catalogue accidentally advertises client selection',()=>{
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},stub=new Proxy({},{get:(_,key)=>key});
 const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
 const {getSchedulingCopy}=load('translations/schedulingCopy.ts',()=>load('translations/schedulingWorkspaceCopy.ts'));
 for(const context of ['public','internal']){
  const runtime=hookRuntime();
  const flow={catalog:source,service:source.services[0],staff:source.staff[0],step:'contact',contactVisited:true,contact:{...utils.emptyBookingContact},startAt:instant,creatingClient:false};
  const {BookingForm}=load('components/BookingForm.tsx',id=>{
   if(id==='react')return {...runtime.hooks,useId:()=> 'boundary-form'};if(id==='react/jsx-runtime')return jsx;
   if(id.endsWith('/useBookingFlow'))return {useBookingFlow:()=>flow};
   if(id.endsWith('/bookingFlow'))return utils;
   if(id.endsWith('/bookingFlowCopy'))return load('translations/bookingFlowCopy.ts');
   if(id.endsWith('/schedulingOperationsCopy'))return load('translations/schedulingOperationsCopy.ts');
   if(id.endsWith('/serviceTermsCopy'))return load('translations/serviceTermsCopy.ts');
   if(id.endsWith('/schedulingIdentity'))return {schedulingTone:'coral'};
   if(id.endsWith('/moduleColors'))return {MODULE_COLORS:{blue:{primary:'#2563EB'}}};
   if(id.endsWith('/IndiceFilterBar'))return {getIndiceFilterControlClassName:()=>''};return stub;
  });
  runtime.render(()=>BookingForm({context,catalog:source,copy:getSchedulingCopy('es-MX'),locale:'es-MX'}));
  assert.equal(nodes(runtime.result).some(node=>node.type==='BookingClientPicker'),context==='internal');
 }
});
