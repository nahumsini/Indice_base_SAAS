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
const {ReservationsCalendar}=load('components/ReservationsCalendar.tsx',id=>id==='react'?{useRef:()=>({current:null})}:id==='react/jsx-runtime'?jsx:id.endsWith('/calendarActivities')?activities:id.endsWith('/dateScope')?dates:id.endsWith('/calendarScope')?scopes:id.endsWith('/schedulingCalendarCopy')?labels:id.endsWith('/schedulingExperienceCopy')?experience:stub);
const empty={items:[],events:[],total:0,eventsTotal:0};
function calendar(extra={}){const creates=[],reviews=[],selected=[],clears=[];globalThis.requestAnimationFrame=fn=>fn();return {creates,reviews,selected,clears,tree:ReservationsCalendar({workspace:empty,from:'2090-10-01',to:'2090-10-31',selectedDate:'2090-10-22',copy,locale:'es-MX',onReview:r=>reviews.push(r.id),onSelectDate:d=>selected.push(d),onCreate:d=>creates.push(d),onClearFilters:()=>clears.push(true),...extra})};}
test('empty/filter states preserve selected date and respect read-only scope',()=>{
 const plain=calendar();assert.match(JSON.stringify(plain.tree),/No hay reservas ni eventos para este día/);nodes(plain.tree).find(n=>n.type==='ActionButton'&&JSON.stringify(n.props.children).includes(copy.newReservation)).props.onClick();assert.deepEqual(plain.creates,['2090-10-22']);
 const filtered=calendar({filtered:true});assert.match(JSON.stringify(filtered.tree),/No hay actividades que coincidan con los filtros/);assert.doesNotMatch(JSON.stringify(filtered.tree),/No hay reservas ni eventos para este día/);nodes(filtered.tree).find(n=>n.type==='ActionButton'&&n.props.children==='Limpiar filtros del día').props.onClick();assert.deepEqual(filtered.clears,[true]);assert.deepEqual(filtered.selected,[]);
 const read=calendar({onCreate:undefined});assert.ok(!JSON.stringify(read.tree).includes(copy.newReservation));
});
test('overflow opens all loaded mixed activities while review keeps reservation ownership',()=>{
 const source={items:[reservation(1,'12'),reservation(2,'10'),reservation(3,'13'),reservation(4,'14')],events:[event(1,'11')],total:20,eventsTotal:1};const result=calendar({workspace:source});assert.ok(nodes(result.tree).some(n=>n.type==='Feedback'&&n.props.children===copy.partialCalendar));
 const surface=nodes(result.tree).find(n=>n.type==='IndiceCalendarSurface'),buttons=nodes(surface.props.renderDay('2090-10-22')).filter(n=>n.type==='button');assert.equal(buttons.length,4);buttons.at(-1).props.onClick();assert.deepEqual(result.selected,['2090-10-22']);
 const region=nodes(result.tree).find(n=>n.type==='section');const rows=nodes(region).filter(n=>n.type==='button'||n.type==='article');assert.equal(rows.length,5);assert.equal(rows[1].type,'article');rows[0].props.onClick();assert.deepEqual(result.reviews,[2]);
 const day=calendar({workspace:source,from:'2090-10-22',to:'2090-10-22'});assert.equal(nodes(day.tree).filter(n=>n.type==='IndiceCalendarSurface').length,0);
});
test('prefilled request date stays editable, starts clean and never selects a slot or submits implicitly',async()=>{
 const runtime=hookRuntime(),calls=[],dirty=[],sent=[];
 const {BookingForm}=load('components/BookingForm.tsx',id=>id==='react'?{...runtime.hooks,useId:()=> 'test-form'}:id==='react/jsx-runtime'?jsx:id.endsWith('/useBookingFlow')?load('hooks/useBookingFlow.ts',dep=>dep==='react'?runtime.hooks:load('utils/bookingFlow.ts')):id.endsWith('/bookingFlow')?load('utils/bookingFlow.ts'):id.endsWith('/bookingFlowCopy')?load('translations/bookingFlowCopy.ts'):id.endsWith('/schedulingOperationsCopy')?load('translations/schedulingOperationsCopy.ts'):id.endsWith('/serviceTermsCopy')?load('translations/serviceTermsCopy.ts'):id.endsWith('/schedulingIdentity')?{schedulingTone:'coral'}:stub);
 const props={context:'internal',tone:'coral',presetDate:'2090-10-23',catalog:{staff:[{id:2,publicName:'Staff',timezone:'UTC'}],services:[{id:1,name:'Service',durationMinutes:60}],events:[]},copy,locale:'es-MX',onDirtyChange:d=>dirty.push(d),loadSlots:async request=>{calls.push(request);return {timezone:'UTC',starts:['2090-10-23T10:00:00Z']};},onSubmit:body=>sent.push(body)};
 runtime.render(()=>BookingForm(props));await runtime.flush();assert.equal(dirty.at(-1),false);assert.equal(calls.length,0);
 let selects=nodes(runtime.result).filter(n=>n.type==='select');selects[0].props.onChange({target:{value:'service:1'}});selects[1].props.onChange({target:{value:'2'}});await runtime.flush();
 assert.deepEqual(calls.at(-1),{serviceId:1,staffId:2,date:'2090-10-23'});
 await nodes(runtime.result).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await runtime.flush();assert.equal(nodes(runtime.result).find(n=>n.type==='input'&&n.props.type==='date').props.value,'2090-10-23');
 assert.equal(nodes(runtime.result).find(n=>n.type==='ActionButton'&&n.props.type==='submit').props.disabled,true);assert.equal(sent.length,0);runtime.unmount();
});
