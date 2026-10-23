import { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useMailCompletionCopy } from '../../../../ComplementaryModules/Email/completionCopy';
import { useMailDailyCopy } from '../../../../ComplementaryModules/Email/mailDailyCopy';
import { useMailAttachmentCopy } from '../../../../ComplementaryModules/Email/attachmentCopy';
import { useMailEditorCopy } from '../../../../components/mail-editor/mailEditorCopy';
import { AttachmentUploadError, attachmentErrorKey, prepareMailAttachment, MAIL_ATTACHMENT_TOTAL_BYTES } from '../../../../ComplementaryModules/Email/mailAttachmentUpload';
import { mailingFileApi, type MailingFile } from '../mailingApi';
import { useReusableFileCopy } from '../reusableFileCopy';

type Pending={file:File;id:string;request?:Awaited<ReturnType<typeof mailingFileApi.upload>>;transferred:boolean};
export function MailingFiles({files,onChange,onBusy,disabled=false,shared=false}:{files:MailingFile[];onChange?:(files:MailingFile[])=>void;onBusy?:(busy:boolean)=>void;disabled?:boolean;shared?:boolean}){
 const copy=useMailCompletionCopy(),daily=useMailDailyCopy(),text={...useMailAttachmentCopy(),...useMailEditorCopy()},reusable=useReusableFileCopy();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState<Pending|null>(null);const lock=useRef(false);
 async function upload(original:File,previous?:Pending){
  if(lock.current||disabled||!onChange)return;lock.current=true;setBusy(true);onBusy?.(true);setError('');setRetry(null);let pending=previous;
  try{
   const file=pending?.file??await prepareMailAttachment(original);
   if(files.length>=5||files.reduce((sum,f)=>sum+f.sizeBytes,0)+file.size>MAIL_ATTACHMENT_TOTAL_BYTES)throw new AttachmentUploadError('fileLimit');
   pending??={file,id:crypto.randomUUID(),transferred:false};
   pending.request??=await mailingFileApi.upload({requestId:pending.id,filename:file.name,contentType:file.type,sizeBytes:file.size});
   if(!pending.transferred){
    const headers=Object.fromEntries(Object.entries(pending.request.headers).filter(([key])=>key.toLowerCase()!=='content-length'));
    const response=await fetch(pending.request.url,{method:'PUT',headers,body:file,credentials:'omit',signal:AbortSignal.timeout(90000)});
    if(!response.ok){if(response.status===403)pending.request=undefined;throw new AttachmentUploadError('fileTransfer');}
    pending.transferred=true;
   }
   const saved=await mailingFileApi.register(pending.id);onChange([...files,saved]);
  }catch(failure){const key=attachmentErrorKey(failure);setError(text[key]);if(pending&&['fileUnknown','fileStorage','fileTransfer'].includes(key))setRetry(pending);}
  finally{lock.current=false;setBusy(false);onBusy?.(false);}
 }
 return <section aria-label={copy.files} aria-busy={busy} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
  <h4 className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4"/>{copy.files} ({files.length}/5)</h4>
  {files.map(file=><div key={file.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-all">{file.filename} <small className="text-slate-500">{Math.ceil(file.sizeBytes/1024)} KB</small></span><a className="inline-flex min-h-11 items-center px-3 text-blue-700 dark:text-blue-300" href={mailingFileApi.downloadUrl(file.id)} download>{copy.download}</a>{onChange&&<Button type="button" variant="ghost" disabled={disabled||busy} onClick={()=>onChange(files.filter(f=>f.id!==file.id))}>{copy.remove}</Button>}</div>)}
  {shared&&<p className="text-xs text-slate-500">{reusable.shared}</p>}
  {!shared&&files.length>0&&<p className="text-xs text-slate-500">{reusable.snapshot}</p>}
  {onChange&&<><label className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm ${disabled||busy||files.length>=5?'opacity-50':'cursor-pointer'}`}><Paperclip className="h-4 w-4"/>{copy.addFile}<input className="sr-only" type="file" disabled={disabled||busy||files.length>=5} accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label><p className="text-xs text-slate-500">{daily.attachmentHelp}</p></>}
  {busy&&<p role="status" className="text-sm">{text.uploading}</p>}
  {error&&<div role="alert" className="text-sm text-red-700 dark:text-red-300"><p>{error}</p>{retry&&<Button type="button" variant="outline" disabled={disabled||busy} onClick={()=>void upload(retry.file,retry)}>{text.retry}</Button>}</div>}
 </section>;
}
