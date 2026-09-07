import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Gauge,
  Landmark,
  Percent,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement, PettyCashStatementStatus } from '../types/pettyCash.types';
import { useTablePagination } from '../../../hooks/useTablePagination';
import {
  formatPettyCashNativeBreakdown,
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getFundById,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregates, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';
import { getOperationalKpiCurrencyCopy, OperationalKpiCurrencyStrip } from '../../shared/operational';
import { useLanguage } from '../../../shared/context';
import { getPettyCashMethodLabel } from '../utils/pettyCash.methods';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import {
  PettyCashEmptyState,
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashPagination,
  PettyCashSortableHeader,
  pettyCashInputClass,
  PettyCashStatusPill,
  usePettyCashTableSort,
} from './PettyCashShared';

type PettyCashFinancialViewWorkspaceProps = {
  funds: PettyCashFund[];
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  statements: PettyCashStatement[];
};

type KpiTone = 'healthy' | 'review' | 'critical' | 'neutral';

const toneStyles: Record<KpiTone, { badge: string; bar: string; label: string; value: string }> = {
  critical: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
    bar: 'bg-rose-500',
    label: 'Crítico',
    value: 'text-rose-600 dark:text-rose-300',
  },
  healthy: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    bar: 'bg-[#147514]',
    label: 'Saludable',
    value: 'text-[#147514] dark:text-emerald-300',
  },
  neutral: {
    badge: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    bar: 'bg-slate-500',
    label: 'Informativo',
    value: 'text-slate-900 dark:text-white',
  },
  review: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    bar: 'bg-amber-500',
    label: 'En revisión',
    value: 'text-amber-600 dark:text-amber-300',
  },
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

const rankTone = (value: number): KpiTone => {
  if (value >= 80) {
    return 'healthy';
  }
  if (value >= 55) {
    return 'review';
  }
  return 'critical';
};

export function PettyCashFinancialViewWorkspace({
  funds,
  movements,
  settlementLines,
  statements,
}: PettyCashFinancialViewWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { currentLanguage } = useLanguage();
  const currencyCopy = getOperationalKpiCurrencyCopy(currentLanguage.code);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PettyCashStatementStatus | 'all'>('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions: Array<{ label: string; value: PettyCashStatementStatus | 'all' }> = useMemo(() => [
    { label: copy.common.all, value: 'all' },
    { label: copy.status.statement.OPEN, value: 'OPEN' },
    { label: copy.status.statement.CUT_PENDING, value: 'CUT_PENDING' },
    { label: copy.status.statement.PARTIALLY_SETTLED, value: 'PARTIALLY_SETTLED' },
    { label: copy.status.statement.SETTLED, value: 'SETTLED' },
    { label: copy.status.statement.SHORTAGE, value: 'SHORTAGE' },
    { label: copy.status.statement.FORGIVEN_SHORTAGE, value: 'FORGIVEN_SHORTAGE' },
    { label: copy.status.statement.CHARGED_TO_EMPLOYEE, value: 'CHARGED_TO_EMPLOYEE' },
    { label: copy.status.statement.CLOSED, value: 'CLOSED' },
  ], [copy]);

  const periodOptions = useMemo(() => (
    Array.from(new Set(statements.map(statement => statement.periodKey))).sort().reverse()
  ), [statements]);
  const unitOptions = useMemo(() => [...new Map(funds.map(fund => [fund.unitId, fund.unitName])).entries()], [funds]);
  const businessOptions = useMemo(() => [...new Map(funds.filter(fund => unitFilter === 'all' || fund.unitId === unitFilter).map(fund => [fund.businessId, fund.businessName])).entries()], [funds, unitFilter]);

  const filteredStatements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return statements.filter((statement) => {
      const fund = getFundById(funds, statement.pettyCashFundId);
      const matchesPeriod = periodFilter === 'all' || statement.periodKey === periodFilter;
      const matchesStatus = statusFilter === 'all' || statement.status === statusFilter;
      const matchesUnit = unitFilter === 'all' || fund?.unitId === unitFilter;
      const matchesBusiness = businessFilter === 'all' || fund?.businessId === businessFilter;
      const matchesSearch = !search
        || statement.folio.toLowerCase().includes(search)
        || statement.responsibleName.toLowerCase().includes(search)
        || fund?.name.toLowerCase().includes(search)
        || fund?.unitName.toLowerCase().includes(search)
        || fund?.businessName.toLowerCase().includes(search);

      return matchesPeriod && matchesStatus && matchesUnit && matchesBusiness && matchesSearch;
    });
  }, [businessFilter, funds, periodFilter, searchTerm, statements, statusFilter, unitFilter]);

  const filteredStatementIds = useMemo(
    () => new Set(filteredStatements.map(statement => statement.id)),
    [filteredStatements],
  );
  const visibleFundIds = useMemo(() => new Set(filteredStatements.map(statement => statement.pettyCashFundId)), [filteredStatements]);
  const visibleFunds = useMemo(() => funds.filter(fund => visibleFundIds.has(fund.id)), [funds, visibleFundIds]);
  const filteredMovements = useMemo(
    () => movements.filter(movement => (
      movement.pettyCashStatementId
        ? filteredStatementIds.has(movement.pettyCashStatementId)
        : visibleFundIds.has(movement.pettyCashFundId)
    )),
    [filteredStatementIds, movements, visibleFundIds],
  );
  const filteredLines = useMemo(
    () => settlementLines.filter(line => filteredStatementIds.has(line.pettyCashStatementId)),
    [filteredStatementIds, settlementLines],
  );

  const statementIds = filteredStatements.map((statement) => statement.id);
  const fundIds = visibleFunds.map((fund) => fund.id);
  const summaryAggregates = useKpiMonetaryAggregates([
    { key: 'assigned', metric: 'PETTY_CASH_STATEMENT_FUNDED', preferredCurrency, ids: statementIds },
    { key: 'estimated', metric: 'PETTY_CASH_STATEMENT_ESTIMATED', preferredCurrency, ids: statementIds },
    { key: 'verified', metric: 'PETTY_CASH_STATEMENT_VERIFIED', preferredCurrency, ids: statementIds },
    { key: 'pending', metric: 'PETTY_CASH_STATEMENT_PENDING', preferredCurrency, ids: statementIds },
    { key: 'shortage', metric: 'PETTY_CASH_STATEMENT_SHORTAGE', preferredCurrency, ids: statementIds },
    { key: 'balance', metric: 'PETTY_CASH_BALANCE', preferredCurrency, ids: fundIds },
  ]);
  const balanceAggregate = summaryAggregates.data.balance;
  const summary = {
    assignedAmount: summaryAggregates.data.assigned?.preferredTotal ?? 0,
    currentBalanceAmount: balanceAggregate?.preferredTotal ?? 0,
    estimatedUsageAmount: summaryAggregates.data.estimated?.preferredTotal ?? 0,
    pendingReconciliationAmount: summaryAggregates.data.pending?.preferredTotal ?? 0,
    riskCount: filteredStatements.filter((statement) => ['SHORTAGE', 'CUT_PENDING', 'PARTIALLY_SETTLED'].includes(statement.status)).length,
    shortageAmount: summaryAggregates.data.shortage?.preferredTotal ?? 0,
    verifiedExpenseAmount: summaryAggregates.data.verified?.preferredTotal ?? 0,
  };
  const nativeBalance = useMemo(() => formatPettyCashNativeBreakdown(
    visibleFunds,
    fund => fund.currentBalanceAmount,
    fund => fund.currencyCode,
  ), [visibleFunds]);
  const nativeCurrencies = useMemo(
    () => Array.from(new Set(filteredStatements.map(statement => statement.currencyCode))).join(' / ') || preferredCurrency,
    [filteredStatements, preferredCurrency],
  );

  const assignedAmount = Math.max(summary.assignedAmount, 1);
  const verifiedWidth = clampPercent((summary.verifiedExpenseAmount / assignedAmount) * 100);
  const pendingWidth = Math.min(100 - verifiedWidth, clampPercent((summary.pendingReconciliationAmount / assignedAmount) * 100));
  const shortageWidth = Math.min(100 - verifiedWidth - pendingWidth, clampPercent((summary.shortageAmount / assignedAmount) * 100));
  const remainingWidth = Math.max(0, 100 - verifiedWidth - pendingWidth - shortageWidth);
  const reconciliationRate = summary.estimatedUsageAmount > 0
    ? Math.round(clampPercent((summary.verifiedExpenseAmount / summary.estimatedUsageAmount) * 100))
    : 0;
  const budgetAvailable = Math.max(0, summary.currentBalanceAmount);
  const authorizedReceiptCount = filteredLines.filter(line => line.status === 'EXPENSE_CREATED').length;
  const pendingReceiptCount = filteredLines.filter(line => !['EXPENSE_CREATED', 'REJECTED', 'REVERSED'].includes(line.status)).length;
  const evidenceCoverage = filteredLines.length > 0
    ? Math.round(clampPercent((filteredLines.filter(line => line.attachmentCount > 0).length / filteredLines.length) * 100))
    : 0;
  const pendingRatio = clampPercent((summary.pendingReconciliationAmount / assignedAmount) * 100);
  const shortageRatio = clampPercent((summary.shortageAmount / assignedAmount) * 100);
  const healthScore = Math.round(clampPercent(
    (reconciliationRate * 0.35)
    + (evidenceCoverage * 0.25)
    + ((100 - pendingRatio) * 0.2)
    + ((100 - shortageRatio) * 0.2),
  ));

  const monetaryGroups = useMemo(() => {
    const units = new Map<string, { ids: string[]; name: string }>();
    const responsibles = new Map<string, { ids: string[]; name: string }>();
    filteredStatements.forEach(statement => {
      const fund = getFundById(funds, statement.pettyCashFundId);
      const unitKey = fund?.unitId ?? 'none';
      const unit = units.get(unitKey) ?? { ids: [], name: fund?.unitName ?? copy.common.notAvailable };
      unit.ids.push(statement.id);
      units.set(unitKey, unit);
      const responsible = responsibles.get(statement.responsibleUserId) ?? { ids: [], name: statement.responsibleName };
      responsible.ids.push(statement.id);
      responsibles.set(statement.responsibleUserId, responsible);
    });
    return { units: [...units.entries()], responsibles: [...responsibles.entries()] };
  }, [copy.common.notAvailable, filteredStatements, funds]);
  const groupQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const queries: KpiMonetaryBatchQuery[] = [];
    monetaryGroups.units.forEach(([key, group]) => ['FUNDED', 'PENDING', 'VERIFIED'].forEach((metric) => queries.push({ key: `unit-${metric}-${key}`, metric: `PETTY_CASH_STATEMENT_${metric}` as KpiMonetaryBatchQuery['metric'], preferredCurrency, ids: group.ids })));
    visibleFunds.forEach((fund) => ['PENDING', 'VERIFIED'].forEach((metric) => queries.push({ key: `fund-${metric}-${fund.id}`, metric: `PETTY_CASH_STATEMENT_${metric}` as KpiMonetaryBatchQuery['metric'], preferredCurrency, ids: filteredStatements.filter((statement) => statement.pettyCashFundId === fund.id).map((statement) => statement.id) })));
    monetaryGroups.responsibles.forEach(([key, group]) => ['PENDING', 'VERIFIED'].forEach((metric) => queries.push({ key: `responsible-${metric}-${key}`, metric: `PETTY_CASH_STATEMENT_${metric}` as KpiMonetaryBatchQuery['metric'], preferredCurrency, ids: group.ids })));
    periodOptions.slice(0, 6).forEach((period) => queries.push({ key: `period-${period}`, metric: 'PETTY_CASH_STATEMENT_VERIFIED', preferredCurrency, ids: statements.filter((statement) => statement.periodKey === period && visibleFundIds.has(statement.pettyCashFundId)).map((statement) => statement.id) }));
    return queries;
  }, [filteredStatements, monetaryGroups, periodOptions, preferredCurrency, statements, visibleFundIds, visibleFunds]);
  const groupedAggregates = useKpiMonetaryAggregates(groupQueries);
  const unitPerformance = monetaryGroups.units.map(([key, group]) => ({ assigned: groupedAggregates.data[`unit-FUNDED-${key}`]?.preferredTotal ?? 0, name: group.name, pending: groupedAggregates.data[`unit-PENDING-${key}`]?.preferredTotal ?? 0, verified: groupedAggregates.data[`unit-VERIFIED-${key}`]?.preferredTotal ?? 0 })).sort((a, b) => b.verified - a.verified);
  const topFunds = visibleFunds.map((fund) => ({ ...fund, pending: groupedAggregates.data[`fund-PENDING-${fund.id}`]?.preferredTotal ?? 0, spent: groupedAggregates.data[`fund-VERIFIED-${fund.id}`]?.preferredTotal ?? 0 })).sort((a, b) => b.spent - a.spent).slice(0, 5);
  const topResponsibles = monetaryGroups.responsibles.map(([key, group]) => ({ count: group.ids.length, name: group.name, pending: groupedAggregates.data[`responsible-PENDING-${key}`]?.preferredTotal ?? 0, spent: groupedAggregates.data[`responsible-VERIFIED-${key}`]?.preferredTotal ?? 0 })).sort((a, b) => b.spent - a.spent);
  const periodTrend = periodOptions.slice(0, 6).reverse().map((period) => ({ period, value: groupedAggregates.data[`period-${period}`]?.preferredTotal ?? 0 }));
  const maxTrend = Math.max(1, ...periodTrend.map(item => item.value));
  const maxUnit = Math.max(1, ...unitPerformance.map(item => item.assigned));
  const maxTopFund = Math.max(1, ...topFunds.map(fund => fund.spent));
  const maxTopResponsible = Math.max(1, ...topResponsibles.map(responsible => responsible.spent));

  const statementSortAccessors = useMemo(() => ({
    assigned: (statement: PettyCashStatement) => statement.assignedAmount + statement.additionalDepositAmount,
    estimated: (statement: PettyCashStatement) => statement.estimatedUsageAmount,
    fund: (statement: PettyCashStatement) => getFundById(funds, statement.pettyCashFundId)?.name ?? '',
    pending: (statement: PettyCashStatement) => getStatementSettlementBalance(statement),
    period: (statement: PettyCashStatement) => statement.periodKey,
    shortage: (statement: PettyCashStatement) => statement.shortageAmount,
    statement: (statement: PettyCashStatement) => statement.folio,
    status: (statement: PettyCashStatement) => statement.status,
    verified: (statement: PettyCashStatement) => statement.verifiedExpenseAmount,
  }), [funds]);
  const statementSort = usePettyCashTableSort(filteredStatements, statementSortAccessors, 'period', 'desc');
  const statementPaginationResetKey = useMemo(
    () => `${periodFilter}:${statusFilter}:${unitFilter}:${businessFilter}:${searchTerm}:${statementSort.sortKey}:${statementSort.sortDirection}:${filteredStatements.map(statement => statement.id).join('|')}`,
    [businessFilter, filteredStatements, periodFilter, searchTerm, statementSort.sortDirection, statementSort.sortKey, statusFilter, unitFilter],
  );
  const statementPagination = useTablePagination({
    resetKey: statementPaginationResetKey,
    rows: statementSort.sortedRows,
  });

  const movementSortAccessors = useMemo(() => ({
    amount: (movement: PettyCashMovement) => movement.amount,
    date: (movement: PettyCashMovement) => movement.movementDate,
    fund: (movement: PettyCashMovement) => getFundById(funds, movement.pettyCashFundId)?.name ?? '',
    reference: (movement: PettyCashMovement) => movement.reference,
    source: (movement: PettyCashMovement) => movement.fromPaymentAccountName ?? '',
    target: (movement: PettyCashMovement) => movement.toPaymentAccountName ?? '',
    type: (movement: PettyCashMovement) => movement.type,
  }), [funds]);
  const movementSort = usePettyCashTableSort(filteredMovements, movementSortAccessors, 'date', 'desc');
  const movementPaginationResetKey = useMemo(
    () => `${periodFilter}:${statusFilter}:${unitFilter}:${businessFilter}:${searchTerm}:${movementSort.sortKey}:${movementSort.sortDirection}:${filteredMovements.map(movement => movement.id).join('|')}`,
    [businessFilter, filteredMovements, movementSort.sortDirection, movementSort.sortKey, periodFilter, searchTerm, statusFilter, unitFilter],
  );
  const movementPagination = useTablePagination({
    resetKey: movementPaginationResetKey,
    rows: movementSort.sortedRows,
  });

  const resetFilters = () => {
    setPeriodFilter('all');
    setStatusFilter('all');
    setUnitFilter('all');
    setBusinessFilter('all');
    setSearchTerm('');
  };

  const summaryMoney = (value: number) => (
    !summaryAggregates.loading && !summaryAggregates.error
      ? formatPettyCashCurrency(value, preferredCurrency)
      : '—'
  );

  const kpiCards = [
    {
      description: 'Monto asignado a los cortes visibles, convertido a la divisa preferida.',
      helper: `${filteredStatements.length} cortes en alcance`,
      icon: WalletCards,
      progress: undefined,
      title: copy.financial.metrics.assignedFunds,
      tone: summary.assignedAmount > 0 ? 'healthy' : 'neutral',
      value: summaryMoney(summary.assignedAmount),
    },
    {
      description: 'Saldo operativo actual de los fondos relacionados con el filtro.',
      helper: `${visibleFunds.length} cajas visibles`,
      icon: Landmark,
      progress: summary.assignedAmount > 0 ? (summary.currentBalanceAmount / summary.assignedAmount) * 100 : 0,
      title: 'Saldo actual',
      tone: summary.currentBalanceAmount >= 0 ? 'healthy' : 'critical',
      value: summaryMoney(summary.currentBalanceAmount),
    },
    {
      description: 'Compras comprobadas que ya pueden relacionarse con Expenses.',
      helper: `${authorizedReceiptCount} comprobantes autorizados`,
      icon: CheckCircle2,
      progress: reconciliationRate,
      title: copy.financial.metrics.verifiedExpense,
      tone: reconciliationRate >= 80 ? 'healthy' : reconciliationRate >= 50 ? 'review' : 'critical',
      value: summaryMoney(summary.verifiedExpenseAmount),
    },
    {
      description: 'Importe que todavía necesita evidencia o autorización.',
      helper: `${pendingReceiptCount} comprobantes pendientes`,
      icon: FileText,
      progress: pendingRatio,
      title: copy.financial.metrics.pendingProof,
      tone: pendingRatio <= 15 ? 'healthy' : pendingRatio <= 40 ? 'review' : 'critical',
      value: summaryMoney(summary.pendingReconciliationAmount),
    },
    {
      description: 'Diferencia detectada al cerrar cortes o revisar saldos.',
      helper: `${summary.riskCount} cajas con riesgo`,
      icon: AlertTriangle,
      progress: shortageRatio,
      title: copy.financial.metrics.shortages,
      tone: summary.shortageAmount === 0 ? 'healthy' : summary.shortageAmount <= summary.assignedAmount * 0.05 ? 'review' : 'critical',
      value: summaryMoney(summary.shortageAmount),
      onClick: () => setStatusFilter(current => current === 'SHORTAGE' ? 'all' : 'SHORTAGE'),
    },
    {
      description: 'Porcentaje del uso estimado que ya fue comprobado.',
      helper: `${copy.financial.progress.verified} vs ${copy.financial.progress.pending}`,
      icon: Percent,
      progress: reconciliationRate,
      title: 'Avance de comprobación',
      tone: reconciliationRate >= 80 ? 'healthy' : reconciliationRate >= 50 ? 'review' : 'critical',
      value: `${reconciliationRate}%`,
    },
    {
      description: 'Comprobantes con archivo adjunto dentro del alcance.',
      helper: `${filteredLines.filter(line => line.attachmentCount > 0).length} de ${filteredLines.length} con evidencia`,
      icon: ReceiptText,
      progress: evidenceCoverage,
      title: 'Cobertura de evidencia',
      tone: filteredLines.length === 0 ? 'neutral' : evidenceCoverage >= 85 ? 'healthy' : evidenceCoverage >= 60 ? 'review' : 'critical',
      value: `${evidenceCoverage}%`,
    },
    {
      description: 'Puntaje combinado de comprobación, evidencia, pendientes y faltantes.',
      helper: `35% comprobación · 25% evidencia · 20% pendientes · 20% faltantes`,
      icon: ShieldCheck,
      progress: healthScore,
      title: 'Salud de caja chica',
      tone: rankTone(healthScore),
      value: `${healthScore}/100`,
    },
  ] satisfies Array<{
    description: string;
    helper: string;
    icon: LucideIcon;
    progress?: number;
    onClick?: () => void;
    title: string;
    tone: KpiTone;
    value: string;
  }>;

  return (
    <div className="space-y-6">
      <PettyCashHeaderBanner
        description={copy.financial.header.description}
        emoji="📊"
        title={copy.financial.header.title}
      />

      <PettyCashFilterShell
        activeAdvancedCount={Number(unitFilter !== 'all') + Number(businessFilter !== 'all')}
        advancedContent={(
          <>
            <PettyCashField label={copy.funds.table.unit}>
              <select className={pettyCashInputClass} onChange={(event) => { setUnitFilter(event.target.value); setBusinessFilter('all'); }} value={unitFilter}>
                <option value="all">{copy.common.all}</option>
                {unitOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </PettyCashField>
            <PettyCashField label={copy.funds.table.business}>
              <select className={pettyCashInputClass} onChange={(event) => setBusinessFilter(event.target.value)} value={businessFilter}>
                <option value="all">{copy.common.all}</option>
                {businessOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </PettyCashField>
          </>
        )}
        hasActiveFilters={Boolean(searchTerm || periodFilter !== 'all' || statusFilter !== 'all' || unitFilter !== 'all' || businessFilter !== 'all')}
        onClear={resetFilters}
        resultLabel={copy.financial.filters.result(filteredStatements.length)}
        subtitle={copy.financial.filters.subtitle}
      >
        <PettyCashField label={copy.financial.filters.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${pettyCashInputClass} pl-9`}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.financial.filters.searchPlaceholder}
              value={searchTerm}
            />
          </div>
        </PettyCashField>
        <PettyCashField label={copy.financial.filters.period}>
          <select className={pettyCashInputClass} onChange={(event) => setPeriodFilter(event.target.value)} value={periodFilter}>
            <option value="all">{copy.common.all}</option>
            {periodOptions.map(period => <option key={period} value={period}>{period}</option>)}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.financial.filters.status}>
          <select className={pettyCashInputClass} onChange={(event) => setStatusFilter(event.target.value as PettyCashStatementStatus | 'all')} value={statusFilter}>
            {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </PettyCashField>
      </PettyCashFilterShell>

      <OperationalKpiCurrencyStrip context={{
        preferredCurrency,
        nativeBreakdown: balanceAggregate?.nativeTotals
          .map(({ amount, currency }) => formatPettyCashCurrency(amount, currency as PettyCashFund['currencyCode']))
          .join(' / ') || nativeCurrencies,
        rateLabel: balanceAggregate?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
        effectiveDate: balanceAggregate?.exchangeRate.effectiveDate,
        source: balanceAggregate?.exchangeRate.source,
        isPartial: Boolean(summaryAggregates.error || balanceAggregate?.partial),
        excludedCount: balanceAggregate?.excludedRecords ?? (summaryAggregates.error ? visibleFunds.length : 0),
        labels: currencyCopy,
      }} />

      {summaryAggregates.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          {copy.common.financialDataUnavailable}
        </div>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(card => <KpiDecisionCard key={card.title} {...card} />)}
      </section>

      <section className="space-y-3">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-[#147514]" style={{ width: `${verifiedWidth}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${pendingWidth}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${shortageWidth}%` }} />
          <div className="h-full bg-sky-400" style={{ width: `${remainingWidth}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#147514]" /> {copy.financial.progress.verified}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> {copy.financial.progress.pending}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" /> {copy.financial.progress.shortage}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" /> {copy.financial.progress.available}</span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard icon={<CheckCircle2 className="h-5 w-5" />} subtitle="Comprobantes autorizados, pendientes, faltantes y disponible del alcance." title="Mezcla de caja">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { color: 'bg-[#147514]', label: copy.financial.progress.verified, value: summary.verifiedExpenseAmount, width: verifiedWidth },
              { color: 'bg-amber-400', label: copy.financial.progress.pending, value: summary.pendingReconciliationAmount, width: pendingWidth },
              { color: 'bg-red-500', label: copy.financial.progress.shortage, value: summary.shortageAmount, width: shortageWidth },
              { color: 'bg-sky-400', label: copy.financial.progress.available, value: budgetAvailable, width: remainingWidth },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="text-sm font-medium text-slate-950 dark:text-white">{formatPettyCashCurrency(item.value, preferredCurrency)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(4, item.width)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={<Building2 className="h-5 w-5" />} subtitle={`Gasto comprobado por unidad, expresado en ${preferredCurrency}.`} title="Comparativo por unidad">
          <div className="space-y-4">
            {unitPerformance.slice(0, 6).map(unit => (
              <div key={unit.name}>
                <div className="mb-2 flex justify-between gap-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="truncate">{unit.name}</span>
                  <span className="shrink-0">{formatPettyCashCurrency(unit.verified, preferredCurrency)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-[#59C3A5]" style={{ width: `${Math.max(4, (unit.assigned / maxUnit) * 100)}%` }} />
                </div>
              </div>
            ))}
            {unitPerformance.length === 0 ? <PettyCashEmptyState label="No hay unidades para comparar." /> : null}
          </div>
        </SectionCard>

        <SectionCard icon={<TrendingUp className="h-5 w-5" />} subtitle="Gasto comprobado de los ultimos cortes disponibles." title="Evolucion por periodo">
          <div className="flex h-56 items-end gap-3">
            {periodTrend.map(item => (
              <div key={item.period} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-[#147514]" style={{ height: `${Math.max(8, (item.value / maxTrend) * 180)}px` }} />
                <span className="w-full truncate text-center text-xs font-medium text-slate-500">{item.period}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={<Activity className="h-5 w-5" />} subtitle="Lectura operativa de lo que todavia requiere accion." title={copy.financial.cards.riskTitle}>
          <div className="grid gap-3 sm:grid-cols-3">
            <RiskBox label={copy.financial.progress.pending} tone="review" value={formatPettyCashCurrency(summary.pendingReconciliationAmount, preferredCurrency)} />
            <RiskBox label={copy.financial.progress.shortage} tone={summary.shortageAmount > 0 ? 'critical' : 'healthy'} value={formatPettyCashCurrency(summary.shortageAmount, preferredCurrency)} />
            <RiskBox label={copy.financial.progress.available} tone="healthy" value={formatPettyCashCurrency(budgetAvailable, preferredCurrency)} />
          </div>
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
            {summary.riskCount} cajas requieren atencion · {pendingReceiptCount} comprobantes pendientes · {copy.common.nativeBreakdown(nativeBalance)}.
          </p>
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RankingCard maxValue={maxTopFund} rows={topFunds.map(fund => ({ detail: fund.responsibleName, label: fund.name, secondary: formatPettyCashCurrency(fund.pending, preferredCurrency), value: fund.spent }))} title={`Top ${copy.shell.tabs.cash}`} valueCurrency={preferredCurrency} />
        <RankingCard maxValue={maxTopResponsible} rows={topResponsibles.map(responsible => ({ detail: `${responsible.count} cortes`, label: responsible.name, secondary: formatPettyCashCurrency(responsible.pending, preferredCurrency), value: responsible.spent }))} title="Top responsables" valueCurrency={preferredCurrency} />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-medium text-slate-900 dark:text-white">Desempeno por corte</h3>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Compara comprobacion, saldo pendiente, faltantes y estado operativo por corte.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.financial.filters.result(filteredStatements.length)}</span>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {statementPagination.paginatedRows.map((statement) => {
            const fund = getFundById(funds, statement.pettyCashFundId);
            return (
              <article key={statement.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{statement.folio}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{fund?.name ?? copy.financial.statements.noFund} · {statement.periodKey}</p></div>
                  <PettyCashStatusPill kind="statement" status={statement.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 dark:border-slate-800">
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">{copy.financial.statements.columns.verified}</p><p className="mt-1 text-base font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</p></div>
                  <div className="text-right"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.financial.statements.columns.pending}</p><p className="mt-1 text-base font-medium tabular-nums text-amber-600 dark:text-amber-300">{formatPettyCashCurrency(getStatementSettlementBalance(statement), statement.currencyCode)}</p></div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{statement.responsibleName}</p>
              </article>
            );
          })}
          {statementPagination.totalCount === 0 ? <PettyCashEmptyState label="No hay cortes con el alcance seleccionado." /> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1180px]">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
              <tr>
                <PettyCashSortableHeader columnKey="statement" label={copy.financial.statements.columns.statement} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="fund" label={copy.financial.statements.columns.fund} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="period" label={copy.financial.statements.columns.period} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="assigned" label={copy.financial.statements.columns.assigned} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="verified" label={copy.financial.statements.columns.verified} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="pending" label={copy.financial.statements.columns.pending} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="shortage" label={copy.financial.statements.columns.shortage} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="status" label={copy.financial.statements.columns.status} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {statementPagination.paginatedRows.map((statement) => {
                const fund = getFundById(funds, statement.pettyCashFundId);
                return (
                  <tr key={statement.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">{statement.folio}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{fund?.name ?? copy.financial.statements.noFund}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{statement.responsibleName}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{statement.periodKey}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-slate-900 dark:text-white">{formatPettyCashCurrency(statement.assignedAmount + statement.additionalDepositAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-amber-600 dark:text-amber-300">{formatPettyCashCurrency(getStatementSettlementBalance(statement), statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-red-600 dark:text-red-300">{formatPettyCashCurrency(statement.shortageAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4"><PettyCashStatusPill kind="statement" status={statement.status} /></td>
                  </tr>
                );
              })}
              {statementPagination.totalCount === 0 ? (
                <tr>
                  <td className="px-5 py-10" colSpan={8}>
                    <PettyCashEmptyState label="No hay cortes con el alcance seleccionado." />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PettyCashPagination
          currentPage={statementPagination.currentPage}
          itemLabel={copy.financial.statements.itemLabel}
          onPageChange={statementPagination.onPageChange}
          onPageSizeChange={statementPagination.onPageSizeChange}
          pageEnd={statementPagination.pageEnd}
          pageSize={statementPagination.pageSize}
          pageSizeOptions={statementPagination.pageSizeOptions}
          pageStart={statementPagination.pageStart}
          totalCount={statementPagination.totalCount}
          totalPages={statementPagination.totalPages}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-medium text-slate-900 dark:text-white">{copy.financial.movements.title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copy.financial.movements.subtitle}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.financial.movements.result(filteredMovements.length)}</span>
        </div>
        {filteredMovements.length > 0 ? (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {movementPagination.paginatedRows.map((movement) => {
                const fund = getFundById(funds, movement.pettyCashFundId);
                return (
                  <article key={movement.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{copy.status.movement[movement.type]}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{fund?.name ?? copy.financial.movements.noFund} · {formatPettyCashIsoDate(movement.movementDate)}</p></div><p className="shrink-0 text-base font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</p></div>
                    <p className="mt-3 truncate border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">{getPettyCashMethodLabel(copy.funds.methodLabels, movement.reference)}</p>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
                  <tr>
                    <PettyCashSortableHeader columnKey="date" label={copy.financial.movements.columns.date} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                    <PettyCashSortableHeader columnKey="fund" label={copy.financial.movements.columns.fund} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                    <PettyCashSortableHeader columnKey="type" label={copy.financial.movements.columns.type} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                    <PettyCashSortableHeader columnKey="source" label={copy.financial.movements.columns.source} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                    <PettyCashSortableHeader columnKey="target" label={copy.financial.movements.columns.target} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                    <PettyCashSortableHeader columnKey="amount" label={copy.financial.movements.columns.amount} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                    <PettyCashSortableHeader columnKey="reference" label={copy.financial.movements.columns.reference} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {movementPagination.paginatedRows.map((movement) => {
                    const fund = getFundById(funds, movement.pettyCashFundId);
                    return (
                      <tr key={movement.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                        <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{formatPettyCashIsoDate(movement.movementDate)}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">{fund?.name ?? copy.financial.movements.noFund}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{copy.status.movement[movement.type]}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{movement.fromPaymentAccountName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{movement.toPaymentAccountName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{getPettyCashMethodLabel(copy.funds.methodLabels, movement.reference)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PettyCashPagination
              currentPage={movementPagination.currentPage}
              itemLabel={copy.financial.movements.itemLabel}
              onPageChange={movementPagination.onPageChange}
              onPageSizeChange={movementPagination.onPageSizeChange}
              pageEnd={movementPagination.pageEnd}
              pageSize={movementPagination.pageSize}
              pageSizeOptions={movementPagination.pageSizeOptions}
              pageStart={movementPagination.pageStart}
              totalCount={movementPagination.totalCount}
              totalPages={movementPagination.totalPages}
            />
          </>
        ) : (
          <div className="p-5">
            <PettyCashEmptyState label={copy.financial.movements.empty} />
          </div>
        )}
      </section>
    </div>
  );
}

function KpiDecisionCard({
  description,
  helper,
  icon: Icon,
  onClick,
  progress,
  title,
  tone,
  value,
}: {
  description: string;
  helper: string;
  icon: LucideIcon;
  onClick?: () => void;
  progress?: number;
  title: string;
  tone: KpiTone;
  value: string;
}) {
  const styles = toneStyles[tone];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-[#147514] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{title}</p>
            <p className={`mt-2 text-3xl font-medium tracking-tight ${styles.value}`}>{value}</p>
          </div>
        </div>
        {onClick ? (
          <button type="button" aria-label={title} onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/40 ${styles.badge}`}>{styles.label}</button>
        ) : (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${styles.badge}`}>{styles.label}</span>
        )}
      </div>
      {progress !== undefined ? (
        <div className="mt-5 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${clampPercent(progress)}%` }} />
          </div>
          <span className="w-10 text-right text-sm font-medium text-slate-800 dark:text-slate-100">{Math.round(clampPercent(progress))}%</span>
        </div>
      ) : null}
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{helper}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

function SectionCard({
  children,
  icon,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RiskBox({ label, tone, value }: { label: string; tone: KpiTone; value: string }) {
  const styles = toneStyles[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-medium ${styles.value}`}>{value}</p>
    </div>
  );
}

function RankingCard({
  maxValue,
  rows,
  title,
  valueCurrency,
}: {
  maxValue: number;
  rows: Array<{ detail: string; label: string; secondary: string; value: number }>;
  title: string;
  valueCurrency: string;
}) {
  return (
    <SectionCard icon={<Gauge className="h-5 w-5" />} subtitle={`Concentracion de gasto comprobado en ${valueCurrency}.`} title={title}>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{row.label}</p>
                  <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{row.detail}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-[#147514]">{formatPettyCashCurrency(row.value, valueCurrency)}</p>
                <p className="text-xs font-medium text-amber-600">{row.secondary}</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-[#59C3A5]" style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <PettyCashEmptyState label="No hay informacion disponible." /> : null}
      </div>
    </SectionCard>
  );
}
