import { useEffect,useRef,useState } from 'react';
import { useBlocker } from 'react-router';
import { MessageCircle,Settings } from 'lucide-react';
import { IndiceTitleBar,IndiceViewState } from '../../../components/frontend-os';
import { IndiceModalFrame,IndiceConfirmationDialog } from '../../../components/indice-modal';
import { Button } from '../../../components/ui/button';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { ApiClientError } from '../../../lib/apiClient';
import { conversationsApi,type Capability,type Context,type Member } from './conversationsApi';
import { conversationsCopy } from './conversationsCopy';
import { conversationConnectionCopy } from './conversationConnectionCopy';
import './conversations.css';
const allCapabilities:Capability[]=['READ_OWN','TAKE','READ_ALL','REPLY','TRANSFER','RESOLVE','NOTE','LINK','TASK'];
export default function ConversationConnectionSettings(){const revision=useAuthorizationRevision();return <SettingsWorkspace key={revision}/>;}
function SettingsWorkspace(){
 const {currentLanguage}=useLanguage(),c=conversationsCopy(currentLanguage.code),connectionCopy=conversationConnectionCopy(currentLanguage.code);
 const [context,setContext]=useState<Context|null>(null),[members,setMembers]=useState<Member[]>([]),[candidates,setCandidates]=useState<Member[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [selected,setSelected]=useState(''),[capabilities,setCapabilities]=useState<Capability[]>([]),[edit,setEdit]=useState(false),[discard,setDiscard]=useState(false),[active,setActive]=useState(true);
 const [control,setControl]=useState<'SUSPEND'|'DISCONNECT'|null>(null);
 const setupKey=useRef(crypto.randomUUID()),latch=useRef(false),alive=useRef(true),original=useRef('');
 const capLabel:Record<Capability,string>={READ_OWN:c.MINE,TAKE:c.take,READ_ALL:c.ALL,REPLY:c.reply,TRANSFER:c.transfer,RESOLVE:c.resolve,NOTE:c.note,LINK:c.crm,TASK:c.followUp};
 const dirty=JSON.stringify([selected,capabilities,active])!==original.current;
 const blocker=useBlocker(({currentLocation,nextLocation})=>(edit&&dirty||busy)&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search));
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(edit&&dirty||busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[edit,dirty,busy]);
 useEffect(()=>{alive.current=true;const abort=new AbortController();conversationsApi.connectionContext(abort.signal).then(async value=>{if(abort.signal.aborted)return;setContext(value);
  if(value.connection){const [grants,eligible]=await Promise.all([conversationsApi.members(value.connection.id,abort.signal),conversationsApi.candidates(value.connection.id,abort.signal)]);if(!abort.signal.aborted){setMembers(grants);setCandidates(eligible);}}
 }).catch(e=>{if(!abort.signal.aborted)setError(e instanceof ApiClientError&&[401,403].includes(e.status)?c.denied:c.error);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>{abort.abort();alive.current=false;};},[]);
 function open(member?:Member){const value=member?[String(member.membershipId),member.capabilities,member.active]as const:['',[],true]as const;setSelected(value[0]);setCapabilities([...value[1]]);setActive(value[2]);original.current=JSON.stringify(value);setEdit(true);setError('');}
 function choose(value:string){const current=members.find(m=>String(m.membershipId)===value);setSelected(value);setCapabilities(current?.capabilities??[]);setActive(current?.active??true);}
 async function setup(){if(latch.current)return;latch.current=true;setBusy(true);setError('');try{const connection=await conversationsApi.setup(setupKey.current);if(alive.current){setContext(old=>old?{...old,connection}:old);setCandidates(await conversationsApi.candidates(connection.id));}}catch{if(alive.current)setError(c.error);}finally{latch.current=false;if(alive.current)setBusy(false);}}
 async function save(){if(latch.current||!context?.connection||!selected)return;latch.current=true;setBusy(true);setError('');try{
  const member=members.find(m=>String(m.membershipId)===selected);const value=await conversationsApi.grant(context.connection.id,Number(selected),{capabilities,active,version:member?.version??0});
  if(alive.current){setMembers(value);setContext(await conversationsApi.connectionContext());setEdit(false);}
 }catch(e){if(alive.current){if(e instanceof ApiClientError&&[401,403].includes(e.status)){setContext(null);setMembers([]);setCandidates([]);setEdit(false);setError(c.denied);}else{if(e instanceof ApiClientError&&e.status===409){const latest=await conversationsApi.members(context.connection.id).catch(()=>null);if(latest&&alive.current)setMembers(latest);}setError(e instanceof ApiClientError&&e.status===409?c.conflict:c.error);}}}finally{latch.current=false;if(alive.current)setBusy(false);}}
 async function applyControl(){if(latch.current||!control||!context?.connection)return;latch.current=true;setBusy(true);setError('');try{await conversationsApi.control(context.connection.id,{requestKey:crypto.randomUUID(),version:context.connection.version,action:control});if(alive.current){setContext(await conversationsApi.connectionContext());setMembers(await conversationsApi.members(context.connection.id));setControl(null);}}catch{if(alive.current)setError(c.error);}finally{latch.current=false;if(alive.current)setBusy(false);}}
 const allowed=(cap:Capability)=>context?.capabilities.includes(cap)||!members.some(m=>m.active)&&Number(selected)===context?.membershipId;
 return <section className="sales-conversations space-y-5" data-whatsapp-settings><IndiceTitleBar tone="coral" title={c.connection} subtitle={c.settingsHint} icon={<MessageCircle/>}/>
  {loading?<IndiceViewState tone="coral" variant="loading" title={c.loading}/>:!context||!context.canManage?<IndiceViewState tone="coral" variant="error" title={error||c.denied}/>:!context.enabled?<IndiceViewState tone="coral" variant="empty" title={c.disabled}/>:<>
   <div className="conversation-settings-panel space-y-4"><h2>{context.connection?c[context.connection.status as keyof typeof c]??c.CONFIGURING:c.noConnection}</h2>{context.connection?.displayPhone&&<p>{context.connection.displayPhone}</p>}
    <p>{context.connection?.status==='CONNECTED'?c.privacy:c.setupPending}</p><p>{c.providerCosts}</p><p>{connectionCopy.pending}</p>{context.connection?.lastSignalAt&&<p>{connectionCopy.lastSignal}: {new Intl.DateTimeFormat(currentLanguage.code,{dateStyle:'short',timeStyle:'short'}).format(new Date(context.connection.lastSignalAt))}</p>}
    {context.connection&&context.connection.status!=='CONFIGURING'&&context.connection.status!=='REVOKED'&&<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>setControl('SUSPEND')}>{connectionCopy.suspend}</Button><Button variant="outline" disabled={busy} onClick={()=>setControl('DISCONNECT')}>{connectionCopy.disconnect}</Button></div>}
    {!context.connection&&<Button type="button" onClick={()=>void setup()} disabled={busy}>{c.requestSetup}</Button>}
   </div>
   {context.connection&&<div className="conversation-settings-panel"><div className="flex flex-wrap items-center justify-between gap-3"><h2>{c.members}</h2><Button type="button" onClick={()=>open()}>{c.grant}</Button></div><p>{c.permissionsHint}</p>
    {!members.length?<p>{c.noMembers}</p>:members.map(member=><div className="conversation-member" key={member.membershipId}><div><p>{member.name}</p><small>{member.active?member.capabilities.map(cap=>capLabel[cap]).join(' · '):c.REVOKED}</small></div><Button type="button" variant="outline" onClick={()=>open(member)}>{c.grant}</Button></div>)}
   </div>}
  </>}
  {error&&!edit&&<p role="alert" className="conversation-error">{error}</p>}
  <IndiceModalFrame open={edit} title={c.members} description={c.settingsHint} icon={<Settings/>} modalType="standard-form" tone="blue" busy={busy} onOpenChange={value=>{if(!value){if(dirty)setDiscard(true);else setEdit(false);}}} footer={<><Button type="button" variant="outline" disabled={busy} onClick={()=>{if(dirty)setDiscard(true);else setEdit(false);}}>{c.cancel}</Button><Button type="button" disabled={busy||!selected} onClick={()=>void save()}>{c.save}</Button></>}>
   <div className="space-y-5"><label>{c.member}<select aria-label={c.member} className="conversation-input" value={selected} onChange={e=>choose(e.target.value)} disabled={busy}><option value="">{c.chooseMember}</option>{[...new Map([...members,...candidates].map(m=>[m.membershipId,m])).values()].map(m=><option key={m.membershipId} value={m.membershipId}>{m.name}</option>)}</select></label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={active} disabled={busy} onChange={e=>setActive(e.target.checked)}/>{c.grant}</label>
    <fieldset className="conversation-capabilities"><legend>{c.capabilities}</legend>{allCapabilities.map(cap=><label key={cap}><input type="checkbox" checked={capabilities.includes(cap)} disabled={busy||!allowed(cap)} onChange={e=>setCapabilities(old=>e.target.checked?[...old,cap]:old.filter(value=>value!==cap))}/>{capLabel[cap]}</label>)}</fieldset>
    {error&&<p role="alert" className="conversation-error">{error}</p>}
   </div>
  </IndiceModalFrame>
  <IndiceConfirmationDialog open={!!control} title={connectionCopy.confirm} description={connectionCopy.hint} confirmLabel={control==='DISCONNECT'?connectionCopy.disconnect:connectionCopy.suspend} cancelLabel={c.cancel} busy={busy} onConfirm={()=>void applyControl()} onCancel={()=>setControl(null)} destructive/>
  <IndiceConfirmationDialog open={discard||blocker.state==='blocked'} title={c.unsaved} description={c.settingsHint} confirmLabel={c.discard} cancelLabel={c.cancel} onCancel={()=>{setDiscard(false);if(blocker.state==='blocked')blocker.reset();}} onConfirm={()=>{setDiscard(false);setEdit(false);if(blocker.state==='blocked')blocker.proceed();}} destructive/>
 </section>;
}
