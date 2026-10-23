import { useMailEditorCopy } from '../../components/mail-editor/mailEditorCopy';
import { useEffect, useRef, useState } from 'react';
import { Mail, Send, Maximize2, Minimize2 } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MailRichEditor, plainMailHtml } from './MailRichEditor';
import { MailRecipients } from './MailRecipients';
import { MailComposerLibrary } from './MailComposerLibrary';
import { SafeMailView } from './SafeMailView';
import { useMailDailyCopy } from './mailDailyCopy';
import { ApiClientError } from '../../lib/apiClient';
import { mailboxApi, type MailboxAccount, type MailboxMessage, type MailDraft } from './mailboxApi';
import { MailAttachments } from './MailAttachments';
import { splitRecipients, validRecipients } from './mailboxModel';
import { useEmailCopy } from './translations';
import { useMailboxCopy } from './mailboxCopy';

type Form = { to: string; cc: string; bcc: string; subject: string; bodyText: string; bodyHtml: string | null };
export function MailComposer({ account, initial, messageId, onClose, onDone }: {
  account: MailboxAccount; initial: MailDraft; messageId?: string; onClose: () => void; onDone: (message: MailboxMessage) => void;
}) {
  const pro=useMailEditorCopy(); const [expanded,setExpanded]=useState(false);const [signatureHtml,setSignatureHtml]=useState<string|null>(null);const signatureApplied=useRef(false);const [editorBusy,setEditorBusy]=useState(false);
  const modalBody = useRef<HTMLDivElement>(null);
  const { copy } = useEmailCopy(); const text = useMailboxCopy(); const daily = useMailDailyCopy();
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [copies, setCopies] = useState(!!initial.cc.length || !!initial.bcc.length); const [signature, setSignature] = useState('');
  const [autosaving, setAutosaving] = useState(false); const [autoPaused, setAutoPaused] = useState(false);
  const pendingSave = useRef<{ form: Form; draft: MailDraft } | null>(null);
  const inFlight = useRef<Promise<MailboxMessage | undefined> | null>(null); const attachmentLock = useRef(false); const sendLock = useRef(false); const saveLock = useRef(false);
  const [form, setForm] = useState<Form>({ to: initial.to.length ? initial.to.join(', ') + ', ' : '', cc: initial.cc.length ? initial.cc.join(', ') + ', ' : '', bcc: initial.bcc.length ? initial.bcc.join(', ') + ', ' : '', subject: initial.subject, bodyText: initial.bodyText, bodyHtml: initial.bodyHtml ?? null });
  const formRef = useRef(form); formRef.current = form;
  const [baseline, setBaseline] = useState(JSON.stringify(form)); const [view, setView] = useState<'edit' | 'discard' | 'review'>('edit');
  useEffect(() => { if (modalBody.current) modalBody.current.scrollTop = 0; }, [view]);
  const [saved, setSaved] = useState<MailboxMessage | null>(null); const [operationBusy, setBusy] = useState(false); const [attachmentBusy,setAttachmentBusy]=useState(false);const busy=operationBusy||attachmentBusy||libraryBusy||editorBusy; const [error, setError] = useState(''); const [uncertain, setUncertain] = useState(false);
  const id = useRef(messageId ?? crypto.randomUUID()); const version = useRef(initial.version); const alive = useRef(true);
  const dirty = JSON.stringify(form) !== baseline; const locked = busy || autosaving;
  useEffect(() => { const abort = new AbortController(); mailboxApi.preferences(account.id, abort.signal).then(value => { if (!abort.signal.aborted) {setSignature(value.signature ?? '');setSignatureHtml(value.signatureHtml??null);
      if(!messageId&&!signatureApplied.current&&value.signature&&(initial.replyToMessageId?value.signatureReply:value.signatureNew)) {signatureApplied.current=true;appendText(value.signature,undefined,value.signatureHtml??null);}
    } }).catch(() => {}); return () => abort.abort(); }, [account.id]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty || locked) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, locked]);
  const leave = () => saved ? onDone(saved) : onClose();
  const close = () => { if (!locked) dirty ? setView('discard') : leave(); };
  function draft(value = formRef.current): MailDraft { return { ...initial, version: version.current, to: splitRecipients(value.to), cc: splitRecipients(value.cc), bcc: splitRecipients(value.bcc), subject: value.subject, bodyText: value.bodyText, bodyHtml: value.bodyHtml }; }
  function valid(value: MailDraft, review: boolean) {
    return value.bodyText.length <= 20000 && (value.bodyHtml?.length ?? 0) <= 500000 && validRecipients(value.to, value.cc, value.bcc)
      && (!review || (!!(value.to.length + value.cc.length + value.bcc.length) && !!value.subject.trim() && !!value.bodyText.trim()));
  }
  async function saveSnapshot(automatic: boolean) {
    const snapshot = formRef.current; const value = draft(snapshot);
    if (!valid(value, false)) { if (!automatic) setError(text.invalid); return; }
    setAutosaving(true);
    const task = (async () => {
      try {
        pendingSave.current = { form: snapshot, draft: value };
        const result = await mailboxApi.save(account.id, id.current, value);
        pendingSave.current = null;
        if (!alive.current) return;
        version.current = result.version; setSaved(result); setBaseline(JSON.stringify(snapshot)); setAutoPaused(false); setError(''); return result;
      } catch (failure) {
        if (failure instanceof ApiClientError && failure.status >= 400 && failure.status < 500) pendingSave.current = null;
        if (alive.current) { setAutoPaused(true); setError(failure instanceof ApiClientError && failure.status === 409 ? text.conflict : automatic ? daily.saveFailed : text.saveError); }
      } finally { if (alive.current) setAutosaving(false); }
    })();
    inFlight.current = task;
    try { return await task; } finally { if (inFlight.current === task) inFlight.current = null; }
  }
  async function reconcileSave() {
    const pending = pendingSave.current; if (!pending) return true;
    try {
      const remote = await mailboxApi.get(account.id, id.current); if (!alive.current) return false;
      const value = pending.draft;
      const sameContent = remote.subject === value.subject.trim() && remote.bodyText === value.bodyText
        && (remote.bodyHtml ?? '') === (value.bodyHtml ?? '')
        && (['to','cc','bcc'] as const).every(field => JSON.stringify(remote[field]) === JSON.stringify(value[field]));
      if (remote.state !== 'DRAFT' || remote.version !== value.version && !(remote.version === value.version + 1 && sameContent)) { setError(text.conflict); return false; }
      version.current = remote.version; setSaved(remote); pendingSave.current = null;
      if (sameContent) setBaseline(JSON.stringify(pending.form)); return true;
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 404 && pending.draft.version === 0) { pendingSave.current = null; return true; }
      if (alive.current) setError(text.saveError); return false;
    }
  }
  async function persist(review: boolean, stay = false) {
    if (saveLock.current) return; saveLock.current = true; setBusy(true);
    try {
      if (inFlight.current) await inFlight.current;
      if (!alive.current || !await reconcileSave()) return;
      if(review&&/\{\{[^{}]+\}\}/.test(formRef.current.subject+' '+formRef.current.bodyText)){setError(pro.variables);return;}
      if (!valid(draft(), review)) { setError(text.invalid); return; }
      const result = await saveSnapshot(false); if (!result || !alive.current) return; if (review) setView('review'); else if (!stay) onDone(result); return result; }
    finally { saveLock.current = false; if (alive.current) setBusy(false); }
  }
  useEffect(() => {
    if (!dirty || view !== 'edit' || busy || autosaving || autoPaused || uncertain) return;
    const timer = window.setTimeout(() => {
      if (!inFlight.current && !attachmentLock.current && alive.current) void saveSnapshot(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [form, dirty, view, busy, autosaving, autoPaused, uncertain]);
  function appendText(body: string, subject?: string, html?:string|null) {
    setForm(previous => {
      // A template goes before an untouched automatic signature, never below it.
      const currentHtml = previous.bodyHtml ?? plainMailHtml(previous.bodyText);
      const footerHtml = signatureHtml ?? plainMailHtml(signature);
      const beforeSignature = subject !== undefined && !!signature && previous.bodyText.endsWith(signature) && currentHtml.endsWith(footerHtml);
      const prefixText = beforeSignature ? previous.bodyText.slice(0, -signature.length).trimEnd() : previous.bodyText;
      const prefixHtml = beforeSignature ? currentHtml.slice(0, -footerHtml.length).replace(/(?:<br>)+$/, '') : currentHtml;
      return { ...previous, subject: previous.subject || subject || '',
        bodyText: [prefixText, body, beforeSignature ? signature : ''].filter(Boolean).join('\n\n'),
        bodyHtml: `${prefixHtml}${prefixText ? '<br><br>' : ''}${html ?? plainMailHtml(body)}${beforeSignature ? '<br><br>' + footerHtml : ''}` };
    });
  }
  async function send() {
    if (!saved || locked || uncertain || sendLock.current) return; sendLock.current = true; setBusy(true); setError('');
    try { const result = await mailboxApi.send(account.id, saved, account.version); if (alive.current) onDone(result); }
    catch { if (alive.current) { setUncertain(true); setError(text.sendCheck); } }
    finally { sendLock.current = false; if (alive.current) setBusy(false); }
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
  return <IndiceModalFrame contentClassName={`mail-compose-frame ${expanded&&view==='edit'?'mail-compose-expanded':''}`} open bodyRef={modalBody} busy={locked} tone="blue" modalType={view === 'edit' ? 'standard-form' : 'confirmation'} icon={<Mail className="h-5 w-5" />}
    title={view!=='edit'?view==='review'?text.reviewTitle:copy.discardTitle:<span className="flex items-center justify-between gap-2"><span>{view === 'edit' ? text.composerTitle : view === 'review' ? text.reviewTitle : copy.discardTitle}</span><Button type="button" variant="ghost" className="h-10 w-10 shrink-0 p-0 text-white hover:bg-white/15 hover:text-white" aria-label={expanded?pro.restore:pro.expandCompose} title={expanded?pro.restore:pro.expandCompose} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 className="h-5 w-5"/>:<Maximize2 className="h-5 w-5"/>}</Button></span>}
    description={view === 'edit' ? text.composerHint : view === 'review' ? text.reviewHint : copy.discardDescription}
    closeLabel={copy.cancel} onOpenChange={open => { if (!open && !locked) view !== 'edit' && !uncertain ? setView('edit') : close(); }}
    footerLeading={<Button variant="outline" disabled={locked} className="h-11 !border-white !bg-white !text-slate-600 hover:!bg-white/90" onClick={() => view === 'edit' || uncertain ? close() : setView('edit')}>{view === 'edit' || uncertain ? copy.cancel : copy.back}</Button>}
    footer={view === 'discard' ? <Button data-modal-destructive onClick={leave}>{copy.discard}</Button> : view === 'review' ? <Button disabled={locked} onClick={() => uncertain ? void check() : void send()}><Send className="mr-2 h-4 w-4" />{busy ? text.submitting : uncertain ? text.checkResult : text.sendNow}</Button> : <>
      <Button variant="outline" disabled={locked} onClick={() => void persist(false)}>{copy.saveDraft}</Button><Button disabled={locked} onClick={() => void persist(true)}>{busy ? copy.saving : text.sendReview}</Button>
    </>}>
    {(form.bodyText.length > 20000 || (form.bodyHtml?.length ?? 0) > 500000) && <p role="alert" className="mb-4 text-sm text-amber-800 dark:text-amber-200">{daily.contentTooLong}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {view === 'edit' && <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span className="text-slate-500 dark:text-slate-400">{text.from}: </span><span className="break-all">{account.displayName} &lt;{account.email}&gt;</span></div>
      <p id="mail-recipient-hint" className="text-xs text-slate-500 dark:text-slate-400">{text.recipientsHint}</p>
      <div className="flex items-center justify-between gap-2"><p role="status" className={`text-xs ${autoPaused ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>{autosaving ? daily.autosaving : dirty ? daily.unsaved : saved || messageId ? daily.autosaved : ''}</p><Button type="button" variant="ghost" disabled={busy} aria-expanded={copies} onClick={() => setCopies(v => !v)}>{daily.cc}</Button></div>
      {(['to', ...(copies ? ['cc', 'bcc'] as const : [])] as const).map(field => <MailRecipients existing={[...splitRecipients(form.to),...splitRecipients(form.cc),...splitRecipients(form.bcc)]} key={field} label={field === 'to' ? copy.to : text[field]} value={form[field]} disabled={busy} onChange={value => setForm(v => ({ ...v, [field]: value }))} />)}
      <MailComposerLibrary onBusy={setLibraryBusy} disabled={busy} existing={[...splitRecipients(form.to),...splitRecipients(form.cc),...splitRecipients(form.bcc)]} onContacts={(emails,target)=>{if(target!=='to')setCopies(true);setForm(v=>{const used=new Set([...splitRecipients(v.to),...splitRecipients(v.cc),...splitRecipients(v.bcc)].map(e=>e.toLowerCase()));const fresh=emails.filter(email=>!used.has(email.toLowerCase()));if(used.size+fresh.length>20){setError(pro.limit);return v;}return {...v,[target]:[...splitRecipients(v[target]),...fresh,''].join(', ')};});}} onTemplate={async(template,replace)=>{
        if(template.attachments?.length){
          const message=await persist(false,true);if(!message)throw new Error('draft-save-required');
          try{const result=await mailboxApi.templateFiles(account.id,id.current,template.id,template.version,message.version,account.version);version.current=result.version;setSaved(result);}
          catch(failure){
            // A response may be lost after the immutable references committed. Recover the
            // attachment version only when the draft content is still our saved snapshot.
            try{const remote=await mailboxApi.get(account.id,id.current);if(remote.state==='DRAFT'&&remote.subject===message.subject&&remote.bodyText===message.bodyText&&(remote.bodyHtml??'')===(message.bodyHtml??'')){version.current=remote.version;setSaved(remote);}}catch{}
            throw failure;
          }
        }
        if(replace)setForm(v=>({...v,subject:template.subject,bodyText:template.bodyText,bodyHtml:template.bodyHtml??plainMailHtml(template.bodyText)}));else appendText(template.bodyText,template.subject,template.bodyHtml);
      }} />
      <label className="block space-y-2 text-sm"><span>{copy.subject}</span><Input className="h-11" disabled={busy} maxLength={240} value={form.subject} onChange={e => setForm(v => ({ ...v, subject: e.target.value }))} /></label>
      <div className="space-y-2"><span className="text-sm">{copy.message}</span><MailRichEditor onBusy={setEditorBusy} label={copy.message} text={form.bodyText} html={form.bodyHtml} disabled={busy} onChange={(bodyText, bodyHtml) => setForm(v => ({ ...v, bodyText, bodyHtml }))} /><Button type="button" variant="ghost" disabled={busy || !signature || !!signature&&form.bodyText.includes(signature)} title={signature ? daily.insertSignature : daily.signatureMissing} onClick={() => {appendText(signature,undefined,signatureHtml);signatureApplied.current=true;}}>{daily.insertSignature}</Button></div>
      <MailAttachments disabled={autosaving || operationBusy} account={account.id} messageId={id.current} version={saved?.version??initial.version} accountVersion={account.version} onPrepare={()=>persist(false,true)} onBusy={value=>{attachmentLock.current=value;setAttachmentBusy(value);}} onSaved={result=>{version.current=result.version;setSaved(result);}}/>
    </div>}
    {view === 'review' && saved && <div className="space-y-4 text-sm">
      <dl className="space-y-3 break-words"><div><dt className="text-slate-500 dark:text-slate-400">{text.from}</dt><dd>{account.displayName} &lt;{account.email}&gt;</dd></div>
        {(['to', 'cc', 'bcc'] as const).map(field => saved[field].length > 0 && <div key={field}><dt className="text-slate-500 dark:text-slate-400">{field === 'to' ? copy.to : text[field]}</dt><dd>{saved[field].join(', ')}</dd></div>)}
        <div><dt className="text-slate-500 dark:text-slate-400">{copy.subject}</dt><dd className="font-medium">{saved.subject}</dd></div></dl>
      <MailAttachments account={account.id} messageId={id.current} version={saved.version} accountVersion={account.version}/>
      <SafeMailView text={saved.bodyText} html={saved.bodyHtml} />
    </div>}
  </IndiceModalFrame>;
}
