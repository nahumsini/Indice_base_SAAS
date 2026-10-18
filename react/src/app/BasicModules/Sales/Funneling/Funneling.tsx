import { useEffect, useMemo, useState } from 'react';
import { Copy, Filter, List, Pencil, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { TableBody, TableCell, TableRow } from '../../../components/ui/table';
import { IndiceViewState, IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { IndiceTableShell, IndiceOperationalTable, IndiceTableColGroup, IndiceTableHeaderRow, type IndiceTableColumnDefinition } from '../../../components/table/IndiceTableEngine';
import { usePersistentColumnWidths } from '../../../hooks/usePersistentColumnWidths';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { SalesTitleBar, salesTitleBarPrimaryActionClassName } from '../components/SalesTitleBar';
import { SalesFilterBar, SalesFilterSearch, SalesFilterSelect } from '../components/SalesFilterBar';
import { FunnelEditor, funnelChannels, funnelStatuses } from './FunnelEditor';
import { FunnelView } from './FunnelView';
import { useFunnelCopy } from './funnelCopy';
import { funnelApi } from './funnelApi';
import { duplicateFunnel, normalizeFunnelView, selectVisibleFunnel, type FunnelInput, type FunnelPage, type FunnelPlan, type FunnelViewMode } from './funnelModel';

type Column = 'name' | 'channel' | 'stages' | 'conversion' | 'updatedAt';
const widths = { name: 300, channel: 180, stages: 120, conversion: 190, updatedAt: 220 };
const sortable: Column[] = ['name', 'updatedAt'];
const defaults = { search: '', status: 'ALL', page: 1, pageSize: 25, sort: 'updatedAt', direction: 'desc', view: 'list' as FunnelViewMode };
export default function Funneling() {
  const { copy, locale } = useFunnelCopy();
  const revision = useAuthorizationRevision();
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<FunnelPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: string; initial: FunnelInput } | null>(null);
  useWorkspaceNavigationMemory({ moduleKey: 'crm', tabKey: 'funneling', state: filters, defaults, urlFields: { view: 'view' }, onRestore: value => setFilters({
    search: typeof value.search === 'string' ? value.search.slice(0, 180) : '',
    status: ['ALL', 'DRAFT', 'PLANNED', 'ARCHIVED'].includes(value.status) ? value.status : 'ALL',
    page: Math.max(1, Math.min(10000, Number(value.page) || 1)),
    pageSize: [10, 25, 50, 100, 200].includes(value.pageSize) ? value.pageSize : 25,
    sort: ['name', 'updatedAt'].includes(value.sort) ? value.sort : 'updatedAt', direction: value.direction === 'asc' ? 'asc' : 'desc',
    view: normalizeFunnelView(value.view),
  }) });
  useEffect(() => { const timer = window.setTimeout(() => setSearch(filters.search), 250); return () => window.clearTimeout(timer); }, [filters.search]);
  useEffect(() => { setEditor(null); setNotice(''); setSelectedId(null); }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false); setData(null);
    funnelApi.list(new URLSearchParams({ search, status: filters.status, page: String(filters.page), pageSize: String(filters.pageSize), sort: filters.sort, direction: filters.direction }), controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setData(result);
        setSelectedId(id => selectVisibleFunnel(result.items, id)?.id ?? null);
        const last = Math.max(1, Math.ceil(result.total / filters.pageSize));
        if (filters.page > last) setFilters(value => ({ ...value, page: last }));
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, filters.status, filters.page, filters.pageSize, filters.sort, filters.direction, revision, refresh]);
  const labels = useMemo(() => ({ name: copy.name, channel: copy.channel, stages: copy.stages, conversion: copy.conversion, updatedAt: copy.updatedAt }), [copy]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({ defaults: widths, headerLabels: labels, sortableColumnIds: sortable, storageKey: 'sales-funneling-column-widths-v1' });
  const columns: IndiceTableColumnDefinition<Column>[] = (Object.keys(widths) as Column[]).map(id => ({ id, label: labels[id], width: columnWidths[id], defaultWidth: widths[id], contentMinimumWidth: widths[id], sortable: sortable.includes(id), resizeLabel: `${copy.resize}: ${labels[id]}` }));
  const total = data?.total ?? 0;
  const statuses = Object.fromEntries(funnelStatuses(copy));
  const channels = Object.fromEntries(funnelChannels(copy));
  const selected = selectVisibleFunnel(data?.items ?? [], selectedId);
  const pagination = <DataTablePagination currentPage={filters.page} pageSize={filters.pageSize} pageSizeOptions={[10, 25, 50, 100, 200]} totalCount={total} totalPages={Math.max(1, Math.ceil(total / filters.pageSize))} pageStart={(filters.page - 1) * filters.pageSize + 1} pageEnd={Math.min(filters.page * filters.pageSize, total)} onPageChange={page => setFilters(f => ({ ...f, page }))} onPageSizeChange={pageSize => setFilters(f => ({ ...f, pageSize, page: 1 }))} />;
  function create() {
    setNotice('');
    setEditor({ id: crypto.randomUUID(), initial: { name: '', objective: '', audience: '', channel: 'MIXED', notes: '', status: 'DRAFT', version: 0,
      stages: [copy.attract, copy.interest, copy.decision, copy.conversionStage].map(name => ({ name, action: '', measure: '', target: null })) } });
  }
  function open(plan: FunnelPlan, duplicate = false) {
    setNotice('');
    setEditor({ id: duplicate ? crypto.randomUUID() : plan.id, initial: duplicate ? duplicateFunnel(plan, `${plan.name} — ${copy.copySuffix}`) : {
      name: plan.name, objective: plan.objective, audience: plan.audience, channel: plan.channel,
      notes: plan.notes, stages: plan.stages, status: plan.status, version: plan.version,
    } });
  }
  return <div className="space-y-5">
    <SalesTitleBar title="Funneling" subtitle={copy.subtitle} icon={<Filter className="h-5 w-5" />} actions={<>
      <IndiceWorkspaceNavigation variant="views" tone="coral" ariaLabel={copy.views} value={filters.view} onValueChange={view => setFilters(f => ({ ...f, view }))} items={[{ id: 'list', label: copy.listView, icon: <List /> }, { id: 'funnel', label: copy.funnelView, icon: <Filter /> }]} />
      <Button variant="outline" className="min-h-11 gap-2" disabled={loading} onClick={() => setRefresh(v => v + 1)}><RefreshCw className="h-4 w-4" />{copy.refresh}</Button>
      <Button className={salesTitleBarPrimaryActionClassName} disabled={!data || loading} onClick={create}><Plus className="h-4 w-4" />{copy.newPlan}</Button>
    </>} />
    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{copy.planHint}</p>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <SalesFilterBar title={copy.filters} summary={loading ? copy.loading : String(total)}>
      <SalesFilterSearch label={copy.search} placeholder={copy.searchPlaceholder} value={filters.search} onValueChange={value => setFilters(f => ({ ...f, search: value.slice(0, 180), page: 1 }))} />
      <SalesFilterSelect label={copy.status} value={filters.status} onValueChange={status => setFilters(f => ({ ...f, status, page: 1 }))} options={[{ value: 'ALL', label: copy.all }, ...funnelStatuses(copy).map(([value, label]) => ({ value, label }))]} />
    </SalesFilterBar>
    {loading ? <IndiceViewState variant="loading" title={copy.loading} tone="coral" /> : failed ? <IndiceViewState variant="error" title={copy.loadError} tone="coral" action={<Button variant="outline" onClick={() => setRefresh(v => v + 1)}>{copy.retry}</Button>} /> : total === 0 ?
      <IndiceViewState variant="empty" title={search || filters.status !== 'ALL' ? copy.noMatches : copy.empty} description={search || filters.status !== 'ALL' ? copy.noMatchesHint : copy.emptyHint} tone="coral" action={<Button className={salesTitleBarPrimaryActionClassName} onClick={create}>{copy.newPlan}</Button>} /> :
      filters.view === 'funnel' && selected ? <div className="min-w-0 space-y-4">
        <label className="block min-w-0 space-y-1.5 text-sm"><span className="font-medium">{copy.selectPlan}</span><select aria-describedby="funnel-page-hint" className="min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={selected.id} onChange={event => setSelectedId(event.target.value)}>{data?.items.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><span id="funnel-page-hint" className="block text-xs text-slate-500 dark:text-slate-400">{copy.pagePlans}: {data?.items.length} / {total}</span></label>
        <FunnelView key={`${selected.id}:${selected.version}`} plan={selected} copy={copy} locale={locale} statusLabel={statuses[selected.status]} channelLabel={channels[selected.channel]} onEdit={() => open(selected)} />
        {pagination}
      </div> : <IndiceTableShell pagination={pagination}>
        <IndiceOperationalTable minimumWidth={Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 110}>
          <IndiceTableColGroup columns={columns} actionsWidth={110} />
          <IndiceTableHeaderRow columns={columns} onResize={resizeColumn} sortState={{ columnId: filters.sort as Column, direction: filters.direction as 'asc' | 'desc' }} onSort={id => setFilters(f => ({ ...f, sort: id, direction: f.sort === id && f.direction === 'asc' ? 'desc' : 'asc', page: 1 }))} actions={{ label: copy.actions, width: 110 }} tone="coral" />
          <TableBody>{data?.items.map(plan => <TableRow key={plan.id}>
            <TableCell><button type="button" aria-label={`${copy.viewFunnel}: ${plan.name}`} className="min-h-11 break-words text-left font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]" onClick={() => { setSelectedId(plan.id); setFilters(f => ({ ...f, view: 'funnel' })); }}>{plan.name}</button><div><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{statuses[plan.status]}</span></div></TableCell>
            <TableCell>{channels[plan.channel]}</TableCell><TableCell>{plan.stages.length}</TableCell>
            <TableCell>{plan.estimatedConversion === null ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(plan.estimatedConversion)}%`}</TableCell>
            <TableCell>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(plan.updatedAt))}</TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${copy.edit}: ${plan.name}`} onClick={() => open(plan)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${copy.duplicate}: ${plan.name}`} onClick={() => open(plan, true)}><Copy className="h-4 w-4" /></Button></div></TableCell>
          </TableRow>)}</TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>}
    {editor && <FunnelEditor key={editor.id} {...editor} copy={copy} locale={locale} onClose={() => setEditor(null)} onSaved={() => { setSelectedId(editor.id); setEditor(null); setNotice(copy.saved); setFilters(f => ({ ...f, search: '', status: 'ALL', page: 1 })); setRefresh(v => v + 1); }} />}
  </div>;
}
