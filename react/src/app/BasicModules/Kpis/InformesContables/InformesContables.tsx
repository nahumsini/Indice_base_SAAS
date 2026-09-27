import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, BookOpenCheck, Download, FileSpreadsheet, ListChecks,
  LockKeyhole, Printer, RefreshCw, RotateCcw, Scale, ShieldCheck, Sparkles,
} from 'lucide-react';
import {
  getIndiceFilterControlClassName, IndiceFilterBar, IndiceFilterField, IndiceFilterSelect,
  IndiceTitleBar, IndiceWorkspaceNavigation,
} from '../../../components/frontend-os';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { apiClient, ApiClientError } from '../../../lib/apiClient';
import { useLanguage } from '../../../shared/context';
import { AnalyticsDocumentPreviewModal, type AnalyticsDocumentMode } from '../components/AnalyticsDocumentPreviewModal';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { AccountingEntryModal } from './AccountingEntryModal';
import { AccountingDocumentCanvas } from './AccountingDocumentCanvas';
import { AccountingDrilldownModal, type AccountingDrilldownSubject } from './AccountingDrilldownModal';
import { AccountingOverviewView } from './AccountingOverviewView';
import { ClosePeriodConfirmation, ReopenPeriodModal } from './AccountingPeriodModals';
import {
  AccountingLoading, AccountingReadiness, AccountingWorkflow, formatAccountingMoney,
  QualityView, StatementView,
} from './AccountingReportViews';
import { AccountingTrialBalanceView } from './AccountingTrialBalanceView';
import { getAccountingReportCopy } from './accountingReportTranslations';
import { accountingReportsApi, type AccountingAnalytics, type AccountingReport, type AccountingViewId } from './accountingReportsApi';

type PeriodId = 'current' | 'previous' | 'quarter' | 'year' | 'custom';
type WorkspaceState = { [key: string]: unknown; view: AccountingViewId; statementId: string; period: PeriodId; from: string; to: string; unitId: string; businessId: string };

function localIso(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function periodRange(id: PeriodId, reference = new Date()) {
  const year = reference.getFullYear(); const month = reference.getMonth();
  if (id === 'previous') { const date = new Date(year, month - 1, 1); return { from: localIso(date), to: localIso(new Date(date.getFullYear(), date.getMonth() + 1, 0)) }; }
  if (id === 'quarter') { const startMonth = Math.floor(month / 3) * 3; return { from: localIso(new Date(year, startMonth, 1)), to: localIso(new Date(year, startMonth + 3, 0)) }; }
  if (id === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };
  return { from: localIso(new Date(year, month, 1)), to: localIso(new Date(year, month + 1, 0)) };
}

const initialRange = periodRange('current');
const workspaceDefaults: WorkspaceState = { view: 'overview', statementId: 'profit-loss', period: 'current', ...initialRange, unitId: '', businessId: '' };

export default function InformesContables() {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getAccountingReportCopy(locale);
  const { identity: companyPrintIdentity, isReady: isPrintReady } = useCompanyPrintIdentity();
  const [view, setView] = useState<AccountingViewId>('overview');
  const [statementId, setStatementId] = useState('profit-loss');
  const [period, setPeriod] = useState<PeriodId>('current');
  const [from, setFrom] = useState(initialRange.from); const [to, setTo] = useState(initialRange.to);
  const [unitId, setUnitId] = useState(''); const [businessId, setBusinessId] = useState('');
  const [data, setData] = useState<AccountingReport | null>(null);
  const [analytics, setAnalytics] = useState<AccountingAnalytics | null>(null);
  const [loading, setLoading] = useState(true); const [mutating, setMutating] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [drilldown, setDrilldown] = useState<AccountingDrilldownSubject | null>(null);
  const [documentMode, setDocumentMode] = useState<AnalyticsDocumentMode | null>(null);
  const [closeOpen, setCloseOpen] = useState(false); const [reopenOpen, setReopenOpen] = useState(false);
  const requestSequence = useRef(0);
  const [entryOpen, setEntryOpen] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [businessDate, setBusinessDate] = useState('');
  useEffect(() => { let active = true; apiClient<{ canManage: boolean; businessDate: string }>('/api/v1/kpis/accounting-reports/capabilities').then(result => { if (active) { setCanManage(result.canManage); setBusinessDate(result.businessDate); } }).catch(() => { if (active) setCanManage(false); }); return () => { active = false; }; }, []);

  const workspaceState = useMemo<WorkspaceState>(() => ({ view, statementId, period, from, to, unitId, businessId }), [businessId, from, period, statementId, to, unitId, view]);
  useWorkspaceNavigationMemory({
    moduleKey: 'kpis', tabKey: 'accounting-reports', state: workspaceState, defaults: workspaceDefaults,
    urlFields: { view: 'reportView', statementId: 'statement', period: 'period', from: 'from', to: 'to', unitId: 'unit', businessId: 'business' },
    onRestore: (restored) => {
      const restoredView = String(restored.view) === 'quality' ? 'close-quality' : restored.view;
      setView(['overview', 'statements', 'trial-balance', 'close-quality'].includes(restoredView) ? restoredView as AccountingViewId : 'overview');
      setStatementId(typeof restored.statementId === 'string' ? restored.statementId : 'profit-loss');
      setPeriod(['current', 'previous', 'quarter', 'year', 'custom'].includes(restored.period) ? restored.period : 'current');
      setFrom(typeof restored.from === 'string' ? restored.from : initialRange.from); setTo(typeof restored.to === 'string' ? restored.to : initialRange.to);
      const nextUnit = typeof restored.unitId === 'string' ? restored.unitId : ''; setUnitId(nextUnit); setBusinessId(nextUnit && typeof restored.businessId === 'string' ? restored.businessId : '');
    },
  });

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current; setLoading(true); setError('');
    try {
      const scope = { from, to, unitId, businessId };
      const [report, pulse] = await Promise.all([accountingReportsApi.get(scope), accountingReportsApi.analytics({ ...scope, months: 12 })]);
      if (requestId !== requestSequence.current) return;
      setData(report); setAnalytics(pulse); setSetupRequired(false);
      setStatementId((current) => report.statements.some((statement) => statement.id === current) ? current : report.statements[0]?.id ?? 'profit-loss');
    } catch (cause) {
      if (requestId !== requestSequence.current) return;
      if (cause instanceof ApiClientError && cause.code === 'ACCOUNTING_NOT_READY') { setSetupRequired(true); setData(null); setAnalytics(null); }
      else setError(copy.messages.loadError);
    } finally { if (requestId === requestSequence.current) setLoading(false); }
  }, [businessId, copy.messages.loadError, from, to, unitId]);
  useEffect(() => { void load(); }, [load]);

  const units = data?.organization.units ?? [];
  const businesses = unitId ? units.find((unit) => String(unit.id) === unitId)?.businesses ?? [] : [];
  const activeStatement = data?.statements.find((statement) => statement.id === statementId) ?? data?.statements[0];
  const monthClosable = data && businessDate && data.context.to < businessDate ? data.context.from === `${data.context.periodKey}-01` && data.context.to === lastDayOfMonth(data.context.periodKey) : false;
  const scope = useMemo(() => ({ from, to, unitId, businessId }), [businessId, from, to, unitId]);

  const changePeriod = (next: string) => { const id = next as PeriodId; setPeriod(id); if (id !== 'custom') { const range = periodRange(id); setFrom(range.from); setTo(range.to); } };
  const resetFilters = () => { const range = periodRange('current'); setPeriod('current'); setFrom(range.from); setTo(range.to); setUnitId(''); setBusinessId(''); };
  const synchronize = async () => { setMutating(true); setError(''); setNotice(''); try { await accountingReportsApi.synchronize(from, to); setNotice(copy.messages.syncSuccess); await load(); } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : copy.messages.loadError); } finally { setMutating(false); } };
  const confirmClose = async () => { if (!data || !monthClosable) return; setMutating(true); setError(''); try { await accountingReportsApi.close(data.context.periodKey); setCloseOpen(false); setNotice(copy.messages.closeSuccess); await load(); } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : copy.messages.loadError); } finally { setMutating(false); } };
  const confirmReopen = async (reason: string) => { if (!data) return; setMutating(true); setError(''); try { await accountingReportsApi.reopen(data.context.periodKey, reason); setReopenOpen(false); setNotice(copy.messages.reopenSuccess); await load(); } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : copy.messages.loadError); } finally { setMutating(false); } };

  const handleInsight = (actionCode: string) => {
    if (actionCode === 'OPEN_CLOSE_QUALITY') return setView('close-quality');
    setView('statements');
    if (actionCode === 'OPEN_FINANCIAL_POSITION') setStatementId('financial-position'); else setStatementId('profit-loss');
    if (actionCode === 'OPEN_REVENUE_DETAIL') setDrilldown({ type: 'STATEMENT_LINE', id: 'REVENUE' });
  };
  const activePrintView = data ? buildPrintView(data, analytics, view, statementId, locale, copy) : null;

  const navigationItems = [
    { id: 'overview' as const, label: copy.views.overview, icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'statements' as const, label: copy.views.statements, icon: <BookOpenCheck className="h-4 w-4" /> },
    { id: 'trial-balance' as const, label: copy.views.trial, icon: <Scale className="h-4 w-4" /> },
    { id: 'close-quality' as const, label: copy.views.quality, icon: <ListChecks className="h-4 w-4" /> },
  ];

  return <div className="space-y-5">
    <IndiceTitleBar tone="blue" icon="📑" title={copy.title} subtitle={copy.subtitle} actions={<><Button type="button" variant="outline" disabled={!data || loading} onClick={() => setDocumentMode('export')} className="h-11 rounded-xl border-blue-200 bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-200"><Download className="h-4 w-4" />{copy.actions.export}</Button><Button type="button" variant="outline" disabled={!data || loading || !isPrintReady} onClick={() => setDocumentMode('print')} className="h-11 rounded-xl border-blue-200 bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-200"><Printer className="h-4 w-4" />{copy.actions.print}</Button><Button type="button" disabled={!canManage || mutating || loading} onClick={() => void synchronize()} className="h-11 rounded-xl bg-blue-700 text-white hover:bg-blue-800"><RefreshCw className={cn('h-4 w-4', mutating && 'animate-spin')} />{mutating ? copy.actions.syncing : copy.actions.synchronize}</Button></>} />

    <IndiceFilterBar title={copy.filters.title} subtitle={copy.filters.subtitle} gridClassName={period === 'custom' ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} summary={<Button type="button" variant="outline" onClick={resetFilters} className="h-9 rounded-xl"><RotateCcw className="h-4 w-4" />{copy.filters.clear}</Button>}>
      <IndiceFilterSelect label={copy.filters.period} value={period} onValueChange={changePeriod} options={(Object.keys(copy.periods) as PeriodId[]).map((id) => ({ value: id, label: copy.periods[id] }))} tone="blue" />
      {period === 'custom' ? <><IndiceFilterField label={copy.filters.from}><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={getIndiceFilterControlClassName('blue')} /></IndiceFilterField><IndiceFilterField label={copy.filters.to}><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={getIndiceFilterControlClassName('blue')} /></IndiceFilterField></> : null}
      <IndiceFilterSelect label={copy.filters.unit} value={unitId || 'all'} onValueChange={(value) => { setUnitId(value === 'all' ? '' : value); setBusinessId(''); }} options={[{ value: 'all', label: copy.filters.allUnits }, ...units.map((unit) => ({ value: String(unit.id), label: unit.name }))]} tone="blue" />
      <IndiceFilterSelect label={copy.filters.business} value={businessId || 'all'} onValueChange={(value) => setBusinessId(value === 'all' ? '' : value)} options={[{ value: 'all', label: copy.filters.allBusinesses }, ...businesses.map((business) => ({ value: String(business.id), label: business.name }))]} tone="blue" />
    </IndiceFilterBar>

    {data && !loading ? <IndiceWorkspaceNavigation<AccountingViewId> ariaLabel={copy.views.aria} items={navigationItems} onValueChange={setView} tone="blue" value={view} variant="sections" /> : null}
    {error ? <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><Button type="button" variant="outline" onClick={() => void load()} className="h-9 rounded-xl">{copy.actions.retry}</Button></section> : null}
    {notice ? <section aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"><ShieldCheck className="mr-2 inline h-4 w-4" />{notice}</section> : null}
    {setupRequired && !loading && canManage ? <AccountingSetup copy={copy} onSetup={() => void synchronize()} busy={mutating} /> : null}
    {loading ? <AccountingLoading /> : null}
    {data && analytics && !loading ? <>
      {view === 'overview' ? <><AccountingReadiness copy={copy} data={data} locale={locale} /><AccountingOverviewView analytics={analytics} copy={copy} locale={locale} report={data} onInsightAction={handleInsight} onUnitSelect={(nextUnitId) => { setUnitId(nextUnitId); setBusinessId(''); }} /></> : null}
      {view === 'statements' ? <div className="space-y-4"><AccountingReadiness copy={copy} data={data} locale={locale} /><IndiceWorkspaceNavigation<string> ariaLabel={copy.views.statements} items={data.statements.map((statement) => ({ id: statement.id, label: statement.title, icon: statement.id === 'profit-loss' ? <Sparkles className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" /> }))} onValueChange={setStatementId} tone="blue" value={statementId} variant="sections" />{activeStatement ? <StatementView copy={copy} currency={data.context.presentationCurrency} locale={locale} statement={activeStatement} onOpenLine={(id) => setDrilldown({ type: 'STATEMENT_LINE', id })} /> : null}</div> : null}
      {view === 'trial-balance' ? <AccountingTrialBalanceView copy={copy} data={data} locale={locale} onOpenAccount={(id) => setDrilldown({ type: 'ACCOUNT', id: String(id) })} /> : null}
      {view === 'close-quality' ? <div className="space-y-5"><AccountingReadiness copy={copy} data={data} locale={locale} /><AccountingWorkflow copy={copy} data={data} /><div className="flex flex-wrap justify-end gap-2">{canManage ? <Button type="button" variant="outline" disabled={mutating} onClick={() => setEntryOpen(true)}>{locale.startsWith('es') ? 'Apertura o ajuste' : 'Opening or adjustment'}</Button> : null}{canManage && monthClosable && !unitId && !businessId && data.readiness.decisionReady ? data.context.periodStatus === 'CLOSED' ? <Button type="button" variant="outline" disabled={mutating} onClick={() => setReopenOpen(true)} className="h-10 rounded-xl"><LockKeyhole className="h-4 w-4" />{copy.actions.reopen}</Button> : <Button type="button" variant="outline" disabled={mutating} onClick={() => setCloseOpen(true)} className="h-10 rounded-xl border-emerald-200 text-emerald-700"><LockKeyhole className="h-4 w-4" />{copy.actions.close}</Button> : null}</div><QualityView copy={copy} data={data} /></div> : null}
    </> : null}
    {data && activePrintView ? <AnalyticsDocumentPreviewModal documentDefinition={{
      contract: { category: 'executive-report', modifiers: ['internal', 'confidential', 'multi-currency'], pageSize: 'a4', orientation: 'landscape', version: '1.0' },
      fileName: { documentType: 'financial-report', identifier: view, period: data.context.periodKey },
      title: activePrintView.title, subtitle: activePrintView.subtitle, issuer: companyPrintIdentity.name, logoUrl: companyPrintIdentity.logoUrl, locale,
      metadata: [{ label: copy.filters.period, value: `${data.context.from} / ${data.context.to}` }, { label: copy.common.framework, value: data.context.reportingFramework.split('_').join(' ') }, { label: copy.common.currency, value: data.context.presentationCurrency }, { label: copy.common.status, value: copy.readiness[data.readiness.status] }, { label: copy.readiness.coverage, value: `${data.readiness.coveragePercent}%` }],
      metrics: activePrintView.metrics,
      tables: activePrintView.tables.map(table => ({ title: table.title, columns: table.headers, rows: table.rows, emptyMessage: table.emptyLabel })),
      notice: data.readiness.message,
      sections: data.preparationNotes?.length ? [{ title: copy.views.quality, paragraphs: data.preparationNotes }] : [],
    }} company={companyPrintIdentity} fileName={`indice-financial-${view}-${data.context.from}-${data.context.to}.html`} locale={locale} mode={documentMode} onClose={() => setDocumentMode(null)} onExportData={() => exportAccountingCsv(data, analytics, view, statementId, locale)} scopeItems={[{ label: copy.filters.period, value: `${data.context.from} / ${data.context.to}` }, { label: copy.common.framework, value: data.context.reportingFramework.split('_').join(' ') }, { label: copy.common.currency, value: data.context.presentationCurrency }, { label: copy.common.status, value: copy.readiness[data.readiness.status] }]} title={activePrintView.title}><AccountingDocumentCanvas copy={copy} data={data} report={activePrintView} /></AnalyticsDocumentPreviewModal> : null}
    {entryOpen && data ? <AccountingEntryModal open report={data} locale={locale} onClose={() => setEntryOpen(false)} onSaved={() => { setEntryOpen(false); void load(); }} /> : null}
    <AccountingDrilldownModal copy={copy} locale={locale} subject={drilldown} scope={scope} onClose={() => setDrilldown(null)} />
    <ClosePeriodConfirmation copy={copy} open={closeOpen} periodKey={data?.context.periodKey ?? ''} busy={mutating} onCancel={() => setCloseOpen(false)} onConfirm={() => void confirmClose()} />
    <ReopenPeriodModal copy={copy} open={reopenOpen} periodKey={data?.context.periodKey ?? ''} busy={mutating} onCancel={() => setReopenOpen(false)} onConfirm={(reason) => void confirmReopen(reason)} />
  </div>;
}

function AccountingSetup({ copy, onSetup, busy }: { copy: ReturnType<typeof getAccountingReportCopy>; onSetup: () => void; busy: boolean }) {
  return <section className="rounded-[24px] border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900 dark:bg-blue-950/20"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex max-w-3xl gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white"><Sparkles className="h-6 w-6" /></span><div><h3 className="text-xl font-medium text-slate-950 dark:text-white">{copy.setup.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{copy.setup.description}</p><p className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-200">{copy.setup.note}</p></div></div><Button type="button" disabled={busy} onClick={onSetup} className="h-11 rounded-xl bg-blue-700 text-white"><RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />{copy.actions.setup}</Button></div></section>;
}

function lastDayOfMonth(periodKey: string) { const [year, month] = periodKey.split('-').map(Number); return localIso(new Date(year, month, 0)); }

export function buildPrintView(data: AccountingReport, analytics: AccountingAnalytics | null, view: AccountingViewId, statementId: string, locale: string, copy: ReturnType<typeof getAccountingReportCopy>) {
  const currency = data.context.presentationCurrency;
  const metrics = [{ label: copy.metrics.revenue, value: formatAccountingMoney(data.headline.revenue, currency, locale) }, { label: copy.metrics.netProfit, value: formatAccountingMoney(data.headline.netProfit, currency, locale) }, { label: copy.readiness.coverage, value: `${data.readiness.coveragePercent}%` }];
  if (view === 'overview' && analytics) return { title: copy.views.overview, subtitle: copy.overview.subtitle, metrics, tables: [{ title: copy.overview.trend, emptyLabel: copy.trial.empty, headers: [copy.filters.period, copy.metrics.REVENUE, copy.metrics.OPERATING_PROFIT, copy.metrics.NET_PROFIT], rows: analytics.monthlyTrend.map((row) => [row.periodKey, formatAccountingMoney(row.revenue, currency, locale), formatAccountingMoney(row.operatingProfit, currency, locale), formatAccountingMoney(row.netProfit, currency, locale)]) }] };
  if (view === 'trial-balance') return { title: copy.views.trial, subtitle: data.readiness.message, metrics, tables: [{ title: copy.views.trial, emptyLabel: copy.trial.empty, headers: [copy.trial.code, copy.trial.name, copy.trial.debit, copy.trial.credit, copy.trial.balance], rows: data.trialBalance.map((row) => [row.accountCode, row.accountName, formatAccountingMoney(row.debit, currency, locale), formatAccountingMoney(row.credit, currency, locale), formatAccountingMoney(row.balance, currency, locale)]) }] };
  if (view === 'close-quality') return { title: copy.views.quality, subtitle: copy.quality.subtitle, metrics, tables: [{ title: copy.quality.title, emptyLabel: copy.quality.noFindings, headers: [copy.common.severity, copy.common.finding, copy.common.detail, copy.quality.action], rows: data.findings.map((finding) => [finding.severity, finding.title, finding.detail, finding.action]) }] };
  const statement = data.statements.find((item) => item.id === statementId) ?? data.statements[0];
  return { title: statement.title, subtitle: statement.subtitle, metrics, tables: [{ title: statement.standardReference, emptyLabel: copy.trial.empty, headers: [copy.common.concept, copy.statement.current, copy.statement.comparative, copy.statement.variance], rows: statement.lines.map((line) => [line.label, formatAccountingMoney(line.current, currency, locale), formatAccountingMoney(line.comparative, currency, locale), `${line.variancePercent.toFixed(1)}%`]) }] };
}

export type AccountingPrintView = ReturnType<typeof buildPrintView>;

function exportAccountingCsv(data: AccountingReport, analytics: AccountingAnalytics | null, view: AccountingViewId, statementId: string, locale: string) {
  const report = buildPrintView(data, analytics, view, statementId, locale, getAccountingReportCopy(locale));
  const rows: Array<Array<string | number>> = [[report.title], [report.subtitle], [data.context.from, data.context.to], [], ...report.tables.flatMap((table) => [[table.title], table.headers, ...table.rows, []])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${view}-${data.context.from}-${data.context.to}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
