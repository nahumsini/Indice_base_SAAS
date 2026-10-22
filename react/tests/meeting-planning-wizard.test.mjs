import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root='src/app/ComplementaryModules/MinutesControl/';
const load=(file,require)=>loadTypescript(resolve(root+file),require);
const dates=load('utils/dateScope.ts'),workflow=load('translations/meetingWorkflowCopy.ts'),labels=load('translations/meetingPlanningStepsCopy.ts');
const copy=load('translations/meetingCopy.ts').getMeetingCopy('es-MX'),w=workflow.getMeetingWorkflowCopy('es-MX');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},stub=new Proxy({},{get:(_,key)=>key});
const nodes=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
class ApiClientError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status;}}
const planning=load('utils/meetingPlanning.ts',id=>id==='./dateScope'?dates:{ApiClientError});
globalThis.requestAnimationFrame=fn=>fn();
const members=[{id:42,name:'Coordinator'},{id:43,name:'Writer'}];
const previewFor=body=>({count:body.recurrence?.count??1,timezone:body.meeting.timezone,monthlyClamp:false,overlapUsesEarlierOffset:false,occurrences:[{number:1,startAt:body.meeting.startAt,endAt:body.meeting.endAt,conflicts:0}]});
function harness(options={}){
 const runtime=hookRuntime(),previews=[],writes=[],closed=[],planned=[],saved=[];let revision=0,valid=true;
 const api={members:async()=>({items:members,total:2}),flows:async()=>[],preview:async body=>{previews.push(body);return options.preview?options.preview(body,previews.length):previewFor(body);},plan:async(body,key)=>{writes.push({body,key});return options.plan?options.plan(body,key,writes.length):{firstMeetingId:100,count:body.recurrence?.count??1,seriesId:null,flowId:null};},edit:async(id,body)=>writes.push({id,body})};
 const {MeetingPlanningModal}=load('components/MeetingPlanningModal.tsx',id=>{
  if(id==='react')return {...runtime.hooks,useId:()=> 'planning-form'};
  if(id==='react/jsx-runtime')return jsx;
  if(id.endsWith('/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id.endsWith('/authSessionStore'))return {getAuthorizationRevision:()=>revision};
  if(id.endsWith('/useAuthorizationRevision'))return {useAuthorizationRevision:()=>revision};
  if(id.endsWith('/apiClient'))return {ApiClientError};
  if(id.endsWith('/meetingApi'))return {meetingApi:api};
  if(id.endsWith('/meetingPlanning'))return planning;
  if(id.endsWith('/meetingWorkflowCopy'))return workflow;
  if(id.endsWith('/meetingPlanningStepsCopy'))return labels;
  if(id.endsWith('/meetingLiveCopy'))return load('translations/meetingLiveCopy.ts');
  if(id.endsWith('/meetingOperationsCopy'))return load('translations/meetingOperationsCopy.ts');
  if(id.endsWith('/MeetingPrimitives'))return {Action:"Action",Field:"Field",Feedback:"Feedback",control:"control",useMeetingQuery:fn=>{const [data,setData]=runtime.hooks.useState();runtime.hooks.useEffect(()=>{const controller=new AbortController();fn(controller.signal).then(setData);return()=>controller.abort();},[fn]);return {data,loading:!data,error:false};}};
  return stub;
 });
 runtime.render(()=>MeetingPlanningModal({copy,userId:42,administrator:true,suggestedDate:'2090-10-23',initial:options.initial,onClose:()=>closed.push(true),onSaved:()=>saved.push(true),onPlanned:value=>planned.push(value)}));
 const form=()=>nodes(runtime.result).find(n=>n.type==='form');
 const attach=()=>{if(form())form().props.ref.current={reportValidity:()=>valid,querySelector:()=>null,focus(){}};};
 const flush=async()=>{await runtime.flush();attach();};attach();
 return {runtime,previews,writes,closed,planned,saved,flush,form,valid:v=>{valid=v;},authorization:v=>{revision=v;runtime.render();attach();}};
}
const field=(h,type)=>nodes(h.runtime.result).find(n=>n.type===type);
const step=h=>field(h,'IndiceModalWizardStepper').props.activeStepId;
const actions=h=>nodes(h.runtime.result.props.footer).filter(n=>n.type==='Action');
const advance=async h=>{const button=actions(h).at(-1);assert.equal(button.props.disabled,false);button.props.onClick();await h.flush();};
const back=async h=>{actions(h)[0].props.onClick();await h.flush();};
const update=async(h,patch)=>{(field(h,'PurposePeople')??field(h,'ScheduleSetup')??field(h,'PlanReview')).props.update(patch);await h.flush();};
const purpose={title:'Planning review',objective:'Clarify priorities',expectedResult:'Assign next steps'};
async function schedule(h){await h.flush();await update(h,purpose);await advance(h);await advance(h);assert.equal(step(h),'2');}
async function submit(h){h.form().props.onSubmit({preventDefault(){}});await h.flush();}

test('single meeting uses four gated steps; Back retains people, date and agenda; only final review writes',async()=>{
 const h=harness();await h.flush();assert.equal(h.runtime.result.props.modalType,'wizard');assert.equal(field(h,'IndiceModalWizardStepper').props.steps.length,4);assert.equal(field(h,'PurposePeople').props.part,'purpose');assert.equal(field(h,'ScheduleSetup'),undefined);assert.equal(h.previews.length,0);
 await advance(h);assert.equal(step(h),'0');assert.ok(field(h,'IndiceModalValidation'));
 await update(h,purpose);await advance(h);assert.equal(step(h),'1');assert.equal(field(h,'PurposePeople').props.part,'team');await update(h,{minutesOwnerId:43,participantIds:[43]});await advance(h);assert.equal(field(h,'ScheduleSetup').props.guided,false);
 await update(h,{duration:45,agenda:'Decide the three priorities',location:'Room 2',reminderMinutes:15});await back(h);assert.equal(field(h,'PurposePeople').props.form.minutesOwnerId,43);await back(h);assert.equal(field(h,'PurposePeople').props.form.title,purpose.title);await advance(h);await advance(h);assert.equal(field(h,'ScheduleSetup').props.form.start,'2090-10-23T09:00');await advance(h);
 assert.equal(step(h),'3');assert.equal(h.writes.length,0);assert.equal(field(h,'PlanReview').props.allowSaveFlow,false);await submit(h);assert.equal(h.writes.length,1);assert.equal(h.writes[0].body.meeting.agenda,'Decide the three priorities');assert.equal(h.writes[0].body.meeting.minutesOwnerId,43);assert.deepEqual(h.writes[0].body.meeting.participantIds,[43]);assert.equal(h.writes[0].body.recurrence,null);assert.equal(h.planned.length,1);h.runtime.unmount();
});
test('current-step native validity and active people validation prevent advancing',async()=>{
 const h=harness();await h.flush();await update(h,purpose);h.valid(false);await advance(h);assert.equal(step(h),'0');h.valid(true);await advance(h);await update(h,{minutesOwnerId:43,participantIds:[]});await advance(h);assert.equal(step(h),'1');assert.equal(field(h,'IndiceModalValidation').props.messages[0],w.peopleInvalid);assert.equal(h.previews.length,0);h.runtime.unmount();
});
test('preview failure stays on schedule; retry reaches explicit overlap review and time changes clear acknowledgment',async()=>{
 const h=harness({preview:(body,n)=>{if(n===1)throw new Error('offline');const value=previewFor(body);value.occurrences[0].conflicts=1;return value;}});await schedule(h);await advance(h);assert.equal(step(h),'2');assert.equal(field(h,'ScheduleSetup').props.form.title,purpose.title);await advance(h);assert.equal(step(h),'3');assert.equal(actions(h).at(-1).props.disabled,true);await update(h,{allowConflicts:true});assert.equal(actions(h).at(-1).props.disabled,false);await back(h);await update(h,{duration:30});assert.equal(field(h,'ScheduleSetup').props.form.allowConflicts,false);await advance(h);assert.equal(actions(h).at(-1).props.disabled,true);assert.equal(h.writes.length,0);h.runtime.unmount();
});
test('pending guards prevent duplicate preview/submission and dismissal; failed save retains the retry key',async()=>{
 let releasePreview,releasePlan;const h=harness({preview:body=>new Promise(resolve=>{releasePreview=()=>resolve(previewFor(body));}),plan:(body,key,n)=>n===1?Promise.reject(new Error('offline')):new Promise(resolve=>{releasePlan=()=>resolve({firstMeetingId:100,count:1,seriesId:null,flowId:null});})});await schedule(h);
 const next=actions(h).at(-1).props.onClick;next();next();await h.flush();assert.equal(h.previews.length,1);h.runtime.result.props.onOpenChange(false);assert.equal(h.closed.length,0);releasePreview();await h.flush();assert.equal(step(h),'3');await submit(h);assert.equal(h.writes.length,1);const key=h.writes[0].key;assert.ok(key);
 const onSubmit=h.form().props.onSubmit;onSubmit({preventDefault(){}});onSubmit({preventDefault(){}});await h.flush();assert.equal(h.writes.length,2);assert.equal(h.writes[1].key,key);h.runtime.result.props.onOpenChange(false);assert.equal(h.closed.length,0);releasePlan();await h.flush();assert.equal(h.planned.length,1);h.runtime.unmount();
});
test('series mode keeps the wizard, enables recurrence and reviews the existing recurrence payload',async()=>{
 const h=harness();await h.flush();nodes(h.runtime.result).find(n=>n.type==='button'&&n.props['aria-pressed']===false).props.onClick();await h.flush();assert.equal(h.runtime.result.props.modalType,'wizard');await update(h,purpose);await advance(h);await advance(h);assert.equal(field(h,'ScheduleSetup').props.guided,true);await update(h,{recurring:true,count:3,frequency:'WEEKLY',interval:1});await advance(h);assert.equal(field(h,'PlanReview').props.allowSaveFlow,true);await submit(h);assert.deepEqual(h.writes[0].body.recurrence,{frequency:'WEEKLY',interval:1,count:3});h.runtime.unmount();
});
test('discard uses the same frame and preserves the current step; authorization changes invalidate pending preview',async()=>{
 let done;const h=harness({preview:body=>new Promise(resolve=>{done=()=>resolve(previewFor(body));})});await schedule(h);h.runtime.result.props.onOpenChange(false);await h.flush();assert.equal(h.runtime.result.props.modalType,'confirmation');actions(h)[0].props.onClick();await h.flush();assert.equal(step(h),'2');assert.equal(field(h,'ScheduleSetup').props.form.title,purpose.title);actions(h).at(-1).props.onClick();await h.flush();h.authorization(1);await h.flush();assert.equal(h.closed.length,1);done();await h.flush();assert.equal(step(h),'2');assert.equal(h.writes.length,0);h.runtime.unmount();
});
test('editing existing single meetings retains its existing owner form and version',async()=>{
 const initial={meeting:{id:9,title:'Existing',meetingType:'WORKING',ownerId:42,startAt:'2090-10-23T09:00:00Z',endAt:'2090-10-23T10:00:00Z',version:7},participants:members,agenda:'Keep agenda',location:'Keep location'};const h=harness({initial});await h.flush();assert.equal(h.runtime.result.props.modalType,'standard-form');assert.equal(field(h,'PurposePeople').props.part,'all');await submit(h);assert.equal(h.writes[0].id,9);assert.equal(h.writes[0].body.expectedVersion,7);assert.equal(h.saved.length,1);assert.equal(h.previews.length,0);h.runtime.unmount();
});
test('all supported locales have every step label, hint and explicit fallback',()=>{
 const keys=Object.keys(labels.getMeetingPlanningStepsCopy('en-CA'));for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){const c=labels.getMeetingPlanningStepsCopy(locale);assert.deepEqual(Object.keys(c),keys);assert.ok(Object.values(c).every(value=>value.trim()));}assert.deepEqual(labels.getMeetingPlanningStepsCopy('unknown'),labels.getMeetingPlanningStepsCopy('en-CA'));
});
