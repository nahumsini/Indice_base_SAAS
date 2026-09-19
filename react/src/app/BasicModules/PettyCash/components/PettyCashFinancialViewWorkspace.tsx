import { useMemo, useState } from 'react';
import { BarChart3, Building2, ClipboardList, LayoutGrid, Printer, RefreshCw, Search } from 'lucide-react';
import { IndiceTitleBar, IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { useLanguage } from '../../../shared/context';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { OperationalKpiCurrencyStrip } from '../../shared/operational';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../types/pettyCash.types';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import { PettyCashField, PettyCashFilterShell, pettyCashInputClass } from './PettyCashShared';
import { defaultKpiScope, normalizeKpiView, pettyCashKpiViews, selectPettyCashKpiScope, type KpiScope, type PettyCashKpiView } from '../KPIs/pettyCashKpiSelectors';
import { buildPettyCashKpiQueries } from '../KPIs/pettyCashKpiQueries';
import { usePettyCashKpiAggregates } from '../KPIs/usePettyCashKpiAggregates';
import { getPettyCashKpiCopy } from '../KPIs/workspaceCopy';
import { buildPettyCashKpiCards, kpiMoney, PettyCashKpiAnalysis, PettyCashKpiOverview, type DetailFocus } from '../KPIs/components/PettyCashKpiViews';
import { normalizeTablePreferences, PettyCashKpiTable, type KpiTableModel, type KpiTablePreference } from '../KPIs/components/PettyCashKpiTable';
import { buildPettyCashKpiTables } from '../KPIs/pettyCashKpiTables';
import { buildPettyCashKpiReport } from '../KPIs/pettyCashKpiReport';

type Props = {
  dataReady?: boolean; sourceError?: boolean; updatedAt?: string | null; onRefresh: () => void;
  funds: PettyCashFund[]; movements: PettyCashMovement[]; settlementLines: PettyCashSettlementLine[]; statements: PettyCashStatement[];
};

export function PettyCashFinancialViewWorkspace({ dataReady = true, sourceError = false, updatedAt, onRefresh, funds, movements, settlementLines, statements }: Props) {
  const moduleCopy = usePettyCashTranslations();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getPettyCashKpiCopy(locale);
  const currencyCopy = { consolidatedIn: copy.consolidated, nativeOrigin: copy.native, partialTotal: copy.partial,
    excludedRecords: (count: number) => `${copy.excluded}: ${count}`, dailyRate: copy.rate, unavailable: copy.unavailable };
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [activeView, setActiveView] = useState<PettyCashKpiView>('overview');
  const [scope, setScope] = useState<KpiScope>(defaultKpiScope);
  const [preferences, setPreferences] = useState<Record<string, KpiTablePreference>>({});
  const [detailFocus, setDetailFocus] = useState<DetailFocus>('all');
  const [reportError, setReportError] = useState(false);
  const periods = useMemo(() => [...new Set(statements.map(row => row.periodKey))].sort().reverse(), [statements]);
  const units = useMemo(() => [...new Map(funds.map(row => [row.unitId, row.unitName])).entries()], [funds]);
  const businesses = useMemo(() => [...new Map(funds.filter(row => scope.unit === 'all' || row.unitId === scope.unit).map(row => [row.businessId, row.businessName])).entries()], [funds, scope.unit]);
  const state = useMemo(() => ({ periodFilter: scope.period, statusFilter: scope.status, unitFilter: scope.unit, businessFilter: scope.business, searchTerm: scope.search, classification: scope.classification, activeView, tables: preferences }), [scope, activeView, preferences]);
  const memoryReady = useWorkspaceNavigationMemory({ moduleKey: 'petty-cash', tabKey: 'kpis', enabled: dataReady,
    state, defaults: { periodFilter: 'all', statusFilter: 'all', unitFilter: 'all', businessFilter: 'all', searchTerm: '', classification: defaultKpiScope.classification, activeView: 'overview' as PettyCashKpiView, tables: {} as Record<string, KpiTablePreference> },
    urlFields: { activeView: 'view', periodFilter: 'pck_period', statusFilter: 'pck_status', unitFilter: 'pck_unit', businessFilter: 'pck_business', searchTerm: 'pck_q', classification: 'pck_type' },
    onRestore: restored => {
      const unit = funds.some(row => row.unitId === restored.unitFilter) ? restored.unitFilter : 'all';
      setScope({ period: periods.includes(restored.periodFilter) ? restored.periodFilter : 'all', status: Object.prototype.hasOwnProperty.call(moduleCopy.status.statement, restored.statusFilter) ? restored.statusFilter : 'all',
        unit, business: funds.some(row => row.businessId === restored.businessFilter && (unit === 'all' || row.unitId === unit)) ? restored.businessFilter : 'all',
        search: typeof restored.searchTerm === 'string' ? restored.searchTerm : '', classification: restored.classification === 'EXTERNAL_MANAGED' ? 'EXTERNAL_MANAGED' : 'INTERNAL_COMPANY' });
      setActiveView(normalizeKpiView(restored.activeView)); setPreferences(normalizeTablePreferences(restored.tables));
    },
  });
  const applyScope = (patch: Partial<KpiScope>) => {
    setScope(previous => ({ ...previous, ...patch })); setDetailFocus('all');
    setPreferences(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, currentPage: 1 }])));
  };
  const selection = useMemo(() => selectPettyCashKpiScope(funds, statements, settlementLines, movements, scope), [funds, statements, settlementLines, movements, scope]);
  const groups = useMemo(() => buildPettyCashKpiQueries(selection, preferredCurrency), [selection, preferredCurrency]);
  const sourceRevision = useMemo(() => ({ funds, statements, settlementLines, movements }), [funds, statements, settlementLines, movements]);
  const aggregates = usePettyCashKpiAggregates(groups.queries, sourceRevision, dataReady && memoryReady && !sourceError);
  const partial = Object.values(aggregates.data).some(value => value.partial);
  const monetaryWarning = Boolean(aggregates.error || partial);
  const cards = buildPettyCashKpiCards(selection, aggregates.data, copy, preferredCurrency, locale);
  const tables = buildPettyCashKpiTables(selection, groups, aggregates.data, copy, moduleCopy, locale, preferredCurrency);
  const onFocus = (focus: DetailFocus) => { setDetailFocus(focus); setActiveView('details'); setPreferences(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, currentPage: 1 }]))); };
  const table = (model: KpiTableModel, onSelect?: (id: string) => void) => <PettyCashKpiTable key={model.id} model={model} copy={copy} locale={locale} preference={preferences[model.id]} onPreference={value => setPreferences(previous => ({ ...previous, [model.id]: value }))} onSelect={onSelect} />;
  const restrictTable = (id: string, ids?: Set<string>) => ({ ...tables[id], rows: ids ? tables[id].rows.filter(row => ids.has(row.id)) : tables[id].rows });
  const focusLabels = { all: copy.all, pending: copy.pending, missing: copy.missing, open: copy.open, negative: copy.negative, shortage: copy.shortage };
  const receiptIds = detailFocus === 'pending' ? new Set(selection.pendingLines.map(row => row.id)) : detailFocus === 'missing' ? new Set(selection.withoutEvidence.map(row => row.id)) : undefined;
  const statementIds = detailFocus === 'open' ? new Set(selection.openStatements.map(row => row.id)) : detailFocus === 'shortage' ? new Set(selection.statements.filter(row => row.shortageAmount > 0).map(row => row.id)) : undefined;
  const balanceIds = detailFocus === 'negative' ? new Set(selection.negativeFunds.map(row => row.id)) : undefined;
  const classificationLabel = scope.classification === 'EXTERNAL_MANAGED' ? copy.external : copy.internal;
  const print = () => {
    setReportError(false);
    try {
      const labels = [classificationLabel, `${copy.period}: ${scope.period === 'all' ? copy.all : scope.period}`, `${copy.status}: ${moduleCopy.status.statement[scope.status as keyof typeof moduleCopy.status.statement] ?? copy.all}`,
        `${copy.unit}: ${units.find(([id]) => id === scope.unit)?.[1] ?? copy.all}`, `${copy.business}: ${businesses.find(([id]) => id === scope.business)?.[1] ?? copy.all}`, `${copy.search}: ${scope.search || copy.all}`];
      const notices = [updatedAt ? `${copy.updated}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))}` : '', scope.classification === 'EXTERNAL_MANAGED' ? copy.externalHelp : '', monetaryWarning ? copy.moneyError : '', selection.unlinkedMovements ? `${copy.unlinked}: ${selection.unlinkedMovements}` : ''];
      printStandardDocumentPdf(buildPettyCashKpiReport(copy, locale, labels, cards, Object.values(tables), notices));
    } catch { setReportError(true); }
  };
  const capturedAggregate = aggregates.data.captured;
  const buttonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#147514]/25 bg-white px-4 text-sm font-medium text-[#147514] hover:bg-[#147514]/10 disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300';
  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <IndiceTitleBar className="mb-0" tone="green" icon={<BarChart3 className="h-5 w-5" />} title={copy.title} subtitle={copy.subtitle} actions={<><button type="button" className={buttonClass} disabled={!dataReady && !sourceError} onClick={onRefresh}><RefreshCw className="h-4 w-4" />{copy.refresh}</button><button type="button" className={`${buttonClass} !bg-[#147514] !text-white`} disabled={!dataReady || !memoryReady || aggregates.loading} onClick={print}><Printer className="h-4 w-4" />{copy.print}</button></>} />
    <IndiceWorkspaceNavigation<PettyCashKpiView> value={activeView} onValueChange={setActiveView} ariaLabel={copy.views} variant="views" tone="green" items={pettyCashKpiViews.map((id, index) => ({ id, label: copy[id], icon: [<LayoutGrid key="overview" className="h-4 w-4" />, <BarChart3 key="analysis" className="h-4 w-4" />, <Building2 key="units" className="h-4 w-4" />, <ClipboardList key="details" className="h-4 w-4" />][index] }))} />
    <PettyCashFilterShell resultLabel={moduleCopy.financial.filters.result(selection.statements.length)} activeAdvancedCount={Number(scope.unit !== 'all') + Number(scope.business !== 'all') + Number(scope.status !== 'all')}
      hasActiveFilters={JSON.stringify(scope) !== JSON.stringify(defaultKpiScope)} onClear={() => applyScope(defaultKpiScope)}
      advancedContent={<><PettyCashField label={copy.unit}><select value={scope.unit} onChange={event => applyScope({ unit: event.target.value, business: 'all' })} className={pettyCashInputClass}><option value="all">{copy.all}</option>{units.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></PettyCashField><PettyCashField label={copy.business}><select value={scope.business} onChange={event => applyScope({ business: event.target.value })} className={pettyCashInputClass}><option value="all">{copy.all}</option>{businesses.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></PettyCashField><PettyCashField label={copy.status}><select value={scope.status} onChange={event => applyScope({ status: event.target.value })} className={pettyCashInputClass}><option value="all">{copy.all}</option>{Object.entries(moduleCopy.status.statement).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></PettyCashField></>}>
      <PettyCashField label={copy.search}><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={scope.search} onChange={event => applyScope({ search: event.target.value })} placeholder={copy.searchHelp} className={`${pettyCashInputClass} pl-10`} /></div></PettyCashField>
      <PettyCashField label={copy.period}><select value={scope.period} onChange={event => applyScope({ period: event.target.value })} className={pettyCashInputClass}><option value="all">{copy.all}</option>{periods.map(period => <option key={period} value={period}>{period}</option>)}</select></PettyCashField>
      <PettyCashField label={copy.classification}><select value={scope.classification} onChange={event => applyScope({ classification: event.target.value === 'EXTERNAL_MANAGED' ? 'EXTERNAL_MANAGED' : 'INTERNAL_COMPANY' })} className={pettyCashInputClass}><option value="INTERNAL_COMPANY">{copy.internal}</option><option value="EXTERNAL_MANAGED">{copy.external}</option></select></PettyCashField>
    </PettyCashFilterShell>
    <div className="rounded-2xl border border-[#147514]/15 bg-[#147514]/5 px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><p><span className="font-medium text-[#147514] dark:text-emerald-300">{classificationLabel}. </span>{copy.context}</p>{scope.classification === 'EXTERNAL_MANAGED' ? <p>{copy.externalHelp}</p> : null}{updatedAt ? <p className="mt-1 text-xs">{copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))}</p> : null}</div>
    {sourceError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{copy.sourceError}</div> : null}
    {monetaryWarning || reportError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{monetaryWarning ? copy.moneyError : copy.reportError}</div> : null}
    {dataReady && memoryReady ? <>
      <OperationalKpiCurrencyStrip context={{ preferredCurrency, nativeBreakdown: capturedAggregate?.nativeTotals.map(row => kpiMoney(row.amount, row.currency, locale, copy.unavailable)).join(' / ') || [...new Set(selection.validLines.map(row => row.currencyCode))].join(' / '), rateLabel: capturedAggregate?.exchangeRate.mode === 'daily' || capturedAggregate?.exchangeRate.mode === 'configured' ? currencyCopy.dailyRate : currencyCopy.unavailable, effectiveDate: capturedAggregate?.exchangeRate.effectiveDate, source: capturedAggregate?.exchangeRate.source, isPartial: monetaryWarning, labels: currencyCopy }} />
      {selection.unlinkedMovements ? <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{copy.unlinked}: {selection.unlinkedMovements}</p> : null}
      {aggregates.loading ? <p role="status" className="text-sm text-slate-500">{copy.loading}</p> : null}
      {selection.funds.length === 0 && selection.statements.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.empty}</p> : null}
      {activeView === 'overview' ? <PettyCashKpiOverview cards={cards} copy={copy} selection={selection} onFocus={onFocus} /> : null}
      <div hidden={activeView !== 'analysis'}><div className="grid gap-6">{activeView === 'analysis' ? <PettyCashKpiAnalysis selection={selection} groups={groups} aggregates={aggregates.data} copy={copy} currency={preferredCurrency} locale={locale} /> : null}<div className="grid gap-6 xl:grid-cols-2">{table(tables.funds)}{table(tables.responsibles)}</div></div></div>
      <div hidden={activeView !== 'units'}>{table(tables.units, unit => applyScope({ unit, business: 'all' }))}</div>
      <div hidden={activeView !== 'details'}><div className="grid gap-6"><div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300"><label className="font-medium" htmlFor="petty-cash-kpi-focus">{copy.attention}</label><select id="petty-cash-kpi-focus" className={`${pettyCashInputClass} sm:!w-auto`} value={detailFocus} onChange={event => onFocus(event.target.value as DetailFocus)}>{Object.entries(focusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        <div hidden={!['all', 'pending', 'missing'].includes(detailFocus)}>{table(restrictTable('receipts', receiptIds))}</div>
        <div hidden={!['all', 'open', 'shortage'].includes(detailFocus)}>{table(restrictTable('statements', statementIds))}</div>
        <div hidden={!['all', 'negative'].includes(detailFocus)}>{table(restrictTable('balances', balanceIds))}</div>
        <div hidden={detailFocus !== 'all'}>{table(tables.movements)}</div>
      </div></div>
    </> : !sourceError ? <div aria-busy="true" aria-label={copy.loading} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div> : null}
  </div>;
}
