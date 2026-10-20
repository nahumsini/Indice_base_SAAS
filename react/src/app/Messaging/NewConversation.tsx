import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../lib/apiClient';
import { usePhotoDraft } from './usePhotoDraft';
import { PhotoPicker } from './MessagePhotos';
import { attachmentCopy, attachmentErrorText } from './attachmentCopy';
import { ArrowLeft, Headphones, Send, Users, X } from 'lucide-react';
import { useMessagingApi } from './MessagingTransportContext';
import { messagingCopy, messagingLabel } from './copy';
import { teamCopy } from './teamCopy';
import { requestIdentity } from './messageState';
import { field, button, primary, ErrorNotice, type ComposerState } from './MessagingPrimitives';
import type { Conversation, MessagingContext, Person } from './types';

export function NewConversation({ context, locale, onCancel, onCreated, onState, initialKind }: { context: MessagingContext; locale: string; onCancel: () => void; onCreated: (id: number) => void; onState: (state: ComposerState) => void; initialKind: 'DIRECT' | 'SUPPORT' }) {
  const copy = messagingCopy(locale);
  const team = teamCopy(locale);
  const api = useMessagingApi('member');
  const photos = usePhotoDraft();
  const attachmentLabels = attachmentCopy(locale);
  const [kind, setKind] = useState<Conversation['kind']>(context.supportOnly ? 'SUPPORT' : initialKind);
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<unknown>(null);
  const [directoryRevision, setDirectoryRevision] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [members, setMembers] = useState<Person[]>([]);
  const [groupName, setGroupName] = useState('');
  const isTeam = kind === 'DIRECT' || kind === 'GROUP';
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('CONSULTATION');
  const [moduleName, setModuleName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { onState({ dirty: Boolean(body.trim() || subject.trim() || moduleName.trim() || groupName.trim() || members.length || recipient || photos.photos.length), busy }); }, [body, subject, moduleName, groupName, members, recipient, photos.photos.length, busy, onState]);
  useEffect(() => () => onState({ dirty: false, busy: false }), [onState]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    if (!isTeam) { setDirectoryLoading(false); return; }
    setDirectoryLoading(true); setDirectoryError(null); setPeople([]);
    const timer = setTimeout(() => { void api.directory(search).then(rows => { if (active) setPeople(rows); }).catch(failure => { if (active) setDirectoryError(failure); }).finally(() => { if (active) setDirectoryLoading(false); }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [api, search, isTeam, directoryRevision]);
  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    const payload = { kind, recipientMembershipId: kind === 'DIRECT' ? Number(recipient) : null, subject: isTeam ? '' : subject.trim(), topic: isTeam ? 'CONSULTATION' : topic, moduleName: isTeam ? '' : moduleName, language: locale, body: body.trim(), ...(kind === 'GROUP' ? { groupName: groupName.trim(), participantMembershipIds: members.map(p => p.id).sort((a,b) => a-b) } : {}) };
    try {
      const attachmentIds = context.initialAttachments ? await photos.upload(api, 0) : [];
      if (!mounted.current) return;
      request.current = requestIdentity(request.current, JSON.stringify([payload, attachmentIds]));
      let result;
      try { result = await api.create({ ...payload, attachmentIds, requestKey: request.current.key }); }
      catch (failure) {
        if (!(failure instanceof ApiClientError) || failure.status !== 409 || !photos.expired()) throw failure;
        const renewed = await photos.upload(api, 0, true);
        if (!mounted.current) return;
        result = await api.create({ ...payload, attachmentIds: renewed, requestKey: request.current.key });
      }
      if (mounted.current) { photos.clear(); onCreated(result.conversation.id); }
    }
    catch (failure) { if (mounted.current) setError(failure); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  return <form data-chat-new-conversation className="flex min-h-0 flex-1 flex-col" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <div data-chat-header className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700"><button type="button" aria-label={copy.back} className={button} disabled={busy} onClick={onCancel}><ArrowLeft size={18} /></button><h2 className="font-medium">{copy.newMessage}</h2></div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"><div className="mx-auto max-w-2xl space-y-4">
    <fieldset disabled={busy} className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.title}>
        {([...(!context.supportOnly ? ['DIRECT','GROUP'] : []), 'SUPPORT', ...(context.distributor ? ['DISTRIBUTOR'] : [])] as Conversation['kind'][]).map(value =>
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`${button} ${kind === value ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : ''}`}>
            <span aria-hidden>{value === 'DIRECT' ? '💬' : value === 'GROUP' ? '👥' : '🎧'}</span>{value === 'DIRECT' ? team.direct : value === 'GROUP' ? team.group : value === 'SUPPORT' ? copy.support : copy.distributor}
          </button>)}
      </div>
      {isTeam && <p className="rounded-2xl bg-blue-50 p-3 text-sm text-[#143675] dark:bg-slate-800 dark:text-slate-200">{kind === 'GROUP' ? team.groupHint : team.directHint}</p>}
      {kind === 'GROUP' && <>
        <label className="block text-sm">{team.groupName}<input required maxLength={80} value={groupName} onChange={e => setGroupName(e.target.value)} className={field} /></label>
        <div className="space-y-2"><p className="text-sm">{team.selected}: {members.length}/49</p>
          <div className="flex flex-wrap gap-2">{members.map(p => <button key={p.id} type="button" className={`${button} bg-blue-50 dark:bg-blue-950`} onClick={() => setMembers(rows => rows.filter(row => row.id !== p.id))} aria-label={`${copy.discard}: ${p.name}`}>{p.name}<X size={14}/></button>)}</div>
        </div>
        <input type="search" inputMode="search" autoComplete="off" maxLength={100} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} aria-label={copy.search} placeholder={copy.search} value={search} onChange={e => setSearch(e.target.value)} className={field}/>
        <div role="group" aria-label={team.members} className="max-h-60 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-slate-700">
          {people.map(p => <label key={p.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl p-3 hover:bg-blue-50 dark:hover:bg-slate-800"><input type="checkbox" className="h-5 w-5 shrink-0 accent-[#143675]" checked={members.some(m => m.id === p.id)} disabled={busy || (members.length >= 49 && !members.some(m => m.id === p.id))} onChange={e => setMembers(rows => e.target.checked ? [...rows, p] : rows.filter(row => row.id !== p.id))}/><span className="min-w-0 break-words text-sm">{p.name}</span></label>)}
          {directoryLoading ? <p role="status" className="p-3 text-sm">{copy.loading}</p> : !directoryError && !people.length && <p className="p-3 text-sm">{copy.noPeople}</p>}
        </div>
      </>}
      {kind === 'DIRECT' && <><input type="search" inputMode="search" autoComplete="off" maxLength={100} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} aria-label={copy.search} placeholder={copy.search} value={search} onChange={e => { setSearch(e.target.value); setRecipient(''); }} className={field} />
        <label className="block text-sm">{copy.recipient}<select aria-label={copy.recipient} disabled={directoryLoading} required value={recipient} onChange={e => setRecipient(e.target.value)} className={field}><option value="">—</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {directoryLoading ? <p role="status" className="text-sm">{copy.loading}</p> : !directoryError && !people.length && <p className="text-sm">{copy.noPeople}</p>}</>}
      {isTeam && <ErrorNotice error={directoryError} copy={copy} retry={() => setDirectoryRevision(value => value + 1)}/>}
      {!isTeam && <label className="block text-sm">{copy.subject}<input required maxLength={180} value={subject} onChange={e => setSubject(e.target.value)} className={field} /></label>}
      {!isTeam && <><label className="block text-sm">{copy.topic}<select value={topic} onChange={e => setTopic(e.target.value)} className={field}>{['CONSULTATION','FAILURE','IMPROVEMENT'].map(v => <option key={v} value={v}>{messagingLabel(copy,v)}</option>)}</select></label>
        <label className="block text-sm">{copy.module}<input maxLength={120} value={moduleName} onChange={e => setModuleName(e.target.value)} className={field} /></label><p className="text-xs text-slate-500">{copy.asynchronous}</p></>}
      <label className="block text-sm">{copy.body}<textarea aria-label={copy.body} required={!photos.photos.length} rows={4} maxLength={8000} value={body} onChange={e => setBody(e.target.value)} onPaste={e => { const files=Array.from(e.clipboardData.files); if (context.initialAttachments && !busy && files.length) { e.preventDefault(); photos.add(files); } }} className={field} /></label>
      {context.initialAttachments && <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50"><PhotoPicker photos={photos.photos} error={photos.error} disabled={busy} locale={locale} onAdd={photos.add} onRemove={photos.remove}/><p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{attachmentLabels.help}</p></div>}
    </fieldset>
    </div></div>
    <div data-chat-new-footer className="shrink-0 space-y-2 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-700">
      {attachmentErrorText(error, locale) && photos.photos.length ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{attachmentErrorText(error, locale)}</p> : <ErrorNotice error={error} copy={copy} />}
      <div className="flex justify-end gap-2"><button type="button" className={button} onClick={onCancel} disabled={busy}>{copy.cancel}</button><button className={primary} disabled={busy || (!body.trim() && !photos.photos.length) || (!isTeam && !subject.trim()) || (kind === 'DIRECT' && !recipient) || (kind === 'GROUP' && (!groupName.trim() || members.length < 2))}><Send size={16} />{busy ? copy.sending : copy.send}</button></div></div>
  </form>;
}
