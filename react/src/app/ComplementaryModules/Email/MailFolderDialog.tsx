import { useRef, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { mailboxApi, type MailboxAccount, type MailboxWorkspace } from './mailboxApi';
import { useEmailCopy } from './translations';
import { useMailWorkspaceCopy } from './mailWorkspaceCopy';
export function MailFolderDialog({account,onClose,onSaved}:{account:MailboxAccount;onClose:()=>void;onSaved:(value:MailboxWorkspace)=>void}) {
  const {copy}=useEmailCopy();const text=useMailWorkspaceCopy();const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState(false);const flight=useRef(false);
  async function submit(event:React.FormEvent) {event.preventDefault();if(flight.current)return;flight.current=true;setBusy(true);setError(false);
    try{onSaved(await mailboxApi.createFolder(account.id,name.trim(),account.version));}catch{setError(true);}finally{flight.current=false;setBusy(false);}}
  return <IndiceModalFrame open tone="blue" modalType="standard-form" icon={<FolderPlus className="h-5 w-5"/>} title={text.newFolder} description={text.folderHint} closeLabel={copy.cancel} onOpenChange={open=>{if(!open&&!busy)onClose();}}
    footerLeading={<Button disabled={busy} variant="outline" onClick={onClose}>{copy.cancel}</Button>}
    footer={<Button type="submit" form="mail-folder-form" disabled={busy||!name.trim()}>{busy?copy.saving:text.create}</Button>}>
    <form id="mail-folder-form" onSubmit={submit} className="space-y-4"><label className="block space-y-2 text-sm font-medium"><span>{text.folderName}</span><Input autoFocus required maxLength={80} pattern="[\p{L}\p{N} _\-]{1,80}" value={name} onChange={event=>setName(event.target.value)} disabled={busy}/></label>{error&&<p role="alert" className="text-sm text-red-600 dark:text-red-300">{text.folderError}</p>}</form>
  </IndiceModalFrame>;
}
