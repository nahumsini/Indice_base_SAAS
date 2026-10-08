import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Globe, Plus, RotateCw, Users, Wrench } from 'lucide-react';
import { IndiceTitleBar } from '../../../components/frontend-os/IndiceTitleBar';
import { IndiceTitleBarOverflow } from '../../../components/frontend-os/IndiceTitleBarOverflow';
import { IndiceFilterBar, IndiceFilterSelect } from '../../../components/frontend-os/IndiceFilterBar';
import { IndiceFilterAdvancedSection, IndiceFilterDisclosureActions, useIndiceFilterDisclosureCopy } from '../../../components/frontend-os/IndiceFilterDisclosure';
import { IndiceWorkspaceNavigation } from '../../../components/frontend-os/IndiceWorkspaceNavigation';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { schedulingApi, type Reservation, type ReservationStatus } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass, Feedback, Field } from '../components/SchedulingPrimitives';
import { InternalBookingModal } from '../components/InternalBookingModal';
import { ReservationReview } from '../components/ReservationReview';
import { ReservationManagement, type ManagementAction } from '../components/ReservationManagement';
import { ReservationsTable, type ReservationColumn } from '../components/ReservationsTable';
import { ReservationsCalendar } from '../components/ReservationsCalendar';
import { PublicAgendaModal } from '../components/PublicAgendaModal';
import { AgendaConfigurationModal, type AgendaConfigurationSection } from '../components/AgendaConfigurationModal';
import { dateInput, dateScope } from '../utils/dateScope';
import { calendarDates, calendarPeriod, type CalendarPeriod } from '../utils/calendarScope';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';
const statuses = ['REQUESTED','CONFIRMED','COMPLETED','NO_SHOW','CANCELLED','PAUSED'] as const;
export default function ReservationsTab({ mode, copy, locale, canRead = true, canCapture, canConfigure = false, administrator = false }: {
  mode: 'calendar'|'reservations'; copy: SchedulingCopy; locale: string; canRead?: boolean; canCapture: boolean; canConfigure?: boolean; administrator?: boolean;
}) {
  const today=dateInput(new Date()),initial=calendarPeriod(today,'month');
  const [explicit]=useState(()=>new URLSearchParams(window.location.search));
  const initialDate=(key:string,fallback:string)=>/^\d{4}-\d{2}-\d{2}$/.test(explicit.get(key)??'')?explicit.get(key)!:fallback;
  const [from,setFrom]=useState(()=>initialDate('from',initial.from)),[to,setTo]=useState(()=>initialDate('to',initial.to));
  const [view,setView]=useState<'calendar'|'table'>(()=>explicit.get('view')==='table'?'table':'calendar');
  const [period,setPeriod]=useState<CalendarPeriod>('month'),[staffId,setStaffId]=useState(0),[status,setStatus]=useState(()=>statuses.includes(explicit.get('status') as ReservationStatus)?explicit.get('status')!:'');
  const [anchor,setAnchor]=useState(today);
  const [page,setPage]=useState(1),[size,setSize]=useState(25),[includeArchived,setIncludeArchived]=useState(false);
  const [advancedOpen,setAdvancedOpen]=useState(false);
  const filterCopy=useIndiceFilterDisclosureCopy();
  useEffect(()=>{if(includeArchived)setAdvancedOpen(true);},[includeArchived]);
  const [capture,setCapture]=useState(false),[review,setReview]=useState<Reservation|null>(null),[publicOpen,setPublicOpen]=useState(false);
  const [configuration,setConfiguration]=useState<AgendaConfigurationSection|null>(null);
  const [management,setManagement]=useState<{record:Reservation;action:ManagementAction}|null>(null);
  const [widths,setWidths]=useState({time:240,attendee:260,service:230,consultant:210,status:160});
  const options=useSchedulingQuery(useCallback(signal=>canRead?schedulingApi.staffOptions(signal):Promise.resolve([]),[canRead]));
  const table=useSchedulingQuery(useCallback(signal=>canRead&&view==='table'?schedulingApi.reservations(mode,dateScope(from,to),page,size,signal,status as ReservationStatus||undefined,staffId||undefined,includeArchived):Promise.resolve(undefined),[canRead,view,mode,from,to,page,size,status,staffId,includeArchived]));
  let validCalendar=true;try{calendarDates(from,to);}catch{validCalendar=false;}
  const calendar=useSchedulingQuery(useCallback(signal=>canRead&&view==='calendar'&&validCalendar?schedulingApi.calendarGrid(dateScope(from,to),staffId||undefined,status as ReservationStatus||undefined,signal):Promise.resolve(undefined),[canRead,view,validCalendar,from,to,staffId,status]));
  useWorkspaceNavigationMemory({moduleKey:'scheduling',tabKey:'calendar',state:{from,to,view,period,staffId,status,page,size,widths,includeArchived},
    defaults:{...initial,view:'calendar',period:'month',staffId:0,status:'',page:1,size:25,widths,includeArchived:false},
    urlFields:{from:'from',to:'to',status:'status',view:'view',staffId:'staff'},onRestore:state=>{
      if(/^\d{4}-\d{2}-\d{2}$/.test(state.from))setFrom(state.from);if(/^\d{4}-\d{2}-\d{2}$/.test(state.to))setTo(state.to);
      if(['table','calendar'].includes(state.view))setView(state.view as typeof view);if(['day','week','month'].includes(state.period))setPeriod(state.period as CalendarPeriod);
      setStaffId(Number.isSafeInteger(Number(state.staffId))&&Number(state.staffId)>0?Number(state.staffId):0);
      setStatus(statuses.includes(state.status as ReservationStatus)?state.status:'');setIncludeArchived(state.includeArchived===true);
      setPage(Number.isInteger(state.page)&&state.page>0&&state.page<=10000?state.page:1);setSize([10,25,50,100,200].includes(state.size)?state.size:25);
      if(state.widths&&Object.keys(widths).every(key=>Number.isFinite(state.widths[key as keyof typeof widths])&&state.widths[key as keyof typeof widths]>=140&&state.widths[key as keyof typeof widths]<=1200))setWidths(state.widths);
    }});
  const columns=useMemo(()=>(['time','attendee','service','consultant','status'] as const).map(id=>({id,label:{time:copy.date,attendee:copy.attendee,service:copy.service,consultant:copy.collaborator,status:copy.status}[id],width:widths[id],defaultWidth:{time:240,attendee:260,service:230,consultant:210,status:160}[id],contentMinimumWidth:140,resizeLabel:copy.edit})),[copy,widths]);
  const resize=useCallback((id:ReservationColumn,width:number)=>setWidths(previous=>({...previous,[id]:width})),[]);
  const refresh=()=>{table.reload();calendar.reload();options.reload();};
  const applyPeriod=(value:CalendarPeriod,date=anchor)=>{const range=calendarPeriod(date,value);setAnchor(date);setPeriod(value);setFrom(range.from);setTo(range.to);setPage(1);};
  const move=(offset:number)=>{const date=new Date(`${from}T12:00:00`);if(period==='month')date.setMonth(date.getMonth()+offset,1);else date.setDate(date.getDate()+offset*(period==='week'?7:1));applyPeriod(period,dateInput(date));};
  const query=view==='calendar'?calendar:table;
  const titleActions=[
    ...(canCapture?[{id:'new',label:copy.newReservation,icon:<Plus className="h-4 w-4"/>,onSelect:()=>setCapture(true),primary:true}]:[]),
    ...(canConfigure?[
      {id:'team',label:copy.team,icon:<Users className="h-4 w-4"/>,onSelect:()=>setConfiguration('team'),primary:false},
      {id:'public',label:copy.publicAgenda,icon:<Globe className="h-4 w-4"/>,onSelect:()=>setPublicOpen(true),primary:false},
      {id:'services',label:copy.services,icon:<Wrench className="h-4 w-4"/>,onSelect:()=>setConfiguration('services'),primary:false},
    ]:[]),
    {id:'refresh',label:copy.refresh,icon:<RotateCw className="h-4 w-4"/>,onSelect:refresh,primary:false},
  ];
  const directActions=titleActions.length>3?titleActions.slice(0,3):titleActions;
  const hasActiveFilters=from!==initial.from||to!==initial.to||staffId!==0||status!==''||includeArchived;
  const clearFilters=()=>{setFrom(initial.from);setTo(initial.to);setAnchor(today);setPeriod('month');setStaffId(0);setStatus('');setIncludeArchived(false);setPage(1);setAdvancedOpen(false);};
  return <>
    <IndiceTitleBar tone={schedulingTone} title={copy.agendaReservations} subtitle={copy.reservationsHint} icon={schedulingEmoji.calendar}
      actions={<>
        {[...directActions].sort((a,b)=>Number(a.primary)-Number(b.primary)).map(action=><ActionButton key={action.id} primary={action.primary} onClick={action.onSelect}>{action.icon}{action.label}</ActionButton>)}
        {titleActions.length>3&&<IndiceTitleBarOverflow label={copy.actions} items={titleActions.slice(3)}/>}
      </>}/>
    {canRead&&<>
    <IndiceWorkspaceNavigation variant="views" tone={schedulingTone} ariaLabel={copy.reservations} value={view} onValueChange={value=>{setView(value);setPage(1);}}
      items={[{id:'calendar',label:copy.calendarView,icon:<CalendarDays/>},{id:'table',label:copy.tableView,icon:<ClipboardList/>}]}/>
    <IndiceFilterBar title={copy.filters} gridClassName="md:grid-cols-2 xl:grid-cols-4" summary={<IndiceFilterDisclosureActions
      tone={schedulingTone} hasActiveFilters={hasActiveFilters} onClear={clearFilters} clearLabel={filterCopy.clearFilters}
      showAdvancedToggle={view==='table'} activeAdvancedCount={Number(includeArchived)} isAdvancedOpen={advancedOpen}
      advancedLabel={advancedOpen?filterCopy.hideFilters:filterCopy.moreFilters} onToggleAdvanced={()=>setAdvancedOpen(!advancedOpen)}/> }>
      <Field label={copy.from}><input required className={controlClass} type="date" value={from} onChange={e=>{setFrom(e.target.value);if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))setAnchor(e.target.value);setPage(1);}}/></Field>
      <Field label={copy.to}><input required className={controlClass} type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(1);}}/></Field>
      <IndiceFilterSelect tone={schedulingTone} triggerClassName="rounded-[12px] data-[size=default]:h-11" label={copy.status} value={status||'all'} onValueChange={value=>{setStatus(value==='all'?'':value);setPage(1);}}
        options={[{value:'all',label:copy.allStates},...statuses.map(value=>({value,label:copy[value]}))]}/>
      <fieldset disabled={options.loading||options.error} className="min-w-0"><IndiceFilterSelect tone={schedulingTone} triggerClassName="rounded-[12px] data-[size=default]:h-11" label={copy.collaborator} value={String(staffId||'all')}
        onValueChange={value=>{setStaffId(value==='all'?0:Number(value));setPage(1);}}
        options={[{value:'all',label:copy.allStaff},...(options.data??[]).map(staff=>({value:String(staff.id),label:staff.publicName}))]}/></fieldset>
      {view==='table'&&advancedOpen&&<IndiceFilterAdvancedSection className="md:col-span-2 xl:col-span-4">
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={includeArchived} onChange={e=>{setIncludeArchived(e.target.checked);setPage(1);}}/>{copy.includeArchived}</label>
      </IndiceFilterAdvancedSection>}
    </IndiceFilterBar>
    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.timezone}: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
    {options.error&&<Feedback error>{copy.error}</Feedback>}
    {view==='calendar'&&<div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(['day','week','month'] as const).map(value=><ActionButton key={value} aria-pressed={period===value} primary={period===value} onClick={()=>applyPeriod(value)}>{copy[value]}</ActionButton>)}</div>
      <div className="flex gap-2"><ActionButton aria-label={copy.back} onClick={()=>move(-1)}><ChevronLeft className="h-4 w-4"/></ActionButton><ActionButton onClick={()=>applyPeriod(period,today)}>{copy.today}</ActionButton><ActionButton aria-label={copy.next} onClick={()=>move(1)}><ChevronRight className="h-4 w-4"/></ActionButton></div></div>}
    {view==='calendar'&&!validCalendar?<Feedback>{copy.calendarRangeHint}</Feedback>:query.loading?<Feedback>{copy.loading}</Feedback>:query.error?<Feedback error>{copy.error}<ActionButton onClick={refresh}>{copy.retry}</ActionButton></Feedback>:view==='calendar'&&calendar.data?
      <ReservationsCalendar workspace={calendar.data} from={from} to={to} copy={copy} locale={locale} selectedDate={anchor} onSelectDate={setAnchor} onReview={setReview}/>:
      view==='table'&&table.data&&<ReservationsTable data={table.data} columns={columns} copy={copy} locale={locale} page={page} size={size} administrator={administrator} canManage={canCapture} onPage={setPage}
        onSize={value=>{setSize(value);setPage(1);}} onResize={resize} onReview={setReview} onManage={(record,action)=>setManagement({record,action})}/>}
    {capture&&canCapture&&<InternalBookingModal copy={copy} locale={locale} onClose={()=>{setCapture(false);refresh();}}/>}
    {review&&<ReservationReview record={review} copy={copy} locale={locale} canManage={canCapture&&!review.archivedAt} onClose={()=>setReview(null)} onSaved={()=>{setReview(null);refresh();}}/>}
    {management&&<ReservationManagement {...management} staff={options.data??[]} copy={copy} onClose={()=>setManagement(null)} onSaved={()=>{setManagement(null);refresh();}}/>}
    </>}
    {configuration&&canConfigure&&<AgendaConfigurationModal section={configuration} copy={copy} locale={locale} onClose={()=>setConfiguration(null)} onChanged={refresh}/>}
    {publicOpen&&canConfigure&&<PublicAgendaModal copy={copy} onClose={()=>setPublicOpen(false)}/>}
  </>;
}
