import { useEffect, useRef, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { ApiClientError } from '../../lib/apiClient';
import { mailboxApi, type MailboxAccount, type MailboxMessage, type MailDraft } from './mailboxApi';
import { MailAttachments } from './MailAttachments';
import { splitRecipients, validRecipients } from './mailboxModel';
import { useEmailCopy } from './translations';
import { useMailboxCopy } from './mailboxCopy';

type Form = { to: string; cc: string; bcc: string; subject: string; bodyText: string };
export function MailComposer({ account, initial, messageId, onClose, onDone }: {
  account: MailboxAccount; initial: MailDraft; messageId?: string; onClose: () => void; onDone: (message: MailboxMessage) => void;
}) {
  const { copy } = useEmailCopy(); const text = useMailboxCopy();
  const [form, setForm] = useState<Form>({ to: initial.to.join(', '), cc: initial.cc.join(', '), bcc: initial.bcc.join(', '), subject: initial.subject, bodyText: initial.bodyText });
  const [baseline, setBaseline] = useState(JSON.stringify(form)); const [view, setView] = useState<'edit' | 'discard' | 'review'>('edit');
  const [saved, setSaved] = useState<MailboxMessage | null>(null); const [operationBusy, setBusy] = useState(false); const [attachmentBusy,setAttachmentBusy]=useState(false);const busy=operationBusy||attachmentBusy; const [error, setError] = useState(''); const [uncertain, setUncertain] = useState(false);
  const id = useRef(messageId ?? crypto.randomUUID()); const version = useRef(initial.version); const alive = useRef(true);
  const dirty = JSON.stringify(form) !== baseline;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, busy]);
  const leave = () => saved ? onDone(saved) : onClose();
  const close = () => { if (!busy) dirty ? setView('discard') : leave(); };
  function draft(): MailDraft { return { ...initial, version: version.current, to: splitRecipients(form.to), cc: splitRecipients(form.cc), bcc: splitRecipients(form.bcc), subject: form.subject, bodyText: form.bodyText, bodyHtml: null }; }
  async function persist(review: boolean, stay = false) {
    const value = draft();
    if (!validRecipients(value.to, value.cc, value.bcc) || (review && (!value.to.length && !value.cc.length && !value.bcc.length || !value.subject.trim() || !value.bodyText.trim()))) { setError(text.invalid); return; }
    setBusy(true); setError('');
    try {
      const result = await mailboxApi.save(account.id, id.current, value);
      if (!alive.current) return;
      version.current = result.version; setSaved(result); setBaseline(JSON.stringify(form));
      if (review) setView('review'); else if (!stay) onDone(result); return result;
    } catch (failure) { if (alive.current) setError(failure instanceof ApiClientError && failure.status === 409 ? text.conflict : text.saveError); }
    finally { if (alive.current) setBusy(false); }
  }
  async function send() {
    if (!saved || busy || uncertain) return; setBusy(true); setError('');
    try { const result = await mailboxApi.send(account.id, saved, account.version); if (alive.current) onDone(result); }
    catch { if (alive.current) { setUncertain(true); setError(text.sendCheck); } }
    finally { if (alive.current) setBusy(false); }
  }
  async function check() {
    setBusy(true);
    try {
      const result = await mailboxApi.get(account.id, id.current);
      if (!alive.current) return;
      if (result.state === 'DRAFT') { setSaved(result); version.current = result.version; setUncertain(false); setError(''); }
      else onDone(result);
    } catch { if (alive.current) setError(text.sendCheck); }
    finally { if (alive.current) setBusy(false); }
  }
  return <IndiceModalFrame open tone="blue" modalType={view === 'edit' ? 'standard-form' : 'confirmation'} icon={<Mail className="h-5 w-5" />}
    title={view === 'edit' ? text.composerTitle : view === 'review' ? text.reviewTitle : copy.discardTitle}
    description={view === 'edit' ? text.composerHint : view === 'review' ? text.reviewHint : copy.discardDescription}
    closeLabel={copy.cancel} onOpenChange={open => { if (!open && !busy) view !== 'edit' && !uncertain ? setView('edit') : close(); }}
    footerLeading={<Button variant="outline" disabled={busy} className="h-11 !border-white !bg-white !text-slate-600 hover:!bg-white/90" onClick={() => view === 'edit' || uncertain ? close() : setView('edit')}>{view === 'edit' || uncertain ? copy.cancel : copy.back}</Button>}
    footer={view === 'discard' ? <Button data-modal-destructive onClick={leave}>{copy.discard}</Button> : view === 'review' ? <Button disabled={busy} onClick={() => uncertain ? void check() : void send()}><Send className="mr-2 h-4 w-4" />{busy ? text.submitting : uncertain ? text.checkResult : text.sendNow}</Button> : <>
      <Button variant="outline" disabled={busy} onClick={() => void persist(false)}>{copy.saveDraft}</Button><Button disabled={busy} onClick={() => void persist(true)}>{busy ? copy.saving : text.sendReview}</Button>
    </>}>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {view === 'edit' && <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">{text.from}: </span><span className="break-all">{account.displayName} &lt;{account.email}&gt;</span></div>
      <p id="mail-recipient-hint" className="text-xs text-slate-500 dark:text-slate-400">{text.recipientsHint}</p>
      {(['to', 'cc', 'bcc'] as const).map(field => <label key={field} className="block space-y-2 text-sm"><span>{field === 'to' ? copy.to : text[field]}</span><Input type="text" inputMode="email" className="h-11" disabled={busy} maxLength={5000} aria-describedby="mail-recipient-hint" value={form[field]} onChange={event => setForm(v => ({ ...v, [field]: event.target.value }))} /></label>)}
      <label className="block space-y-2 text-sm"><span>{copy.subject}</span><Input className="h-11" disabled={busy} maxLength={240} value={form.subject} onChange={e => setForm(v => ({ ...v, subject: e.target.value }))} /></label>
      <label className="block space-y-2 text-sm"><span>{copy.message}</span><Textarea className="min-h-52" disabled={busy} maxLength={20000} value={form.bodyText} onChange={e => setForm(v => ({ ...v, bodyText: e.target.value }))} /></label>
      <MailAttachments account={account.id} messageId={id.current} version={saved?.version??initial.version} accountVersion={account.version} onPrepare={()=>persist(false,true)} onBusy={setAttachmentBusy} onSaved={result=>{version.current=result.version;setSaved(result);}}/>
    </div>}
    {view === 'review' && saved && <div className="space-y-4 text-sm">
      <dl className="space-y-3 break-words"><div><dt className="text-slate-500 dark:text-slate-400">{text.from}</dt><dd>{account.displayName} &lt;{account.email}&gt;</dd></div>
        {(['to', 'cc', 'bcc'] as const).map(field => saved[field].length > 0 && <div key={field}><dt className="text-slate-500 dark:text-slate-400">{field === 'to' ? copy.to : text[field]}</dt><dd>{saved[field].join(', ')}</dd></div>)}
        <div><dt className="text-slate-500 dark:text-slate-400">{copy.subject}</dt><dd className="font-medium">{saved.subject}</dd></div></dl>
      <MailAttachments account={account.id} messageId={id.current} version={saved.version} accountVersion={account.version}/>
      <p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words border-t border-slate-200 pt-4 dark:border-slate-700">{saved.bodyText}</p>
    </div>}
  </IndiceModalFrame>;
}
