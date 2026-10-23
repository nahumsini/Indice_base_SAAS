import {Button} from '../../../../components/ui/button';
import {SalesModalFrame} from '../../components/SalesModalFrame';
import {getSalesModalActionClassNames} from '../../salesModalStyles';
import {brandCopy} from '../brand/brandCopy';
import type {ContentCalendarCopy} from './contentCalendarCopy';
import {channelNames,sortedEntries,type ContentEntry} from './contentCalendarModel';
export function ContentDayModal({date,entries,locale,c,closeLabel,disabled,canCreate,onClose,onCreate,onEdit}:{date:string;entries:ContentEntry[];locale:string;c:ContentCalendarCopy;closeLabel:string;disabled:boolean;canCreate:boolean;onClose:()=>void;onCreate:()=>void;onEdit:(entry:ContentEntry)=>void}){
 const b=brandCopy(locale),actions=getSalesModalActionClassNames();
 return <SalesModalFrame open modalType="operational-workspace" title={b.day} description={new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`))} icon={<span aria-hidden="true">🗓️</span>} onOpenChange={open=>{if(!open)onClose();}} footer={<><Button className={actions.secondary} onClick={onClose}>{closeLabel}</Button><Button className={actions.primary} disabled={disabled||!canCreate} onClick={onCreate}>＋ {c.create}</Button></>}>
 <div className="space-y-3">{!entries.length?<div className="brand-empty"><span aria-hidden="true">🗓️</span><p>{b.emptyDay}</p></div>:sortedEntries(entries).map(row=><button key={row.id} type="button" disabled={disabled} onClick={()=>onEdit(row)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-900"><span className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{row.time||c.noTime} · {channelNames[row.channel]}</span><span>{c.statuses[row.status]}</span></span><strong className="mt-2 block break-words">{row.title}</strong><span className="mt-2 block text-sm text-slate-500">{c.formats[row.format]}</span></button>)}</div>
 </SalesModalFrame>;
}
