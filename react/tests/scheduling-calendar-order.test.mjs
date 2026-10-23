import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root='src/app/ComplementaryModules/Scheduling/';
const load=(file,require)=>loadTypescript(resolve(root+file),require);
const dates=load('utils/dateScope.ts'),scopes=load('utils/calendarScope.ts',()=>dates);
const labels=load('translations/schedulingCalendarCopy.ts'),experience=load('translations/schedulingExperienceCopy.ts');
const copy=load('translations/schedulingCopy.ts',()=>load('translations/schedulingWorkspaceCopy.ts')).getSchedulingCopy('es-MX');
const activities=load('utils/calendarActivities.ts',()=>dates);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},stub=new Proxy({},{get:(_,key)=>key});
const nodes=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const reservation=(id,hour)=>({id,startAt:`2090-10-22T${hour}:00:00`,durationMinutes:60,attendeeName:'Client '+id,serviceName:'Service',staffName:'Staff',status:'REQUESTED'});
const event=(id,hour)=>({id,startAt:`2090-10-22T${hour}:00:00`,durationMinutes:60,title:'Event '+id,capacity:10,confirmedCount:2,status:'ACTIVE'});
test('day labels cover every locale with contextual empty/filter messages',()=>{
 const keys=Object.keys(labels.getSchedulingCalendarCopy('en-CA'));
 for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){const c=labels.getSchedulingCalendarCopy(locale);assert.deepEqual(Object.keys(c),keys);assert.ok(Object.values(c).every(v=>v.trim()));}
 assert.equal(labels.getSchedulingCalendarCopy('es-MX').dayAgenda,'Agenda del día');
});
test('combined agenda retains reservation/event identities in chronological order',()=>{
 const source={items:[reservation(1,'12'),reservation(2,'10')],events:[event(1,'11')],total:2,eventsTotal:1};
 assert.deepEqual(activities.activitiesForDay(source,'2090-10-22').map(a=>a.key),['reservation-2','event-1','reservation-1']);assert.deepEqual(activities.activitiesForDay(source,'2090-10-23'),[]);assert.equal(source.items[0].id,1);
});
const resolveModule=id=>id==='react/jsx-runtime'?jsx:id.endsWith('/calendarActivities')?activities:id.endsWith('/dateScope')?dates:id.endsWith('/calendarScope')?scopes:id.endsWith('/schedulingCalendarCopy')?labels:id.endsWith('/schedulingExperienceCopy')?experience:id.endsWith('/schedulingIdentity')?{schedulingTone:'coral',schedulingEmoji:{calendar:'📅'}}:stub;
const {ReservationsCalendar}=load('components/ReservationsCalendar.tsx',resolveModule);
const {ReservationDayAgenda}=load('components/ReservationDayAgenda.tsx',resolveModule);
const empty={items:[],events:[],total:0,eventsTotal:0};
function calendar(extra={}){const reviews=[],selected=[],days=[];return {reviews,selected,days,tree:ReservationsCalendar({workspace:empty,from:'2090-10-01',to:'2090-10-31',selectedDate:'2090-10-22',copy,locale:'es-MX',onReview:r=>reviews.push(r.id),onSelectDate:d=>selected.push(d),onDayOpen:d=>days.push(d),...extra})};}
function agenda(extra={}){const creates=[],reviews=[],clears=[],closes=[],retries=[];return {creates,reviews,clears,closes,retries,tree:ReservationDayAgenda({workspace:empty,date:'2090-10-22',copy,locale:'es-MX',onReview:r=>reviews.push(r.id),onCreate:d=>creates.push(d),onClearFilters:()=>clears.push(true),onClose:()=>closes.push(true),onRetry:()=>retries.push(true),...extra})};}
test('calendar mirrors Meetings: no persistent day panel; day/overflow/event selects explicitly open the day modal',()=>{
 const source={items:[reservation(1,'12'),reservation(2,'10'),reservation(3,'13'),reservation(4,'14')],events:[event(1,'11')],total:20,eventsTotal:1};const result=calendar({workspace:source});
 assert.doesNotMatch(JSON.stringify(result.tree),/Agenda del día|No hay reservas ni eventos|scheduling-calendar-detail/);
 assert.ok(nodes(result.tree).some(n=>n.type==='Feedback'&&n.props.children===copy.partialCalendar));
 const surface=nodes(result.tree).find(n=>n.type==='IndiceCalendarSurface');surface.props.onSelectDate('2090-10-23');assert.deepEqual(result.selected,['2090-10-23']);assert.deepEqual(result.days,['2090-10-23']);
 const buttons=nodes(surface.props.renderDay('2090-10-22')).filter(n=>n.type==='button');assert.equal(buttons.length,4);buttons.at(-1).props.onClick();buttons[1].props.onClick();assert.deepEqual(result.days,['2090-10-23','2090-10-22','2090-10-22']);buttons[0].props.onClick();assert.deepEqual(result.reviews,[2]);
 const day=calendar({workspace:source,from:'2090-10-22',to:'2090-10-22'});assert.equal(nodes(day.tree).filter(n=>n.type==='IndiceCalendarSurface').length,1);
});
test('day modal keeps empty/filtered messages, selected-date capture, normal close and read-only/past-day restrictions',()=>{
 const plain=agenda();assert.equal(plain.tree.type,'IndiceModalFrame');assert.equal(plain.tree.props.modalType,'standard-form');assert.equal(plain.tree.props.tone,'coral');assert.match(JSON.stringify(plain.tree),/No hay reservas ni eventos para este día/);
 nodes(plain.tree.props.footer).find(n=>n.type==='ActionButton'&&JSON.stringify(n.props.children).includes(copy.newReservation)).props.onClick();assert.deepEqual(plain.creates,['2090-10-22']);plain.tree.props.onOpenChange(false);assert.deepEqual(plain.closes,[true]);
 const filtered=agenda({filtered:true});assert.match(JSON.stringify(filtered.tree),/No hay actividades que coincidan con los filtros/);assert.doesNotMatch(JSON.stringify(filtered.tree),/No hay reservas ni eventos para este día/);nodes(filtered.tree).find(n=>n.type==='ActionButton'&&n.props.children==='Limpiar filtros del día').props.onClick();assert.deepEqual(filtered.clears,[true]);
 for(const result of [agenda({onCreate:undefined}),agenda({date:'2020-01-01'})])assert.ok(!JSON.stringify(result.tree.props.footer).includes(copy.newReservation));
});
test('daily modal orders every loaded mixed activity, keeps reservation ownership and discloses partial/loading/failure scope',()=>{
 const source={items:[reservation(1,'12'),reservation(2,'10'),reservation(3,'13'),reservation(4,'14'),{...reservation(5,'09'),startAt:'2090-10-23T09:00:00'}],events:[event(1,'11')],total:20,eventsTotal:1};const result=agenda({workspace:source});
 const list=nodes(result.tree).find(n=>n.type==='ol'),rows=nodes(list).filter(n=>n.type==='button'||n.type==='article');assert.equal(rows.length,5);assert.equal(rows[1].type,'article');rows[0].props.onClick();assert.deepEqual(result.reviews,[2]);assert.equal(source.items[0].id,1);
 assert.ok(nodes(result.tree).some(n=>n.type==='Feedback'&&n.props.children===copy.partialCalendar));
 for(const state of [{loading:true},{error:true}]){const a=agenda(state);assert.doesNotMatch(JSON.stringify(a.tree),/No hay reservas ni eventos para este día/);assert.ok(!nodes(a.tree).some(n=>n.type==='ol'));}
 const failed=agenda({error:true});nodes(failed.tree).find(n=>n.type==='ActionButton'&&n.props.children===copy.retry).props.onClick();assert.deepEqual(failed.retries,[true]);
});
function workspace(extra={}){
 const runtime=hookRuntime(),originalWindow=globalThis.window;globalThis.window={location:{search:''}};
 let props={mode:'calendar',copy,locale:'es-MX',canRead:true,canCapture:true,canConfigure:true,...extra},index=0,calendarQuery={data:empty,loading:false,error:false,reload(){}};
 const {default:ReservationsTab}=load('tabs/ReservationsTab.tsx',id=>id==='react'?runtime.hooks:id==='react-router'?{useSearchParams:()=>[new URLSearchParams()]}:id.endsWith('/useSchedulingQuery')?{useSchedulingQuery:()=>[{}, {data:[],loading:false,error:false,reload(){}}, {reload(){}}, calendarQuery][index++]}:id.endsWith('/useWorkspaceNavigationMemory')?{useWorkspaceNavigationMemory(){}}:id.endsWith('/IndiceFilterDisclosure')?{...stub,useIndiceFilterDisclosureCopy:()=>({})}:resolveModule(id));
 runtime.render(()=>{index=0;return ReservationsTab(props);});
 return {runtime,all:()=>nodes(runtime.result),setProps:next=>{props={...props,...next};runtime.render();},setQuery:next=>{calendarQuery={...calendarQuery,...next};runtime.render();},stop:()=>{runtime.unmount();if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}};
}
test('one parent frame replaces day agenda with review/capture/setup and returns to the selected day',async()=>{
 const h=workspace();try{
 const get=type=>h.all().find(n=>n.type===type);
 get('ReservationsCalendar').props.onDayOpen('2090-10-23');await h.runtime.flush();let day=get('ReservationDayAgenda');assert.equal(day.props.date,'2090-10-23');
 day.props.onReview(reservation(2,'10'));await h.runtime.flush();assert.ok(!get('ReservationDayAgenda'));assert.equal(get('ReservationReview').props.record.id,2);get('ReservationReview').props.onClose();await h.runtime.flush();day=get('ReservationDayAgenda');assert.equal(day.props.date,'2090-10-23');
 day.props.onCreate('2090-10-23');await h.runtime.flush();assert.ok(!get('ReservationDayAgenda'));const capture=get('InternalBookingModal');assert.equal(capture.props.suggestedDate,'2090-10-23');capture.props.onSetup('services');await h.runtime.flush();assert.ok(!get('ReservationDayAgenda'));assert.ok(!get('InternalBookingModal'));get('AgendaConfigurationModal').props.onClose();await h.runtime.flush();day=get('ReservationDayAgenda');assert.equal(day.props.date,'2090-10-23');
 day.props.onCreate('2090-10-23');await h.runtime.flush();get('InternalBookingModal').props.onClose();await h.runtime.flush();get('ReservationDayAgenda').props.onClose();await h.runtime.flush();assert.ok(!get('ReservationDayAgenda'));assert.ok(!get('ReservationReview'));assert.ok(!get('InternalBookingModal'));
 }finally{h.stop();}
});
test('day consultation follows refreshed query state, clears only day filters and never exposes unauthorized capture',async()=>{
 const h=workspace({canCapture:false});try{
 const get=type=>h.all().find(n=>n.type===type);get('ReservationsCalendar').props.onDayOpen('2090-10-23');await h.runtime.flush();assert.equal(get('ReservationDayAgenda').props.onCreate,undefined);
 get('IndiceFilterSelect').props.onValueChange('CONFIRMED');await h.runtime.flush();assert.equal(get('ReservationDayAgenda').props.filtered,true);get('ReservationDayAgenda').props.onClearFilters();await h.runtime.flush();assert.equal(get('ReservationDayAgenda').props.filtered,false);assert.equal(get('ReservationDayAgenda').props.date,'2090-10-23');
 h.setQuery({data:undefined,loading:true});assert.equal(get('ReservationDayAgenda').props.loading,true);assert.equal(get('ReservationDayAgenda').props.workspace,undefined);
 h.setQuery({loading:false,error:true});assert.equal(get('ReservationDayAgenda').props.error,true);h.setProps({canRead:false});assert.ok(!get('ReservationDayAgenda'));
 }finally{h.stop();}
});
test('prefilled request date stays editable, starts clean and never selects a slot or submits implicitly',async()=>{
 const runtime=hookRuntime(),calls=[],dirty=[],sent=[];
 const {BookingForm}=load('components/BookingForm.tsx',id=>id==='react'?{...runtime.hooks,useId:()=> 'test-form'}:id==='react/jsx-runtime'?jsx:id.endsWith('/useBookingFlow')?load('hooks/useBookingFlow.ts',dep=>dep==='react'?runtime.hooks:load('utils/bookingFlow.ts')):id.endsWith('/bookingFlow')?load('utils/bookingFlow.ts'):id.endsWith('/publicAgendaBrandCopy')?load('translations/publicAgendaBrandCopy.ts'):id.endsWith('/bookingFlowCopy')?load('translations/bookingFlowCopy.ts'):id.endsWith('/schedulingOperationsCopy')?load('translations/schedulingOperationsCopy.ts'):id.endsWith('/serviceTermsCopy')?load('translations/serviceTermsCopy.ts'):id.endsWith('/schedulingIdentity')?{schedulingTone:'coral'}:stub);
 const props={context:'internal',tone:'coral',presetDate:'2090-10-23',catalog:{staff:[{id:2,publicName:'Staff',timezone:'UTC'}],services:[{id:1,name:'Service',durationMinutes:60}],events:[]},copy,locale:'es-MX',onDirtyChange:d=>dirty.push(d),loadSlots:async request=>{calls.push(request);return {timezone:'UTC',starts:['2090-10-23T10:00:00Z']};},onSubmit:body=>sent.push(body)};
 runtime.render(()=>BookingForm(props));await runtime.flush();assert.equal(dirty.at(-1),false);assert.equal(calls.length,0);
 let selects=nodes(runtime.result).filter(n=>n.type==='select');selects[0].props.onChange({target:{value:'service:1'}});selects[1].props.onChange({target:{value:'2'}});await runtime.flush();
 assert.deepEqual(calls.at(-1),{serviceId:1,staffId:2,date:'2090-10-23'});
 await nodes(runtime.result).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await runtime.flush();assert.equal(nodes(runtime.result).find(n=>n.type==='input'&&n.props.type==='date').props.value,'2090-10-23');
 assert.equal(nodes(runtime.result).find(n=>n.type==='ActionButton'&&n.props.type==='submit').props.disabled,true);assert.equal(sent.length,0);runtime.unmount();
});
