import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { mailboxApi, type MailboxMessage, type MailAttachment } from './mailboxApi';
import { useMailDailyCopy } from './mailDailyCopy';
import { useMailCompletionCopy } from './completionCopy';
import { useMailAttachmentCopy } from './attachmentCopy';
import { AttachmentUploadError, attachmentErrorKey, prepareMailAttachment, MAIL_ATTACHMENT_TOTAL_BYTES } from './mailAttachmentUpload';

type UploadRequest = Awaited<ReturnType<typeof mailboxApi.upload>>;
type PendingUpload = { file: File; request?: UploadRequest; expiresAt?: number; transferred: boolean };
type Phase = 'preparing' | 'uploading' | 'registering' | 'removing';
export function MailAttachments({ account, messageId, version, accountVersion, onPrepare, onSaved, onBusy, disabled = false }: {
  disabled?: boolean;
  account: string; messageId: string; version: number; accountVersion: number;
  onPrepare?: () => Promise<MailboxMessage | null | undefined>; onSaved?: (message: MailboxMessage) => void; onBusy?: (busy: boolean) => void;
}) {
  const daily = useMailDailyCopy(); const copy = useMailCompletionCopy(); const text = useMailAttachmentCopy();
  const [files, setFiles] = useState<MailAttachment[]>([]); const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>('preparing'); const [error, setError] = useState('');
  const [filename, setFilename] = useState(''); const [corrected, setCorrected] = useState('');
  const [retry, setRetry] = useState<PendingUpload | null>(null);
  const alive = useRef(true); const locked = useRef(false); const transfer = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; transfer.current?.abort(); }; }, []);
  useEffect(() => {
    if (!version) return;
    const abort = new AbortController();
    mailboxApi.attachments(account, messageId, abort.signal).then(value => { if (!abort.signal.aborted) setFiles(value); })
      .catch(failure => { if (!abort.signal.aborted) setError(text[attachmentErrorKey(failure)]); });
    return () => abort.abort();
  }, [account, messageId, version]);
  function working(value: boolean) {
    locked.current = value;
    if (alive.current) { setBusy(value); onBusy?.(value); }
  }
  async function upload(original: File, previous?: PendingUpload) {
    if (locked.current || disabled) return;
    working(true); setError(''); setRetry(null); setFilename(original.name); setPhase('preparing');
    let pending = previous;
    try {
      const file = pending?.file ?? await prepareMailAttachment(original);
      if (!alive.current) return;
      setCorrected(file.name !== original.name ? file.name : '');
      pending ??= { file, transferred: false };
      // A registration response can be lost after the server committed it. Reconcile that same
      // attachment before retrying, so a retry never duplicates an already accepted file.
      if (pending.request && pending.transferred) {
        const current = await mailboxApi.attachments(account, messageId);
        if (current.some(value => value.id === pending!.request!.id)) {
          const saved = await mailboxApi.get(account, messageId);
          if (alive.current) { setFiles(current); onSaved?.(saved); }
          return;
        }
      }
      if (files.length >= 5 || files.reduce((total, item) => total + item.sizeBytes, 0) + file.size > MAIL_ATTACHMENT_TOTAL_BYTES) throw new AttachmentUploadError('fileLimit');
      if (pending.request && !pending.transferred && Date.now() >= (pending.expiresAt ?? 0)) throw new AttachmentUploadError('fileExpired');
      const message = await onPrepare?.();
      if (!message || !alive.current) return;
      if (!pending.request) {
        pending.request = await mailboxApi.upload(account, messageId, { filename: file.name, contentType: file.type, sizeBytes: file.size, version: message.version, accountVersion });
        pending.expiresAt = Date.now() + 290_000;
      }
      if (!alive.current) return;
      if (!pending.transferred) {
        setPhase('uploading');
        const headers = Object.fromEntries(Object.entries(pending.request.headers).filter(([key]) => key.toLowerCase() !== 'content-length'));
        const controller = new AbortController(); transfer.current = controller;
        const timeout = setTimeout(() => controller.abort(), 90_000);
        try {
          const response = await fetch(pending.request.url, { method: 'PUT', headers, body: file, credentials: 'omit', signal: controller.signal });
          if (!response.ok) throw new AttachmentUploadError(response.status === 403 ? 'fileExpired' : 'fileTransfer');
          pending.transferred = true;
        } catch (failure) { throw failure instanceof AttachmentUploadError ? failure : new AttachmentUploadError('fileTransfer'); }
        finally { clearTimeout(timeout); transfer.current = null; }
      }
      if (!alive.current) return;
      setPhase('registering');
      const saved = await mailboxApi.register(account, messageId, pending.request.id, message.version, accountVersion);
      if (alive.current) onSaved?.(saved);
    } catch (failure) {
      if (alive.current) {
        const key = attachmentErrorKey(failure); setError(text[key]);
        if (pending && ['fileTransfer', 'fileUnknown', 'fileStorage'].includes(key)) setRetry(pending);
      }
    } finally { working(false); }
  }
  async function remove(file: MailAttachment) {
    if (locked.current || disabled) return;
    working(true); setError(''); setRetry(null); setFilename(file.filename); setPhase('removing');
    try { const saved = await mailboxApi.removeAttachment(account, messageId, file.id, version, accountVersion); if (alive.current) onSaved?.(saved); }
    catch (failure) { if (alive.current) setError(text[attachmentErrorKey(failure)]); }
    finally { working(false); }
  }
  return <section aria-busy={busy} className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
    <h4 className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" />{copy.files}{files.length > 0 && <span className="text-slate-500 dark:text-slate-400">({files.length}/5)</span>}</h4>
    {files.map(file => <div key={file.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
      <FileText className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
      <span className="min-w-0 flex-1 break-all font-medium">{file.filename}<span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{file.sizeBytes > 0 ? `${Math.ceil(file.sizeBytes / 1024)} KB` : ''}</span></span>
      <a className="inline-flex min-h-11 items-center px-3 text-blue-600 dark:text-blue-300" href={mailboxApi.downloadUrl(account, messageId, file.id)} download>{copy.download}</a>
      {onPrepare && <Button type="button" variant="ghost" disabled={busy || disabled} onClick={() => void remove(file)}>{copy.remove}</Button>}
    </div>)}
    {busy && <p role="status" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300"><Loader2 className="h-4 w-4 animate-spin" /><span>{text[phase]} <span className="break-all">{filename}</span></span></p>}
    {corrected && <p className="break-words text-xs text-slate-500 dark:text-slate-400">{text.corrected} <strong>{corrected}</strong>.</p>}
    {error && <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {filename && <p className="break-all font-medium">{filename}</p>}<p>{error}</p>
      {retry && <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => void upload(retry.file, retry)}><RotateCcw className="mr-2 h-4 w-4" />{text.retry}</Button>}
    </div>}
    {onPrepare && <><label className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm focus-within:ring-2 focus-within:ring-blue-500 ${busy || disabled || files.length >= 5 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <Paperclip className="mr-2 h-4 w-4" />{copy.addFile}
      <input type="file" className="sr-only" disabled={busy || disabled || files.length >= 5} accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx,.pptx" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file); }} />
    </label><p className="text-xs text-slate-500 dark:text-slate-400">{daily.attachmentHelp}</p></>}
  </section>;
}
