import { useCallback, useEffect, useState } from 'react';
import { schedulingApi, type Service, type AvailabilityDay } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { useLanguage } from '../../../shared/context';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import { ActionButton, controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';
import { WeeklyHours } from './WeeklyHours';
import { SchedulingValidationError, validWeeklyHours } from '../utils/setupValidation';
export function ServiceEditor({service,copy,onClose,onSaved}:{service?:Service;copy:SchedulingCopy;onClose:()=>void;onSaved:()=>void}){
 const {currentLanguage}=useLanguage(),setup=getSchedulingSetupCopy(currentLanguage.code);
 const [term,setTerm]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1);
 useEffect(()=>{const timer=setTimeout(()=>{setSearch(term);setPage(1);},250);return()=>clearTimeout(timer);},[term]);
 const catalog=useSchedulingQuery(useCallback(signal=>schedulingApi.inventoryServices(search,page,signal),[search,page]));
 const [draft,setDraft]=useState({productId:service?.productId??undefined,name:service?.name??'',description:service?.description??'',durationMinutes:service?.durationMinutes??60,bufferMinutes:service?.bufferMinutes??15,noticeHours:service?.noticeHours??24,active:service?.active??true,days:service?.days??[] as AvailabilityDay[]});
 const [restricted,setRestricted]=useState(!!service?.days?.length);
 return <EditorFrame icon={schedulingEmoji.services} title={service?copy.edit:copy.newService} description={setup.catalogHint} copy={copy} onClose={onClose} onSaved={onSaved} onSave={()=>{if(!service&&!draft.productId)throw new SchedulingValidationError('scheduling_catalog_service_unavailable');if(restricted&&(!draft.days.length||!validWeeklyHours(draft.days)))throw new SchedulingValidationError('scheduling_hours_invalid');return schedulingApi.saveService({...draft,days:restricted?draft.days:[],version:service?.version},service?.id);}}>
 <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
 <Field label={setup.findService}><input type="search" className={controlClass} value={term} maxLength={180} onChange={e=>setTerm(e.target.value)}/></Field>
 <Field label={setup.inventory}><select className={controlClass} required={!service} disabled={!!service?.productId} value={draft.productId??''} onChange={e=>{const item=catalog.data?.items.find(v=>v.id===Number(e.target.value));if(item)setDraft({...draft,productId:item.id,name:item.name.slice(0,180),description:(item.description??'').slice(0,1500)});}}><option value="">{copy.selectOption}</option>{draft.productId&&!catalog.data?.items.some(v=>v.id===draft.productId)&&<option value={draft.productId}>{draft.name}</option>}{catalog.data?.items.map(item=><option key={item.id} value={item.id} disabled={!item.active}>{item.name}{item.sku?` · ${item.sku}`:''}</option>)}</select></Field>
 {catalog.loading&&<Feedback>{copy.loading}</Feedback>}{catalog.error&&<Feedback error>{copy.error}<ActionButton onClick={catalog.reload}>{copy.retry}</ActionButton></Feedback>}
 {catalog.data&&<div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{catalog.data.total} · {setup.inventory}</span><div className="flex gap-2"><ActionButton disabled={page===1} onClick={()=>setPage(v=>v-1)}>{copy.back}</ActionButton><ActionButton disabled={page*25>=catalog.data.total} onClick={()=>setPage(v=>v+1)}>{copy.next}</ActionButton></div></div>}</section>
 <Field label={copy.name}><input className={controlClass} required maxLength={180} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></Field>
 <Field label={copy.description}><textarea className={`${controlClass} h-24 py-3`} maxLength={1500} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></Field>
 <div className="grid gap-4 sm:grid-cols-3">{(['durationMinutes','bufferMinutes','noticeHours'] as const).map(key=><Field key={key} label={{durationMinutes:copy.duration,bufferMinutes:setup.sessionGap,noticeHours:copy.notice}[key]}><input className={controlClass} type="number" required min={key==='durationMinutes'?15:0} max={key==='durationMinutes'?180:key==='bufferMinutes'?60:720} value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)})}/></Field>)}</div><p className="text-sm leading-6 text-slate-500">{setup.gapHint}</p>
 <fieldset className="space-y-3"><legend className="mb-2 font-medium">{setup.serviceHours}</legend><p className="text-sm leading-6 text-slate-500">{setup.serviceHoursHint}</p><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={restricted} onChange={e=>{setRestricted(e.target.checked);if(e.target.checked&&!draft.days.length)setDraft({...draft,days:[1,2,3,4,5].map(dayOfWeek=>({dayOfWeek,startTime:'09:00',endTime:'17:00'}))});}}/>{setup.restrictHours}</label>{restricted&&<WeeklyHours days={draft.days} onChange={days=>setDraft({...draft,days})} locale={currentLanguage.code} copy={copy}/>}</fieldset>
 <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/>{copy.active}</label>
 </EditorFrame>;
}
