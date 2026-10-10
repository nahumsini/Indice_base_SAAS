import { useCallback, useEffect, useContext, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Headphones, MessageSquare, Plus, RefreshCw, Search, Send, Users } from 'lucide-react';
import { ApiClientError } from '../lib/apiClient';
import { field, button, primary, ErrorNotice, type ComposerState } from './MessagingPrimitives';
export type { ComposerState } from './MessagingPrimitives';
import { NewConversation } from './NewConversation';
import { teamCopy } from './teamCopy';
import { QuickMessageTask } from './QuickMessageTask';
import { messageReceipt } from './messageState';
import './messaging.css';
import { IndiceConfirmationDialog } from '../components/indice-modal/IndiceConfirmationDialog';
import { useMessagingApi, MessagingVisibleContext } from './MessagingTransportContext';
import { messagingCopy, messagingLabel } from './copy';
import { useConversation } from './useConversation';
import { MessagePhoto, PhotoPicker } from './MessagePhotos';
import { photoCopy } from './photoCopy';
import type { Audit, CareSummary, Conversation, MessagingContext, MessagingPortal, Page, Person } from './types';

export function MessagingWorkspace({ portal, locale, userId, initialId = null, initialQuery = '', contained = false, onComposerState, initialKind = 'DIRECT' }: {
  portal: MessagingPortal; locale: string; userId: number; initialId?: number | null; initialQuery?: string; contained?: boolean; onComposerState?: (state: ComposerState) => void; initialKind?: 'DIRECT' | 'SUPPORT';
}) {
  const copy = messagingCopy(locale);
  const team = teamCopy(locale);
  const api = useMessagingApi(portal);
  const visible = useContext(MessagingVisibleContext);
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
      if (!visible || document.hidden) { timer = setTimeout(load, 15000); return; }
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
  }, [api, portal, filter, query, revision, limit, visible]);

  const filters = portal === 'member' ? ['ALL', ...(!context?.supportOnly ? ['DIRECT','GROUP'] : []),'SUPPORT', ...(context?.distributor ? ['DISTRIBUTOR'] : [])]
    : ['ALL','UNASSIGNED','MINE','OPEN','WAITING_CUSTOMER','RESOLVED'];
  const label = (value: string) => value === 'ALL' ? copy.all : value === 'GROUP' ? team.groups : value === 'DIRECT' ? team.direct : value === 'SUPPORT' ? copy.support
    : value === 'DISTRIBUTOR' ? copy.distributor : value === 'UNASSIGNED' ? copy.unassigned : value === 'MINE' ? copy.mine : messagingLabel(copy, value);
  return <section className={`messaging-workspace flex min-h-0 flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 ${contained ? 'flex-1' : 'h-[min(800px,85dvh)] rounded-2xl border border-slate-200 dark:border-slate-700'}`} aria-label={portal === 'member' ? copy.title : copy.care}>
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
        <div data-chat-inbox-header className="shrink-0 space-y-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-lg font-medium"><span aria-hidden data-chat-emoji>💬</span>{copy.inbox}</h2>{portal === 'member' && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{team.connected}</p>}</div><button type="button" aria-label={copy.refresh} className={button} onClick={refresh}><RefreshCw size={16} /></button></div>
          {portal === 'member' && <button type="button" className={`${primary} w-full`} disabled={!context || composer.busy} onClick={() => navigate(() => { setSelected(null); setCreating(true); })}><Plus size={18} />{copy.newMessage}</button>}
          <div className="relative"><Search size={17} aria-hidden className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input aria-label={copy.search} placeholder={copy.search} value={query} maxLength={100} onChange={e => { setQuery(e.target.value); setLimit(40); }} className={`${field} pl-10`} /></div>
          <select aria-label={copy.title} value={filter} onChange={e => { setFilter(e.target.value); setLimit(40); }} className={field}>{filters.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2" aria-busy={loading}>
          {loading ? <p role="status">{copy.loading}</p> : !page.items.length ? <p className="p-3 text-sm text-slate-500">{copy.empty}</p> : page.items.map(c =>
            <button type="button" key={c.id} disabled={composer.busy} onClick={() => { if (selected !== c.id || creating) navigate(() => { setSelected(c.id); setCreating(false); }); }} aria-current={selected === c.id && !creating ? 'true' : undefined}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${selected === c.id && !creating ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span aria-hidden data-chat-emoji className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800">{c.kind === 'DIRECT' ? '💬' : c.kind === 'GROUP' ? '👥' : '🎧'}</span>
              <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="break-words text-base font-medium [overflow-wrap:anywhere]">{c.displayName || c.subject}</span>{c.unreadCount > 0 && <span className="shrink-0 rounded-full bg-[#143675] px-2 py-0.5 text-xs text-white">{c.unreadCount}</span>}</span>
              <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-300">{portal === 'member' ? label(c.kind) : `${c.companyName} · ${c.requesterName}`}</span>
              <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{['DIRECT','GROUP'].includes(c.kind) ? new Date(c.updatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : messagingLabel(copy,c.status)}</span></span>
            </button>)}
          {page.hasMore && <button type="button" className={button} onClick={() => setLimit(value => value + 40)}>{copy.more}</button>}
        </div>
      </aside>
      <div data-messaging-detail className={`${selected || creating ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
        {creating && context ? <NewConversation initialKind={initialKind} context={context} locale={locale} onState={setComposer} onCancel={() => navigate(() => setCreating(false))} onCreated={id => { setCreating(false); setSelected(id); refresh(); }} />
          : selected ? <ConversationThread key={`${portal}:${selected}`} id={selected} portal={portal} locale={locale} userId={context?.userId ?? userId} onState={setComposer} onBack={() => navigate(() => setSelected(null))} onChanged={refresh} />
            : <div className="m-auto max-w-sm p-8 text-center text-sm text-slate-500 dark:text-slate-400"><span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950"><MessageSquare size={28} /></span><h2 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">{copy.title}</h2>{copy.choose}</div>}
      </div>
    </div>
  </section>;
}

function ConversationThread({ id, portal, locale, userId, onBack, onChanged, onState }: { id: number; portal: MessagingPortal; locale: string; userId: number; onBack: () => void; onChanged: () => void; onState: (state: ComposerState) => void }) {
  const copy = messagingCopy(locale);
  const team = teamCopy(locale);
  const visible = useContext(MessagingVisibleContext);
  const thread = useConversation(portal, id, onChanged);
  const c = thread.conversation;
  const isTeam = c?.kind === 'DIRECT' || c?.kind === 'GROUP';
  const api = useMessagingApi(portal);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskState, setTaskState] = useState<ComposerState>({ dirty:false, busy:false });
  const [canCreateTask, setCanCreateTask] = useState(false);
  const blocked = isTeam && thread.participants.some(p => !p.active);
  useEffect(() => {
    let active = true;
    if (portal === 'member' && isTeam) void api.taskContext().then(result => { if (active) setCanCreateTask(result.canCreate); }).catch(() => { if (active) setCanCreateTask(false); });
    return () => { active = false; };
  }, [api, portal, isTeam]);
  const [assignees, setAssignees] = useState<Person[]>([]);
  const [audit, setAudit] = useState<Audit[] | null>(null);
  const [staffError, setStaffError] = useState<unknown>(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const history = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const latestId = thread.messages[thread.messages.length - 1]?.id;
  const composerInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { onState({ dirty: taskState.dirty || Boolean(thread.draft.trim() || thread.photos.photos.length), busy: taskState.busy || thread.sending }); }, [taskState, thread.draft, thread.photos.photos.length, thread.sending, onState]);
  useEffect(() => () => onState({ dirty: false, busy: false }), [onState]);
  useEffect(() => {
    const input = composerInput.current;
    if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 112)}px`; }
  }, [thread.draft, c?.id]);
  useEffect(() => { if (followLatest.current && history.current) history.current.scrollTop = history.current.scrollHeight; }, [latestId, taskOpen]);
  const readVisible = useCallback(() => {
    const el = history.current;
    if (visible && !taskOpen && latestId && el && el.clientHeight > 0 && el.scrollHeight - el.scrollTop - el.clientHeight < 60) void thread.markRead(latestId);
  }, [visible, taskOpen, latestId, thread.markRead]);
  useEffect(() => { const frame = requestAnimationFrame(readVisible); return () => cancelAnimationFrame(frame); }, [readVisible, thread.revision]);
  useEffect(() => { let active = true; if (portal !== 'member') void api.assignees().then(rows => { if (active) setAssignees(rows); }).catch(e => { if (active) setStaffError(e); }); return () => { active = false; }; }, [api, portal]);
  const showAudit = async () => { try { setAudit(await api.audit(id)); } catch (e) { setStaffError(e); } };
  return <>
    <div data-chat-header className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700"><button type="button" aria-label={copy.back} className={`${button} md:hidden`} disabled={thread.sending || taskState.busy} onClick={onBack}><ArrowLeft size={18} /></button>
      <span aria-hidden data-chat-emoji className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 md:flex dark:bg-slate-800">{c?.kind === 'GROUP' ? '👥' : isTeam ? '💬' : '🎧'}</span>
      <div className="min-w-0 flex-1"><h2 className="break-words font-medium [overflow-wrap:anywhere]">{c?.displayName || c?.subject || copy.title}</h2>{c && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{isTeam ? c.kind === 'GROUP' ? `${team.members} · ${thread.participants.length}` : team.direct : `${c.kind === 'SUPPORT' ? copy.support : copy.distributor} · ${messagingLabel(copy,c.status)}`}</p>}</div>
      <button type="button" aria-label={copy.refresh} className={button} onClick={() => void thread.refresh()}><RefreshCw size={16} /></button></div>
    {(thread.error || staffError) ? <div className="shrink-0 px-3 pt-2"><ErrorNotice error={thread.error || staffError} copy={copy} /></div> : null}
    {isTeam && !taskOpen && <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800">
      <details className="min-w-0 flex-1 text-xs text-slate-600 dark:text-slate-300"><summary className="flex min-h-11 cursor-pointer items-center gap-2"><Users size={16}/>{team.members}</summary><ul className="max-h-32 space-y-2 overflow-y-auto pb-2">{thread.participants.map(p => <li key={p.membershipId} className="break-words">{p.name}{!p.active ? ` · ${team.inactive}` : ''}</li>)}</ul><p className="pb-2">{team.receiptHint}</p></details>
      {portal === 'member' && <button type="button" className={`${button} self-start border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100`} disabled={!canCreateTask || thread.sending} title={!canCreateTask ? team.taskDenied : team.taskHint} onClick={() => setTaskOpen(true)}><span aria-hidden>✅</span>{team.addTask}</button>}
    </div>}
    {taskOpen && c && <QuickMessageTask conversationId={id} locale={locale} onClose={() => setTaskOpen(false)} onState={setTaskState}/>}
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
    <div ref={history} data-chat-history hidden={taskOpen} onScroll={e => { const el=e.currentTarget; followLatest.current=el.scrollHeight-el.scrollTop-el.clientHeight<60; readVisible(); }} className={`${taskOpen ? 'hidden' : 'flex'} min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 md:p-6`} role="log" aria-live="polite" aria-label={copy.title} aria-busy={thread.loading}>
      {thread.loading && <p role="status">{copy.loading}</p>}
      {thread.hasOlder && <button type="button" className={button} onClick={() => void thread.older()}>{copy.older}</button>}
      {thread.messages.map(m => { const receipt = messageReceipt(m, thread.participants); const receiptLabel = receipt.allRead ? team.read : receipt.read > 0 ? team.readBy.replace('{read}', String(receipt.read)).replace('{total}', String(receipt.total)) : copy.sent; return <article key={m.id} data-chat-message data-chat-own={m.senderUserId === userId && m.visibility !== 'INTERNAL' ? '' : undefined} className={`max-w-[90%] shrink-0 rounded-2xl border px-4 py-3 md:max-w-[80%] ${m.visibility === 'INTERNAL' ? 'self-start border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' : m.senderUserId === userId ? 'self-end rounded-br-sm' : 'self-start rounded-bl-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
        <p className="mb-1 text-xs font-medium">{m.senderName}{m.visibility === 'INTERNAL' ? ` · ${copy.internal}` : ''}</p><p data-chat-body className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.body}</p>
        {m.attachments?.map(photo => <MessagePhoto key={photo.id} photo={photo} portal={portal} conversationId={id} locale={locale}
          onLoad={() => { if (followLatest.current && history.current) history.current.scrollTop = history.current.scrollHeight; }} />)}
        <div data-chat-time title={new Date(m.createdAt).toLocaleString(locale)} className="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-600 dark:text-slate-300"><span>{new Date(m.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>{m.senderUserId === userId && <span data-chat-receipt title={isTeam ? team.receiptHint : copy.sent}>{isTeam && m.visibility === 'PUBLIC' ? <>{receipt.allRead ? <CheckCheck size={16} aria-hidden/> : <Check size={16} aria-hidden/>}<span>{receiptLabel}</span></> : copy.sent}</span>}</div>
      </article>; })}
    </div>
    {blocked && !taskOpen && <p role="status" className="shrink-0 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">{team.unavailable}</p>}
    {c && !taskOpen && <form className="shrink-0 space-y-2 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-700" onSubmit={e => { e.preventDefault(); if (!blocked) { followLatest.current = true; void thread.send(); } }}>
      <PhotoPicker photos={thread.photos.photos} disabled={thread.sending} locale={locale} onAdd={thread.photos.add} onRemove={thread.photos.remove} />
      {thread.error && thread.photos.photos.length > 0 && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{photoCopy(locale).uploadError}</p>}
      {portal !== 'member' && <select className={field} aria-label={copy.body} disabled={thread.sending} value={thread.visibility} onChange={e => thread.setVisibility(e.target.value)}><option value="PUBLIC">{copy.public}</option><option value="INTERNAL">{copy.internal}</option></select>}
      <div className="flex items-end gap-2"><textarea ref={composerInput} aria-label={copy.body} placeholder={copy.body} value={thread.draft} onChange={e => thread.setDraft(e.target.value)} rows={1} maxLength={8000} disabled={thread.sending} className={`${field} max-h-28 min-w-0 flex-1 resize-none`} />
        <button type="submit" aria-label={thread.sending ? copy.sending : copy.send} className={`${primary} shrink-0`} disabled={blocked || thread.sending || (!thread.draft.trim() && !thread.photos.photos.length)}><Send size={18} /><span className="hidden sm:inline">{thread.sending ? copy.sending : copy.send}</span></button></div>
      {thread.draft.length > 7000 && <p className="text-right text-xs text-slate-500">{thread.draft.length}/8000</p>}
    </form>}
    <IndiceConfirmationDialog open={confirmTransfer} title={copy.transfer} description={copy.transferConfirm} confirmLabel={copy.transfer} cancelLabel={copy.cancel}
      busy={thread.sending} tone="blue" onCancel={() => setConfirmTransfer(false)} onConfirm={async () => { if (await thread.change('TRANSFER')) onBack(); }} />
  </>;
}
