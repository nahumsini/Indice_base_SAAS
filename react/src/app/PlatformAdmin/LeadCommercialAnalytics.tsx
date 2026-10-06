import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, ChevronRight, ClipboardList, Clock3, Handshake, LoaderCircle, Users } from 'lucide-react';
import { useLanguage } from '../shared/context';
import {
  platformLeadAnalyticsApi, type AcquisitionView, type LeadAnalyticsDashboard, type LeadAnalyticsDetails,
  type LeadAnalyticsView, type LeadBreakdown, type LeadDetailSelection, type LeadMarket,
} from '../api/platformLeadAnalytics';
import { IndiceModalFrame } from '../components/indice-modal';
import { DataTablePagination } from '../components/table/DataTablePagination';
import { getIndiceTableMinimumWidth, IndiceOperationalTable, IndiceTableColGroup, IndiceTableHeaderRow, IndiceTableShell } from '../components/table/IndiceTableEngine';
import { usePersistentColumnWidths } from '../hooks/usePersistentColumnWidths';
import { TableBody, TableCell, TableRow } from '../components/ui/table';
import { getLeadAnalyticsCopy, type LeadAnalyticsCopyKey } from './leadAnalyticsCopy';

const surface = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const action = 'rounded-xl outline-none transition hover:border-blue-300 hover:bg-blue-50/50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:border-blue-700 dark:hover:bg-blue-950/30';
const detailWidths = { company: 270, status: 170, owner: 170, receivedAt: 200, nextAction: 240 };
const sourceWidths = { source: 320, received: 170, diagnosed: 190, proposal: 190, won: 180 };

function useLeadColumns<K extends LeadAnalyticsCopyKey>(defaults: Record<K, number>, t: (key: LeadAnalyticsCopyKey) => string, storageKey: string) {
  const labels = useMemo(() => Object.fromEntries(Object.keys(defaults).map((key) => [key, t(key as K)])) as Record<K, string>, [defaults, t]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths({ defaults, headerLabels: labels, storageKey });
  const columns = (Object.keys(defaults) as K[]).map((id) => ({ id, label: labels[id], width: columnWidths[id], defaultWidth: defaults[id], contentMinimumWidth: 120, resizeLabel: labels[id], alignment: id === 'source' || defaults === detailWidths ? 'left' as const : 'right' as const }));
  return { columns, resizeColumn };
}

/** Separate sources: saved commercial leads are never inferred from anonymous analytics events. */
export function LeadCommercialAnalytics({ days, market, view, refreshKey, onOpenLead }: {
  days: 7 | 30 | 90; market: LeadMarket; view: AcquisitionView; refreshKey: number; onOpenLead?: (id: number) => void;
}) {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const { t } = useMemo(() => getLeadAnalyticsCopy(locale), [locale]);
  const detailTable = useLeadColumns(detailWidths, t, 'indice:platform-lead-analytics:details:columns:v1');
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const percent = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
  const date = (value: string | null, withTime = true) => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' as const } : { timeZone: 'UTC' }) }).format(new Date(value)) : '—';
  const [data, setData] = useState<LeadAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<LeadDetailSelection | null>(null);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<LeadAnalyticsDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);

  useEffect(() => {
    let current = true;
    setData(null); setLoading(true); setFailed(false);
    platformLeadAnalyticsApi.dashboard(days, market).then((result) => {
      if (current) setData(result);
    }).catch(() => { if (current) setFailed(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [days, market, refreshKey, retry]);

  useEffect(() => { setSelection(null); setPage(1); }, [days, market]);
  useEffect(() => {
    if (!selection) { setDetails(null); return; }
    let current = true;
    setDetails(null); setDetailLoading(true); setDetailFailed(false);
    platformLeadAnalyticsApi.details(days, market, selection, page).then((result) => {
      if (current) setDetails(result);
    }).catch(() => { if (current) setDetailFailed(true); }).finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; };
  }, [days, market, selection, page, refreshKey, retry]);

  const open = (value: LeadDetailSelection) => { setPage(1); setSelection(value); };
  const label = (value: LeadAnalyticsView) => t(value === 'lost' ? 'LOST' : value === 'nurture' ? 'NURTURE' : value);
  const sourceName = (value: string) => value === 'unattributed' ? t('unattributed') : value;
  const planName = (value: string) => value === 'UNKNOWN' ? t('noPlan') : ({ CONTROLA: 'Controla', ESCALA: 'Escala', CORPORATIVO: 'Corporativo' }[value] ?? value);
  const totals = data?.totals;
  const context = data ? t('cohort', { from: date(`${data.period.from}T00:00:00Z`, false), to: date(`${data.period.to}T00:00:00Z`, false) }) : '';

  if (view === 'traffic') return null;
  return <div className="min-w-0 space-y-6" aria-busy={loading}>
    {loading ? <div role="status" className={`${surface} flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500`}><LoaderCircle className="h-5 w-5 animate-spin" />{t('loading')}</div> : failed ? <div role="alert" className={`${surface} border-red-200 text-sm text-red-700`}><p>{t('error')}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-lg border px-3 py-2">{t('reload')}</button></div> : data ? <>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{context}</p>
      {view === 'overview' ? <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Users />} label={t('received')} value={number(totals!.received)} helper={t('recordedLeads')} onClick={() => open({ view: 'received' })} />
          <Metric icon={<Clock3 />} label={t('contactSla')} value={percent(data.rates.contactSla)} helper={t('slaHelper', { met: number(totals!.slaMet), eligible: number(totals!.slaEligible) })} onClick={() => open({ view: 'sla_missed' })} />
          <Metric icon={<ClipboardList />} label={t('diagnosisRate')} value={percent(data.rates.diagnosis)} helper={t('diagnosisHelper', { count: number(totals!.diagnosed), total: number(totals!.received) })} onClick={() => open({ view: 'diagnosed' })} />
          <Metric icon={<Handshake />} label={t('winRate')} value={percent(data.rates.proposalWin)} helper={t('winHelper', { count: number(totals!.won), total: number(totals!.proposals) })} onClick={() => open({ view: 'won' })} />
        </div>
        <section className={surface}>
          <h2 className="text-lg font-medium text-slate-950 dark:text-white">{t('funnel')}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{t('funnelHelp')}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {data.stages.map((stage) => <button key={stage.code} type="button" onClick={() => open({ view: stage.code })} className={`${action} min-w-0 border border-blue-100 bg-blue-50/50 p-4 text-left dark:border-blue-900 dark:bg-blue-950/20`}>
              <span className="block min-h-10 text-sm font-medium text-slate-700 dark:text-slate-200">{label(stage.code)}</span>
              <span className="mt-2 flex items-center justify-between gap-2 text-2xl font-medium text-blue-700 dark:text-blue-300">{number(stage.count)}<ChevronRight className="h-4 w-4" /></span>
              <span className="mt-2 block text-xs leading-4 text-slate-500">{t('cohortRate', { rate: percent(stage.cohortRate) })}</span>
            </button>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([{ view: 'trial', key: 'trial', count: totals!.trials }, { view: 'lost', key: 'LOST', count: totals!.lost }, { view: 'nurture', key: 'NURTURE', count: totals!.nurture }] as const).map((item) => <button key={item.view} type="button" onClick={() => open({ view: item.view })} className={`${action} border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300`}>{t(item.key)} · {number(item.count)}</button>)}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{t('outcomeNote')}</p>
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section className={surface}>
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">{t('attention')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('currentScope')}</p>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {([{ view: 'overdue', count: data.attention.overdue }, { view: 'uncontacted', count: data.attention.uncontacted }, { view: 'unassigned', count: data.attention.unassigned }, { view: 'missing_action', count: data.attention.missingAction }, { view: 'trial_attention', count: data.attention.trialsEnding + data.attention.trialsExpired }] as const).map((item) => <button key={item.view} type="button" onClick={() => open({ view: item.view })} className={`${action} flex w-full items-center justify-between gap-4 px-2 py-3 text-left`}>
                <span className="text-sm text-slate-700 dark:text-slate-200">{label(item.view)}{item.view === 'trial_attention' ? <span className="mt-1 block text-xs text-slate-500">{t('trialHelp', { ending: number(data.attention.trialsEnding), expired: number(data.attention.trialsExpired) })}</span> : null}</span>
                <span className={`flex shrink-0 items-center gap-2 text-lg font-medium ${item.count ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>{number(item.count)}<ChevronRight className="h-4 w-4" /></span>
              </button>)}
            </div>
          </section>
          <section className={`${surface} flex flex-col justify-center`}>
            <Clock3 className="h-8 w-8 text-blue-600" />
            <button type="button" onClick={() => open({ view: 'contacted' })} className={`${action} mt-4 p-2 text-left text-lg font-medium text-slate-900 dark:text-white`}>{t('averageContact', { hours: totals!.averageContactHours == null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(totals!.averageContactHours), count: number(totals!.contacted) })}</button>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t('contactDefinition')}</p>
            {totals!.received === 0 ? <p className="mt-4 text-sm text-slate-500">{t('empty')}</p> : null}
          </section>
        </div>
      </> : <>
        <section className={surface}>
          <h2 className="text-lg font-medium text-slate-950 dark:text-white">{t('campaigns')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('campaignsHelp')}</p>
          <p className="mt-2 text-xs text-slate-500">{t('coverage', { shown: number(data.sources.length), total: number(data.sourceGroups) })}</p>
          <div className="mt-4"><BreakdownTable rows={data.sources} t={t} number={number} percent={percent} sourceName={sourceName} onOpen={(row) => open({ view: 'received', source: row.source, medium: row.medium, campaign: row.campaign })} /></div>
        </section>
        <section className={surface}>
          <h2 className="text-lg font-medium text-slate-950 dark:text-white">{t('planInterest')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('planHelp')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.plans.map((row) => <button key={row.plan} type="button" onClick={() => open({ view: 'received', plan: row.plan })} className={`${action} border border-slate-200 p-4 text-left dark:border-slate-700`}><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{planName(row.plan)}</span><span className="mt-2 block text-2xl text-blue-700 dark:text-blue-300">{number(row.received)}</span><span className="mt-2 block text-xs text-slate-500">{t('diagnosed')} · {number(row.diagnosed)} · {percent(row.diagnosisRate)}</span></button>)}
          </div>
          {data.plans.length === 0 ? <p className="mt-4 text-sm text-slate-500">{t('empty')}</p> : null}
        </section>
      </>}
    </> : null}

    <IndiceModalFrame open={selection !== null} onOpenChange={(isOpen) => { if (!isOpen) setSelection(null); }} modalType="operational-workspace" tone="blue" icon={<Users className="h-5 w-5" />} title={selection ? `${t('details')} · ${label(selection.view)}` : t('details')} description={details?.currentBacklog ? t('currentScope') : context} footer={<button type="button" onClick={() => setSelection(null)}>{t('close')}</button>}>
      {detailLoading ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />{t('loading')}</p> : detailFailed ? <p role="alert" className="py-6 text-sm text-red-700">{t('error')} <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 underline">{t('reload')}</button></p> : details ? <>
        {selection?.source ? <p className="mb-4 text-sm text-slate-500">{sourceName(selection.source)} · {sourceName(selection.medium ?? '')} · {sourceName(selection.campaign ?? '')}</p> : null}
        {selection?.plan ? <p className="mb-4 text-sm text-slate-500">{planName(selection.plan)}</p> : null}
        <IndiceTableShell pagination={<DataTablePagination currentPage={details.page} totalPages={details.totalPages} pageSize={25} pageSizeOptions={[25]} totalCount={details.total} pageStart={details.total ? (details.page - 1) * 25 + 1 : 0} pageEnd={Math.min(details.page * 25, details.total)} onPageChange={setPage} onPageSizeChange={() => {}} />}>
          <IndiceOperationalTable minimumWidth={getIndiceTableMinimumWidth({ columns: detailTable.columns, actionsWidth: 200 })}>
            <IndiceTableColGroup columns={detailTable.columns} actionsWidth={200} />
            <IndiceTableHeaderRow columns={detailTable.columns} actions={{ label: t('actions'), width: 200 }} onResize={detailTable.resizeColumn} tone="blue" />
            <TableBody>{details.items.map((row) => <TableRow key={row.id}>
              <TableCell className="px-4 align-top"><p className="font-medium">{row.companyName}</p><p className="mt-1 text-xs text-slate-500">{row.market} · {planName(row.plan)}</p><p className="mt-1 break-words text-xs text-slate-500">{sourceName(row.source)} · {sourceName(row.campaign)}</p></TableCell>
              <TableCell className="px-4 align-top">{t(row.status)}</TableCell>
              <TableCell className="px-4 align-top">{row.assignedName ?? t('unassigned')}</TableCell>
              <TableCell className="px-4 align-top"><p>{date(row.createdAt)}</p><p className="mt-1 text-xs text-slate-500">{t('contacted')} · {date(row.firstContactAt)}</p></TableCell>
              <TableCell className="px-4 align-top">{date(row.nextActionAt)}</TableCell>
              <TableCell className="px-4 text-right align-top">{onOpenLead ? <button type="button" onClick={() => { setSelection(null); onOpenLead(row.id); }} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-800 dark:text-blue-300">{t('openLead')}<ArrowRight className="h-4 w-4" /></button> : null}</TableCell>
            </TableRow>)}</TableBody>
          </IndiceOperationalTable>
          {details.items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{t('noDetails')}</p> : null}
        </IndiceTableShell>
      </> : null}
    </IndiceModalFrame>
  </div>;
}

function Metric({ icon, label, value, helper, onClick }: { icon: ReactNode; label: string; value: string; helper: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`${surface} ${action} text-left`}>
    <span className="flex items-center justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><ChevronRight className="h-4 w-4 text-slate-400" /></span>
    <span className="mt-4 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span><span className="mt-1 block text-3xl font-medium text-slate-950 dark:text-white">{value}</span><span className="mt-2 block text-xs leading-5 text-slate-500">{helper}</span>
  </button>;
}

function BreakdownTable({ rows, t, number, percent, sourceName, onOpen }: {
  rows: LeadBreakdown[]; t: (key: LeadAnalyticsCopyKey) => string; number: (value: number) => string;
  percent: (value: number | null) => string; sourceName: (value: string) => string; onOpen: (row: LeadBreakdown) => void;
}) {
  const { columns, resizeColumn } = useLeadColumns(sourceWidths, t, 'indice:platform-lead-analytics:sources:columns:v1');
  return <IndiceTableShell><IndiceOperationalTable minimumWidth={getIndiceTableMinimumWidth({ columns, actionsWidth: 120 })}>
    <IndiceTableColGroup columns={columns} actionsWidth={120} />
    <IndiceTableHeaderRow columns={columns} actions={{ label: t('actions'), width: 120 }} onResize={resizeColumn} tone="blue" />
    <TableBody>{rows.map((row) => <TableRow key={JSON.stringify([row.source, row.medium, row.campaign])}>
      <TableCell className="px-4"><p className="font-medium">{sourceName(row.source)}</p><p className="mt-1 text-xs text-slate-500">{sourceName(row.medium)} · {sourceName(row.campaign)}</p></TableCell>
      <TableCell className="px-4 text-right">{number(row.received)}</TableCell><TableCell className="px-4 text-right">{number(row.diagnosed)}<span className="ml-2 text-xs text-slate-500">{percent(row.diagnosisRate)}</span></TableCell>
      <TableCell className="px-4 text-right">{number(row.proposals)}</TableCell><TableCell className="px-4 text-right">{number(row.won)}<span className="ml-2 text-xs text-slate-500">{percent(row.proposalWinRate)}</span></TableCell>
      <TableCell className="px-4 text-right"><button type="button" onClick={() => onOpen(row)} aria-label={`${t('details')} · ${sourceName(row.source)} · ${sourceName(row.campaign)}`} className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-blue-200 text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"><ChevronRight className="h-4 w-4" /></button></TableCell>
    </TableRow>)}</TableBody>
  </IndiceOperationalTable>{rows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{t('empty')}</p> : null}</IndiceTableShell>;
}
