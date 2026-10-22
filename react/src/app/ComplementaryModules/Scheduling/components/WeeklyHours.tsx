import { Plus, X } from 'lucide-react';
import type { AvailabilityDay } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { ActionButton, Field, controlClass } from './SchedulingPrimitives';
import { getStaffEditorCopy } from '../translations/staffEditorCopy';
export function WeeklyHours({days,onChange,locale,copy,compact=false}:{days:AvailabilityDay[];onChange:(days:AvailabilityDay[])=>void;locale:string;copy:SchedulingCopy;compact?:boolean}){
 const op=getSchedulingOperationsCopy(locale);
 const staffCopy=getStaffEditorCopy(locale);
 const weekday=(day:number)=>new Intl.DateTimeFormat(locale,{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+day)));
 return <div className={compact?'divide-y divide-slate-200 dark:divide-slate-700':'space-y-3'}>
 {compact&&<div aria-hidden="true" className="hidden gap-3 pb-2 text-xs text-slate-500 dark:text-slate-400 sm:grid sm:grid-cols-[7rem_minmax(0,1fr)]"><span/><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem_2.75rem] gap-2"><span>{copy.start}</span><span>{copy.end}</span></div></div>}
 {[1,2,3,4,5,6,7].map(day=>{
 const windows=days.map((row,index)=>({...row,index})).filter(row=>row.dayOfWeek===day);
 if(compact)return <section key={day} aria-label={weekday(day)} className="grid min-w-0 gap-1 py-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
   <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 shrink-0 accent-[#FF6B5E]" checked={!!windows.length}
     onChange={e=>onChange(e.target.checked?[...days,{dayOfWeek:day,startTime:'09:00',endTime:'17:00'}]:days.filter(row=>row.dayOfWeek!==day))}/>{weekday(day)}</label>
   <div className="min-w-0 space-y-2">{!windows.length?<p className="flex min-h-11 items-center text-sm text-slate-500 dark:text-slate-400">{staffCopy.noHours}</p>:windows.map((window,position)=><div key={window.index} className="grid min-w-0 grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem_2.75rem] sm:[&>div>label]:sr-only">
     {(['startTime','endTime'] as const).map(key=><Field key={key} label={key==='startTime'?copy.start:copy.end}>
       <input type="time" step={60} required aria-label={`${key==='startTime'?copy.start:copy.end} · ${weekday(day)} · ${position+1}`} className={`${controlClass} min-w-0 px-2`} value={window[key].slice(0,5)} onChange={e=>onChange(days.map((row,index)=>index===window.index?{...row,[key]:e.target.value}:row))}/>
     </Field>)}
     <div className="col-span-2 flex justify-end gap-2 sm:col-span-2">
       <ActionButton className="w-11 shrink-0 px-0" aria-label={`${op.remove} · ${weekday(day)} · ${position+1}`} title={op.remove} onClick={()=>onChange(days.filter((_,index)=>index!==window.index))}><X className="h-4 w-4"/></ActionButton>
       {position===windows.length-1&&days.length<28?<ActionButton className="w-11 shrink-0 px-0" aria-label={`${op.addWindow} · ${weekday(day)}`} title={op.addWindow} onClick={()=>onChange([...days,{dayOfWeek:day,startTime:'18:00',endTime:'19:00'}])}><Plus className="h-4 w-4"/></ActionButton>:<span className="hidden w-11 sm:block"/>}
     </div>
   </div>)}</div>
 </section>;
 return <section key={day} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
 <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={!!windows.length} onChange={e=>onChange(e.target.checked?[...days,{dayOfWeek:day,startTime:'09:00',endTime:'17:00'}]:days.filter(row=>row.dayOfWeek!==day))}/>{weekday(day)}</label>
 {windows.map(window=><div key={window.index} className="grid min-w-0 grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
 {(['startTime','endTime'] as const).map(key=><Field key={key} label={`${key==='startTime'?copy.start:copy.end} · ${weekday(day)}`}><input type="time" step={60} required className={controlClass} value={window[key].slice(0,5)} onChange={e=>onChange(days.map((row,index)=>index===window.index?{...row,[key]:e.target.value}:row))}/></Field>)}
 <ActionButton className="col-span-2 sm:col-span-1" onClick={()=>onChange(days.filter((_,i)=>i!==window.index))}>{op.remove}</ActionButton></div>)}
 {!!windows.length&&days.length<28&&<ActionButton onClick={()=>onChange([...days,{dayOfWeek:day,startTime:'18:00',endTime:'19:00'}])}>{op.addWindow}</ActionButton>}
 </section>;
 })}</div>;
}
