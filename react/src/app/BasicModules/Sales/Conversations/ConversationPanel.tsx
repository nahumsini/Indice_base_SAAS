import { useEffect,useRef,useState } from 'react';
import { ArrowLeft,MessageCircle,StickyNote,Paperclip,X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { IndiceViewState } from '../../../components/frontend-os';
import { ApiClientError } from '../../../lib/apiClient';
import { conversationsApi,type Context,type Member } from './conversationsApi';
import { conversationsCopy } from './conversationsCopy';
import { serviceWindow,transportStatus } from './conversationState';
import { IndiceConfirmationDialog } from '../../../components/indice-modal';
import { conversationFileCopy } from './conversationFileCopy';
import { useConversationFile } from './useConversationFile';
import { ConversationCrmPanel } from './ConversationCrmPanel';
import { useConversationTimeline } from './useConversationTimeline';
export function ConversationPanel({id,context,locale,onBack,onDirty,onChanged}:{id:string;context:Context;locale:string;onBack:()=>void;onDirty:(dirty:boolean,busy:boolean)=>void;onChanged:()=>void}){
 const fileCopy=conversationFileCopy(locale),file=useConversationFile(id),fileInput=useRef<HTMLInputElement|null>(null);
 const [optOut,setOptOut]=useState(false),[duplicate,setDuplicate]=useState(false);
 const c=conversationsCopy(locale),{timeline,error,loading,refresh,loadEarlier,loadingEarlier}=useConversationTimeline(id);
 const [reply,setReply]=useState(''),[note,setNote]=useState(''),[internal,setInternal]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 const [ownerDirty,setOwnerDirty]=useState(false),[ownerBusy,setOwnerBusy]=useState(false);
 const [members,setMembers]=useState<Member[]>([]),[target,setTarget]=useState(''),[transferOpen,setTransferOpen]=useState(false);
 const latch=useRef(false),alive=useRef(true),request=useRef<{body:string;note:boolean;version:number;key:string}|null>(null),dirtyCallback=useRef(onDirty);dirtyCallback.current=onDirty;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;dirtyCallback.current(false,false);};},[]);
 useEffect(()=>{dirtyCallback.current(!!reply||!!note||!!file.file||ownerDirty,busy||ownerBusy);},[reply,note,busy,ownerDirty,ownerBusy,file.file]);
 const draft=internal?note:reply,chat=timeline?.conversation,caps=timeline?.capabilities??[];
 const owner=chat?.assigneeMembershipId===context.membershipId,windowOpen=serviceWindow(chat?.lastInboundAt??null),canReply=owner&&caps.includes('REPLY')&&chat?.status==='OPEN'&&windowOpen&&context.outboundEnabled&&context.connection?.status==='CONNECTED'&&!chat.outboundBlocked;
 useEffect(()=>{if(error instanceof ApiClientError&&[401,403,404].includes(error.status)){setReply('');setNote('');request.current=null;file.clear();}},[error]);
 const statusLabel=(key:string)=>c[key as keyof typeof c]??c.activity;
 async function act(action:string){if(!chat||latch.current)return;latch.current=true;setBusy(true);setFailure('');
  try{await conversationsApi.command(id,{requestKey:crypto.randomUUID(),version:chat.version,action,...(target?{targetMembershipId:Number(target)}:{}),...(action==='READ'?{readSeq:timeline!.cursor}:{})});if(alive.current){await refresh();setTransferOpen(false);onChanged();}}
  catch(e){if(alive.current){setFailure(e instanceof ApiClientError&&e.status===409?c.conflict:c.error);await refresh();}}
  finally{latch.current=false;if(alive.current)setBusy(false);}
 }
 async function submit(confirmed=false){if(!chat||latch.current||(!draft.trim()&&(internal||!file.file))||(!internal&&!canReply)||internal&&!caps.includes('NOTE'))return;
  if(!internal&&!confirmed&&!request.current&&timeline?.messages.some(m=>m.direction==='OUT'&&m.dispatchState==='UNKNOWN'&&m.body===draft.trim())){setDuplicate(true);return;}
  setDuplicate(false);latch.current=true;setBusy(true);setFailure('');const body=draft.trim();
  if(!request.current||request.current.body!==body||request.current.note!==internal)request.current={body,note:internal,version:chat.version,key:crypto.randomUUID()};
  const current=request.current;
  try{const attachment=internal?null:await file.prepare();if(!alive.current)return;await conversationsApi.text(id,internal,{requestKey:current.key,version:current.version,body,...(attachment?{attachmentIds:[attachment.id]}:{})});if(alive.current){if(internal)setNote('');else{setReply('');file.clear();}request.current=null;await refresh();onChanged();}}
  catch(e){if(alive.current){if(e instanceof ApiClientError&&e.status===409){request.current=null;setFailure(c.conflict);}else setFailure(c.error);await refresh();}}
  finally{latch.current=false;if(alive.current)setBusy(false);}
 }
 async function openTransfer(){try{const value=await conversationsApi.eligible(id);if(alive.current){setMembers(value);setTransferOpen(true);}}catch{if(alive.current)setFailure(c.error);}}
 if(loading)return <IndiceViewState tone="coral" variant="loading" title={c.loading}/>;
 if(!timeline||!chat)return <IndiceViewState tone="coral" variant="error" title={error instanceof ApiClientError&&[401,403,404].includes(error.status)?c.denied:c.error}/>;
 const items=[...timeline.messages.map(message=>({key:message.id,at:message.createdAt,node:<article className={`conversation-bubble ${message.direction==='OUT'?'is-outbound':''}`} data-message-id={message.id}><p>{message.type==='UNSUPPORTED'?c.unsupported:message.body}</p>{message.attachments?.map(attachment=><div className="conversation-attachment" key={attachment.id}>{attachment.state==='READY'?<a href={conversationsApi.attachmentUrl(id,attachment.id)} target="_blank" rel="noopener noreferrer" title={fileCopy.verification}>{attachment.contentType.startsWith('image/')&&<img src={conversationsApi.attachmentUrl(id,attachment.id)} alt={attachment.fileName} loading="lazy"/>}{fileCopy.open}: {attachment.fileName}</a>:<span>{attachment.fileName} · {fileCopy[attachment.state as keyof typeof fileCopy]??fileCopy.PENDING}</span>}</div>)}<small>{message.authorName||chat.phone} · {statusLabel(transportStatus(message))}</small><time dateTime={message.createdAt}>{new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short'}).format(new Date(message.createdAt))}</time></article>})),...timeline.notes.map(item=>({key:item.id,at:item.createdAt,node:<article className="conversation-internal-note" data-internal-note><small><StickyNote size={14}/>{c.internalNote} · {item.authorName}</small><p>{item.body}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short'}).format(new Date(item.createdAt))}</time></article>}))].sort((a,b)=>a.at.localeCompare(b.at)||a.key.localeCompare(b.key));
 return <section className="conversation-detail" aria-label={chat.phone}>
  <header className="conversation-detail-header"><Button type="button" variant="outline" onClick={onBack} disabled={busy||ownerBusy}><ArrowLeft size={16}/>{c.back}</Button><h2>{chat.phone}</h2><span>{chat.status==='RESOLVED'?c.RESOLVED:c.human}</span></header>
  <div className="conversation-actions">
   {chat.assigneeMembershipId===null&&caps.includes('TAKE')&&<Button type="button" onClick={()=>void act('TAKE')} disabled={busy||ownerBusy}>{c.take}</Button>}
   {caps.includes('TRANSFER')&&chat.assigneeMembershipId!==null&&<Button type="button" variant="outline" onClick={()=>void openTransfer()} disabled={busy||ownerBusy}>{c.transfer}</Button>}
   {caps.includes('RESOLVE')&&<Button type="button" variant="outline" onClick={()=>void act(chat.status==='OPEN'?'RESOLVE':'REOPEN')} disabled={busy||ownerBusy}>{chat.status==='OPEN'?c.resolve:c.reopen}</Button>}
   {owner&&caps.includes('REPLY')&&!chat.outboundBlocked&&<Button type="button" variant="outline" disabled={busy||ownerBusy} onClick={()=>setOptOut(true)}>{fileCopy.optOut}</Button>}
   <Button type="button" variant="outline" onClick={()=>void act('READ')} disabled={busy||ownerBusy}>{c.readInternal}</Button>
  </div>
  {transferOpen&&<div className="conversation-transfer"><label>{c.chooseMember}<select className="conversation-input" value={target} onChange={e=>setTarget(e.target.value)}><option value="">{c.chooseMember}</option>{members.filter(m=>m.membershipId!==chat.assigneeMembershipId).map(m=><option key={m.membershipId} value={m.membershipId}>{m.name}</option>)}</select></label><Button disabled={!target||busy} onClick={()=>void act('TRANSFER')}>{c.transfer}</Button><Button variant="outline" onClick={()=>setTransferOpen(false)}>{c.cancel}</Button></div>}
  {chat.outboundBlocked&&<p role="status" className="conversation-window">{fileCopy.blocked}</p>}
  {context.connection?.status!=='CONNECTED'&&<p role="status" className="conversation-window">{statusLabel(context.connection?.status??'RECONNECT_REQUIRED')}</p>}
  <p className={`conversation-window ${windowOpen?'is-open':''}`}>{windowOpen?c.windowOpen:c.windowClosed}</p>
  <div className="conversation-history" role="log" aria-label={c.activity} aria-live="polite">{timeline.hasEarlier&&<Button variant="outline" disabled={loadingEarlier} onClick={()=>void loadEarlier()}>{c.earlier}</Button>}{items.map(item=><div key={item.key}>{item.node}</div>)}</div>
  <div className="conversation-composer">
   <div className="conversation-composer-modes"><Button type="button" variant={internal?'outline':'default'} aria-pressed={!internal} disabled={busy||ownerBusy} onClick={()=>{setInternal(false);setFailure('');}}><MessageCircle size={16}/>{c.reply}</Button>{caps.includes('NOTE')&&<Button type="button" variant={internal?'default':'outline'} aria-pressed={internal} disabled={busy||ownerBusy} onClick={()=>{setInternal(true);setFailure('');}}><StickyNote size={16}/>{c.note}</Button>}</div>
   <label className="conversation-composer-label">{internal?c.internalNote:c.reply}<Textarea aria-label={internal?c.note:c.reply} maxLength={!internal&&file.file?1000:4000} rows={4} value={draft} disabled={busy||ownerBusy} onChange={e=>{internal?setNote(e.target.value):setReply(e.target.value);request.current=null;}}/></label>
   {!internal&&(!context.outboundEnabled||!owner)&&<p>{!context.outboundEnabled?c.outboundPaused:c.notOwner}</p>}
   {!internal&&<div className="space-y-2"><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" aria-label={fileCopy.attach} disabled={busy||ownerBusy||!owner} onChange={e=>{file.choose(e.target.files?.[0]??null);e.target.value='';request.current=null;}}/><Button type="button" variant="outline" disabled={busy||ownerBusy||!owner} onClick={()=>fileInput.current?.click()}><Paperclip size={16}/>{fileCopy.attach}</Button>{file.file&&<div className="flex items-center gap-2"><span>{file.file.name}</span><Button type="button" variant="ghost" aria-label={fileCopy.remove} disabled={busy} onClick={()=>{file.clear();request.current=null;}}><X size={16}/></Button></div>}<p className="conversation-privacy">{file.preparing?fileCopy.uploading:fileCopy.limits}</p>{file.error&&<p role="alert" className="conversation-error">{fileCopy.error}</p>}</div>}
   {failure&&<p role="alert" className="conversation-error">{failure}</p>}
   <Button type="button" disabled={busy||ownerBusy||(!draft.trim()&&(internal||!file.file))||(internal?!caps.includes('NOTE'):!canReply)} onClick={()=>void submit()}>{internal?c.saveNote:c.send}</Button>
   <p className="conversation-privacy">{internal?c.notesHint:c.privacy}</p>
  </div>
  <IndiceConfirmationDialog open={optOut} title={fileCopy.confirmOptOut} description={fileCopy.optOutHint} confirmLabel={fileCopy.optOut} cancelLabel={c.cancel} busy={busy} onCancel={()=>setOptOut(false)} onConfirm={()=>{setOptOut(false);void act('OPT_OUT');}} destructive/>
  <IndiceConfirmationDialog open={duplicate} title={fileCopy.duplicate} description={fileCopy.duplicateHint} confirmLabel={fileCopy.newIntent} cancelLabel={c.cancel} onCancel={()=>setDuplicate(false)} onConfirm={()=>void submit(true)}/>
  <ConversationCrmPanel chat={chat} capabilities={caps} locale={locale} onChanged={()=>{void refresh();onChanged();}} onDirty={(value,locked)=>{setOwnerDirty(value);setOwnerBusy(locked);}}/>
  <details className="conversation-audit"><summary>{c.activity}</summary><ol>{timeline.events.map(event=><li key={event.seq}>{statusLabel(event.type==='TAKE'?'take':event.type==='TRANSFER'?'transfer':event.type==='RESOLVE'?'resolve':event.type==='REOPEN'||event.type==='CUSTOMER_REOPENED'?'reopen':event.type==='INTERNAL_NOTE'?'note':event.type==='CUSTOMER_MESSAGE'?'RECEIVED':event.type.startsWith('MESSAGE_')?event.type.slice(8):event.type.startsWith('PROVIDER_')?event.type.slice(9):'activity')} · {event.actorName||c.human} {event.targetName?`→ ${event.targetName}`:''} · {new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short'}).format(new Date(event.createdAt))}</li>)}</ol></details>
 </section>;
}
