import { useEffect, useRef, useState } from 'react';
import { Mail, PenLine, RefreshCw, Settings, Search } from 'lucide-react';
import { IndiceTitleBarOverflow, IndiceTitleBar, IndiceViewState, IndiceWorkspaceNavigation } from '../../components/frontend-os';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ApiClientError } from '../../lib/apiClient';
import { useWorkspaceNavigationMemory } from '../../hooks/useWorkspaceNavigationMemory';
import { mailboxApi, type MailboxAccount, type MailboxMessage, type MailboxWorkspace, type MailDraft, type MailPage } from './mailboxApi';
import { MailPreferences } from './MailPreferences';
import { useMailCompletionCopy } from './completionCopy';
import { MailComposer } from './MailComposer';
import { MailMessageDetail, messageState } from './MailMessageDetail';
import { initialDraft } from './mailboxModel';
import { useEmailCopy } from './translations';
import { useMailboxCopy } from './mailboxCopy';

const defaults = { accountId: '', folder: 'INBOX', query: '' };
const emptyWorkspace: MailboxWorkspace = { folders: [], lastSyncAt: null, lastError: null };
const selectClass = 'h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900';
export function LiveMailboxWorkspace({ onAccounts }: { onAccounts?: () => void }) {
  const { copy } = useEmailCopy(); const text = useMailboxCopy(); const extra=useMailCompletionCopy();const [preferences,setPreferences]=useState(false);
  const [accounts, setAccounts] = useState<MailboxAccount[]>([]); const [filters, setFilters] = useState(defaults);
  const [workspace, setWorkspace] = useState(emptyWorkspace); const [page, setPage] = useState<MailPage>({ items: [], hasMore: false });
  const [selected, setSelected] = useState<MailboxMessage | null>(null); const [offset, setOffset] = useState(0); const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true); const [listLoading, setListLoading] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [compose, setCompose] = useState<{ draft: MailDraft; id?: string } | null>(null);
  const [discard, setDiscard] = useState<MailboxMessage | null>(null); const alive = useRef(true); const scope = useRef('');
  const account = accounts.find(a => a.id === filters.accountId) ?? accounts[0];
  scope.current = account?.id ?? '';
  useWorkspaceNavigationMemory({ moduleKey: 'email', tabKey: 'mail', defaults, state: filters, onRestore: value => setFilters({ accountId: typeof value.accountId === 'string' ? value.accountId : '', folder: typeof value.folder === 'string' ? value.folder : 'INBOX', query: typeof value.query === 'string' ? value.query.slice(0, 180) : '' }) });
  const accountId = account?.id;
  const folderId = filters.folder === 'INBOX' ? workspace.folders.find(f => f.kind === 'INBOX')?.id : filters.folder;
  const remoteFolder = workspace.folders.find(f => f.id === folderId || filters.folder === 'SENT' && f.kind === 'SENT');
  const current = (captured: string) => alive.current && scope.current === captured;
  function failure(error: unknown) {
    if (error instanceof ApiClientError) {
      if (error.code === 'email_move_unsupported') return text.moveUnsupported;
      if (error.code === 'email_imap_required') return text.imapRequired;
      if (['email_folder_changed', 'email_message_unavailable'].includes(error.code ?? '')) return text.conflict;
      if (error.code === 'email_operation_in_progress') return text.busyError;
      if (error.status === 409) return text.conflict;
      if (error.status === 429) return text.rateError;
      if ([401, 403, 404].includes(error.status)) return text.accessError;
    }
    return text.operationError;
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    mailboxApi.accounts(controller.signal).then(setAccounts).catch(e => { if (!controller.signal.aborted) setError(failure(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    setWorkspace(emptyWorkspace); setSelected(null); setPage({ items: [], hasMore: false }); setOffset(0);
    if (!accountId) return;
    const controller = new AbortController();
    mailboxApi.workspace(accountId, controller.signal).then(value => { if (!controller.signal.aborted) setWorkspace(value); }).catch(e => { if (!controller.signal.aborted) setError(failure(e)); });
    return () => controller.abort();
  }, [accountId, account?.version]);
  useEffect(() => {
    setSelected(null); setPage({ items: [], hasMore: false });
    if (!accountId || !folderId || !['DRAFTS', 'SENT', 'OUTBOX'].includes(folderId) && !workspace.folders.some(f => f.id === folderId)) return;
    const controller = new AbortController(); setListLoading(true);
    const timer = window.setTimeout(() => mailboxApi.list(accountId, folderId, filters.query, offset, controller.signal)
      .then(value => { if (!controller.signal.aborted) setPage(value); })
      .catch(e => { if (!controller.signal.aborted) setError(failure(e)); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); }), 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [accountId, folderId, filters.query, offset, workspace, reload]);
  function changeFolder(folder: string) { setOffset(0); setFilters(v => ({ ...v, folder })); setSelected(null); setNotice(''); setError(''); }
  async function refresh(older = false, quiet = false) {
    if (!account || busy) return; const captured = account.id; setBusy(true); if (!quiet) { setError(''); setNotice(''); }
    try {
      const value = account.receiveProtocol === 'IMAP' && (!['DRAFTS', 'OUTBOX'].includes(filters.folder))
        ? await mailboxApi.sync(captured, remoteFolder?.id ?? null, older)
        : await mailboxApi.workspace(captured);
      if (current(captured)) { setWorkspace(value); if (!quiet) setNotice(account.receiveProtocol === 'IMAP' && !['DRAFTS', 'OUTBOX'].includes(filters.folder) ? text.syncDone : ''); }
    } catch (e) { if (current(captured)) setError(failure(e)); }
    finally { if (current(captured)) setBusy(false); }
  }
  useEffect(() => {
    if (!workspace.lastSyncAt || busy || compose || discard || loading || account?.receiveProtocol !== 'IMAP') return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(false, true); }, 60_000);
    return () => window.clearInterval(timer);
  }, [workspace, busy, compose, discard, loading, accountId, filters.folder]);
  async function open(message: MailboxMessage) {
    if (!account || busy) return; const captured = account.id; setBusy(true); setError('');
    try { const value = await mailboxApi.open(captured, message.id); if (current(captured)) { setSelected(value); setPage(v => ({ ...v, items: v.items.map(m => m.id === value.id ? { ...m, read: value.read, version: value.version } : m) })); } }
    catch (e) { if (current(captured)) setError(failure(e)); }
    finally { if (current(captured)) setBusy(false); }
  }
  function write(mode: 'new' | 'edit' | 'reply' | 'all' | 'forward' | 'copy' = 'new') {
    if (account) setCompose({ draft: initialDraft(account, selected ?? undefined, mode), id: mode === 'edit' ? selected?.id : undefined });
  }
  function done(message: MailboxMessage) {
    setCompose(null); changeFolder(message.state === 'DRAFT' ? 'DRAFTS' : message.state === 'ACCEPTED' ? 'SENT' : 'OUTBOX');
    setNotice(message.state === 'DRAFT' ? text.draftSaved : messageState(message.state, text)); setReload(v => v + 1);
  }
  async function action(action: string, target?: string) {
    if (!account || !selected || busy) return; const captured = account.id; setBusy(true); setError('');
    try { const value = await mailboxApi.action(captured, selected, account.version, action, target ?? null); if (current(captured)) { setSelected(action === 'MOVE' || action === 'UNREAD' ? null : value); setPage(v => ({ ...v, items: action === 'MOVE' ? v.items.filter(m => m.id !== value.id) : v.items.map(m => m.id === value.id ? value : m) })); if (action === 'MOVE') setNotice(text.moveDone); } }
    catch (e) { if (current(captured)) setError(failure(e)); }
    finally { if (current(captured)) setBusy(false); }
  }
  async function discardDraft() {
    if (!account || !discard) return; const captured = account.id; setBusy(true); setError('');
    try { await mailboxApi.discard(captured, discard, account.version); if (current(captured)) { setDiscard(null); setSelected(null); setReload(v => v + 1); } }
    catch (e) { if (current(captured)) { setError(failure(e)); setDiscard(null); } }
    finally { if (current(captured)) setBusy(false); }
  }
  const folderItems = [{ id: 'INBOX', label: copy.inbox }, { id: 'SENT', label: copy.sent }, { id: 'DRAFTS', label: copy.drafts }, { id: 'OUTBOX', label: text.outbox }];
  return <div className="space-y-5">
    <IndiceTitleBar title={copy.mailbox} subtitle={copy.subtitle} icon={<Mail className="h-5 w-5" />} tone="blue" actions={<>
      <IndiceTitleBarOverflow label={copy.actions} items={[{id:"preferences",label:extra.preferences,disabled:!account||busy,onSelect:()=>setPreferences(true)},...(onAccounts?[{id:"accounts",label:copy.configureAccounts,onSelect:onAccounts}]:[])]}/>

      <Button variant="outline" disabled={!account || busy || loading} onClick={() => void refresh()}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? text.syncing : copy.refresh}</Button>
      <Button disabled={!account || busy || loading} onClick={() => write()}><PenLine className="mr-2 h-4 w-4" />{copy.compose}</Button>
    </>} />
    {error && <IndiceViewState compact variant="error" title={error} tone="blue" action={<Button variant="outline" disabled={busy} onClick={() => { setError(''); setReload(v => v + 1); }}>{copy.refresh}</Button>} />}
    {notice && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">{notice}</p>}
    {loading && !account ? <IndiceViewState variant="loading" title={copy.loading} tone="blue" /> : !account ? <IndiceViewState variant="empty" title={copy.noAccounts} description={copy.noAccountsDescription} tone="blue" action={onAccounts ? <Button onClick={onAccounts}>{copy.connect}</Button> : undefined} /> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="space-y-4 border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="grid gap-4 md:grid-cols-2"><label className="min-w-0 space-y-2 text-sm"><span>{text.account}</span><select className={selectClass} value={account.id} disabled={busy} onChange={e => { setFilters({ accountId: e.target.value, folder: 'INBOX', query: '' }); setError(''); setNotice(''); }}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.label} · {a.email}</option>)}</select></label>
          <div className="flex items-end text-xs text-slate-500 dark:text-slate-400"><p>{workspace.lastSyncAt && workspace.folders.some(f => f.syncedAt) ? `${text.lastSync}: ${new Date(workspace.lastSyncAt).toLocaleString()}` : text.neverSynced}</p></div></div>
        <IndiceWorkspaceNavigation tone="blue" ariaLabel={copy.folders} value={filters.folder} onValueChange={value => { if (!busy) changeFolder(value); }} items={folderItems} />
        <div className="grid gap-3 md:grid-cols-2"><label className="relative block"><span className="sr-only">{copy.search}</span><Search aria-hidden className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input className="h-11 pl-10" placeholder={text.searchHint} disabled={busy} value={filters.query} maxLength={180} onChange={e => { setOffset(0); setFilters(v => ({ ...v, query: e.target.value })); }} /></label>
          {!!workspace.folders.length && <label className="block min-w-0"><span className="sr-only">{text.moreFolders}</span><select className={selectClass} disabled={busy} value={workspace.folders.some(f => f.id === filters.folder) ? filters.folder : ''} onChange={e => e.target.value && changeFolder(e.target.value)}><option value="">{text.moreFolders}</option>{workspace.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}</div>
      </div>
      {workspace.lastError&&<p role="status" className="border-b border-amber-200 p-4 text-sm text-amber-800 dark:border-amber-900 dark:text-amber-200">{text.operationError}</p>}
      {account.receiveProtocol !== 'IMAP' && <p className="border-b border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">{text.imapRequired}</p>}
      {!folderId && filters.folder === 'INBOX' ? <IndiceViewState variant="empty" title={text.start} description={text.startHint} tone="blue" action={account.receiveProtocol === 'IMAP' ? <Button disabled={busy} onClick={() => void refresh()}>{text.sync}</Button> : onAccounts ? <Button onClick={onAccounts}>{copy.configureAccounts}</Button> : undefined} /> : <>
        <div className="grid min-h-[440px] lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <div className={`${selected ? 'hidden lg:block' : ''} max-h-[70dvh] overflow-y-auto border-slate-200 dark:border-slate-700 lg:border-r`}>
            {listLoading ? <IndiceViewState compact variant="loading" title={copy.loading} tone="blue" /> : !page.items.length ? <IndiceViewState compact variant="empty" title={filters.query ? copy.noResults : copy.emptyFolder} tone="blue" /> : page.items.map(message => <button key={message.id} disabled={busy} aria-pressed={selected?.id === message.id} onClick={() => void open(message)} className={`w-full border-b border-slate-100 p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:opacity-60 dark:border-slate-800 ${selected?.id === message.id ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{message.state !== 'RECEIVED' ? `${copy.to}: ${message.to.join(', ')}` : message.fromName || message.fromAddress}</span>{!message.read && <span aria-label={copy.notRead} className="h-2 w-2 rounded-full bg-blue-600" />}{message.starred && <span aria-label={copy.starred}>★</span>}</div>
              <p className="mt-2 truncate text-sm">{message.subject || copy.noSubject}</p><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{messageState(message.state, text)}</span><time>{new Date(message.occurredAt).toLocaleDateString()}</time></div>
            </button>)}
          </div>
          <article className={`${selected ? '' : 'hidden lg:block'} min-w-0 p-5 md:p-7`}><MailMessageDetail key={selected?.id??'empty'} account={account.id} accountVersion={account.version} message={selected} folders={workspace.folders} busy={busy} onBack={() => setSelected(null)} onWrite={write} onAction={(value, target) => void action(value, target)} onDiscard={() => setDiscard(selected)} /></article>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">{text.syncedHint}</p><div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!offset || busy || listLoading} onClick={() => setOffset(v => Math.max(0, v - 25))}>{text.previous}</Button><Button variant="outline" disabled={!page.hasMore || busy || listLoading} onClick={() => setOffset(v => v + 25)}>{text.next}</Button>
          {remoteFolder?.hasOlder && <Button variant="outline" disabled={busy} onClick={() => void refresh(true)}>{text.older}</Button>}</div></div>
      </>}
    </section>}
    {preferences&&account&&<MailPreferences account={account} folders={workspace.folders} onClose={()=>setPreferences(false)}/>}
    {compose && account && <MailComposer key={compose.id ?? 'new'} account={account} initial={compose.draft} messageId={compose.id} onClose={() => setCompose(null)} onDone={done} />}
    {discard && <IndiceModalFrame open tone="blue" modalType="confirmation" icon={<Mail className="h-5 w-5" />} title={text.deleteTitle} description={text.deleteHint} closeLabel={copy.cancel} onOpenChange={open => { if (!open && !busy) setDiscard(null); }}
      footerLeading={<Button disabled={busy} variant="outline" className="!border-white !bg-white !text-slate-600" onClick={() => setDiscard(null)}>{copy.cancel}</Button>}
      footer={<Button data-modal-destructive disabled={busy} onClick={() => void discardDraft()}>{text.deleteDraft}</Button>}><p className="break-words text-sm">{discard.subject || copy.noSubject}</p></IndiceModalFrame>}
  </div>;
}
