import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useMessagingApi } from './MessagingTransportContext';
import { messagingCopy } from './copy';
import { teamCopy } from './teamCopy';
import { requestIdentity } from './messageState';
import { field, button, primary, ErrorNotice, type ComposerState } from './MessagingPrimitives';
import type { TaskLink } from './types';

export function QuickMessageTask({ conversationId, locale, onClose, onState }: {
  conversationId: number; locale: string; onClose: () => void; onState: (state: ComposerState) => void;
}) {
  const api = useMessagingApi('member'), copy = messagingCopy(locale), c = teamCopy(locale);
  const [title, setTitle] = useState(''), [due, setDue] = useState('');
  const [busy, setBusy] = useState(false), [discard, setDiscard] = useState(false);
  const [error, setError] = useState<unknown>(null), [saved, setSaved] = useState<TaskLink | null>(null);
  const request = useRef<{ fingerprint: string; key: string } | null>(null), sending = useRef(false), mounted = useRef(true);
  const dirty = !saved && Boolean(title.trim() || due);
  useEffect(() => { onState({ dirty, busy }); }, [dirty, busy, onState]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; onState({ dirty:false, busy:false }); }; }, [onState]);
  const close = () => { if (!busy) { if (dirty) setDiscard(true); else onClose(); } };
  const submit = async () => {
    if (sending.current || !title.trim()) return;
    sending.current = true; setBusy(true); setError(null);
    request.current = requestIdentity(request.current, JSON.stringify([conversationId, title.trim(), due]));
    try { const result = await api.createTask(conversationId, title.trim(), due || null, request.current.key); if (mounted.current) setSaved(result); }
    catch (failure) { if (mounted.current) setError(failure); }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  };
  return <form className="flex min-h-0 flex-1 flex-col" aria-label={c.addTask} onSubmit={e => { e.preventDefault(); void submit(); }}>
    <div className="flex items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700"><button type="button" aria-label={copy.back} className={button} onClick={close} disabled={busy}><ArrowLeft size={18}/></button><h3 className="font-medium"><span aria-hidden>✅ </span>{c.addTask}</h3></div>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
      <ErrorNotice error={error} copy={copy}/>
      {discard && <div role="alert" className="space-y-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"><p>{copy.discardPrompt}</p><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setDiscard(false)}>{copy.keepWriting}</button><button type="button" className={button} onClick={onClose}>{copy.discard}</button></div></div>}
      {saved ? <div role="status" className="space-y-3 rounded-2xl bg-emerald-50 p-5 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"><span aria-hidden className="text-3xl">✅</span><h3 className="font-medium">{c.taskSaved}</h3><p className="break-words">{saved.title}</p><p className="text-sm">{saved.folio}</p></div>
        : <fieldset disabled={busy} className="mx-auto max-w-xl space-y-5"><p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">{c.taskHint}</p><label className="block space-y-2 text-sm"><span>{c.taskTitle}</span><input autoFocus required maxLength={220} value={title} onChange={e => setTitle(e.target.value)} className={field}/></label><label className="block space-y-2 text-sm"><span>{c.dueDate}</span><input type="date" min="2000-01-01" max="9999-12-31" value={due} onChange={e => setDue(e.target.value)} className={field}/></label></fieldset>}
    </div>
    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700"><button type="button" className={button} disabled={busy} onClick={close}>{saved ? copy.back : copy.cancel}</button>{!saved && <button type="submit" className={primary} disabled={busy || !title.trim()}><Check size={18}/>{busy ? copy.sending : c.createTask}</button>}</div>
  </form>;
}
