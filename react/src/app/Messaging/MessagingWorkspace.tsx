import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Headphones, MessageSquare, Plus, RefreshCw, Search, Send, Users } from 'lucide-react';
import { ApiClientError } from '../lib/apiClient';
import { cn } from '../components/ui/utils';
import { IndiceConfirmationDialog } from '../components/indice-modal/IndiceConfirmationDialog';
import { messagingApi } from './api';
import { messagingCopy, messagingLabel } from './copy';
import { requestIdentity } from './messageState';
import { useConversation } from './useConversation';
import { MessagePhoto, PhotoPicker } from './MessagePhotos';
import { photoCopy } from './photoCopy';
import type { Audit, CareSummary, Conversation, MessagingContext, MessagingPortal, Page, Person } from './types';

const field = 'w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800';
const primary = cn(button, 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:hover:bg-blue-700');
type Copy = ReturnType<typeof messagingCopy>;
export type ComposerState = { dirty: boolean; busy: boolean };

function ErrorNotice({ error, copy, retry }: { error: unknown; copy: Copy; retry?: () => void }) {
  if (!error) return null;
  const status = error instanceof ApiClientError ? error.status : 0;
  return <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
    {[401,403,404].includes(status) ? copy.denied : status === 409 ? copy.conflict : status === 429 ? copy.limited : copy.error}
    {retry && <button type="button" className={`${button} ml-2`} onClick={retry}>{copy.retry}</button>}
  </div>;
}

export function MessagingWorkspace({ portal, locale, userId, initialId = null, initialQuery = '', contained = false, onComposerState }: {
  portal: MessagingPortal; locale: string; userId: number; initialId?: number | null; initialQuery?: string; contained?: boolean; onComposerState?: (state: ComposerState) => void;
}) {
  const copy = messagingCopy(locale);
  const api = useMemo(() => messagingApi(portal), [portal]);
  const [context, setContext] = useState<MessagingContext | null>(null);
  const [page, setPage] = useState<Page<Conversation>>({ items: [], hasMore: false });
  const [summary, setSummary] = useState<CareSummary | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState(initialQuery.slice(0, 100));
  const [selected, setSelected] = useState<number | null>(initialId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(40);
  const [composer, setComposer] = useState<ComposerState>({ dirty: false, busy: false });
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const navigate = (action: () => void) => {
    if (composer.busy) return;
    if (composer.dirty) setPendingNavigation(() => action);
    else action();
  };
  useEffect(() => { onComposerState?.(composer); }, [composer, onComposerState]);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    if (portal === 'member') void api.context().then(value => { if (active) setContext(value); }).catch(failure => { if (active) setError(failure); });
    return () => { active = false; };
  }, [api, portal]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const pages: Conversation[] = [];
        let hasMore = false;
        for (let offset = 0; offset < limit; offset += 40) {
          const result = await api.list(filter, query, offset);
          pages.push(...result.items); hasMore = result.hasMore;
          if (!hasMore || !active) break;
        }
        if (active) { setPage({ items: pages, hasMore }); setError(null); }
        if (portal !== 'member') {
          const result = await api.summary(); if (active) setSummary(result);
        }
      } catch (failure) {
        if (active) {
          setError(failure);
          if (failure instanceof ApiClientError && [401,403].includes(failure.status)) { setPage({ items: [], hasMore: false }); setSelected(null); }
        }
      } finally { if (active) { setLoading(false); timer = setTimeout(() => { if (!document.hidden) void load(); else timer = setTimeout(load, 15000); }, 15000); } }
    };
    const debounce = setTimeout(load, 200);
    return () => { active = false; clearTimeout(debounce); clearTimeout(timer); };
  }, [api, portal, filter, query, revision, limit]);

  const filters = portal === 'member' ? ['ALL', ...(!context?.supportOnly ? ['DIRECT'] : []),'SUPPORT', ...(context?.distributor ? ['DISTRIBUTOR'] : [])]
    : ['ALL','UNASSIGNED','MINE','OPEN','WAITING_CUSTOMER','RESOLVED'];
  const label = (value: string) => value === 'ALL' ? copy.all : value === 'DIRECT' ? copy.team : value === 'SUPPORT' ? copy.support
    : value === 'DISTRIBUTOR' ? copy.distributor : value === 'UNASSIGNED' ? copy.unassigned : value === 'MINE' ? copy.mine : messagingLabel(copy, value);
  return <section className={`flex min-h-0 flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 ${contained ? 'flex-1' : 'h-[min(800px,85dvh)] rounded-2xl border border-slate-200 dark:border-slate-700'}`} aria-label={portal === 'member' ? copy.title : copy.care}>
    {summary && <div className="grid max-h-36 shrink-0 grid-cols-2 gap-2 overflow-y-auto p-3 lg:grid-cols-4">
      {([['unassigned',copy.unassigned],['waitingCare',copy.OPEN],['waitingCustomer',copy.WAITING_CUSTOMER],['overdue',copy.overdue],
        ['averageFirstResponseMinutes',copy.firstResponse],['averageResolutionMinutes',copy.resolution],['pendingNotifications',copy.pendingNotifications]] as const).map(([key,label]) =>
        <div key={key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500 dark:text-slate-300">{label}</div><strong>{summary[key] ?? '—'}</strong></div>)}
    </div>}
    <ErrorNotice error={error} copy={copy} retry={refresh} />
    {pendingNavigation && <div role="alert" className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-amber-50 p-3 text-sm dark:bg-amber-950">
      <p className="flex-1">{copy.discardPrompt}</p><button className={button} onClick={() => setPendingNavigation(null)}>{copy.keepWriting}</button>
      <button disabled={composer.busy} className={primary} onClick={() => { setComposer({ dirty: false, busy: false }); pendingNavigation(); setPendingNavigation(null); }}>{copy.discard}</button>
    </div>}
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside aria-label={copy.inbox} className={`${selected || creating ? 'hidden md:flex' : 'flex'} min-h-0 w-full shrink-0 flex-col border-r border-slate-200 md:w-80 lg:w-96 dark:border-slate-700`}>
        <div className="shrink-0 space-y-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between"><h2 className="text-base font-medium">{copy.inbox}</h2><button type="button" aria-label={copy.refresh} className={button} onClick={refresh}><RefreshCw size={16} /></button></div>
          {portal === 'member' && <button type="button" className={`${primary} w-full`} disabled={!context || composer.busy} onClick={() => navigate(() => { setSelected(null); setCreating(true); })}><Plus size={18} />{copy.newMessage}</button>}
          <div className="relative"><Search size={17} aria-hidden className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input aria-label={copy.search} placeholder={copy.search} value={query} maxLength={100} onChange={e => { setQuery(e.target.value); setLimit(40); }} className={`${field} pl-10`} /></div>
          <select aria-label={copy.title} value={filter} onChange={e => { setFilter(e.target.value); setLimit(40); }} className={field}>{filters.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2" aria-busy={loading}>
          {loading ? <p role="status">{copy.loading}</p> : !page.items.length ? <p className="p-3 text-sm text-slate-500">{copy.empty}</p> : page.items.map(c =>
            <button type="button" key={c.id} disabled={composer.busy} onClick={() => { if (selected !== c.id || creating) navigate(() => { setSelected(c.id); setCreating(false); }); }} aria-current={selected === c.id && !creating ? 'true' : undefined}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${selected === c.id && !creating ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-300">{c.kind === 'DIRECT' ? <Users size={18} /> : <Headphones size={18} />}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{c.subject}</span>{c.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{c.unreadCount}</span>}</span>
              <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-300">{portal === 'member' ? label(c.kind) : `${c.companyName} · ${c.requesterName}`}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{c.kind === 'DIRECT' ? new Date(c.updatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : messagingLabel(copy,c.status)}</span></span>
            </button>)}
          {page.hasMore && <button type="button" className={button} onClick={() => setLimit(value => value + 40)}>{copy.more}</button>}
        </div>
      </aside>
      <div data-messaging-detail className={`${selected || creating ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
        {creating && context ? <NewConversation context={context} locale={locale} onState={setComposer} onCancel={() => navigate(() => setCreating(false))} onCreated={id => { setCreating(false); setSelected(id); refresh(); }} />
          : selected ? <ConversationThread key={`${portal}:${selected}`} id={selected} portal={portal} locale={locale} userId={userId} onState={setComposer} onBack={() => navigate(() => setSelected(null))} onChanged={refresh} />
            : <div className="m-auto max-w-sm p-8 text-center text-sm text-slate-500 dark:text-slate-400"><span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950"><MessageSquare size={28} /></span><h2 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">{copy.title}</h2>{copy.choose}</div>}
      </div>
    </div>
  </section>;
}

function NewConversation({ context, locale, onCancel, onCreated, onState }: { context: MessagingContext; locale: string; onCancel: () => void; onCreated: (id: number) => void; onState: (state: ComposerState) => void }) {
  const copy = messagingCopy(locale);
  const api = useMemo(() => messagingApi('member'), []);
  const [kind, setKind] = useState<Conversation['kind']>('SUPPORT');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('CONSULTATION');
  const [moduleName, setModuleName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { onState({ dirty: Boolean(body.trim() || subject.trim() || moduleName.trim()), busy }); }, [body, subject, moduleName, busy, onState]);
  useEffect(() => () => onState({ dirty: false, busy: false }), [onState]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { if (kind === 'DIRECT') void api.directory(search).then(rows => { if (active) setPeople(rows); }).catch(failure => { if (active) setError(failure); }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [api, search, kind]);
  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    const payload = { kind, recipientMembershipId: kind === 'DIRECT' ? Number(recipient) : null, subject: subject.trim(), topic, moduleName, language: locale, body: body.trim() };
    request.current = requestIdentity(request.current, JSON.stringify(payload));
    try { const result = await api.create({ ...payload, requestKey: request.current.key }); if (mounted.current) onCreated(result.conversation.id); }
    catch (failure) { if (mounted.current) setError(failure); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  return <form className="flex min-h-0 flex-1 flex-col" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700"><button type="button" aria-label={copy.back} className={button} disabled={busy} onClick={onCancel}><ArrowLeft size={18} /></button><h2 className="font-medium">{copy.newMessage}</h2></div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"><div className="mx-auto max-w-2xl space-y-4"><ErrorNotice error={error} copy={copy} />
    <fieldset disabled={busy} className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.title}>
        {(['SUPPORT', ...(!context.supportOnly ? ['DIRECT'] : []), ...(context.distributor ? ['DISTRIBUTOR'] : [])] as Conversation['kind'][]).map(value =>
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`${button} ${kind === value ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : ''}`}>
            {value === 'DIRECT' ? <Users size={16} /> : <Headphones size={16} />}{value === 'DIRECT' ? copy.team : value === 'SUPPORT' ? copy.support : copy.distributor}
          </button>)}
      </div>
      {kind === 'DIRECT' && <><input aria-label={copy.search} placeholder={copy.search} value={search} onChange={e => { setSearch(e.target.value); setRecipient(''); }} className={field} />
        <label className="block text-sm">{copy.recipient}<select required value={recipient} onChange={e => setRecipient(e.target.value)} className={field}><option value="">—</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {!people.length && <p className="text-sm">{copy.noPeople}</p>}</>}
      <label className="block text-sm">{copy.subject}<input required maxLength={180} value={subject} onChange={e => setSubject(e.target.value)} className={field} /></label>
      {kind !== 'DIRECT' && <><label className="block text-sm">{copy.topic}<select value={topic} onChange={e => setTopic(e.target.value)} className={field}>{['CONSULTATION','FAILURE','IMPROVEMENT'].map(v => <option key={v} value={v}>{messagingLabel(copy,v)}</option>)}</select></label>
        <label className="block text-sm">{copy.module}<input maxLength={120} value={moduleName} onChange={e => setModuleName(e.target.value)} className={field} /></label><p className="text-xs text-slate-500">{copy.asynchronous}</p></>}
      <label className="block text-sm">{copy.body}<textarea aria-label={copy.body} required rows={5} maxLength={8000} value={body} onChange={e => setBody(e.target.value)} className={field} /></label>
    </fieldset>
    </div></div>
    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700"><button type="button" className={button} onClick={onCancel} disabled={busy}>{copy.cancel}</button><button className={primary} disabled={busy || !body.trim() || !subject.trim() || (kind === 'DIRECT' && !recipient)}><Send size={16} />{busy ? copy.sending : copy.send}</button></div>
  </form>;
}

function ConversationThread({ id, portal, locale, userId, onBack, onChanged, onState }: { id: number; portal: MessagingPortal; locale: string; userId: number; onBack: () => void; onChanged: () => void; onState: (state: ComposerState) => void }) {
  const copy = messagingCopy(locale);
  const thread = useConversation(portal, id, onChanged);
  const c = thread.conversation;
  const api = useMemo(() => messagingApi(portal), [portal]);
  const [assignees, setAssignees] = useState<Person[]>([]);
  const [audit, setAudit] = useState<Audit[] | null>(null);
  const [staffError, setStaffError] = useState<unknown>(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const history = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const latestId = thread.messages[thread.messages.length - 1]?.id;
  const composerInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { onState({ dirty: Boolean(thread.draft.trim() || thread.photos.photos.length), busy: thread.sending }); }, [thread.draft, thread.photos.photos.length, thread.sending, onState]);
  useEffect(() => () => onState({ dirty: false, busy: false }), [onState]);
  useEffect(() => {
    const input = composerInput.current;
    if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 112)}px`; }
  }, [thread.draft, c?.id]);
  useEffect(() => { if (followLatest.current && history.current) history.current.scrollTop = history.current.scrollHeight; }, [latestId]);
  useEffect(() => { let active = true; if (portal !== 'member') void api.assignees().then(rows => { if (active) setAssignees(rows); }).catch(e => { if (active) setStaffError(e); }); return () => { active = false; }; }, [api, portal]);
  const showAudit = async () => { try { setAudit(await api.audit(id)); } catch (e) { setStaffError(e); } };
  return <>
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700"><button type="button" aria-label={copy.back} className={`${button} md:hidden`} disabled={thread.sending} onClick={onBack}><ArrowLeft size={18} /></button>
      <span aria-hidden className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 md:flex dark:bg-blue-950">{c?.kind === 'DIRECT' ? <Users size={18} /> : <Headphones size={18} />}</span>
      <div className="min-w-0 flex-1"><h2 className="truncate font-medium">{c?.subject ?? copy.title}</h2>{c && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{c.kind === 'DIRECT' ? copy.team : `${c.kind === 'SUPPORT' ? copy.support : copy.distributor} · ${messagingLabel(copy,c.status)}`}</p>}</div>
      <button type="button" aria-label={copy.refresh} className={button} onClick={() => void thread.refresh()}><RefreshCw size={16} /></button></div>
    {(thread.error || staffError) ? <div className="shrink-0 px-3 pt-2"><ErrorNotice error={thread.error || staffError} copy={copy} /></div> : null}
    {c && portal !== 'member' && <div className="max-h-48 shrink-0 space-y-2 overflow-y-auto border-b border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs">#{c.id} · {c.companyName} · {c.requesterName} · {c.language} · {messagingLabel(copy,c.topic)} {c.moduleName ? `· ${c.moduleName}` : ''}</p>
      <div className="flex flex-wrap items-center gap-2"><label className="text-xs">{copy.assignee}<select aria-label={copy.assignee} className={field} disabled={thread.sending} value={c.assignedUserId ?? ''} onChange={e => void thread.change('ASSIGN', e.target.value ? Number(e.target.value) : null)}><option value="">{copy.unassigned}</option>{assignees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <button type="button" className={button} disabled={thread.sending || c.assignedUserId === userId} onClick={() => void thread.change('ASSIGN', userId)}>{copy.take}</button>
        <label className="text-xs">{copy.priority}<select aria-label={copy.priority} className={field} value={c.priority} disabled={thread.sending} onChange={e => void thread.change('PRIORITY', null, e.target.value)}>{['LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v} value={v}>{messagingLabel(copy,v)}</option>)}</select></label>
        <button type="button" className={button} disabled={thread.sending} onClick={() => void thread.change('STATUS', null, c.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED')}>{c.status === 'RESOLVED' ? copy.reopen : copy.resolve}</button>
        <button type="button" className={button} onClick={() => void showAudit()}>{copy.audit}</button>
        {portal === 'distributor' && <button type="button" className={button} disabled={thread.sending} onClick={() => setConfirmTransfer(true)}>{copy.transfer}</button>}
      </div><p className="text-xs">{messagingLabel(copy,c.status)} · {new Date(c.awaitingSince).toLocaleString(locale)}</p>
    </div>}
    {audit && <div className="max-h-40 overflow-y-auto border-b p-3 text-xs"><button type="button" className={button} onClick={() => setAudit(null)}>{copy.close}</button>{audit.map(a => <p key={a.id}>{new Date(a.createdAt).toLocaleString(locale)} · {a.actorName} · {a.action}: {a.detail}</p>)}</div>}
    <div ref={history} onScroll={e => { const el=e.currentTarget; followLatest.current=el.scrollHeight-el.scrollTop-el.clientHeight<60; }} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-slate-50/70 p-4 md:p-6 dark:bg-slate-950/50" role="log" aria-live="polite" aria-label={copy.title} aria-busy={thread.loading}>
      {thread.loading && <p role="status">{copy.loading}</p>}
      {thread.hasOlder && <button type="button" className={button} onClick={() => void thread.older()}>{copy.older}</button>}
      {thread.messages.map(m => <article key={m.id} className={`max-w-[90%] shrink-0 rounded-2xl border px-4 py-3 md:max-w-[80%] ${m.visibility === 'INTERNAL' ? 'self-start border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' : m.senderUserId === userId ? 'self-end rounded-br-sm border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950' : 'self-start rounded-bl-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
        <p className="mb-1 text-xs font-semibold">{m.senderName}{m.visibility === 'INTERNAL' ? ` · ${copy.internal}` : ''}</p><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.body}</p>
        {m.attachments?.map(photo => <MessagePhoto key={photo.id} photo={photo} portal={portal} conversationId={id} locale={locale}
          onLoad={() => { if (followLatest.current && history.current) history.current.scrollTop = history.current.scrollHeight; }} />)}
        <p title={new Date(m.createdAt).toLocaleString(locale)} className="mt-2 text-right text-[11px] text-slate-500 dark:text-slate-400">{new Date(m.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}{m.senderUserId === userId ? ` · ${copy.sent}` : ''}</p>
      </article>)}
    </div>
    {c && <form className="shrink-0 space-y-2 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-700" onSubmit={e => { e.preventDefault(); followLatest.current = true; void thread.send(); }}>
      <PhotoPicker photos={thread.photos.photos} disabled={thread.sending} locale={locale} onAdd={thread.photos.add} onRemove={thread.photos.remove} />
      {thread.error && thread.photos.photos.length > 0 && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{photoCopy(locale).uploadError}</p>}
      {portal !== 'member' && <select className={field} aria-label={copy.body} disabled={thread.sending} value={thread.visibility} onChange={e => thread.setVisibility(e.target.value)}><option value="PUBLIC">{copy.public}</option><option value="INTERNAL">{copy.internal}</option></select>}
      <div className="flex items-end gap-2"><textarea ref={composerInput} aria-label={copy.body} placeholder={copy.body} value={thread.draft} onChange={e => thread.setDraft(e.target.value)} rows={1} maxLength={8000} disabled={thread.sending} className={`${field} max-h-28 min-w-0 flex-1 resize-none`} />
        <button type="submit" aria-label={thread.sending ? copy.sending : copy.send} className={`${primary} shrink-0`} disabled={thread.sending || (!thread.draft.trim() && !thread.photos.photos.length)}><Send size={18} /><span className="hidden sm:inline">{thread.sending ? copy.sending : copy.send}</span></button></div>
      {thread.draft.length > 7000 && <p className="text-right text-xs text-slate-500">{thread.draft.length}/8000</p>}
    </form>}
    <IndiceConfirmationDialog open={confirmTransfer} title={copy.transfer} description={copy.transferConfirm} confirmLabel={copy.transfer} cancelLabel={copy.cancel}
      busy={thread.sending} tone="blue" onCancel={() => setConfirmTransfer(false)} onConfirm={async () => { if (await thread.change('TRANSFER')) onBack(); }} />
  </>;
}
