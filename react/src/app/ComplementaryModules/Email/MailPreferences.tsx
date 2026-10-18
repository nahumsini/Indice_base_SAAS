import { useEffect,useState } from 'react';
import { Settings } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { mailboxApi,type MailboxAccount,type MailboxFolder,type MailPreferencesData } from './mailboxApi';
import { useEmailCopy } from './translations';
import { useMailCompletionCopy } from './completionCopy';
export function MailPreferences({ account,folders,onClose }: { account:MailboxAccount;folders:MailboxFolder[];onClose:()=>void }){
  const copy=useMailCompletionCopy();const {copy:common}=useEmailCopy();const [value,setValue]=useState<MailPreferencesData|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{const abort=new AbortController();mailboxApi.preferences(account.id,abort.signal).then(v=>{if(!abort.signal.aborted)setValue(v);}).catch(()=>{if(!abort.signal.aborted)setError(copy.error);});return()=>abort.abort();},[account.id]);
  async function save(){if(!value)return;setBusy(true);try{await mailboxApi.savePreferences(account.id,{...value,accountVersion:account.version});onClose();}catch{setError(copy.error);}finally{setBusy(false);}}
  return <IndiceModalFrame open tone="blue" modalType="standard-form" title={copy.preferences} description={account.email} icon={<Settings className="h-5 w-5"/>} closeLabel={common.cancel} onOpenChange={open=>{if(!open&&!busy)onClose();}} footerLeading={<Button variant="outline" disabled={busy} onClick={onClose}>{common.cancel}</Button>} footer={<Button disabled={busy||!value} onClick={()=>void save()}>{common.saving&&busy?common.saving:copy.savePreferences}</Button>}>
    {error&&<p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {value&&<div className="space-y-5"><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={busy||account.receiveProtocol!=='IMAP'} checked={value.backgroundEnabled} onChange={e=>setValue({...value,backgroundEnabled:e.target.checked})}/>{copy.background}</label><p className="text-sm text-slate-500 dark:text-slate-400">{copy.backgroundHint}</p><label className="block space-y-2 text-sm"><span>{copy.sentFolder}</span><select className="h-11 w-full rounded-xl border bg-white px-3 dark:border-slate-700 dark:bg-slate-900" value={value.sentFolder??''} disabled={busy} onChange={e=>setValue({...value,sentFolder:e.target.value||null})}><option value="">{copy.automatic}</option>{folders.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}</select></label></div>}
  </IndiceModalFrame>;
}
