import { useEffect, useRef, useState } from 'react';
import { Phone, Copy, Check, ArrowRight, FileText, Mail, MessageCircle, CalendarClock } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../../../../components/ui/resizable';
import { getPhoneHref, getWhatsAppHref } from '../../utils/salesCommunicationUtils';
import type { OpportunityFlowStage, SalesOpportunity } from '../../types/opportunities';
import type { ProspectosCopy } from '../translations';
import type { SellerCopy } from './sellerCopy';
import { callOutcomes, type CallScript } from './sellerApi';
import { suggestedScript } from './sellerModel';
import { SellerPrompter } from './SellerPrompter';
import { callReminderState } from '../utils/nextActionDraft';
import { getNextActionCopy } from '../translations/nextActionCopy';
import { useSellerContact } from './useSellerContact';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
const primary=getSalesModalActionClassNames('coral').primary;
const actionCodes={call:'Call',whatsapp:'WhatsApp',email:'Email',meeting:'Meeting',send_proposal:'Send proposal',follow_up:'Follow up',review_documents:'Review documents',close_deal:'Close deal'} as const;
export function SellerContact({flowId, opportunity, timezone, copy:t, prospectCopy, scripts, stages, sellerName, locale, active, onSaved, onState, onFiles, onEdit, onStageChange}: {
  flowId:number; opportunity:SalesOpportunity;timezone:string;copy:SellerCopy;prospectCopy:ProspectosCopy;scripts:CallScript[];stages:OpportunityFlowStage[];sellerName:string;locale:string;active:boolean;
  onSaved:()=>void;onState:(dirty:boolean,busy:boolean)=>void;onFiles:(record:SalesOpportunity)=>void;onEdit:(record:SalesOpportunity)=>void;onStageChange:(record:SalesOpportunity,stage:SalesOpportunity['stage'])=>void;
}) {
  const session=useSellerContact(flowId,opportunity.backendId??Number(opportunity.id),timezone,t,onSaved);
  const record=session.record??opportunity;
  const [script,setScript]=useState<CallScript|null>(null);
  const choseScript=useRef(false);
  const [pause,setPause]=useState(0);
  const [copied,setCopied]=useState(false);
  const [wide,setWide]=useState(()=>window.matchMedia('(min-width: 1024px)').matches);
  useEffect(()=>{const media=window.matchMedia('(min-width: 1024px)');const change=()=>setWide(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  useEffect(()=>{if(!choseScript.current && scripts.length && session.record){const suggestion=suggestedScript(scripts,record.stage);if(suggestion){setScript(suggestion);choseScript.current=true;}}},[scripts,session.record,record.stage]);
  useEffect(()=>{onState(session.dirty,session.busy||session.uncertain);},[session.dirty,session.busy,session.uncertain,onState]);
  useEffect(()=>{if(!active)setPause(value=>value+1);},[active]);
  const disabled=session.busy||session.uncertain;
  const scheduleCopy=getNextActionCopy(locale);
  const reminder=callReminderState(record,{action:actionCodes[session.action as keyof typeof actionCodes],date:session.date,time:session.time},timezone);
  const externalSignature=[opportunity.stage,opportunity.nextActionDate,opportunity.notes,opportunity.ownerUserCompanyId].join('|');
  const previousExternal=useRef(externalSignature);
  useEffect(()=>{if(previousExternal.current!==externalSignature){previousExternal.current=externalSignature;if(!session.dirty&&!session.busy)void session.reload();}},[externalSignature,session.dirty,session.busy]);
  const copyPhone=async()=>{try{await navigator.clipboard.writeText(record.phone);setCopied(true);}catch{setCopied(false);}};
  return <div className="flex h-full min-w-0 flex-col gap-3" aria-label={record.opportunityName}>
    <header className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{record.company}</p><h2 className="text-2xl font-medium leading-tight text-slate-900 dark:text-white">{record.contactPerson||record.opportunityName}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{record.opportunityName}</p></div><div className="flex flex-wrap items-center gap-2"><Select value={record.stage} disabled={session.dirty||session.busy} onValueChange={value=>{setPause(value=>value+1);onStageChange(record,value);}}><SelectTrigger className="w-40" aria-label={t.stage}><SelectValue /></SelectTrigger><SelectContent>{stages.map(stage=><SelectItem key={stage.key} value={stage.key}>{prospectCopy.options.stages[stage.key as keyof typeof prospectCopy.options.stages]??stage.label}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={session.dirty||session.busy} onClick={()=>onEdit(record)}>{t.edit}</Button></div></div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xl font-medium tabular-nums">{record.phone||t.noPhone}</span><Button variant="ghost" size="icon" disabled={!record.phone} aria-label={copied?t.copied:t.copyPhone} onClick={()=>void copyPhone()}>{copied?<Check />:<Copy />}</Button>{record.phone?<><a href={getPhoneHref(record.phone)} onClick={()=>setPause(value=>value+1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-slate-950"><Phone className="h-4 w-4" />{t.call}</a><a href={getWhatsAppHref(record.phone)} target="_blank" rel="noreferrer" aria-label={prospectCopy.options.nextActions.WhatsApp} className="rounded-xl border border-slate-200 p-2.5 text-emerald-700 dark:text-emerald-300"><MessageCircle className="h-4 w-4" /></a></>:null}{record.email?<a href={'mailto:'+record.email} aria-label={prospectCopy.options.nextActions.Email} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 dark:text-slate-400"><Mail className="h-4 w-4" /></a>:null}<Button variant="outline" onClick={()=>{setPause(value=>value+1);onFiles(record);}}><FileText />{prospectCopy.columns.files.label}</Button></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.callHint}</p>
    </header>
    {session.error?<div role="alert" className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{session.error}{!session.uncertain?<Button variant="ghost" disabled={session.busy} onClick={()=>void session.reload()}>{t.reload}</Button>:null}</div>:null}
    {session.loading?<p role="status">…</p>:null}
    <ResizablePanelGroup direction={wide?'horizontal':'vertical'} className="!h-auto min-h-[900px] flex-1 lg:!h-full lg:min-h-0">
      <ResizablePanel defaultSize={60} minSize={35} className="pr-0 lg:pr-3"><SellerPrompter script={script} scripts={scripts} onSelect={value=>{if(disabled)return;choseScript.current=true;setScript(value);}} copy={t} variables={{contact:record.contactPerson,company:record.company,seller:sellerName}} pauseSignal={pause} /></ResizablePanel>
      <ResizableHandle withHandle aria-label={t.context} />
      <ResizablePanel defaultSize={40} minSize={28} className="pt-3 lg:pl-3 lg:pt-0"><aside className="flex h-full flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" onFocusCapture={()=>setPause(value=>value+1)}>
        <label className="text-sm font-medium" htmlFor="seller-call-notes">{t.notes}</label><Textarea id="seller-call-notes" value={session.notes} onChange={e=>session.setNotes(e.target.value)} disabled={disabled} maxLength={10000} placeholder={t.notesHint} className="mt-2 min-h-28 resize-y" />
        <fieldset disabled={disabled} className="mt-4 space-y-3"><label className="block text-sm font-medium">{t.result}<Select value={session.outcome} disabled={disabled} onValueChange={value=>session.setOutcome(value as typeof callOutcomes[number])}><SelectTrigger className="mt-2" aria-label={t.result}><SelectValue placeholder={t.selectResult} /></SelectTrigger><SelectContent>{callOutcomes.map(value=><SelectItem key={value} value={value}>{t[value]}</SelectItem>)}</SelectContent></Select></label>
          <label className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-[#FF6B5E]" />{t.action}</label>
          <Select value={session.followup} disabled={disabled} onValueChange={value=>{session.setFollowup(value as 'schedule'|'clear');session.changed();}}><SelectTrigger aria-label={t.followup}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="schedule">{t.followup}</SelectItem><SelectItem value="clear">{t.clear}</SelectItem></SelectContent></Select>
          {session.followup==='schedule'?<><Select value={session.action} disabled={disabled} onValueChange={value=>{session.setAction(value);session.changed();}}><SelectTrigger aria-label={t.action}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(actionCodes).map(([value,label])=><SelectItem key={value} value={value}>{prospectCopy.options.nextActions[label]}</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500 dark:text-slate-400">{t.date}<Input type="date" value={session.date} onChange={e=>{session.setDate(e.target.value);session.changed();}} /></label><label className="text-xs text-slate-500 dark:text-slate-400">{t.time}<Input type="time" value={session.time} onChange={e=>{session.setTime(e.target.value);session.changed();}} /></label></div><p className="text-xs text-slate-500 dark:text-slate-400">{timezone}{session.action==='call'&&reminder?' · '+scheduleCopy[reminder]:''}</p></>:null}
        </fieldset>
        {record.notes?<details className="mt-5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><summary className="cursor-pointer text-sm font-medium">{t.context}</summary><p className="mt-2 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">{record.notes}</p></details>:null}
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700"><h3 className="text-sm font-medium">{t.history}</h3>{!session.history.items.length?<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.noHistory}</p>:session.history.items.map(item=><article key={item.id} className="mt-3 border-l-2 border-[#FF6B5E]/30 pl-3 text-sm"><p className="font-medium">{t[item.outcome]}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:timezone||'UTC'}).format(new Date(item.createdAt))} · {item.actorName}</p>{item.scriptName?<p className="text-xs text-slate-500 dark:text-slate-400">{item.scriptName} · v{item.scriptVersion}</p>:null}<p className="mt-1 whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{item.notes}</p>{item.nextActionAt?<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.action}: {item.nextActionAt}</p>:null}</article>)}{session.history.nextCursor?<Button variant="ghost" disabled={session.busy} onClick={()=>void session.older()}>{t.older}</Button>:null}</div>
      </aside></ResizablePanel>
    </ResizablePanelGroup>
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><span role="status" className="text-xs text-slate-500 dark:text-slate-400">{session.dirty?t.dirty:t.result} · {record.owner}</span><Button className={primary} disabled={session.loading||session.busy||!session.record||!session.outcome||session.conflict||session.followup==='schedule'&&(!session.date||!session.time)} onClick={()=>{setPause(value=>value+1);void session.save(script);}}>{session.busy?t.saving:session.uncertain?t.retry:t.saveNext}<ArrowRight className="h-4 w-4" /></Button></footer>
  </div>;
}
