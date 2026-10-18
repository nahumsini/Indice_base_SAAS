import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Phone, CheckCircle2, Headphones, BookOpen } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogDescription, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../../../../components/ui/alert-dialog';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
import type { OpportunityFlowStage, SalesOpportunity } from '../../types/opportunities';
import type { ProspectosCopy } from '../translations';
import type { KanbanCardActions } from '../kanban/ProspectosKanbanCard';
import { getKanbanTiming } from '../kanban/kanbanModel';
import { getSellerCopy } from './sellerCopy';
import { sellerQueue, type QueueFilter } from './sellerModel';
import { sellerApi, type CallScript, type DaySummary } from './sellerApi';
import { SellerContact } from './SellerContact';
import { SellerScriptManager } from './SellerScriptManager';
const defaults={filter:'all' as QueueFilter,mine:false,query:''};
export function SellerWorkspace({flowId,flowName,opportunities,stages,timezone,locale,ownerId,sellerName,copy,active,onRefresh,...actions}: KanbanCardActions & {
  flowId:number;flowName:string;opportunities:SalesOpportunity[];stages:OpportunityFlowStage[];timezone:string;locale:string;ownerId:number|null;sellerName:string;copy:ProspectosCopy;active:boolean;onRefresh:()=>Promise<unknown>;
}) {
  const t=getSellerCopy(locale);
  const [filter,setFilter]=useState(defaults);
  const [selected,setSelected]=useState<SalesOpportunity|null>(null);
  const [completed,setCompleted]=useState<Set<string>>(()=>new Set());
  const [scripts,setScripts]=useState<CallScript[]>([]);
  const [summary,setSummary]=useState<DaySummary|null>(null);
  const [error,setError]=useState('');
  const [now,setNow]=useState(()=>new Date());
  const [manager,setManager]=useState(false);
  const [state,setState]=useState({dirty:false,busy:false});
  const [discard,setDiscard]=useState<SalesOpportunity|null>(null);
  const [saved,setSaved]=useState(false);
  const ready=useWorkspaceNavigationMemory({moduleKey:'sales',tabKey:'seller-'+flowId,state:filter,defaults,rememberScroll:false,onRestore:value=>setFilter({filter:['all','today','overdue','unscheduled'].includes(value.filter)?value.filter:'all',mine:Boolean(value.mine),query:typeof value.query==='string'?value.query:''})});
  const load=useCallback(async()=>{setError('');const results=await Promise.allSettled([sellerApi.scripts(flowId),sellerApi.summary(flowId)]);if(results[0].status==='fulfilled')setScripts(results[0].value);if(results[1].status==='fulfilled')setSummary(results[1].value);if(results.some(result=>result.status==='rejected'))setError(t.error);},[flowId,t]);
  useEffect(()=>{let live=true;Promise.all([sellerApi.scripts(flowId),sellerApi.summary(flowId)]).then(([scripts,summary])=>{if(live){setScripts(scripts);setSummary(summary);}}).catch(()=>{if(live)setError(t.error);});const interval=window.setInterval(()=>setNow(new Date()),60_000);return()=>{live=false;window.clearInterval(interval);};},[flowId,t]);
  const queue=useMemo(()=>sellerQueue(opportunities,stages,timezone,filter.filter,filter.mine,ownerId,filter.query,now).filter(item=>!completed.has(item.id)),[opportunities,stages,timezone,filter,ownerId,now,completed]);
  // Selection is deliberately stable while a conversation is in progress, even as clocks/filters refresh.
  useEffect(()=>{if(!selected && ready && queue.length)setSelected(queue[0]);},[selected,ready,queue]);
  const report=useCallback((dirty:boolean,busy:boolean)=>setState(current=>current.dirty===dirty&&current.busy===busy?current:{dirty,busy}),[]);
  const choose=(item:SalesOpportunity)=>{if(item.id===selected?.id||state.busy)return;if(state.dirty)setDiscard(item);else{setState({dirty:false,busy:false});setSelected(item);setSaved(false);}};
  const afterSave=()=>{if(!selected)return;setCompleted(value=>new Set([...value,selected.id]));setSelected(queue.find(item=>item.id!==selected.id)??null);setState({dirty:false,busy:false});setSaved(true);void load();void onRefresh();};
  const current=opportunities.find(item=>item.id===selected?.id)??selected;
  return <div className="flex h-full min-h-0 flex-col bg-slate-50 p-3 dark:bg-slate-950 sm:p-4" data-seller-workspace>
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3"><div className="flex items-center gap-3 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#b63b32]"><Headphones className="h-5 w-5" /></span><div><p className="font-medium">{sellerName||t.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{summary?.date??''} · {timezone}</p></div></div><div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 sm:ml-auto">{(['attempts','conversations','followups'] as const).map(key=><span key={key}>{t[key]} <strong className="ml-1 text-base font-medium tabular-nums text-slate-900 dark:text-white">{summary?.[key]??'—'}</strong></span>)}</div><Button variant="outline" onClick={()=>setManager(true)}><BookOpen />{t.scripts}</Button></div>
    {error?<div role="alert" className="mb-3 shrink-0 rounded-xl bg-rose-50 p-2 text-sm text-rose-700">{error}<Button variant="ghost" onClick={()=>void load()}>{t.retry}</Button></div>:null}
    {saved?<p role="status" className="mb-2 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{t.saved}</p>:null}
    <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(220px,22%)_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="flex max-h-[350px] min-h-0 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:max-h-none"><div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-700"><h2 className="flex items-center justify-between text-sm font-medium">{t.queue}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 dark:bg-slate-800">{queue.length}</span></h2><div className="relative"><Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" /><Input className="pl-8" aria-label={t.search} placeholder={t.search} value={filter.query} onChange={e=>setFilter(value=>({...value,query:e.target.value}))} /></div><Select value={filter.filter} onValueChange={value=>setFilter(current=>({...current,filter:value as QueueFilter}))}><SelectTrigger aria-label={t.queue}><SelectValue /></SelectTrigger><SelectContent>{(['all','today','overdue','unscheduled'] as const).map(value=><SelectItem key={value} value={value}>{t[value]}</SelectItem>)}</SelectContent></Select><label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><input type="checkbox" checked={filter.mine} onChange={e=>setFilter(value=>({...value,mine:e.target.checked}))} className="accent-[#FF6B5E]" />{t.mine}</label></div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">{ready?queue.length?queue.map(item=>{const timing=getKanbanTiming(item,stages.find(stage=>stage.key===item.stage),now,timezone);return <button key={item.id} type="button" disabled={state.busy} aria-pressed={item.id===selected?.id} onClick={()=>choose(item)} className={'w-full rounded-xl border p-3 text-left focus-visible:ring-2 focus-visible:ring-[#FF6B5E] '+(item.id===selected?.id?'border-[#FF6B5E]/40 bg-[#FF6B5E]/[0.07]':'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800')}><p className="line-clamp-2 text-sm font-medium">{item.contactPerson||item.opportunityName}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.company}</p><p className={'mt-2 flex items-center gap-1.5 text-xs '+(timing.state==='overdue'?'text-rose-700 dark:text-rose-300':'text-slate-500 dark:text-slate-400')}><Phone className="h-3 w-3" />{timing.date?timing.date+' · '+(timing.time||t.unscheduled):t.unscheduled}</p></button>;}):<p className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">{completed.size?t.end:t.empty}</p>:<p role="status">…</p>}</div>
      </aside>
      <main className="min-h-0 min-w-0">{current?<SellerContact key={current.id} flowId={flowId} opportunity={current} timezone={timezone} copy={t} prospectCopy={copy} scripts={scripts} stages={stages} sellerName={sellerName} locale={locale} active={active&&!manager} onSaved={afterSave} onState={report} onFiles={actions.onOpenFiles} onEdit={actions.onEdit} onStageChange={actions.onStageChange} />:<div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 text-slate-500 dark:text-slate-400"><Headphones className="h-10 w-10" /><p>{completed.size?t.end:t.choose}</p></div>}</main>
    </div>
    {manager?<SellerScriptManager flowId={flowId} flowName={flowName} stages={stages} copy={t} onClose={()=>setManager(false)} onSaved={()=>void load()} />:null}
    <AlertDialog open={Boolean(discard)} onOpenChange={open=>{if(!open)setDiscard(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.dirty}</AlertDialogTitle><AlertDialogDescription>{t.discardHint}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.keep}</AlertDialogCancel><AlertDialogAction onClick={()=>{setSelected(discard);setDiscard(null);setState({dirty:false,busy:false});}}>{t.discard}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
