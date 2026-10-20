import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { CalendarClock, CheckCircle2, GitBranch, Handshake, History, KanbanSquare, LayoutGrid, List, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { useLanguage } from '../../../shared/context';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { SalesTitleBar, salesTitleBarPrimaryActionClassName, salesTitleBarSecondaryActionClassName } from '../components/SalesTitleBar';
import { SalesFilterBar, SalesFilterSearch, SalesFilterSelect } from '../components/SalesFilterBar';
import { postSaleWorkspaceApi as api, type ContinuityItem, type ContinuityWorkspace } from './workspace/postSaleWorkspaceApi';
import { continuityCopy } from './workspace/continuityCopy';
import { errorStatus, normalizeContinuitySort, workDraft } from './workspace/continuityModel';
import { ContinuityBoard } from './workspace/ContinuityBoard';
import { ContinuityTable } from './workspace/ContinuityTable';
import { ContinuityWorkModal } from './workspace/ContinuityWorkModal';
import { ContinuityFlowModal } from './workspace/ContinuityFlowModal';
import { PostSalesPortfolio } from './PostSalesPortfolio';
const pageSizes = [10, 25, 50, 100] as const;
const defaults = { kind: 'won', wonView: 'board', lostView: 'board', flow: 0, search: '', owner: 'all', stage: 'all', page: 1, pageSize: 50,
  wonSortColumn: 'nextAction', wonSortDirection: 'asc', lostSortColumn: 'nextAction', lostSortDirection: 'asc' };
export default function Postventa() {
  const { currentLanguage } = useLanguage(); const t = continuityCopy(currentLanguage.code);
  const [filters, setFilters] = useState(defaults);
  const [workspace, setWorkspace] = useState<ContinuityWorkspace | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0); const [selected, setSelected] = useState<ContinuityItem | null>(null);
  const [managing, setManaging] = useState(false); const [portfolio, setPortfolio] = useState(false);
  const [moving, setMoving] = useState(false); const moveLock = useRef(false);
  const [moveRetry, setMoveRetry] = useState<{ item: ContinuityItem; command: ReturnType<typeof workDraft> & { requestKey: string } } | null>(null);
  const location = useLocation();
  const notificationParams = new URLSearchParams(location.search);
  const notificationSource = notificationParams.get('source') ?? '';
  const notificationKind = notificationParams.get('kind') === 'lost' ? 'lost' : 'won';
  const handledNotification = useRef('');
  const notificationKey = `${location.key}:${notificationKind}:${notificationSource}`;
  const ready = useWorkspaceNavigationMemory({ moduleKey: 'sales', tabKey: 'after-sales', state: filters, defaults,
    urlFields: { kind: 'kind', wonView: 'postView', lostView: 'lostView', flow: 'postFlow', search: 'q', owner: 'owner', stage: 'status', page: 'page', pageSize: 'pageSize',
      wonSortColumn: 'wonSort', wonSortDirection: 'wonOrder', lostSortColumn: 'lostSort', lostSortDirection: 'lostOrder' },
    onRestore: (value) => setFilters({ kind: value.kind === 'lost' ? 'lost' : 'won', flow: Number.isFinite(value.flow) && value.flow >= 0 ? value.flow : 0,
      wonView: value.wonView === 'table' ? 'table' : 'board', pageSize: pageSizes.includes(value.pageSize as typeof pageSizes[number]) ? value.pageSize : 50,
      lostView: value.lostView === 'table' ? 'table' : 'board',
      wonSortColumn: normalizeContinuitySort(value.wonSortColumn, value.wonSortDirection, 'won').columnId,
      wonSortDirection: normalizeContinuitySort(value.wonSortColumn, value.wonSortDirection, 'won').direction,
      lostSortColumn: normalizeContinuitySort(value.lostSortColumn, value.lostSortDirection, 'lost').columnId,
      lostSortDirection: normalizeContinuitySort(value.lostSortColumn, value.lostSortDirection, 'lost').direction,
      search: String(value.search).slice(0, 200), owner: /^\d+$/.test(value.owner) ? value.owner : 'all', stage: String(value.stage), page: Math.max(1, Number(value.page) || 1) }),
  });
  useEffect(() => {
    if (!ready || !/^\d+$/.test(notificationSource) || handledNotification.current === notificationKey) return;
    let cancelled = false;
    setFilters((current) => current.kind === notificationKind ? current : { ...current, kind: notificationKind, stage: 'all', page: 1 });
    void api.detail(notificationKind, Number(notificationSource))
      .then((detail) => { if (!cancelled && handledNotification.current !== notificationKey) { handledNotification.current = notificationKey; setSelected(detail.item); } })
      .catch(() => { if (!cancelled) setError(t.error); });
    return () => { cancelled = true; };
  }, [ready, notificationKey, notificationSource, notificationKind, t.error]);
  const kind = filters.kind === 'lost' ? 'lost' : 'won';
  const activeView = (kind === 'won' ? filters.wonView : filters.lostView) === 'table' ? 'table' : 'board';
  const sortState = kind === 'won' ? normalizeContinuitySort(filters.wonSortColumn, filters.wonSortDirection, kind)
    : normalizeContinuitySort(filters.lostSortColumn, filters.lostSortDirection, kind);
  const reload = () => setRevision((value) => value + 1);
  const closeDetail = () => {
    handledNotification.current = notificationKey;
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('source');
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
  };
  useEffect(() => {
    if (!ready) return;
    let cancelled = false; setLoading(true);
    void api.workspace({ kind, search: filters.search, owner: filters.owner === 'all' ? undefined : Number(filters.owner),
      flow: kind === 'won' ? filters.flow : undefined, stage: filters.stage, page: filters.page, pageSize: filters.pageSize, sort: sortState.columnId, direction: sortState.direction })
      .then((data) => {
        if (cancelled) return;
        if (kind === 'won' && !data.flows.some((flow) => flow.id === filters.flow && !flow.archived)) { setFilters((current) => ({ ...current, flow: 0, page: 1 })); return; }
        const lastPage = Math.max(1, Math.ceil(data.counts.total / data.pageSize));
        if (filters.page > lastPage) { setFilters((current) => ({ ...current, page: lastPage })); return; }
        setWorkspace(data);
        setLoadError(false);
        setError((current) => current === t.error ? '' : current);
      }).catch(() => { if (!cancelled) { setLoadError(true); setError(t.error); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ready, kind, filters.flow, filters.search, filters.owner, filters.stage, filters.page, filters.pageSize, sortState.columnId, sortState.direction, revision, t.error]);
  const change = (patch: Partial<typeof filters>) => {
    if (moveLock.current || moveRetry) return;
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    if (Object.keys(next).every((key) => next[key as keyof typeof next] === filters[key as keyof typeof filters])) return;
    setLoading(true); setError(''); setFilters(next);
  };
  const flow = workspace?.flows.find((value) => value.id === filters.flow);
  const stages = kind === 'lost' ? [
    { value: 'all', label: t.allStatuses },
    { value: 'unscheduled', label: t.unscheduled }, { value: 'scheduled', label: t.scheduled }, { value: 'paused', label: t.paused }, { value: 'recovered', label: t.recovered },
  ] : [];
  const metrics = useMemo(() => workspace ? [
    [t.total, workspace.counts.total], [t.overdue, workspace.counts.overdue], [t.today, workspace.counts.today],
    [t.unscheduled, workspace.counts.unscheduled], [kind === 'won' ? t.completed : t.recovered, workspace.counts.completed],
  ] : [], [workspace, kind, t]);
  const move = async (item: ContinuityItem, stage: string) => {
    if (moveLock.current || moveRetry) return;
    if (!item.ownerId) { setSelected(item); return; }
    const operation = { item, command: { ...workDraft(item), stageKey: stage, requestKey: crypto.randomUUID() } };
    await performMove(operation);
  };
  const performMove = async (operation: NonNullable<typeof moveRetry>) => {
    if (moveLock.current) return; moveLock.current = true; setMoving(true); setError('');
    try { await api.save(operation.item.kind, operation.item.sourceId, operation.command); setMoveRetry(null); reload(); }
    catch (failure) { const status = errorStatus(failure); setError(status === 409 ? t.conflict : t.saveError); if (!status || status >= 500) setMoveRetry(operation); else { setMoveRetry(null); reload(); } }
    finally { moveLock.current = false; setMoving(false); }
  };
  if (portfolio) return <div className="space-y-4">{error && <p role="alert">{error}</p>}<Button variant="outline" onClick={() => setPortfolio(false)}>{t.returnBoard}</Button>
    <PostSalesPortfolio onFollowUp={(id) => { void api.detail('won', Number(id)).then((detail) => { setPortfolio(false); setSelected(detail.item); }).catch(() => setError(t.error)); }} /></div>;
  return <div className="space-y-5 p-4 sm:p-6">
    <SalesTitleBar title={t.title} subtitle={t.subtitle} icon={<Handshake className="h-6 w-6" />} actions={<>
      <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={() => setPortfolio(true)}><History className="mr-2 h-4 w-4" />{t.history}</Button>
      <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={reload} disabled={loading || moving || Boolean(moveRetry)}><RefreshCw className="mr-2 h-4 w-4" />{t.refresh}</Button>
      <Button className={salesTitleBarPrimaryActionClassName} onClick={() => setManaging(true)} disabled={!workspace}><GitBranch className="mr-2 h-4 w-4" />{t.flows}</Button>
    </>} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label={t.title} className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {(['won', 'lost'] as const).map((value) => <Button key={value} variant="ghost" className={kind === value ? 'bg-[#FF6B5E] text-[#222831] hover:bg-[#E85C50]' : ''} aria-pressed={kind === value} onClick={() => change({ kind: value, stage: 'all' })} disabled={moving || Boolean(moveRetry)}>
          {value === 'won' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}{t[value]}</Button>)}
      </div>
      <p className="max-w-3xl text-sm text-slate-500">{kind === 'won' ? t.wonHint : t.lostHint}</p>
    </div>
    <div role="group" aria-label={kind === 'won' ? t.wonView : t.lostView} className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {(['board', 'table'] as const).map((view) => <Button key={view} variant="ghost" className={`min-h-11 ${activeView === view ? 'bg-[#FF6B5E] text-[#222831] hover:bg-[#E85C50]' : ''}`} aria-pressed={activeView === view}
        disabled={moving || Boolean(moveRetry)} onClick={() => setFilters((current) => ({ ...current, [kind === 'won' ? 'wonView' : 'lostView']: view }))}>
        {view === 'table' ? <List className="mr-2 h-4 w-4" /> : kind === 'won' ? <KanbanSquare className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}{view === 'board' && kind === 'lost' ? t.cards : t[view]}</Button>)}
    </div>
    <SalesFilterBar title={kind === 'won' ? t.won : t.lost} gridClassName="grid gap-4 md:grid-cols-3">
      <SalesFilterSearch label={t.search} placeholder={t.search} value={filters.search} onValueChange={(value) => change({ search: value })} />
      {kind === 'won' ? <SalesFilterSelect label={t.activeFlow} value={String(filters.flow)} onValueChange={(value) => change({ flow: Number(value), stage: 'all' })} options={(workspace?.flows ?? []).filter((value) => !value.archived).map((value) => ({ value: String(value.id), label: value.id === 0 ? t.defaultFlow : value.name }))} />
        : <SalesFilterSelect label={t.stage} value={filters.stage} onValueChange={(value) => change({ stage: value })} options={stages} />}
      <SalesFilterSelect label={t.owner} value={filters.owner} onValueChange={(value) => change({ owner: value })} options={[{ value: 'all', label: t.allOwners }, ...(workspace?.owners ?? []).map((owner) => ({ value: String(owner.id), label: owner.name }))]} />
    </SalesFilterBar>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error} <Button variant="outline" className="ml-3" onClick={() => { if (moveRetry) void performMove(moveRetry); else reload(); }} disabled={moving}>{t.refresh}</Button></div>}
    {loading ? <p role="status" className="py-10 text-center text-slate-500">{t.loading}</p> : !loadError && workspace && <>
      <div className="flex flex-wrap gap-x-8 gap-y-3 py-2">{metrics.map(([label, value]) => <div key={String(label)} className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-400" /><strong className="text-base font-medium">{value}</strong><span className="text-sm text-slate-500">{label}</span></div>)}</div>
      {activeView === 'table' ? <ContinuityTable key={kind} kind={kind} items={workspace.items} flow={kind === 'won' ? flow : undefined} today={workspace.today} locale={currentLanguage.code} t={t} busy={moving || Boolean(moveRetry)} onOpen={setSelected}
        sortState={sortState} onSort={(column) => {
          const direction = sortState.columnId === column && sortState.direction === 'asc' ? 'desc' : 'asc';
          change(kind === 'won' ? { wonSortColumn: column, wonSortDirection: direction } : { lostSortColumn: column, lostSortDirection: direction });
        }}
        pagination={<DataTablePagination currentPage={workspace.page} totalPages={Math.max(1, Math.ceil(workspace.counts.total / workspace.pageSize))} totalCount={workspace.counts.total}
          pageSize={workspace.pageSize} pageSizeOptions={pageSizes} pageStart={workspace.items.length ? (workspace.page - 1) * workspace.pageSize + 1 : 0}
          pageEnd={Math.min(workspace.page * workspace.pageSize, workspace.counts.total)} onPageChange={(page) => change({ page })} onPageSizeChange={(pageSize) => change({ pageSize })} />} /> : <>
      {!workspace.items.length && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{t.empty}</p>}
      <ContinuityBoard locale={currentLanguage.code} items={workspace.items} flow={kind === 'won' ? flow : undefined} today={workspace.today} t={t} busy={moving || Boolean(moveRetry)} onOpen={setSelected} onMove={(item, stage) => { void move(item, stage); }} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{t.showing} {workspace.items.length ? (workspace.page - 1) * workspace.pageSize + 1 : 0}–{Math.min(workspace.page * workspace.pageSize, workspace.counts.total)} {t.of} {workspace.counts.total}</span>
        <div className="flex items-center gap-3"><Button variant="outline" disabled={filters.page <= 1 || moving || Boolean(moveRetry)} onClick={() => change({ page: filters.page - 1 })}>{t.previous}</Button><span>{t.page} {filters.page}</span><Button variant="outline" disabled={workspace.page * workspace.pageSize >= workspace.counts.total || moving || Boolean(moveRetry)} onClick={() => change({ page: filters.page + 1 })}>{t.next}</Button></div>
      </div>
      </>}
    </>}
    {selected && workspace && <ContinuityWorkModal locale={currentLanguage.code} key={`${selected.kind}:${selected.sourceId}`} item={selected} workspace={workspace} t={t} onClose={closeDetail} onSaved={reload} />}
    {managing && workspace && <ContinuityFlowModal flows={workspace.flows} t={t} onClose={() => setManaging(false)} onSaved={(value) => { setManaging(false); change({ kind: 'won', flow: value.archived ? 0 : value.id, stage: 'all' }); reload(); }} />}
  </div>;
}
