import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ClipboardList,Users} from 'lucide-react';
import {Button} from '../../../components/ui/button';
import {Input} from '../../../components/ui/input';
import {IndiceModalFrame,IndiceConfirmationDialog} from '../../../components/indice-modal';
import {ApiClientError} from '../../../lib/apiClient';
import {conversationsApi,type Conversation,type Capability,type CrmContext,type TaskContext} from './conversationsApi';
import {conversationsCopy} from './conversationsCopy';
import {conversationOwnerCopy} from './conversationOwnerCopy';
export function ConversationCrmPanel({chat,capabilities,locale,onChanged,onDirty}:{chat:Conversation;capabilities:Capability[];locale:string;onChanged:()=>void;onDirty:(dirty:boolean,busy:boolean)=>void}){
 const c=conversationOwnerCopy(locale),base=conversationsCopy(locale),[crm,setCrm]=useState<CrmContext|null>(null),[tasks,setTasks]=useState<TaskContext|null>(null),[search,setSearch]=useState(''),[revision,setRevision]=useState(0);
 const [contact,setContact]=useState(''),[opportunity,setOpportunity]=useState(''),[mode,setMode]=useState<'contact'|'opportunity'|'task'|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false);
 const [form,setForm]=useState({name:'',companyName:'',email:'',flow:'',stage:'',currency:'',amount:'',assignee:'',due:''});
 const initial=useRef(''),alive=useRef(true),latch=useRef(false),request=useRef<{fingerprint:string;key:string;version:number}|null>(null);
 const dirty=!!mode&&JSON.stringify(form)!==initial.current;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;onDirty(false,false);};},[]);
 useEffect(()=>{onDirty(dirty,busy);},[dirty,busy]);
 useEffect(()=>{const abort=new AbortController();const timer=setTimeout(()=>{
  void Promise.all([conversationsApi.crm(chat.id,search,abort.signal),conversationsApi.taskContext(chat.id,abort.signal)]).then(([crm,tasks])=>{if(!abort.signal.aborted){setCrm(crm);setTasks(tasks);setContact(String(chat.contactId??''));setOpportunity(String(chat.opportunityId??''));}}).catch(()=>{if(!abort.signal.aborted)setError(base.error);});
 },search?300:0);return()=>{abort.abort();clearTimeout(timer);};},[chat.id,chat.contactId,chat.opportunityId,search,revision]);
 function open(next:typeof mode){const first=crm?.flows.items.find(f=>f.defaultFlow)??crm?.flows.items[0];const value={name:'',companyName:'',email:'',flow:first?String(first.id??'default'):'',stage:first?.stages.find(s=>s.type==='OPEN')?.key??'',currency:'',amount:'',assignee:'',due:''};setForm(value);initial.current=JSON.stringify(value);request.current=null;setMode(next);setError('');}
 function field(key:keyof typeof form,value:string){setForm(old=>({...old,[key]:value}));request.current=null;}
 function close(){if(busy)return;if(dirty)setDiscard(true);else setMode(null);}
 async function mutate(action:string,body:Record<string,unknown>){if(latch.current)return;latch.current=true;setBusy(true);setError('');
  const fingerprint=JSON.stringify([action,body]);if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,key:crypto.randomUUID(),version:chat.version};
  try{await conversationsApi.ownerCommand(chat.id,action,{...body,requestKey:request.current.key,version:request.current.version});if(alive.current){request.current=null;setMode(null);setRevision(v=>v+1);onChanged();}}
  catch(e){if(alive.current){if(e instanceof ApiClientError&&e.status===409){request.current=null;setError(base.conflict);onChanged();}else setError(e instanceof ApiClientError&&e.status===403?c.noPermission:base.error);}}
  finally{latch.current=false;if(alive.current)setBusy(false);}
 }
 const selectedFlow=crm?.flows.items.find(f=>String(f.id??'default')===form.flow);
 const formValid=mode==='contact'?!!form.name.trim():mode==='task'?!!form.name.trim()&&!!form.assignee&&!!form.due:!!form.name.trim()&&!!contact&&!!form.flow&&!!form.stage&&/^[A-Z]{3}$/.test(form.currency)&&/^\d{1,12}(\.\d{1,2})?$/.test(form.amount);
 function submit(){if(!formValid)return;void mutate(mode==='contact'?'create-contact':mode==='opportunity'?'create-opportunity':'tasks',mode==='contact'?{name:form.name.trim(),companyName:form.companyName.trim(),email:form.email.trim()}:mode==='task'?{title:form.name.trim(),assigneeMembershipId:Number(form.assignee),dueDate:form.due}:{name:form.name.trim(),contactId:Number(contact),flowId:form.flow==='default'?null:Number(form.flow),stage:form.stage,currency:form.currency,amount:form.amount});}
 const label=(name:string,children:ReactNode)=><label className="grid gap-2 text-sm">{name}{children}</label>;
 return <aside className="conversation-crm-panel space-y-4" aria-label={base.crm}>
  <details open><summary>{base.crm}</summary><p className="text-xs text-slate-500 dark:text-slate-400">{c.hint}</p>
   {crm?.canReadContacts? <div className="mt-3 space-y-3">
    {label(c.search,<Input value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/>)}
    {chat.contactId&&!crm.contact&&<p>{c.unavailable}</p>}
    {label(c.contact,<select aria-label={c.contact} className="conversation-input" value={contact} onChange={e=>{setContact(e.target.value);setOpportunity('');request.current=null;}} disabled={busy}><option value="">{c.none}</option>{[...new Map([...(crm.contact?[crm.contact]:[]),...crm.candidates].map(item=>[item.id,item])).values()].map(item=><option value={item.id} key={item.id}>{item.name||item.companyName}{item.phoneMatches?` · ${c.phoneMatch}`:''}</option>)}</select>)}
    {crm.canReadOpportunities&&label(c.opportunity,<select aria-label={c.opportunity} className="conversation-input" value={opportunity} onChange={e=>{setOpportunity(e.target.value);request.current=null;}} disabled={busy}><option value="">{c.none}</option>{[...new Map([...(crm.opportunity?[crm.opportunity]:[]),...crm.opportunities].map(item=>[item.id,item])).values()].filter(item=>!contact||!item.contactId||item.contactId===Number(contact)).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>)}
    {capabilities.includes('LINK')&&<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy||contact===String(chat.contactId??'')&&opportunity===String(chat.opportunityId??'')} onClick={()=>void mutate('links',{contactId:contact?Number(contact):null,opportunityId:opportunity?Number(opportunity):null})}>{c.link}</Button><Button variant="outline" disabled={busy||!!chat.contactId} onClick={()=>open('contact')}>{c.newContact}</Button>{crm.canReadOpportunities&&<Button variant="outline" disabled={busy||!contact||!!chat.opportunityId} onClick={()=>open('opportunity')}>{c.newOpportunity}</Button>}</div>}
   </div>:<p>{c.noPermission}</p>}
  </details>
  <details><summary>{base.followUp}</summary>{tasks?.allowed?<div className="mt-3 space-y-3">{tasks.tasks.map(task=><p key={task.id}>{task.folio} · {task.title} · {task.dueDate}</p>)}<Button variant="outline" onClick={()=>open('task')} disabled={busy}>{c.createTask}</Button></div>:<p>{c.noPermission}</p>}</details>
  {error&&!mode&&<p role="alert" className="conversation-error">{error}</p>}
  <IndiceModalFrame open={!!mode} title={mode==='contact'?c.newContact:mode==='opportunity'?c.newOpportunity:c.createTask} description={mode==='task'?base.settingsHint:c.hint} icon={mode==='task'?<ClipboardList/>:<Users/>} tone="blue" modalType="standard-form" busy={busy} onOpenChange={value=>{if(!value)close();}} footer={<><Button variant="outline" disabled={busy} onClick={close}>{base.cancel}</Button><Button disabled={busy||!formValid} onClick={submit}>{c.create}</Button></>}>
   <div className="space-y-4">{label(mode==='task'?c.taskTitle:c.name,<Input value={form.name} maxLength={mode==='contact'?180:220} onChange={e=>field('name',e.target.value)}/>)}
    {mode==='contact'&&<>{label(c.company,<Input value={form.companyName} maxLength={220} onChange={e=>field('companyName',e.target.value)}/>)}{label(c.email,<Input type="email" value={form.email} maxLength={220} onChange={e=>field('email',e.target.value)}/>)}<p>{chat.phone}</p></>}
    {mode==='opportunity'&&<>{label(c.flow,<select aria-label={c.flow} className="conversation-input" value={form.flow} onChange={e=>{const flow=crm?.flows.items.find(f=>String(f.id??'default')===e.target.value);field('flow',e.target.value);field('stage',flow?.stages.find(s=>s.type==='OPEN')?.key??'');}}><option value="">{c.none}</option>{crm?.flows.items.map(f=><option key={String(f.id)} value={String(f.id??'default')}>{f.name}</option>)}</select>)}{label(c.stage,<select aria-label={c.stage} className="conversation-input" value={form.stage} onChange={e=>field('stage',e.target.value)}>{selectedFlow?.stages.filter(s=>s.type==='OPEN').map(stage=><option key={stage.key} value={stage.key}>{stage.label}</option>)}</select>)}{label(c.currency,<Input maxLength={3} value={form.currency} onChange={e=>field('currency',e.target.value.toUpperCase())}/>)}{label(c.amount,<Input inputMode="decimal" value={form.amount} onChange={e=>field('amount',e.target.value)}/>)}</>}
    {mode==='task'&&<>{label(c.assignee,<select aria-label={c.assignee} className="conversation-input" value={form.assignee} onChange={e=>field('assignee',e.target.value)}><option value="">{c.none}</option>{tasks?.assignees.map(item=><option key={item.membershipId} value={item.membershipId}>{item.name}</option>)}</select>)}{label(c.due,<Input type="date" value={form.due} onChange={e=>field('due',e.target.value)}/>)}</>}
    {error&&<p role="alert" className="conversation-error">{error}</p>}
   </div>
  </IndiceModalFrame>
  <IndiceConfirmationDialog open={discard} title={base.unsaved} description={c.hint} confirmLabel={base.discard} cancelLabel={base.cancel} onCancel={()=>setDiscard(false)} onConfirm={()=>{setDiscard(false);setMode(null);}} destructive/>
 </aside>;
}
