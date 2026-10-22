import { MailOperationalKpis } from './MailOperationalKpis';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useMailEditorCopy } from '../../components/mail-editor/mailEditorCopy';
import '../../components/mail-editor/mailEditor.css';
import { useEffect, useRef, useState } from 'react';
import { Archive, Clock3, FileText, Folder, PanelLeftClose, PanelLeftOpen, X, Inbox, Mail, PenLine, RefreshCw, Settings, Send, ShieldAlert, Trash2 } from 'lucide-react';
import { IndiceTitleBarOverflow, IndiceTitleBar, IndiceViewState } from '../../components/frontend-os';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '../../components/ui/sheet';
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
import { MailFolderDialog } from './MailFolderDialog';
import { useMailWorkspaceCopy, sendFailureText } from './mailWorkspaceCopy';
import { MailMessageList } from './MailMessageList';
import { MailFolderRail } from './MailFolderRail';
import { MailWorkspaceFilters } from './MailWorkspaceFilters';
import './mailWorkspace.css';
import { MailBulkActions } from './MailBulkActions';
import { organizeMail } from './mailBulk';
import { useMailDailyCopy } from './mailDailyCopy';
import { presentMailFolders } from './mailFolderPresentation';

const defaults = { accountId: '', folder: 'INBOX', query: '', quick: 'ALL', foldersCollapsed: false, density: 'comfortable', listWidth: 320 };
const emptyWorkspace: MailboxWorkspace = { folders: [], lastSyncAt: null, lastError: null };
export function LiveMailboxWorkspace({ onAccounts }: { onAccounts?: () => void }) {
  const daily = useMailDailyCopy();
  const [checked, setChecked] = useState<string[]>([]); const [bulkProgress, setBulkProgress] = useState(0); const bulkLock = useRef(false);
  const [newMail, setNewMail] = useState(false);
  const [mobileFolders, setMobileFolders] = useState(false);
  const [readerExpanded, setReaderExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null); const listPosition = useRef(0);
  const mobileFoldersTrigger = useRef<HTMLButtonElement>(null);
  const work=useMailWorkspaceCopy();const [newFolder,setNewFolder]=useState(false);
  const pro=useMailEditorCopy();const [workspaceExpanded,setWorkspaceExpanded]=useState(false);
  useEffect(()=>{if(!workspaceExpanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[workspaceExpanded]);
  const { copy } = useEmailCopy(); const text = useMailboxCopy(); const extra=useMailCompletionCopy();const [preferences,setPreferences]=useState(false);
  const [accounts, setAccounts] = useState<MailboxAccount[]>([]); const [filters, setFilters] = useState(defaults);
  const [workspace, setWorkspace] = useState(emptyWorkspace); const [workspaceReady,setWorkspaceReady]=useState('');const firstSync=useRef('');const lastSyncAttempt=useRef(0); const [page, setPage] = useState<MailPage>({ items: [], hasMore: false });
  const [selected, setSelected] = useState<MailboxMessage | null>(null); const [offset, setOffset] = useState(0); const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true); const [listLoading, setListLoading] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [compose, setCompose] = useState<{ draft: MailDraft; id?: string } | null>(null);
  const [discard, setDiscard] = useState<MailboxMessage | null>(null); const alive = useRef(true); const scope = useRef('');
  const account = accounts.find(a => a.id === filters.accountId) ?? accounts[0];
  scope.current = account?.id ?? '';
  useWorkspaceNavigationMemory({ moduleKey: 'email', tabKey: 'mail', defaults, state: filters, onRestore: value => setFilters({ accountId: typeof value.accountId === 'string' ? value.accountId : '', folder: typeof value.folder === 'string' ? value.folder : 'INBOX', query: typeof value.query === 'string' ? value.query.slice(0, 180) : '', quick: ['UNREAD','STARRED'].includes(String(value.quick)) ? String(value.quick) : 'ALL', foldersCollapsed: value.foldersCollapsed === true, density: value.density === 'compact' ? 'compact' : 'comfortable', listWidth: Math.max(260, Math.min(440, Number(value.listWidth) || 320)) }) });
  const readingExpanded = readerExpanded && !!selected;
  useEffect(() => { if (!selected) setReaderExpanded(false); }, [selected?.id]);
  useEffect(() => {
    if (!readingExpanded && listRef.current) listRef.current.scrollTop = listPosition.current;
  }, [readingExpanded]);
  useEffect(() => {
    if (!readingExpanded || compose || discard || preferences || newFolder || mobileFolders) return;
    const exitReading = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('[role="dialog"], [role="menu"]')) setReaderExpanded(false);
    };
    window.addEventListener('keydown', exitReading);
    return () => window.removeEventListener('keydown', exitReading);
  }, [readingExpanded, compose, discard, preferences, newFolder, mobileFolders]);
  function toggleReading() {
    if (!readingExpanded) listPosition.current = listRef.current?.scrollTop ?? 0;
    setReaderExpanded(value => !value);
  }
  function toggleFolders() {
    if (readingExpanded) { setReaderExpanded(false); setFilters(value => ({ ...value, foldersCollapsed: false })); }
    else setFilters(value => ({ ...value, foldersCollapsed: !value.foldersCollapsed }));
  }
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
    setWorkspaceReady(''); firstSync.current=''; setWorkspace(emptyWorkspace); setSelected(null); setPage({ items: [], hasMore: false }); setOffset(0);
    if (!accountId) return;
    const controller = new AbortController();
    mailboxApi.workspace(accountId, controller.signal).then(value => { if (!controller.signal.aborted) {setWorkspace(value);setWorkspaceReady(accountId);} }).catch(e => { if (!controller.signal.aborted) setError(failure(e)); });
    return () => controller.abort();
  }, [accountId, account?.version]);
  useEffect(() => {
    setSelected(null); setChecked([]); setNewMail(false); setPage({ items: [], hasMore: false });
    if (!accountId || !folderId || !['DRAFTS', 'SENT', 'OUTBOX'].includes(folderId) && !workspace.folders.some(f => f.id === folderId)) return;
    const controller = new AbortController(); setListLoading(true);
    const timer = window.setTimeout(() => mailboxApi.list(accountId, folderId, filters.query, offset, controller.signal, filters.quick)
      .then(value => { if (!controller.signal.aborted) setPage(value); })
      .catch(e => { if (!controller.signal.aborted) setError(failure(e)); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); }), 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [accountId, folderId, filters.query, filters.quick, offset, reload]);
  function changeQuery(query: string) {
    if (busy) return;
    setOffset(0); setSelected(null); setFilters(value => ({ ...value, query: query.slice(0, 180) }));
  }
  function changeQuick(quick: string) {
    if (busy || !['ALL', 'UNREAD', 'STARRED'].includes(quick)) return;
    setOffset(0); setSelected(null); setFilters(value => ({ ...value, quick }));
  }
  function changeAccount(accountId: string) {
    if (busy || !accounts.some(account => account.id === accountId)) return;
    setOffset(0); setSelected(null); setError(''); setNotice('');
    setFilters(value => ({ ...value, accountId, folder: 'INBOX', query: '', quick: 'ALL' }));
  }
  function clearFilters() {
    if (busy) return;
    setOffset(0); setSelected(null); setFilters(value => ({ ...value, query: '', quick: 'ALL' }));
  }
  function changeFolder(folder: string) { if (busy) return; setOffset(0); setFilters(v => ({ ...v, folder, quick: 'ALL' })); setSelected(null); setNotice(''); setError(''); }
  async function refresh(older = false, quiet = false, targetOffset = offset) {
    if (!account || busy) return; const captured = account.id; lastSyncAttempt.current=Date.now(); setBusy(true); if (!quiet) { setError(''); setNotice(''); }
    try {
      const value = account.receiveProtocol === 'IMAP' && (!['DRAFTS', 'OUTBOX'].includes(filters.folder))
        ? await mailboxApi.sync(captured, remoteFolder?.id ?? null, older)
        : await mailboxApi.workspace(captured);
      if (current(captured)) {
        setWorkspace(value);
        const targetFolder = filters.folder === 'INBOX' ? value.folders.find(f => f.kind === 'INBOX')?.id : filters.folder;
        if (targetFolder) {
          const updated = await mailboxApi.list(captured, targetFolder, filters.query, targetOffset, undefined, filters.quick);
          if (current(captured)) { setPage(updated); setSelected(previous => { const fresh = updated.items.find(m => m.id === previous?.id); return previous && fresh ? { ...previous, ...fresh, bodyText: previous.bodyText, bodyHtml: previous.bodyHtml } : previous; }); setChecked([]); setNewMail(false); }
        }
        if (!quiet) setNotice(account.receiveProtocol === 'IMAP' && !['DRAFTS', 'OUTBOX'].includes(filters.folder) ? text.syncDone : ''); }
    } catch (e) { if (current(captured)) setError(failure(e)); }
    finally { if (current(captured)) setBusy(false); }
  }
  useEffect(()=>{
    if(!account||workspaceReady!==account.id||loading||busy||compose||selected||checked.length||account.receiveProtocol!=='IMAP'||['DRAFTS','OUTBOX'].includes(filters.folder))return;
    const key=`${account.id}:${account.version}:${filters.folder}`;
    if(firstSync.current===key)return;
    const timer=window.setTimeout(()=>{firstSync.current=key;void refresh(false,true);},Math.max(0,5100-(Date.now()-lastSyncAttempt.current)));
    return ()=>window.clearTimeout(timer);
  },[accountId,account?.version,workspaceReady,loading,busy,compose,selected,checked.length,filters.folder]);
  useEffect(() => {
    if (!workspace.lastSyncAt || busy || compose || discard || selected || checked.length || loading || account?.receiveProtocol !== 'IMAP') return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(false, true); }, 60_000);
    return () => window.clearInterval(timer);
  }, [workspace, busy, compose, discard, selected, checked.length, loading, accountId, filters.folder]);
  useEffect(() => {
    if (!accountId || !folderId || !selected || busy || compose || checked.length) return;
    const abort = new AbortController();
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const latest = await mailboxApi.list(accountId, folderId, filters.query, 0, abort.signal, filters.quick);
        if (!abort.signal.aborted && latest.items.some(m => !page.items.some(old => old.id === m.id) && new Date(m.occurredAt) > new Date(page.items[0]?.occurredAt ?? 0))) setNewMail(true);
      } catch { /* The next explicit refresh reports connection errors without disturbing reading. */ }
    }, 60_000);
    return () => { abort.abort(); window.clearInterval(timer); };
  }, [accountId, folderId, selected?.id, busy, compose, checked.length, filters.query, filters.quick, page]);
  const selectable = page.items.filter(m => m.folderId && m.state === 'RECEIVED');
  async function bulkAction(kind: string, target?: string) {
    if (!account || busy || bulkLock.current) return;
    const messages = selectable.filter(m => checked.includes(m.id)); if (!messages.length) return;
    const captured = account.id; bulkLock.current = true; setBusy(true); setBulkProgress(0); setError(''); setNotice('');
    try {
      const result = await organizeMail(messages, message => mailboxApi.action(captured, message, account.version, kind, target ?? null), value => {
        setPage(previous => ({ ...previous, items: kind === 'MOVE' || kind === 'READ' && filters.quick === 'UNREAD' ? previous.items.filter(m => m.id !== value.id) : previous.items.map(m => m.id === value.id ? { ...m, ...value } : m) }));
        setSelected(previous => previous?.id === value.id ? kind === 'MOVE' ? null : value : previous);
      }, setBulkProgress, () => current(captured));
      if (current(captured)) { setChecked(result.failed); setNotice(`${result.completed} ${daily.processed}${result.failed.length ? ` · ${result.failed.length} ${daily.failed}` : ''}`); }
      await updateCounts(captured);
    } finally { bulkLock.current = false; if (current(captured)) { setBusy(false); setBulkProgress(0); } }
  }
  async function updateCounts(captured: string) {
    try { const next = await mailboxApi.workspace(captured); if (current(captured)) setWorkspace(next); } catch { /* A failed read must not turn a successful mutation into a failure. */ }
  }
  async function open(message: MailboxMessage) {
    if (!account || busy) return; const captured = account.id; setBusy(true); setError('');
    try { const value = await mailboxApi.open(captured, message.id); if (current(captured)) { setSelected(value); setPage(v => ({ ...v, items: v.items.map(m => m.id === value.id ? { ...m, read: value.read, version: value.version } : m) })); void updateCounts(captured); } }
    catch (e) { if (current(captured)) setError(failure(e)); }
    finally { if (current(captured)) setBusy(false); }
  }
  function write(mode: 'new' | 'edit' | 'reply' | 'all' | 'forward' | 'copy' = 'new') {
    if (account) setCompose({ draft: initialDraft(account, selected ?? undefined, mode), id: mode === 'edit' ? selected?.id : undefined });
  }
  useEffect(()=>{if(!workspaceExpanded)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('[role="dialog"],[role="menu"]')){setWorkspaceExpanded(false);event.preventDefault();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[workspaceExpanded]);
  function done(message: MailboxMessage) {
    setCompose(null); changeFolder(message.state === 'DRAFT' ? 'DRAFTS' : message.state === 'ACCEPTED' ? 'SENT' : 'OUTBOX');
    setNotice(message.state === 'DRAFT' ? text.draftSaved : sendFailureText(message.failureCode,work) ?? messageState(message.state, text)); setReload(v => v + 1);
  }
  async function action(action: string, target?: string) {
    if (!account || !selected || busy) return; const captured = account.id; setBusy(true); setError('');
    try { const value = await mailboxApi.action(captured, selected, account.version, action, target ?? null); if (current(captured)) { setSelected(action === 'MOVE' || action === 'UNREAD' ? null : value); setPage(v => ({ ...v, items: action === 'MOVE' ? v.items.filter(m => m.id !== value.id) : v.items.map(m => m.id === value.id ? value : m) })); if (action === 'MOVE') setNotice(text.moveDone); void updateCounts(captured); } }
    catch (e) { if (current(captured)) setError(failure(e)); }
    finally { if (current(captured)) setBusy(false); }
  }
  async function discardDraft() {
    if (!account || !discard) return; const captured = account.id; setBusy(true); setError('');
    try { await mailboxApi.discard(captured, discard, account.version); if (current(captured)) { setDiscard(null); setSelected(null); setReload(v => v + 1); } }
    catch (e) { if (current(captured)) { setError(failure(e)); setDiscard(null); } }
    finally { if (current(captured)) setBusy(false); }
  }
  const folderLabels:Record<string,string>={INBOX:work.inbox,SENT:copy.sent,ARCHIVE:work.archive,TRASH:copy.trash,JUNK:work.spam,DRAFTS:copy.drafts};
  const folderIcons:Record<string,React.ReactNode>={INBOX:<Inbox className="h-4 w-4"/>,SENT:<Send className="h-4 w-4"/>,ARCHIVE:<Archive className="h-4 w-4"/>,TRASH:<Trash2 className="h-4 w-4"/>,JUNK:<ShieldAlert className="h-4 w-4"/>};
  const namedFolders = presentMailFolders(workspace.folders, folderLabels);
  const folderOrder = ['DRAFTS', 'ARCHIVE', 'JUNK', 'TRASH', 'CUSTOM'];
  const folderItems = [{ id: 'INBOX', kind: 'INBOX', label: work.inbox, icon: folderIcons.INBOX }, { id: 'SENT', kind: 'SENT', label: copy.sent, icon: folderIcons.SENT },
    ...namedFolders.filter(f => !['INBOX', 'SENT'].includes(f.kind))
      .sort((a, b) => folderOrder.indexOf(a.kind) - folderOrder.indexOf(b.kind))
      .map(f => ({ id: f.id, kind: f.kind, label: f.label, description: f.name, icon: folderIcons[f.kind] ?? <Folder className="h-4 w-4" /> })),
    { id: 'DRAFTS', kind: 'DRAFTS', label: copy.drafts, icon: <FileText className="h-4 w-4" />, group: work.localGroup },
    { id: 'OUTBOX', kind: 'OUTBOX', label: daily.outbox, icon: <Clock3 className="h-4 w-4" />, group: work.localGroup }];
  const activeFolderLabel = filters.folder === 'DRAFTS' ? work.localDrafts : folderItems.find(f => f.id === filters.folder)?.label ?? work.inbox;
  const folderRailProps = {
    items: folderItems.map(item => ({ ...item, unread: workspace.folders.find(f => f.id === item.id || item.id === 'INBOX' && f.kind === 'INBOX')?.unreadCount })), namedFolders, value: filters.folder, busy, canCreate: account?.receiveProtocol === 'IMAP',
    lastSync: workspace.folders.some(f => f.syncedAt) ? workspace.lastSyncAt : null,
    onChange: (id: string) => { changeFolder(id); setMobileFolders(false); },
    onCreate: () => { setMobileFolders(false); setNewFolder(true); },
  };
  return <div className={`space-y-5 ${workspaceExpanded?'mail-workspace-expanded':''}`} data-mail-expanded={workspaceExpanded}>
    <IndiceTitleBar title={copy.mailbox} subtitle={work.mailboxSubtitle} icon={<Mail className="h-5 w-5" />} tone="blue" actions={<>
      <Button variant="outline" className="min-h-11 rounded-lg" disabled={busy || loading} onClick={() => account ? void refresh() : setReload(value => value + 1)}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? text.syncing : copy.refresh}</Button>
      {account ? <>
        <Button variant="outline" className="min-h-11 rounded-lg" disabled={busy} onClick={() => setPreferences(true)}><Settings className="h-4 w-4" />{extra.preferences}</Button>
        <Button className="min-h-11 rounded-lg" disabled={busy || loading} onClick={() => write()}><PenLine className="h-4 w-4" />{copy.compose}</Button>
        <IndiceTitleBarOverflow label={copy.actions} items={[
          ...(onAccounts?[{ id: 'accounts', label: copy.accounts, disabled: busy, icon: <Mail className="h-4 w-4" />, onSelect: onAccounts }]:[]),
          {id:'expand',label:workspaceExpanded?pro.restoreMailbox:pro.expandMailbox,icon:workspaceExpanded?<Minimize2 className="h-4 w-4"/>:<Maximize2 className="h-4 w-4"/>,onSelect:()=>setWorkspaceExpanded(v=>!v)}]} />
      </> : onAccounts && <Button className="min-h-11 rounded-lg" disabled={loading} onClick={onAccounts}><Mail className="h-4 w-4" />{copy.connect}</Button>}
    </>} />
    {error && <IndiceViewState compact variant="error" title={error} tone="blue" action={<Button variant="outline" disabled={busy} onClick={() => { setError(''); setReload(v => v + 1); }}>{copy.refresh}</Button>} />}
    {notice && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">{notice}</p>}
    {loading && !account ? <IndiceViewState variant="loading" title={copy.loading} tone="blue" /> : !account ? <IndiceViewState variant="empty" title={copy.noAccounts} description={copy.noAccountsDescription} tone="blue" action={onAccounts ? <Button onClick={onAccounts}>{copy.connect}</Button> : undefined} /> : <>
      <MailWorkspaceFilters className={selected ? 'hidden lg:block' : undefined} accounts={accounts} accountId={account.id}
        query={filters.query} quick={filters.quick} busy={busy || loading} onQuery={changeQuery} onAccount={changeAccount} onQuick={changeQuick} onClear={clearFilters} />
      <MailOperationalKpis key={account.id} account={account.id} query={filters.query} revision={reload} workspace={workspace} hidden={!!selected} busy={busy||loading} folder={filters.folder} quick={filters.quick}
        onSelect={(folder,quick)=>{setSelected(null);setChecked([]);setOffset(0);setFilters(v=>({...v,folder,quick}));}} />
      <section className="overflow-clip rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-3 py-2 dark:border-slate-700 dark:bg-blue-950/20">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" className="hidden h-11 rounded-lg lg:inline-flex" aria-label={readingExpanded || filters.foldersCollapsed ? work.expandFolders : work.collapseFolders} aria-expanded={!readingExpanded && !filters.foldersCollapsed} title={readingExpanded || filters.foldersCollapsed ? work.expandFolders : work.collapseFolders} onClick={toggleFolders}>{readingExpanded || filters.foldersCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}{work.folders}</Button>
          <Button ref={mobileFoldersTrigger} variant="outline" className="h-11 w-11 shrink-0 rounded-lg px-0 lg:hidden" aria-label={work.folders} title={work.folders} aria-expanded={mobileFolders} aria-haspopup="dialog" onClick={() => setMobileFolders(true)}><Folder className="h-4 w-4" /></Button>
          <span title={remoteFolder?.name} className="min-w-0 truncate text-sm font-medium text-blue-900 dark:text-blue-200">{activeFolderLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3"><details className="relative text-xs"><summary className="cursor-pointer rounded-lg border bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">{daily.view}</summary><div className="absolute right-0 top-full z-20 w-64 space-y-4 rounded-xl border bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"><label className="block space-y-2"><span>{daily.density}</span><select aria-label={daily.density} className="h-11 w-full rounded-lg border bg-transparent px-2" value={filters.density} onChange={e => setFilters(v => ({...v, density: e.target.value}))}><option value="comfortable">{daily.comfortable}</option><option value="compact">{daily.compact}</option></select></label><label className="hidden space-y-2 lg:block"><span>{daily.listWidth}</span><input aria-label={daily.listWidth} className="w-full" type="range" min="260" max="440" step="20" value={filters.listWidth} onChange={e => setFilters(v => ({...v, listWidth: Number(e.target.value)}))}/></label></div></details><span className="text-xs text-slate-600 dark:text-slate-300">{work.pageCount}: <span className="rounded-md bg-blue-100 px-2 py-0.5 font-medium text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">{listLoading ? '—' : page.items.length}</span></span></div>
      </div>
      {newMail && <div role="status" className="flex items-center justify-between bg-blue-100 px-4 py-2 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"><span>{daily.newMail}</span><Button disabled={busy} variant="outline" onClick={() => { setOffset(0); void refresh(false, false, 0); }}>{daily.showNew}</Button></div>}
      {!readingExpanded && <MailBulkActions count={checked.length} available={selectable.length} all={selectable.length > 0 && selectable.every(m => checked.includes(m.id))} busy={busy || listLoading} progress={bulkProgress} folders={workspace.folders} folderId={folderId} onSelectAll={() => setChecked(checked.length === selectable.length ? [] : selectable.map(m => m.id))} onClear={() => setChecked([])} onAction={(kind, target) => void bulkAction(kind, target)} />}
      <div data-mail-layout={readingExpanded ? 'reading' : filters.foldersCollapsed ? 'compact' : 'expanded'} className={`grid ${readingExpanded ? 'lg:grid-cols-1' : filters.foldersCollapsed ? 'lg:grid-cols-[68px_minmax(0,1fr)]' : 'lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)]'}`}>
        <aside className={`${readingExpanded ? 'hidden' : 'hidden lg:block'} min-w-0 border-r border-blue-100 bg-blue-50/70 p-3 dark:border-slate-700 dark:bg-blue-950/20`}>
          <div className="max-h-[75dvh] overflow-y-auto overscroll-contain"><MailFolderRail {...folderRailProps} collapsed={filters.foldersCollapsed} /></div>
        </aside>
        <div className="min-w-0">
      {workspace.lastError&&<p role="status" className="border-b border-amber-200 p-4 text-sm text-amber-800 dark:border-amber-900 dark:text-amber-200">{text.operationError}</p>}
      {account.receiveProtocol !== 'IMAP' && <p className="border-b border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">{text.imapRequired}</p>}
      {!folderId && filters.folder === 'INBOX' ? <IndiceViewState variant="empty" title={text.start} description={text.startHint} tone="blue" action={account.receiveProtocol === 'IMAP' ? <Button disabled={busy} onClick={() => void refresh()}>{text.sync}</Button> : onAccounts ? <Button onClick={onAccounts}>{copy.configureAccounts}</Button> : undefined} /> : <>
        <div style={{ '--mail-list-width': `${filters.listWidth}px` } as React.CSSProperties} className={`grid min-h-[480px] ${readingExpanded ? 'lg:grid-cols-1' : 'mail-message-columns'}`}>
          <div ref={listRef} data-mail-message-list className={`${readingExpanded ? 'hidden' : selected ? 'hidden lg:block' : ''} max-h-[70dvh] overflow-y-auto overscroll-contain border-slate-200 dark:border-slate-700 lg:border-r`}>
            {listLoading ? <IndiceViewState compact variant="loading" title={copy.loading} tone="blue" /> : !page.items.length ? <IndiceViewState compact variant="empty" title={filters.query ? copy.noResults : copy.emptyFolder} tone="blue" /> : <MailMessageList density={filters.density} checked={checked} onCheck={id => setChecked(v => v.includes(id) ? v.filter(item => item !== id) : [...v, id])} outgoing={filters.folder==='SENT'} messages={page.items} selectedId={selected?.id} busy={busy} onOpen={message => void open(message)} />}

          </div>
          <article key={selected?.id ?? 'empty'} className={`${selected ? '' : 'hidden lg:block'} min-w-0 max-h-[70dvh] overflow-y-auto overscroll-contain`}><MailMessageDetail key={selected?.id??'empty'} expanded={readingExpanded} onToggleExpanded={toggleReading} account={account.id} accountVersion={account.version} message={selected} folders={workspace.folders} busy={busy} onBack={() => setSelected(null)} onWrite={write} onAction={(value, target) => void action(value, target)} onDiscard={() => setDiscard(selected)} /></article>
        </div>
        <div className={`${readingExpanded ? 'hidden' : 'flex'} flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-700`}><p className="text-xs text-slate-500 dark:text-slate-400">{text.syncedHint}</p><div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!offset || busy || listLoading} onClick={() => setOffset(v => Math.max(0, v - 25))}>{text.previous}</Button><Button variant="outline" disabled={!page.hasMore || busy || listLoading} onClick={() => setOffset(v => v + 25)}>{text.next}</Button>
          {remoteFolder?.hasOlder && <Button variant="outline" disabled={busy} onClick={() => void refresh(true)}>{text.older}</Button>}</div></div>
      </>}
        </div>
      </div>
    </section></>}
    {account && <Sheet open={mobileFolders} onOpenChange={setMobileFolders}>
      <SheetContent side="left" className="mail-folder-sheet w-[min(320px,90vw)] bg-blue-50 dark:bg-slate-900" onCloseAutoFocus={event => { event.preventDefault(); if (!newFolder) mobileFoldersTrigger.current?.focus(); }}>
        <SheetHeader className="border-b border-slate-200 pr-14 dark:border-slate-700"><SheetTitle>{work.folders}</SheetTitle><SheetDescription className="break-all">{account.email}</SheetDescription><SheetClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2 h-11 w-11" aria-label={work.closeFolders}><X className="h-4 w-4" /></Button></SheetClose></SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"><MailFolderRail {...folderRailProps} /></div>
      </SheetContent>
    </Sheet>}
    {newFolder&&account&&<MailFolderDialog account={account} onClose={()=>setNewFolder(false)} onSaved={value=>{setWorkspace(value);setNewFolder(false);}}/>}
    {preferences&&account&&<MailPreferences account={account} folders={workspace.folders} onClose={()=>setPreferences(false)}/>}
    {compose && account && <MailComposer key={compose.id ?? 'new'} account={account} initial={compose.draft} messageId={compose.id} onClose={() => setCompose(null)} onDone={done} />}
    {discard && <IndiceModalFrame open tone="blue" modalType="confirmation" icon={<Mail className="h-5 w-5" />} title={text.deleteTitle} description={text.deleteHint} closeLabel={copy.cancel} onOpenChange={open => { if (!open && !busy) setDiscard(null); }}
      footerLeading={<Button disabled={busy} variant="outline" className="!border-white !bg-white !text-slate-600" onClick={() => setDiscard(null)}>{copy.cancel}</Button>}
      footer={<Button data-modal-destructive disabled={busy} onClick={() => void discardDraft()}>{text.deleteDraft}</Button>}><p className="break-words text-sm">{discard.subject || copy.noSubject}</p></IndiceModalFrame>}
  </div>;
}
