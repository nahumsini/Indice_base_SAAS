import { getAuthorizationRevision } from '../../../api/authSessionStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { schedulingApi, type Client } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { ActionButton, controlClass, Feedback, Field } from './SchedulingPrimitives';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
/** Private capture uses Sales ownership. Public booking never mounts this component. */
export function BookingClientPicker({copy,locale,onSelect,onBusyChange,onCreatingChange}:{copy:SchedulingCopy;locale:string;onSelect:(client:Client)=>void;onBusyChange?:(value:boolean)=>void;onCreatingChange?:(value:boolean)=>void}){
 const [term,setTerm]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [draft,setDraft]=useState({name:'',email:'',phone:'',companyName:'',contactConsent:false});
 const actorRevision=useRef(getAuthorizationRevision());
 const retry=useRef<{fingerprint:string;key:string}|null>(null),pending=useRef(false),fields=useRef<HTMLFieldSetElement>(null);
 const op=getSchedulingOperationsCopy(locale),setup=getSchedulingSetupCopy(locale);
 useEffect(()=>{const timer=setTimeout(()=>{setSearch(term);setPage(1);},250);return()=>clearTimeout(timer);},[term]);
 useEffect(()=>{onCreatingChange?.(creating);},[creating,onCreatingChange]);
 const query=useSchedulingQuery(useCallback(signal=>schedulingApi.bookingClients(search,page,signal),[search,page]));
 return <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
 <div className="flex flex-wrap gap-2"><ActionButton aria-pressed={!creating} disabled={busy} onClick={()=>setCreating(false)}>{setup.existingClient}</ActionButton><ActionButton aria-pressed={creating} disabled={busy} onClick={()=>setCreating(true)}>{setup.newClient}</ActionButton></div>
 {creating?<><p className="text-sm leading-6 text-slate-500">{setup.clientHint}</p>{error&&<Feedback error>{error}</Feedback>}
 <fieldset ref={fields} disabled={busy} className="grid gap-4 sm:grid-cols-2">{(['name','email','companyName','phone'] as const).map(key=><Field key={key} label={{name:copy.attendee,email:copy.email,companyName:copy.company,phone:copy.phone}[key]}><input className={controlClass} type={key==='email'?'email':key==='phone'?'tel':'text'} maxLength={key==='email'?240:key==='phone'?40:180} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></Field>)}
 <label className="flex min-h-11 items-start gap-3 text-sm leading-6 sm:col-span-2"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#FF6B5E]" checked={draft.contactConsent} onChange={e=>setDraft({...draft,contactConsent:e.target.checked})}/>{setup.clientConsent}</label></fieldset>
 <ActionButton primary disabled={busy} onClick={async()=>{
 if(pending.current)return;
 if(actorRevision.current!==getAuthorizationRevision()){setError(copy.error);return;}
 if(!draft.name.trim()||!draft.contactConsent||!fields.current?.querySelector<HTMLInputElement>('input[type=email]')?.checkValidity()||!draft.email.trim()){setError(setup.clientInvalid);return;}
 const fingerprint=JSON.stringify(draft);if(retry.current?.fingerprint!==fingerprint)retry.current={fingerprint,key:crypto.randomUUID()};pending.current=true;setBusy(true);onBusyChange?.(true);setError('');
 try{const client=await schedulingApi.createBookingClient(draft,retry.current.key);onSelect(client);setCreating(false);setDraft({name:'',email:'',phone:'',companyName:'',contactConsent:false});query.reload();}catch{setError(copy.error);}finally{pending.current=false;setBusy(false);onBusyChange?.(false);}
 }}>{busy?copy.loading:setup.createSelect}</ActionButton></>:<>
 <Field label={op.client}><input className={controlClass} maxLength={180} value={term} onChange={e=>setTerm(e.target.value)}/></Field>
 {query.loading?<Feedback>{copy.loading}</Feedback>:query.error?<Feedback error>{copy.error}<ActionButton onClick={query.reload}>{copy.retry}</ActionButton></Feedback>:<>
 <div className="grid gap-2 sm:grid-cols-2">{query.data?.items.map(client=><ActionButton key={client.id} className="h-auto justify-start whitespace-normal text-left" onClick={()=>onSelect(client)}>{client.contactPerson||client.companyName} · {client.email||client.companyName}</ActionButton>)}</div>
 {!query.data?.items.length&&<Feedback>{copy.empty}</Feedback>}
 <DataTablePagination currentPage={page} totalPages={Math.max(1,Math.ceil((query.data?.total??0)/25))} totalCount={query.data?.total??0} pageSize={25} pageSizeOptions={[25]} pageStart={query.data?.total?(page-1)*25+1:0} pageEnd={Math.min(page*25,query.data?.total??0)} onPageChange={setPage} onPageSizeChange={()=>{}}/>
 </>}</>}
 </section>;
}
