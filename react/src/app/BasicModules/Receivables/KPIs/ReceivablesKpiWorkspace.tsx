import { useMemo, useState } from 'react';
import { BarChart3, Building2, ClipboardList, LayoutGrid, Printer, RefreshCw } from 'lucide-react';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect, IndiceTitleBar, IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { OperationalKpiCurrencyStrip } from '../../shared/operational';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';
import { useReceivablesResolvedLocale, useReceivablesTranslations } from '../hooks/useReceivablesTranslations';
import type { ReceivablesKpiSource } from '../services/receivablesApi';
import { ReceivableDetailModal } from '../components/modals/ReceivableDetailModal';
import { getReceivableDetailCopy } from '../components/receivableDetail.copy';
import { periodFilterValues } from '../constants/receivables.constants';
import { defaultKpiScope, normalizeKpiScope, normalizeKpiView, organizationKey, receivablesKpiViews, selectReceivablesKpis, type KpiScope, type ReceivablesKpiView } from './receivablesKpiSelectors';
import { buildReceivablesKpiQueries } from './receivablesKpiQueries';
import { buildReceivablesKpiPresentation, kpiMoney } from './receivablesKpiPresentation';
import { useReceivablesKpiSource } from './useReceivablesKpiSource';
import { useReceivablesKpiAggregates } from './useReceivablesKpiAggregates';
import { getReceivablesKpiCopy } from './workspaceCopy';
import { normalizeTablePreferences, ReceivablesKpiTable, type KpiTableModel, type KpiTablePreference } from './ReceivablesKpiTable';
import { KpiSection, ReceivablesKpiCards, ReceivablesKpiCharts } from './ReceivablesKpiViews';
import { buildReceivablesKpiReport } from './receivablesKpiReport';

const EMPTY_SOURCE: ReceivablesKpiSource = { receivables: [], installments: [], payments: [], asOfDate: '1970-01-01', timeZone: 'UTC' };
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#147514]/20 bg-white px-4 py-2 text-sm font-medium text-[#147514] hover:bg-[#147514]/5 focus-visible:ring-2 focus-visible:ring-[#147514] disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300';
const alertClass = 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200';
type DetailFocus = 'all' | 'overdue' | 'missing';
const normalizeFocus = (value: unknown): DetailFocus => value === 'overdue' || value === 'missing' ? value : 'all';

export function ReceivablesKpiWorkspace() {
  const moduleCopy = useReceivablesTranslations();
  const locale = useReceivablesResolvedLocale();
  const copy = getReceivablesKpiCopy(locale);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const source = useReceivablesKpiSource();
  const [scope, setScope] = useState<KpiScope>(defaultKpiScope);
  const [activeView, setActiveView] = useState<ReceivablesKpiView>('overview');
  const [preferences, setPreferences] = useState<Record<string, KpiTablePreference>>({});
  const [focus, setFocus] = useState<DetailFocus>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reportError, setReportError] = useState(false);
  const memoryReady = useWorkspaceNavigationMemory({ moduleKey: 'receivables', tabKey: 'kpis',
    state: { ...scope, activeView, preferences, focus },
    defaults: { ...defaultKpiScope, activeView: 'overview' as ReceivablesKpiView, preferences: {} as Record<string, KpiTablePreference>, focus: 'all' as DetailFocus },
    urlFields: { activeView: 'view', search: 'search', period: 'period', unit: 'unit', business: 'business', focus: 'focus' },
    onRestore: restored => { setScope(normalizeKpiScope(restored)); setActiveView(normalizeKpiView(restored.activeView)); setPreferences(normalizeTablePreferences(restored.preferences)); setFocus(normalizeFocus(restored.focus)); setDetailId(null); },
  });
  const data = source.data ?? EMPTY_SOURCE;
  const selection = useMemo(() => selectReceivablesKpis(data, scope), [data, scope]);
  const groups = useMemo(() => buildReceivablesKpiQueries(selection, preferredCurrency), [selection, preferredCurrency]);
  const aggregates = useReceivablesKpiAggregates(groups.queries, data, Boolean(source.data) && memoryReady);
  const { cards, tables } = buildReceivablesKpiPresentation(selection, groups, aggregates.data, copy, preferredCurrency, locale);
  const ready = Boolean(source.data) && memoryReady;
  const moneyWarning = Boolean(aggregates.error) || Object.values(aggregates.data).some(row => row.partial);
  const applyScope = (patch: Partial<KpiScope>) => { setScope(current => ({ ...current, ...patch })); setPreferences({}); setDetailId(null); };
  const onFocus = (next: DetailFocus) => { setFocus(next); setActiveView('details'); setPreferences(current => ({ ...current, accounts: { ...current.accounts, currentPage: 1, pageSize: current.accounts?.pageSize ?? 10, sortKey: '4', sortDirection: 'desc' }, payments: { ...current.payments, currentPage: 1, pageSize: current.payments?.pageSize ?? 10, sortKey: '2', sortDirection: 'desc' } })); };
  const units = [...new Map(data.receivables.map(row => [organizationKey(row.unitId), row.unitId == null ? copy.unassigned : row.unit])).entries()];
  const businesses = [...new Map(data.receivables.filter(row => scope.unit === 'all' || organizationKey(row.unitId) === scope.unit).map(row => [organizationKey(row.businessId), row.businessId == null ? copy.unassigned : row.business])).entries()];
  const table = (model: KpiTableModel, onSelect?: (id: string) => void) => <ReceivablesKpiTable model={model} copy={copy} locale={locale} preference={preferences[model.id] ?? { currentPage: 1, pageSize: 10, sortKey: model.id === 'accounts' ? '4' : model.id === 'payments' ? '2' : '1', sortDirection: 'desc' }} onPreference={value => setPreferences(current => ({ ...current, [model.id]: value }))} onSelect={onSelect} />;
  const overdueIds = new Set(selection.overdue.map(row => row.receivableId));
  const missingIds = new Set(selection.payments.filter(row => !row.receiptDataUrl && !row.receiptImageDataUrl).map(row => row.id));
  const detailAccount = ready ? selection.accounts.find(row => row.id === detailId) : undefined;
  const warnings = [moneyWarning ? copy.moneyError : '', selection.missingSchedule.length ? `${copy.scheduleError}: ${selection.missingSchedule.length}` : '', selection.paymentIssues.length ? `${copy.dateError}: ${selection.paymentIssues.length}` : ''].filter(Boolean);
  const scopeLabels = [`${copy.asOf}: ${data.asOfDate} · ${data.timeZone}`, `${copy.period}: ${selection.range.from || copy.all} — ${selection.range.to}`, `${copy.unit}: ${scope.unit === 'all' ? copy.all : units.find(([id]) => id === scope.unit)?.[1] ?? scope.unit}`, `${copy.business}: ${scope.business === 'all' ? copy.all : businesses.find(([id]) => id === scope.business)?.[1] ?? scope.business}`, `${copy.search}: ${scope.search || copy.all}`, `${copy.consolidated}: ${preferredCurrency}`];
  const print = () => { setReportError(false); try { printStandardDocumentPdf(buildReceivablesKpiReport(copy, locale, scopeLabels, cards, Object.values(tables), warnings)); } catch { setReportError(true); } };
  const icons = { overview: <LayoutGrid className="h-4 w-4" />, analysis: <BarChart3 className="h-4 w-4" />, units: <Building2 className="h-4 w-4" />, details: <ClipboardList className="h-4 w-4" /> };
  const balance = aggregates.data.balance;
  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <IndiceTitleBar className="mb-0" tone="green" icon={<BarChart3 className="h-5 w-5" />} title={copy.title} subtitle={copy.subtitle} actions={<><button type="button" className={buttonClass} disabled={source.loading} onClick={() => { setDetailId(null); source.refresh(); }}><RefreshCw className="h-4 w-4" />{copy.refresh}</button><button type="button" className={`${buttonClass} !bg-[#147514] !text-white`} onClick={print} disabled={!ready || aggregates.loading}><Printer className="h-4 w-4" />{copy.print}</button></>} />
    <IndiceWorkspaceNavigation tone="green" variant="views" ariaLabel={copy.views} value={activeView} onValueChange={value => setActiveView(normalizeKpiView(value))} items={receivablesKpiViews.map(id => ({ id, label: copy[id], icon: icons[id] }))} />
    <IndiceFilterBar title={copy.filters} gridClassName="xl:grid-cols-4" summary={<button type="button" className="text-sm text-[#147514] dark:text-emerald-300" onClick={() => { setScope(defaultKpiScope); setPreferences({}); setFocus('all'); setDetailId(null); }}>{copy.clear}</button>}>
      <IndiceFilterSearch tone="green" label={copy.search} value={scope.search} onValueChange={search => applyScope({ search })} onClear={() => applyScope({ search: '' })} placeholder={copy.searchHelp} />
      <IndiceFilterSelect tone="green" label={copy.period} value={scope.period} onValueChange={period => applyScope({ period: normalizeKpiScope({ period: period as KpiScope['period'] }).period })} options={periodFilterValues.map(value => ({ value, label: ({ all: copy.all, today: copy.periodToday, this_week: copy.periodWeek, this_month: copy.periodMonth, last_month: copy.periodLastMonth })[value] }))} />
      <IndiceFilterSelect tone="green" label={copy.unit} value={scope.unit} onValueChange={unit => applyScope({ unit, business: 'all' })} options={[{ value: 'all', label: copy.all }, ...units.map(([value, label]) => ({ value, label }))]} />
      <IndiceFilterSelect tone="green" label={copy.business} value={scope.business} onValueChange={business => applyScope({ business })} options={[{ value: 'all', label: copy.all }, ...businesses.map(([value, label]) => ({ value, label }))]} />
    </IndiceFilterBar>
    <div className="rounded-2xl border border-[#147514]/15 bg-[#147514]/5 px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><p>{copy.context}</p>{ready ? <p className="mt-1 text-xs">{copy.asOf}: {data.asOfDate} · {data.timeZone} · {copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(source.updatedAt))}</p> : null}</div>
    {source.error ? <div role="alert" className={alertClass}>{copy.sourceError}</div> : null}
    {ready && warnings.length ? <div role="alert" className={alertClass}>{warnings.map(warning => <p key={warning}>{warning}</p>)}</div> : null}
    {reportError ? <div role="alert" className={alertClass}>{copy.reportError}</div> : null}
    {ready ? <>
      <OperationalKpiCurrencyStrip context={{ preferredCurrency, nativeBreakdown: balance?.nativeTotals.map(row => kpiMoney(row.amount, row.currency, locale, copy.unavailable)).join(' / ') || copy.unavailable, rateLabel: balance?.exchangeRate.mode === 'daily' || balance?.exchangeRate.mode === 'configured' ? copy.rate : copy.unavailable, source: balance?.exchangeRate.source, effectiveDate: balance?.exchangeRate.effectiveDate, isPartial: moneyWarning, labels: { consolidatedIn: copy.consolidated, nativeOrigin: copy.native, partialTotal: copy.partial, excludedRecords: count => `${copy.excluded}: ${count}` } }} />
      {aggregates.loading ? <p role="status" className="text-sm text-slate-500">{copy.loading}</p> : null}
      {selection.accounts.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.empty}</p> : null}
      {activeView === 'overview' ? <div className="grid gap-6"><ReceivablesKpiCards cards={cards} /><KpiSection title={copy.attention} description={copy.evidenceHelp}><div className="flex flex-wrap gap-3"><button className={buttonClass} type="button" onClick={() => onFocus('overdue')}>{copy.overdueAccounts}: {overdueIds.size}</button><button className={buttonClass} type="button" onClick={() => onFocus('missing')}>{copy.missingReceipts}: {missingIds.size}</button></div></KpiSection></div> : null}
      <div hidden={activeView !== 'analysis'} className="min-w-0"><div className="grid gap-6">{activeView === 'analysis' ? <ReceivablesKpiCharts data={aggregates.data} months={groups.months} copy={copy} currency={preferredCurrency} locale={locale} /> : null}{table(tables.customers)}</div></div>
      <div hidden={activeView !== 'units'}>{table(tables.units, unit => { applyScope({ unit, business: 'all' }); onFocus('all'); })}</div>
      <div hidden={activeView !== 'details'}><div className="grid gap-6"><IndiceFilterSelect tone="green" label={copy.attention} value={focus} onValueChange={value => onFocus(normalizeFocus(value))} options={[{ value: 'all', label: copy.all }, { value: 'overdue', label: copy.overdueAccounts }, { value: 'missing', label: copy.missingReceipts }]} />
        <div hidden={focus === 'missing'}>{table({ ...tables.accounts, rows: focus === 'overdue' ? tables.accounts.rows.filter(row => overdueIds.has(row.id)) : tables.accounts.rows }, setDetailId)}</div>
        <div hidden={focus === 'overdue'}>{table({ ...tables.payments, rows: focus === 'missing' ? tables.payments.rows.filter(row => missingIds.has(row.id)) : tables.payments.rows }, id => setDetailId(selection.payments.find(row => row.id === id)?.receivableId ?? null))}</div>
      </div></div>
      {detailAccount ? <ReceivableDetailModal account={detailAccount} copy={moduleCopy} detailCopy={getReceivableDetailCopy(locale)} installments={data.installments} payments={data.payments} onClose={() => setDetailId(null)} /> : null}
    </> : !source.error ? <p role="status" aria-busy="true" className="rounded-2xl bg-slate-100 p-6 text-sm text-slate-500 dark:bg-slate-800">{copy.loading}</p> : null}
  </div>;
}
