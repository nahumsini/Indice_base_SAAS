import { useEffect,useRef,useState } from 'react';
import { Settings, BookOpen, PenLine } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { MailRichEditor } from '../../components/mail-editor/MailRichEditor';
import { useMailEditorCopy } from '../../components/mail-editor/mailEditorCopy';
import { canAccessModuleTab } from '../../access/tabScopeCatalog';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { TemplateManager } from '../../BasicModules/Sales/Mailing/components/TemplateManager';
import { useMailingCopy } from '../../BasicModules/Sales/Mailing/translations';
import { mailboxApi,type MailboxAccount,type MailboxFolder,type MailPreferencesData } from './mailboxApi';
import { useEmailCopy } from './translations';
import { useMailCompletionCopy } from './completionCopy';
export function MailPreferences({account,folders,onClose}:{account:MailboxAccount;folders:MailboxFolder[];onClose:()=>void}){
 const pro=useMailEditorCopy(),copy=useMailCompletionCopy(),{copy:common}=useEmailCopy(),mailing=useMailingCopy();
 const [value,setValue]=useState<MailPreferencesData|null>(null),[baseline,setBaseline]=useState(''),[busy,setBusy]=useState(false),[editorBusy,setEditorBusy]=useState(false),[error,setError]=useState(''),[view,setView]=useState<'general'|'signature'|'templates'>('general'),[manager,setManager]=useState(false),[discard,setDiscard]=useState(false);const lock=useRef(false),alive=useRef(true);
 const dirty=!!value&&JSON.stringify(value)!==baseline,locked=busy||editorBusy;const templates=canAccessModuleTab('sales','mailing',getCachedAuthSession());
 useEffect(()=>{alive.current=true;const abort=new AbortController();mailboxApi.preferences(account.id,abort.signal).then(v=>{if(!abort.signal.aborted){setValue(v);setBaseline(JSON.stringify(v));}}).catch(()=>{if(!abort.signal.aborted)setError(copy.error);});return()=>{alive.current=false;abort.abort();};},[account.id,copy.error]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty||locked){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,locked]);
 function close(){if(locked)return;if(dirty)setDiscard(true);else onClose();}
 async function save(){if(!value||lock.current||locked)return;lock.current=true;setBusy(true);setError('');try{await mailboxApi.savePreferences(account.id,{...value,accountVersion:account.version});if(alive.current)onClose();}catch{if(alive.current)setError(copy.error);}finally{lock.current=false;if(alive.current)setBusy(false);}}
 if(manager)return <TemplateManager tone="blue" copy={mailing.copy} locale={mailing.locale} onClose={()=>setManager(false)}/>;
 return <IndiceModalFrame open busy={locked} tone="blue" modalType={discard?'confirmation':'standard-form'} title={discard?pro.unsaved:copy.preferences} description={account.email} icon={<Settings className="h-5 w-5"/>} closeLabel={common.cancel} onOpenChange={open=>{if(!open)discard?setDiscard(false):close();}}
  footerLeading={<Button variant="outline" disabled={locked} onClick={()=>discard?setDiscard(false):close()}>{discard?pro.keep:common.cancel}</Button>}
  footer={discard?<Button data-modal-destructive onClick={onClose}>{pro.discard}</Button>:<Button disabled={locked||!value||!dirty||(value.signature?.length??0)>2000} onClick={()=>void save()}>{busy?common.saving:copy.savePreferences}</Button>}>
 {error&&<p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
 {!discard&&<><div role="tablist" aria-label={copy.preferences} className="mb-5 flex gap-2 overflow-x-auto rounded-xl bg-blue-50 p-1 dark:bg-blue-950">{(['general','signature',...(templates?['templates'] as const:[])] as const).map(tab=><Button type="button" role="tab" aria-selected={view===tab} key={tab} variant={view===tab?'default':'ghost'} className="min-h-11 shrink-0" disabled={locked} onClick={()=>setView(tab)}>{tab==='general'?<Settings className="h-4 w-4"/>:tab==='signature'?<PenLine className="h-4 w-4"/>:<BookOpen className="h-4 w-4"/>}{pro[tab]}</Button>)}</div>
 {value&&view==='general'&&<div className="space-y-5"><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={locked||account.receiveProtocol!=='IMAP'} checked={value.backgroundEnabled} onChange={e=>setValue({...value,backgroundEnabled:e.target.checked})}/>{copy.background}</label><p className="text-sm text-slate-500">{copy.backgroundHint}</p><label className="block space-y-2 text-sm"><span>{copy.sentFolder}</span><select className="h-11 w-full rounded-xl border bg-white px-3 dark:border-slate-700 dark:bg-slate-900" value={value.sentFolder??''} disabled={locked} onChange={e=>setValue({...value,sentFolder:e.target.value||null})}><option value="">{copy.automatic}</option>{folders.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}</select></label></div>}
 {value&&view==='signature'&&<div className="space-y-4"><p className="text-sm text-slate-500">{pro.signatureHint}</p><MailRichEditor label={pro.signature} maxText={2000} text={value.signature??''} html={value.signatureHtml??null} disabled={busy} onBusy={setEditorBusy} onChange={(signature,signatureHtml)=>setValue(v=>v?{...v,signature,signatureHtml}:v)}/><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={locked} checked={value.signatureNew??false} onChange={e=>setValue({...value,signatureNew:e.target.checked})}/>{pro.automaticNew}</label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={locked} checked={value.signatureReply??false} onChange={e=>setValue({...value,signatureReply:e.target.checked})}/>{pro.automaticReply}</label></div>}
 {view==='templates'&&<div className="space-y-4 rounded-xl border border-blue-100 bg-white p-5 dark:border-blue-900 dark:bg-slate-900"><BookOpen className="h-8 w-8 text-blue-600"/><p className="text-sm text-slate-600 dark:text-slate-300">{pro.templateHint}</p><Button type="button" variant="outline" disabled={locked} onClick={()=>setManager(true)}>{pro.manage}</Button></div>}
 {!value&&<p role="status">{pro.loading}</p>}</>}
 </IndiceModalFrame>;
}
