import type { AvailabilityDay } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { ActionButton, Field, controlClass } from './SchedulingPrimitives';
export function WeeklyHours({days,onChange,locale,copy}:{days:AvailabilityDay[];onChange:(days:AvailabilityDay[])=>void;locale:string;copy:SchedulingCopy}){
 const op=getSchedulingOperationsCopy(locale);
 const weekday=(day:number)=>new Intl.DateTimeFormat(locale,{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+day)));
 return <div className="space-y-3">{[1,2,3,4,5,6,7].map(day=>{
 const windows=days.map((row,index)=>({...row,index})).filter(row=>row.dayOfWeek===day);
 return <section key={day} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
 <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={!!windows.length} onChange={e=>onChange(e.target.checked?[...days,{dayOfWeek:day,startTime:'09:00',endTime:'17:00'}]:days.filter(row=>row.dayOfWeek!==day))}/>{weekday(day)}</label>
 {windows.map(window=><div key={window.index} className="grid min-w-0 grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
 {(['startTime','endTime'] as const).map(key=><Field key={key} label={`${key==='startTime'?copy.start:copy.end} · ${weekday(day)}`}><input type="time" step={60} required className={controlClass} value={window[key].slice(0,5)} onChange={e=>onChange(days.map((row,index)=>index===window.index?{...row,[key]:e.target.value}:row))}/></Field>)}
 <ActionButton className="col-span-2 sm:col-span-1" onClick={()=>onChange(days.filter((_,i)=>i!==window.index))}>{op.remove}</ActionButton></div>)}
 {!!windows.length&&days.length<28&&<ActionButton onClick={()=>onChange([...days,{dayOfWeek:day,startTime:'18:00',endTime:'19:00'}])}>{op.addWindow}</ActionButton>}
 </section>;
 })}</div>;
}
