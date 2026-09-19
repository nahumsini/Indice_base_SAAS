import { useMemo, useState } from 'react';
import { BarChart3, Building2, CircleDollarSign, ClipboardCheck, ClipboardList, LayoutGrid, Printer, RefreshCw, Target, TimerOff, WalletCards } from 'lucide-react';
import { IndiceFilterAdvancedSection, IndiceFilterBar, IndiceFilterDisclosureActions, IndiceFilterSearch, IndiceFilterSelect, IndiceTitleBar, IndiceWorkspaceNavigation, useIndiceFilterDisclosureCopy } from '../../../components/frontend-os';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { useLanguage } from '../../../shared/context';
import { useKpiMonetaryAggregates, type KpiMonetaryAggregate, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { OperationalKpiCurrencyStrip } from '../../shared/operational';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { printStandardKpiReport } from '../../shared/print/standardKpiPrintReport';
import type { SalesKpiWorkspaceSource } from '../salesApi';
import { SalesKpiGrid, type SalesKpiCardItem, type SalesKpiCardTone } from './components/SalesKpiCard';
import { SalesKpiWorkspaceCharts, type SalesKpiChartRow } from './components/SalesKpiWorkspaceCharts';
import { SalesKpiWorkspaceTable, type SalesKpiWorkspaceTableModel } from './components/SalesKpiWorkspaceTable';
import { useSalesKpiSource } from './hooks/useSalesKpiSource';
import { getSalesKpiWorkspaceCopy } from './salesKpiWorkspaceCopy';
import { buildSalesFunnel, defaultSalesKpiScope, needsFollowUp, normalizeSalesKpiScope, normalizeSalesKpiTablePreferences, normalizeSalesKpiView, salesKpiViews, selectSalesKpis, sellerIdentity, type SalesKpiScope, type SalesKpiTablePreference, type SalesKpiView } from './salesKpiWorkspaceSelectors';

const EMPTY_SOURCE: SalesKpiWorkspaceSource = { contacts: [], opportunities: [], quotes: [], sales: [], units: [], businesses: [], asOfDate: '1970-01-01', timeZone: 'UTC', definitionVersion: 'sales-kpi-v1' };
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#FF6B5E]/30 bg-white px-4 py-2 text-sm font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10 focus-visible:ring-2 focus-visible:ring-[#FF6B5E] disabled:opacity-50 dark:bg-slate-800 dark:text-[#FFB0AA]';
const alertClass = 'rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200';
const periodValues: SalesKpiScope['period'][] = ['all', 'today', 'this_week', 'this_month', 'last_month'];
const moneyKeys = ['sales', 'collected', 'receivable', 'pipeline'] as const;

function readableStatus(value: string | null | undefined, locale: string, labels: Record<string, string>) {
  const statusKey = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (labels[statusKey]) return labels[statusKey];
  const text = statusKey.replace(/_/g, ' ');
  if (!text) return '—';
  return text.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase(locale));
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function aggregateMoney(aggregate: KpiMonetaryAggregate | undefined, locale: string, unavailable: string) {
  if (!aggregate || aggregate.partial) return unavailable;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: aggregate.preferredCurrency, maximumFractionDigits: 2 }).format(aggregate.preferredTotal);
}

function nativeMoney(aggregate: KpiMonetaryAggregate | undefined, locale: string, unavailable: string) {
  if (!aggregate?.nativeTotals.length) return unavailable;
  return aggregate.nativeTotals.map((row) => new Intl.NumberFormat(locale, { style: 'currency', currency: row.currency, maximumFractionDigits: 2 }).format(row.amount)).join(' / ');
}

function monetaryTone(aggregate: KpiMonetaryAggregate | undefined, tone: SalesKpiCardTone): SalesKpiCardTone {
  return aggregate && !aggregate.partial ? tone : 'slate';
}

function monthRows(source: Array<{ saleDate: string | null }>, locale: string): SalesKpiChartRow[] {
  const counts = new Map<string, number>();
  source.forEach((row) => { if (row.saleDate) counts.set(row.saleDate.slice(0, 7), (counts.get(row.saleDate.slice(0, 7)) ?? 0) + 1); });
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-12).map(([month, value]) => ({ label: new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`)), value }));
}

function SalesKpisWorkspace() {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getSalesKpiWorkspaceCopy(locale);
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { identity: companyIdentity, isReady: printIdentityReady } = useCompanyPrintIdentity();
  const source = useSalesKpiSource();
  const [scope, setScope] = useState<SalesKpiScope>(defaultSalesKpiScope);
  const [activeView, setActiveView] = useState<SalesKpiView>('overview');
  const [preferences, setPreferences] = useState<Record<string, SalesKpiTablePreference>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [reportError, setReportError] = useState(false);
  const memoryReady = useWorkspaceNavigationMemory({
    moduleKey: 'sales', tabKey: 'kpis', state: { ...scope, activeView, preferences, advancedOpen },
    defaults: { ...defaultSalesKpiScope, activeView: 'overview' as SalesKpiView, preferences: {} as Record<string, SalesKpiTablePreference>, advancedOpen: false },
    urlFields: { activeView: 'view', search: 'search', period: 'period', unit: 'unit', business: 'business', seller: 'seller' },
    onRestore: (restored) => { setScope(normalizeSalesKpiScope(restored)); setActiveView(normalizeSalesKpiView(restored.activeView)); setPreferences(normalizeSalesKpiTablePreferences(restored.preferences)); setAdvancedOpen(Boolean(restored.advancedOpen)); },
  });
  const data = source.data ?? EMPTY_SOURCE;
  const selection = useMemo(() => selectSalesKpis(data, scope), [data, scope]);
  const ready = Boolean(source.data) && memoryReady;
  const queries = useMemo<KpiMonetaryBatchQuery[]>(() => ready ? [
    { key: 'sales', metric: 'SALES_TOTAL', preferredCurrency, ids: selection.sales.map((row) => row.id) },
    { key: 'collected', metric: 'SALES_COLLECTED', preferredCurrency, ids: selection.currentSales.map((row) => row.id), from: selection.range.from || undefined, to: selection.range.to },
    { key: 'receivable', metric: 'SALES_RECEIVABLE_BALANCE', preferredCurrency, ids: selection.currentSales.map((row) => row.id) },
    { key: 'pipeline', metric: 'SALES_OPPORTUNITY_PIPELINE', preferredCurrency, ids: selection.openOpportunities.map((row) => row.id) },
  ] : [], [preferredCurrency, ready, selection.currentSales, selection.openOpportunities, selection.range.from, selection.range.to, selection.sales]);
  const aggregates = useKpiMonetaryAggregates(queries);
  const monetaryData = aggregates.current ? aggregates.data : {};
  const moneyWarning = Boolean(aggregates.error) || (aggregates.current && moneyKeys.some((item) => monetaryData[item]?.partial));
  const salesAggregate = monetaryData.sales;
  const averageTicket = salesAggregate && !salesAggregate.partial && selection.sales.length
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: salesAggregate.preferredCurrency, maximumFractionDigits: 2 }).format(salesAggregate.preferredTotal / selection.sales.length)
    : copy.unavailable;

  const applyScope = (patch: Partial<SalesKpiScope>) => { setScope((current) => ({ ...current, ...patch })); setPreferences({}); };
  const clear = () => { setScope(defaultSalesKpiScope); setPreferences({}); setAdvancedOpen(false); };
  const unitOptions = data.units.map((row) => ({ value: String(row.id), label: row.name }));
  const businessOptions = data.businesses.filter((row) => scope.unit === 'all' || String(row.unitId) === scope.unit).map((row) => ({ value: String(row.id), label: row.name }));
  const sellerOptions = useMemo(() => {
    const options = new Map<string, string>();
    data.opportunities.forEach((row) => { const item = sellerIdentity(row.ownerUserCompanyId, row.ownerName); if (item.label !== '—') options.set(item.key, item.label); });
    data.quotes.forEach((row) => { const item = sellerIdentity(row.sellerUserCompanyId, row.sellerName); if (item.label !== '—') options.set(item.key, item.label); });
    data.sales.forEach((row) => { const item = sellerIdentity(row.sellerUserCompanyId, row.sellerName); if (item.label !== '—') options.set(item.key, item.label); });
    return [...options].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [data.opportunities, data.quotes, data.sales, locale]);

  const monetaryContext = (aggregate: KpiMonetaryAggregate | undefined) => aggregate?.nativeTotals.length
    ? `${aggregate.partial ? `${copy.partial} · ` : ''}${copy.native}: ${nativeMoney(aggregate, locale, copy.unavailable)}`
    : undefined;
  const cards = useMemo<SalesKpiCardItem[]>(() => [
    { label: copy.cards.registeredSales, detail: copy.cards.registeredSalesHelp, context: monetaryContext(monetaryData.sales), value: aggregateMoney(monetaryData.sales, locale, copy.unavailable), icon: CircleDollarSign, tone: monetaryTone(monetaryData.sales, 'green') },
    { label: copy.cards.collected, detail: copy.cards.collectedHelp, context: monetaryContext(monetaryData.collected), value: aggregateMoney(monetaryData.collected, locale, copy.unavailable), icon: WalletCards, tone: monetaryTone(monetaryData.collected, 'blue') },
    { label: copy.cards.receivable, detail: copy.cards.receivableHelp, context: monetaryContext(monetaryData.receivable), value: aggregateMoney(monetaryData.receivable, locale, copy.unavailable), icon: ClipboardList, tone: monetaryTone(monetaryData.receivable, monetaryData.receivable?.preferredTotal ? 'yellow' : 'green') },
    { label: copy.cards.averageTicket, detail: copy.cards.averageTicketHelp, context: monetaryContext(salesAggregate), value: averageTicket, icon: BarChart3, tone: monetaryTone(salesAggregate, 'blue') },
    { label: copy.cards.pipeline, detail: copy.cards.pipelineHelp, context: monetaryContext(monetaryData.pipeline), value: aggregateMoney(monetaryData.pipeline, locale, copy.unavailable), icon: Target, tone: monetaryTone(monetaryData.pipeline, 'coral') },
    { label: copy.cards.openOpportunities, detail: copy.cards.openOpportunitiesHelp, value: selection.openOpportunities.length.toLocaleString(locale), icon: ClipboardCheck, tone: 'blue' },
    { label: copy.cards.overdueFollowUps, detail: copy.cards.overdueFollowUpsHelp, value: selection.overdueFollowUps.length.toLocaleString(locale), icon: TimerOff, tone: selection.overdueFollowUps.length ? 'red' : 'green', actionLabel: copy.viewOpportunities, onClick: () => setActiveView('opportunities') },
    { label: copy.cards.pendingHandoff, detail: copy.cards.pendingHandoffHelp, value: selection.handoffSales.length.toLocaleString(locale), icon: ClipboardList, tone: selection.handoffSales.length ? 'yellow' : 'green' },
  ], [averageTicket, copy, locale, monetaryData, salesAggregate, selection.handoffSales.length, selection.openOpportunities.length, selection.overdueFollowUps.length]);

  const funnel = buildSalesFunnel(selection);
  const funnelRows: SalesKpiChartRow[] = [
    { label: copy.funnelOpportunities, value: funnel.opportunities }, { label: copy.funnelQuoted, value: funnel.quoted },
    { label: copy.funnelApproved, value: funnel.approved }, { label: copy.funnelSold, value: funnel.sold },
  ];
  const trendRows = monthRows(selection.sales, locale);
  const quoteStatusRows = [...selection.quotes.reduce((result, row) => { const label = readableStatus(row.status, locale, copy.statuses); result.set(label, (result.get(label) ?? 0) + 1); return result; }, new Map<string, number>())]
    .map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value);

  const sellerRows = useMemo(() => {
    const groups = new Map<string, { label: string; sales: number; opportunities: number; quotes: number; followUps: number }>();
    const group = (id: number | null, name: string | null) => { const identity = sellerIdentity(id, name); const current = groups.get(identity.key) ?? { label: identity.label, sales: 0, opportunities: 0, quotes: 0, followUps: 0 }; groups.set(identity.key, current); return current; };
    selection.sales.forEach((row) => { group(row.sellerUserCompanyId, row.sellerName).sales += 1; });
    selection.quotes.forEach((row) => { group(row.sellerUserCompanyId, row.sellerName).quotes += 1; });
    selection.openOpportunities.forEach((row) => { const item = group(row.ownerUserCompanyId, row.ownerName); item.opportunities += 1; if (needsFollowUp(row, data.asOfDate)) item.followUps += 1; });
    return [...groups].map(([id, row]) => ({ id, cells: [row.label, String(row.sales), String(row.opportunities), String(row.quotes), String(row.followUps)], values: [row.label, row.sales, row.opportunities, row.quotes, row.followUps] }));
  }, [data.asOfDate, selection.openOpportunities, selection.quotes, selection.sales]);

  const unitRows = useMemo(() => {
    const contactsById = new Map(data.contacts.map((row) => [row.id, row]));
    const opportunitiesById = new Map(data.opportunities.map((row) => [row.id, row]));
    const unitName = new Map(data.units.map((row) => [row.id, row.name]));
    const quoteUnit = (opportunityId: number | null, contactId: number | null) => opportunitiesById.get(opportunityId ?? -1)?.unitId ?? contactsById.get(contactId ?? -1)?.unitId ?? null;
    const ids = new Set<number | null>([...selection.sales.map((row) => row.unitId), ...selection.openOpportunities.map((row) => row.unitId), ...selection.quotes.map((row) => quoteUnit(row.opportunityId, row.contactId))]);
    return [...ids].map((unitId) => {
      const sales = selection.sales.filter((row) => row.unitId === unitId).length;
      const opportunities = selection.openOpportunities.filter((row) => row.unitId === unitId).length;
      const quotes = selection.quotes.filter((row) => quoteUnit(row.opportunityId, row.contactId) === unitId).length;
      const followUps = selection.overdueFollowUps.filter((row) => row.unitId === unitId).length;
      const handoff = selection.handoffSales.filter((row) => row.unitId === unitId).length;
      const label = unitId == null ? copy.unassigned : unitName.get(unitId) ?? String(unitId);
      return { id: unitId == null ? 'unassigned' : String(unitId), cells: [label, String(sales), String(opportunities), String(quotes), String(followUps), String(handoff)], values: [label, sales, opportunities, quotes, followUps, handoff] };
    });
  }, [copy.unassigned, data.contacts, data.opportunities, data.units, selection]);

  const opportunityRows = useMemo(() => [...selection.opportunities].sort((left, right) => {
    const risk = Number(needsFollowUp(right, data.asOfDate)) - Number(needsFollowUp(left, data.asOfDate));
    return risk || String(left.nextActionAt ?? '9999').localeCompare(String(right.nextActionAt ?? '9999'));
  }).map((row) => ({
    id: String(row.id),
    cells: [row.opportunityName, readableStatus(row.stage, locale, copy.statuses), row.ownerName || '—', formatDate(row.expectedCloseDate, locale), row.nextActionAt ? `${row.nextAction || '—'} · ${formatDate(row.nextActionAt, locale)}` : '—', needsFollowUp(row, data.asOfDate) ? copy.cards.overdueFollowUps : readableStatus(row.status, locale, copy.statuses)],
    values: [row.opportunityName, row.stage, row.ownerName, row.expectedCloseDate, `${needsFollowUp(row, data.asOfDate) ? '0' : row.nextActionAt ? '1' : '2'}:${row.nextActionAt ?? ''}`, Number(needsFollowUp(row, data.asOfDate))],
  })), [copy.cards.overdueFollowUps, data.asOfDate, locale, selection.opportunities]);

  const tables: Record<string, SalesKpiWorkspaceTableModel> = {
    sellers: { id: 'sellers', title: copy.sellerTable, description: copy.sellerHelp, columns: [copy.columns.name, copy.columns.sales, copy.columns.opportunities, copy.columns.quotes, copy.columns.followUps], rows: sellerRows, sortable: [0, 1, 2, 3, 4] },
    units: { id: 'units', title: copy.unitTable, description: copy.unitHelp, columns: [copy.columns.name, copy.columns.sales, copy.columns.opportunities, copy.columns.quotes, copy.columns.followUps, copy.columns.handoff], rows: unitRows, sortable: [0, 1, 2, 3, 4, 5] },
    opportunities: { id: 'opportunities', title: copy.opportunityTable, description: copy.opportunityHelp, columns: [copy.columns.name, copy.columns.stage, copy.columns.owner, copy.columns.expectedClose, copy.columns.nextAction, copy.columns.status], rows: opportunityRows, sortable: [0, 1, 2, 3, 4, 5] },
  };
  const tablePreference = (id: string): SalesKpiTablePreference => preferences[id] ?? { currentPage: 1, pageSize: 10, sortKey: id === 'opportunities' ? '4' : '1', sortDirection: id === 'opportunities' ? 'asc' : 'desc' };
  const table = (model: SalesKpiWorkspaceTableModel) => <SalesKpiWorkspaceTable model={model} copy={copy} locale={locale} preference={tablePreference(model.id)} onPreference={(value) => setPreferences((current) => ({ ...current, [model.id]: value }))} />;
  const reportScope = [
    { label: copy.asOf, value: `${data.asOfDate} · ${data.timeZone}` },
    { label: copy.period, value: scope.period === 'all' ? copy.all : `${selection.range.from} — ${selection.range.to}` },
    { label: copy.unit, value: scope.unit === 'all' ? copy.all : unitOptions.find((row) => row.value === scope.unit)?.label ?? scope.unit },
    { label: copy.business, value: scope.business === 'all' ? copy.all : businessOptions.find((row) => row.value === scope.business)?.label ?? scope.business },
    { label: copy.seller, value: scope.seller === 'all' ? copy.all : sellerOptions.find((row) => row.value === scope.seller)?.label ?? scope.seller },
  ];
  const print = () => {
    setReportError(false);
    try {
      printStandardKpiReport({
        companyIdentity, documentName: copy.title, locale, reportTitle: copy.title, subtitle: copy.subtitle,
        meta: [...reportScope, { label: copy.consolidated, value: preferredCurrency }, ...(moneyWarning ? [{ label: copy.partial, value: copy.moneyError }] : [])],
        metrics: cards.map((card) => ({ label: card.label, value: card.value, detail: [card.context, card.detail].filter(Boolean).join(' · ') })),
        charts: [{ title: copy.funnel, rows: funnelRows.map((row) => ({ ...row, valueLabel: String(row.value) })) }, { title: copy.trend, rows: trendRows.map((row) => ({ ...row, valueLabel: String(row.value) })) }, { title: copy.quoteStatus, rows: quoteStatusRows.map((row) => ({ ...row, valueLabel: String(row.value) })) }],
        tables: [tables.sellers, tables.units, tables.opportunities].map((model) => ({ title: model.title, headers: model.columns, rows: model.rows.map((row) => row.cells), emptyLabel: copy.empty })),
      });
    } catch { setReportError(true); }
  };
  const periodLabels = { all: copy.all, today: copy.today, this_week: copy.thisWeek, this_month: copy.thisMonth, last_month: copy.lastMonth };
  const icons = { overview: <LayoutGrid className="h-4 w-4" />, analysis: <BarChart3 className="h-4 w-4" />, units: <Building2 className="h-4 w-4" />, opportunities: <ClipboardList className="h-4 w-4" /> };
  const hasActiveFilters = JSON.stringify(scope) !== JSON.stringify(defaultSalesKpiScope);

  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <IndiceTitleBar tone="coral" icon={<BarChart3 className="h-5 w-5" />} title={copy.title} subtitle={copy.subtitle} actions={<>
      <button type="button" className={buttonClass} disabled={source.loading} onClick={() => { source.refresh(); aggregates.refresh(); }}><RefreshCw className="h-4 w-4" />{copy.refresh}</button>
      <button type="button" className={`${buttonClass} !bg-[#FF6B5E] !text-[#222831]`} disabled={!ready || !aggregates.current || aggregates.loading || !printIdentityReady} onClick={print}><Printer className="h-4 w-4" />{copy.print}</button>
    </>} />
    <IndiceWorkspaceNavigation tone="coral" variant="views" ariaLabel={copy.views} value={activeView} onValueChange={(value) => setActiveView(normalizeSalesKpiView(value))} items={salesKpiViews.map((id) => ({ id, label: copy[id], icon: icons[id] }))} />
    <IndiceFilterBar title={copy.filters} gridClassName="xl:grid-cols-4" summary={<IndiceFilterDisclosureActions activeAdvancedCount={scope.seller === 'all' ? 0 : 1} advancedLabel={advancedOpen ? disclosureCopy.hideFilters : disclosureCopy.moreFilters} clearLabel={copy.clear} hasActiveFilters={hasActiveFilters} isAdvancedOpen={advancedOpen} onClear={clear} onToggleAdvanced={() => setAdvancedOpen((current) => !current)} tone="coral" />}>
      <IndiceFilterSearch tone="coral" label={copy.search} value={scope.search} onValueChange={(search) => applyScope({ search })} onClear={() => applyScope({ search: '' })} placeholder={copy.searchHelp} />
      <IndiceFilterSelect tone="coral" label={copy.period} value={scope.period} onValueChange={(period) => applyScope({ period: normalizeSalesKpiScope({ period: period as SalesKpiScope['period'] }).period })} options={periodValues.map((value) => ({ value, label: periodLabels[value] }))} />
      <IndiceFilterSelect tone="coral" label={copy.unit} value={scope.unit} onValueChange={(unit) => applyScope({ unit, business: 'all' })} options={[{ value: 'all', label: copy.all }, ...unitOptions]} />
      <IndiceFilterSelect tone="coral" label={copy.business} value={scope.business} onValueChange={(business) => applyScope({ business })} options={[{ value: 'all', label: copy.all }, ...businessOptions]} />
      {advancedOpen ? <IndiceFilterAdvancedSection className="md:col-span-2 xl:col-span-4"><IndiceFilterSelect tone="coral" label={copy.seller} value={scope.seller} onValueChange={(seller) => applyScope({ seller })} options={[{ value: 'all', label: copy.all }, ...sellerOptions]} /></IndiceFilterAdvancedSection> : null}
    </IndiceFilterBar>
    <div className="rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><p>{copy.context}</p>{ready ? <p className="mt-1 text-xs">{copy.asOf}: {data.asOfDate} · {data.timeZone} · {copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(source.updatedAt))}</p> : null}</div>
    {source.error ? <div role="alert" className={alertClass}>{copy.sourceError}</div> : null}
    {ready && moneyWarning ? <div role="alert" className={alertClass}>{copy.moneyError}</div> : null}
    {reportError ? <div role="alert" className={alertClass}>{copy.reportError}</div> : null}
    {ready ? <>
      <OperationalKpiCurrencyStrip context={{ preferredCurrency, nativeBreakdown: nativeMoney(salesAggregate, locale, copy.unavailable), rateLabel: salesAggregate?.exchangeRate.mode === 'configured' ? copy.rateConfigured : salesAggregate?.exchangeRate.mode === 'daily' ? copy.rateDaily : copy.unavailable, effectiveDate: salesAggregate?.exchangeRate.effectiveDate, source: salesAggregate?.exchangeRate.source, isPartial: Boolean(salesAggregate?.partial), excludedCount: salesAggregate?.excludedRecords, labels: { consolidatedIn: copy.consolidated, nativeOrigin: copy.native, partialTotal: copy.partial, excludedRecords: (count) => `${copy.excluded}: ${count}` } }} />
      {!aggregates.current || aggregates.loading ? <p role="status" className="text-sm text-slate-500">{copy.loading}</p> : null}
      {selection.currentSales.length + selection.opportunities.length + selection.currentQuotes.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.empty}</p> : null}
      {activeView === 'overview' ? <SalesKpiGrid items={cards} /> : null}
      {activeView === 'analysis' ? <div className="grid gap-6"><SalesKpiWorkspaceCharts funnel={funnelRows} trend={trendRows} quoteStatus={quoteStatusRows} labels={{ funnel: copy.funnel, funnelHelp: copy.funnelHelp, trend: copy.trend, trendHelp: copy.trendHelp, quoteStatus: copy.quoteStatus, quoteStatusHelp: copy.quoteStatusHelp }} empty={copy.empty} />{table(tables.sellers)}</div> : null}
      {activeView === 'units' ? table(tables.units) : null}
      {activeView === 'opportunities' ? table(tables.opportunities) : null}
    </> : !source.error ? <p role="status" aria-busy="true" className="rounded-2xl bg-slate-100 p-6 text-sm text-slate-500 dark:bg-slate-800">{copy.loading}</p> : null}
  </div>;
}

export default function KPIs() { return <SalesKpisWorkspace />; }
