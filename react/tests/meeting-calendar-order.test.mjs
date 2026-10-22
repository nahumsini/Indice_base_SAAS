import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const base='src/app/ComplementaryModules/MinutesControl/';
const load=path=>loadTypescript(resolve(base+path));
const dates=load('utils/dateScope.ts'),workspace=load('translations/meetingWorkspaceCopy.ts'),copy=load('translations/meetingCopy.ts').getMeetingCopy('es-MX');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const icons=new Proxy({},{get:(_,key)=>key});
const resolveModule=id=>id==='react/jsx-runtime'?jsx:id.endsWith('/dateScope')?dates:id.endsWith('/meetingWorkspaceCopy')?workspace:id.endsWith('.css')?{}:icons;
const {MeetingCalendar}=loadTypescript(resolve(base+'components/MeetingCalendar.tsx'),resolveModule);
const {MeetingDayAgenda}=loadTypescript(resolve(base+'components/MeetingDayAgenda.tsx'),resolveModule);
const nodes=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
function render(overrides={}){const changes=[],opens=[],days=[];const props={items:[],from:'2090-10-01',to:'2090-10-31',selectedDate:'2090-10-22',copy,locale:'es-MX',onRange:value=>changes.push(value),onSelectDate:value=>changes.push(value),onOpen:id=>opens.push(id),onDayOpen:date=>days.push(date),...overrides};return {tree:MeetingCalendar(props),changes,opens,days};}
function agenda(overrides={}){const creates=[],opens=[],clears=[],closes=[],retries=[];return {creates,opens,clears,closes,retries,tree:MeetingDayAgenda({date:'2090-10-22',items:[],copy,locale:'es-MX',onCreate:date=>creates.push(date),onOpen:id=>opens.push(id),onClearFilters:()=>clears.push(true),onClose:()=>closes.push(true),onRetry:()=>retries.push(true),...overrides})};}
const actions=tree=>nodes(tree).filter(n=>n.type==='Action');
const records=Array.from({length:5},(_,i)=>({id:5-i,title:'Meeting '+(5-i),startAt:`2090-10-22T${String(13-i).padStart(2,'0')}:00:00`,endAt:`2090-10-22T${String(14-i).padStart(2,'0')}:00:00`,ownerName:'Coordinator',participantCount:2,status:'PLANNED'}));
test('calendar has no persistent daily panel; a date and its overflow explicitly open the day modal',()=>{
 const result=render({items:records});assert.doesNotMatch(JSON.stringify(result.tree),/Juntas del día|No hay juntas para este día|meeting-calendar-detail/);const surface=nodes(result.tree).find(n=>n.type==='IndiceCalendarSurface');surface.props.onSelectDate('2090-10-23');assert.deepEqual(result.changes,['2090-10-23']);assert.deepEqual(result.days,['2090-10-23']);assert.deepEqual(result.opens,[]);
 const preview=nodes(surface.props.renderDay('2090-10-22')).filter(n=>n.type==='button');assert.equal(preview.length,4);preview.at(-1).props.onClick();assert.deepEqual(result.days,['2090-10-23','2090-10-22']);preview[0].props.onClick();assert.deepEqual(result.opens,[1]);
 const day=render({from:'2090-10-22',to:'2090-10-22'});assert.equal(nodes(day.tree).filter(n=>n.type==='IndiceCalendarSurface').length,1);
});
test('empty modal explains scope, captures its date, closes normally and respects past/read-only capture',()=>{
 const result=agenda();assert.equal(result.tree.type,'IndiceModalFrame');assert.equal(result.tree.props.modalType,'standard-form');assert.match(JSON.stringify(result.tree),/No hay juntas para este día/);const footer=result.tree.props.footer;actions(footer).find(n=>JSON.stringify(n.props.children).includes('Programar junta')).props.onClick();assert.deepEqual(result.creates,['2090-10-22']);result.tree.props.onOpenChange(false);assert.deepEqual(result.closes,[true]);
 const past=agenda({date:'2020-01-01'}),read=agenda({onCreate:undefined});for(const a of [past,read])assert.ok(!JSON.stringify(a.tree.props.footer).includes('Programar junta'));
});
test('daily modal orders every loaded row and distinguishes filtered, loading, retry and truncated scope',()=>{
 const result=agenda({items:[...records,{...records[0],id:99,startAt:'2090-10-23T09:00:00'}],partial:true});const buttons=nodes(result.tree).filter(n=>n.type==='button');assert.equal(buttons.length,5);buttons[0].props.onClick();assert.deepEqual(result.opens,[1]);assert.equal(records[0].id,5);assert.ok(nodes(result.tree).some(n=>n.type==='Feedback'&&n.props.children===copy.partial));
 const filtered=agenda({filtered:true});assert.match(JSON.stringify(filtered.tree),/No hay juntas que coincidan con tus filtros/);assert.doesNotMatch(JSON.stringify(filtered.tree),/No hay juntas para este día/);actions(filtered.tree).find(n=>n.props.children==='Limpiar filtros').props.onClick();assert.deepEqual(filtered.clears,[true]);
 const loading=agenda({loading:true});assert.doesNotMatch(JSON.stringify(loading.tree),/No hay juntas para este día/);const failed=agenda({error:true});assert.doesNotMatch(JSON.stringify(failed.tree),/No hay juntas para este día/);actions(failed.tree).find(n=>n.props.children===copy.refresh).props.onClick();assert.deepEqual(failed.retries,[true]);
});
test('one parent dialog replaces day agenda with detail/planning and returns to the same day',async()=>{
 const runtime=hookRuntime();const {default:MeetingsTab}=loadTypescript(resolve(base+'tabs/MeetingsTab.tsx'),id=>id==='react'?runtime.hooks:id==='react-router'?{useSearchParams:()=>[new URLSearchParams(),()=>{}]}:id.endsWith('/MeetingPrimitives')?{...icons,dateInput:dates.dateInput,instantRange:dates.instantRange,useMeetingQuery:()=>({data:{items:[],total:0},reload(){},loading:false,error:false})}:id.endsWith('/useWorkspaceNavigationMemory')?{useWorkspaceNavigationMemory(){}}:id.endsWith('/meetingWorkflowCopy')?load('translations/meetingWorkflowCopy.ts'):resolveModule(id));
 runtime.render(()=>MeetingsTab({copy,locale:'es-MX',userId:42,administrator:true}));let calendar=nodes(runtime.result).find(n=>n.type==='MeetingCalendar');calendar.props.onDayOpen('2090-10-23');await runtime.flush();let day=nodes(runtime.result).find(n=>n.type==='MeetingDayAgenda');assert.equal(day.props.date,'2090-10-23');day.props.onOpen(5);await runtime.flush();assert.ok(!nodes(runtime.result).some(n=>n.type==='MeetingDayAgenda'));let detail=nodes(runtime.result).find(n=>n.type==='MeetingDetail');assert.equal(detail.props.id,5);detail.props.onClose();await runtime.flush();day=nodes(runtime.result).find(n=>n.type==='MeetingDayAgenda');assert.equal(day.props.date,'2090-10-23');day.props.onCreate('2090-10-23');await runtime.flush();assert.ok(!nodes(runtime.result).some(n=>n.type==='MeetingDayAgenda'));const editor=nodes(runtime.result).find(n=>n.type==='MeetingEditor');assert.equal(editor.props.suggestedDate,'2090-10-23');editor.props.onClose();await runtime.flush();day=nodes(runtime.result).find(n=>n.type==='MeetingDayAgenda');day.props.onClose();await runtime.flush();assert.ok(!nodes(runtime.result).some(n=>['MeetingDayAgenda','MeetingDetail','MeetingEditor'].includes(n.type)));runtime.unmount();
});
test('date prefill preserves selected local day through planning payload',()=>{
 class ApiClientError extends Error{}
 const {initialPlanning,planningRequest}=loadTypescript(resolve(base+'utils/meetingPlanning.ts'),id=>id==='./dateScope'?dates:{ApiClientError});
 const form=initialPlanning(42,'2090-02-28');assert.equal(form.start,'2090-02-28T09:00');assert.equal(form.ownerId,42);
 const request=planningRequest(form,Intl.DateTimeFormat().resolvedOptions().timeZone);assert.equal(dates.dateInput(new Date(request.meeting.startAt)),'2090-02-28');
 assert.equal(Date.parse(request.meeting.endAt)-Date.parse(request.meeting.startAt),3600000);assert.throws(()=>initialPlanning(42,'2090-02-30'));
 assert.ok(Date.parse(planningRequest(initialPlanning(42),'UTC').meeting.startAt)>Date.now());
});
