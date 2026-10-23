import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Filter, List, Pencil, RefreshCw } from 'lucide-react';
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
import { funnelChannels, funnelStatuses } from './FunnelEditor';
import { useFunnelCopy } from './funnelCopy';
import { funnelApi } from './funnelApi';
import { duplicateFunnel, normalizeFunnelView, funnelWorkspaceView, selectVisibleFunnel, type FunnelInput, type FunnelPage, type FunnelPlan, type FunnelViewMode } from './funnelModel';

import { campaignCopy } from './campaignCopy';
import { newCampaignIdea } from './campaignModel';
import { CampaignWorkshopModal } from './CampaignWorkshopModal';
import { CampaignIdeaCards, CampaignPlanView } from './CampaignWorkspaceView';
import { CampaignContentGeneration } from './CampaignContentGeneration';
import { contentGenerationCopy } from './contentGenerationCopy';
import { ContentCalendarView } from './calendar/ContentCalendarView';
import type { ContentNavigationGuard } from './useCampaignContent';
import { IdeasBoard } from './IdeasBoard';
import {BrandLibraryModal} from './brand/BrandLibraryModal';
import {brandCopy} from './brand/brandCopy';
import './funnelingWorkspace.css';
import { journeyCopy } from './journeyCopy';
import type { CampaignPanel } from './journeyModel';

type Column = 'name' | 'channel' | 'stages' | 'conversion' | 'updatedAt';
const widths = { name: 300, channel: 180, stages: 120, conversion: 190, updatedAt: 220 };
const sortable: Column[] = ['name', 'updatedAt'];
const defaults = { search: '', status: 'ALL', page: 1, pageSize: 25, sort: 'updatedAt', direction: 'desc', view: 'ideas' as FunnelViewMode };
export default function Funneling() {
  const { copy, locale } = useFunnelCopy();
  const c = campaignCopy(locale), j = journeyCopy(locale), g = contentGenerationCopy(locale), bc=brandCopy(locale);
  const [libraryOpen,setLibraryOpen]=useState(false),[boardOpen,setBoardOpen]=useState(false);
  const contentGuard = useRef<ContentNavigationGuard['current']>(null);
  function navigate(action: () => void) { if ((filters.view === 'content' || filters.view === 'calendar') && contentGuard.current) contentGuard.current(action); else action(); }
  const revision = useAuthorizationRevision();
  const [filters, setFilters] = useState(defaults);
  const campaignSection=funnelWorkspaceView(filters.view)==='ideas';
  const [search, setSearch] = useState('');
  const [data, setData] = useState<FunnelPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: string; initial: FunnelInput; initialPanel?: CampaignPanel; initialStage?: number } | null>(null);
  useWorkspaceNavigationMemory({ moduleKey: 'crm', tabKey: 'funneling', state: filters, defaults, urlFields: { view: 'view' }, onRestore: value => setFilters({
    search: typeof value.search === 'string' ? value.search.slice(0, 180) : '',
    status: ['ALL', 'DRAFT', 'PLANNED', 'ARCHIVED'].includes(value.status) ? value.status : 'ALL',
    page: Math.max(1, Math.min(10000, Number(value.page) || 1)),
    pageSize: [10, 25, 50, 100, 200].includes(value.pageSize) ? value.pageSize : 25,
    sort: ['name', 'updatedAt'].includes(value.sort) ? value.sort : 'updatedAt', direction: value.direction === 'asc' ? 'asc' : 'desc',
    view: normalizeFunnelView(value.view),
  }) });
  useEffect(() => { const timer = window.setTimeout(() => setSearch(filters.search), 250); return () => window.clearTimeout(timer); }, [filters.search]);
  useEffect(() => { setEditor(null); setNotice(''); setSelectedId(null); setLibraryOpen(false); setBoardOpen(false); }, [revision]);
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
  const pagination = <DataTablePagination currentPage={filters.page} pageSize={filters.pageSize} pageSizeOptions={[10, 25, 50, 100, 200]} totalCount={total} totalPages={Math.max(1, Math.ceil(total / filters.pageSize))} pageStart={(filters.page - 1) * filters.pageSize + 1} pageEnd={Math.min(filters.page * filters.pageSize, total)} onPageChange={page => navigate(() => setFilters(f => ({ ...f, page })))} onPageSizeChange={pageSize => navigate(() => setFilters(f => ({ ...f, pageSize, page: 1 })))} />;
  function createIdea() { setNotice(''); setEditor({ id: crypto.randomUUID(), initial: newCampaignIdea() }); }
  function open(plan: FunnelPlan, duplicate = false, initialPanel: CampaignPanel = 'stage', initialStage = 0) {
    setNotice('');
    setEditor({ id: duplicate ? crypto.randomUUID() : plan.id, initialPanel, initialStage, initial: duplicate ? duplicateFunnel(plan, `${plan.name} — ${copy.copySuffix}`) : {
      name: plan.name, objective: plan.objective, audience: plan.audience, channel: plan.channel,
      notes: plan.notes, workshop: plan.workshop, contentGuide: plan.contentGuide, stages: plan.stages, status: plan.status, version: plan.version,
    } });
  }
  function saved() {
    setSelectedId(editor!.id); setEditor(null); setNotice(j.saved);
    setFilters(f => ({ ...f, search: '', status: 'ALL', page: 1, sort: 'updatedAt', direction: 'desc', view: f.view === 'content' || f.view === 'calendar' ? f.view : 'funnel' })); setRefresh(v => v + 1);
  }
  const filterBar = <SalesFilterBar title={copy.filters} summary={loading ? copy.loading : String(total)}>
      <SalesFilterSearch label={copy.search} placeholder={filters.view === 'content' ? g.searchPlaceholder : copy.searchPlaceholder} value={filters.search} onValueChange={value => navigate(() => setFilters(f => ({ ...f, search: value.slice(0, 180), page: 1 })))} />
      <SalesFilterSelect label={copy.status} value={filters.status} onValueChange={status => navigate(() => setFilters(f => ({ ...f, status, page: 1 })))} options={[{ value: 'ALL', label: copy.all }, ...funnelStatuses(copy).map(([value, label]) => ({ value, label }))]} />
    </SalesFilterBar>;
  return <div className="funneling-workspace space-y-5">
    <SalesTitleBar className="funneling-title-bar" title="Funneling" subtitle={c.subtitle} icon={<span aria-hidden="true">🎯</span>} actions={<>
      <Button variant="outline" className="min-h-11 gap-2 whitespace-normal" onClick={()=>setLibraryOpen(true)}><span aria-hidden="true">🏢</span>{bc.title}</Button>
      <Button variant="outline" aria-label={copy.refresh} className="funnel-refresh min-h-11 gap-2" disabled={loading} onClick={() => navigate(() => setRefresh(v => v + 1))}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">{copy.refresh}</span></Button>
      <Button className={salesTitleBarPrimaryActionClassName} disabled={!data || loading} onClick={() => navigate(createIdea)}><span aria-hidden="true">✨</span>{j.create}</Button>
    </>} />
    <IndiceWorkspaceNavigation variant="sections" tone="coral" ariaLabel={copy.views} value={funnelWorkspaceView(filters.view)} onValueChange={view=>navigate(()=>setFilters(f=>({...f,view})))} items={[{id:'ideas',label:bc.campaigns,icon:<span aria-hidden="true">📁</span>},{id:'content',label:bc.content,icon:<span aria-hidden="true">✨</span>},{id:'calendar',label:bc.calendar,icon:<span aria-hidden="true">🗓️</span>}]}/>
    {!campaignSection&&selected&&<div className="funnel-campaign-context"><div><span className="context-emblem" aria-hidden="true">🎯</span><div><strong>{selected.name}</strong><small>{selected.status==='DRAFT'?copy.draft:selected.status==='PLANNED'?copy.planned:copy.archived}</small></div></div><Button variant="outline" className="min-h-11" onClick={()=>navigate(()=>setFilters(f=>({...f,view:'ideas'})))}>{bc.change}</Button></div>}
    {campaignSection&&<div className="funnel-view-tools"><IndiceWorkspaceNavigation variant="views" tone="coral" ariaLabel={copy.views} value={filters.view==='list'?'list':'ideas'} onValueChange={view=>setFilters(f=>({...f,view}))} items={[{id:'ideas',label:bc.cards,icon:<span aria-hidden="true">🗂️</span>},{id:'list',label:bc.table,icon:<List/>}]}/><Button variant="outline" className="min-h-11 gap-2" aria-pressed={boardOpen} onClick={()=>setBoardOpen(v=>!v)}><span aria-hidden="true">💡</span>{bc.board}</Button></div>}
    <IdeasBoard key={revision} locale={locale} active={campaignSection&&boardOpen}/>
    {filters.view==='funnel'&&selected&&<div className="funnel-selected-actions"><Button variant="ghost" className="min-h-11" onClick={()=>setFilters(f=>({...f,view:'ideas'}))}>{bc.back}</Button><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setFilters(f=>({...f,view:'content'}))}>✨ {bc.content}</Button><Button variant="outline" onClick={()=>setFilters(f=>({...f,view:'calendar'}))}>🗓️ {bc.calendar}</Button></div></div>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {campaignSection&&filters.view!=='funnel'&&filterBar}
    {loading ? <IndiceViewState variant="loading" title={copy.loading} tone="coral" /> : failed ? <IndiceViewState variant="error" title={copy.loadError} tone="coral" action={<Button variant="outline" onClick={() => navigate(() => setRefresh(v => v + 1))}>{copy.retry}</Button>} /> : total === 0 ?
      <IndiceViewState variant="empty" title={search || filters.status !== 'ALL' ? copy.noMatches : copy.empty} description={search || filters.status !== 'ALL' ? copy.noMatchesHint : copy.emptyHint} tone="coral" action={<Button className={salesTitleBarPrimaryActionClassName} onClick={() => navigate(createIdea)}>{j.create}</Button>} /> :
      filters.view === 'ideas' ? <div className="space-y-4"><CampaignIdeaCards plans={data?.items ?? []} copy={copy} c={c} onSelect={plan => { setSelectedId(plan.id); setFilters(f => ({ ...f, view: 'funnel' })); }} onDuplicate={plan => open(plan, true)} />{pagination}</div> :
      filters.view === 'calendar' && selected ? <div className="min-w-0 space-y-4"><ContentCalendarView showCampaignPicker={false} key={`${revision}:${selected.id}`} plan={selected} plans={data?.items ?? []} total={total} locale={locale} copy={copy} guard={contentGuard} onSelect={setSelectedId} /></div> :
      filters.view === 'content' && selected ? <div className="min-w-0 space-y-4"><CampaignContentGeneration key={`${revision}:${selected.id}`} plan={selected} plans={data?.items ?? []} total={total} copy={copy} locale={locale} guard={contentGuard} onSelect={setSelectedId} onEdit={() => open(selected, false, 'campaign')} onReload={() => setRefresh(value => value + 1)} onSaved={plan => { setData(value => value ? { ...value, items: value.items.map(item => item.id === plan.id ? plan : item) } : value); }} /></div> :
      filters.view === 'funnel' && selected ? <div className="min-w-0 space-y-4">

        <CampaignPlanView key={`${selected.id}:${selected.version}`} plan={selected} copy={copy} c={c} locale={locale} onEdit={(panel, index) => open(selected, false, panel, index)} />
      </div> : <IndiceTableShell pagination={pagination}>
        <IndiceOperationalTable minimumWidth={Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 110}>
          <IndiceTableColGroup columns={columns} actionsWidth={110} />
          <IndiceTableHeaderRow columns={columns} onResize={resizeColumn} sortState={{ columnId: filters.sort as Column, direction: filters.direction as 'asc' | 'desc' }} onSort={id => setFilters(f => ({ ...f, sort: id, direction: f.sort === id && f.direction === 'asc' ? 'desc' : 'asc', page: 1 }))} actions={{ label: copy.actions, width: 110 }} tone="coral" />
          <TableBody>{data?.items.map(plan => <TableRow key={plan.id}>
            <TableCell><button type="button" aria-label={`${copy.viewFunnel}: ${plan.name}`} className="min-h-11 break-words text-left font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]" onClick={() => { setSelectedId(plan.id); setFilters(f => ({ ...f, view: 'funnel' })); }}>{plan.name}</button><div><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{statuses[plan.status]}</span></div></TableCell>
            <TableCell>{plan.workshop ? plan.workshop.channels.map(channel => c[`channel_${channel}`]).join(' · ') || copy.undefined : channels[plan.channel]}</TableCell><TableCell>{plan.stages.length}</TableCell>
            <TableCell>{plan.estimatedConversion === null ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(plan.estimatedConversion)}%`}</TableCell>
            <TableCell>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(plan.updatedAt))}</TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${copy.edit}: ${plan.name}`} onClick={() => open(plan)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${copy.duplicate}: ${plan.name}`} onClick={() => open(plan, true)}><Copy className="h-4 w-4" /></Button></div></TableCell>
          </TableRow>)}</TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>}
    {libraryOpen&&<BrandLibraryModal key={`brand:${revision}`} locale={locale} copy={copy} onClose={()=>setLibraryOpen(false)}/>}

    {editor && <CampaignWorkshopModal key={editor.id} {...editor} copy={copy} locale={locale} onClose={() => setEditor(null)} onSaved={saved} />}
  </div>;
}
