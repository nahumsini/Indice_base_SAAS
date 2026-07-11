import { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  PieChart,
  Printer,
  WalletCards,
} from 'lucide-react';
import type { Expense } from '../types/expenses.types';
import type { PeriodFilter } from '../types/expenseView.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import type { FinancialOverviewCostDriverType } from '../types/financial-overview.types';
import { useKpisResolvedLocale, useKpisTranslations } from './hooks/useKpisTranslations';
import { formatKpiPercent } from './kpiUtils';
import {
  BudgetHealthTable,
  CashRequirementGrid,
  CostDriverList,
  FinancialStatusBar,
  KpiEmptyState,
  KpiPanel,
  OverviewMetric,
} from '../components/kpis/KpiPanelParts';
import {
  ConcentrationRiskList,
  ExecutiveSignalList,
  FinancialSummaryCard,
} from '../components/kpis/FinancialExecutiveSections';
import { FinancialOverviewPeriodFilter } from '../components/kpis/FinancialOverviewPeriodFilter';
import { downloadFinancialOverviewPdf } from './financialOverviewPdf';
import { useFinancialOverview } from './useFinancialOverview';
import { useCurrencyAwareMoney } from '../../shared/useCurrencyAwareMoney';

interface GastosKPIPageProps {
  expenses: Expense[];
  providers: ProviderRecord[];
  refreshKey?: number;
}

const buildInsight = ({
  available,
  overdueAmount,
  pendingPayments,
  planned,
  text,
}: {
  available: number;
  overdueAmount: number;
  pendingPayments: number;
  planned: number;
  text: ReturnType<typeof useKpisTranslations>['kpis']['insights'];
}) => {
  if (planned <= 0 && pendingPayments <= 0) {
    return text.noData;
  }

  if (overdueAmount > 0) {
    return text.overdue;
  }

  if (planned > 0 && available < planned * 0.2) {
    return text.limit;
  }

  return text.stable;
};

const LoadingOverview = () => (
  <div className="space-y-5">
    <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 xl:col-span-2" />
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>
  </div>
);

export default function GastosKPIPage({ expenses, providers, refreshKey = 0 }: GastosKPIPageProps) {
  const t = useKpisTranslations();
  const locale = useKpisResolvedLocale();
  const { convertToPreferred, formatPreferred, preferredCurrency, rateContext } = useCurrencyAwareMoney();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const overview = useFinancialOverview({
    alertCopy: t.kpis.alertCopy,
    customEndDate,
    customStartDate,
    fallbackExpenses: expenses,
    fallbackProviders: providers,
    locale,
    periodFilter,
    refreshKey,
  });
  const { currency, metrics } = overview;
  const displayMoney = (amount: number) => formatPreferred(amount, currency);
  const consumed = Math.max(metrics.planned - metrics.available, 0);
  const utilization = metrics.planned > 0 ? (consumed / metrics.planned) * 100 : 0;
  const hasAnyData = metrics.expenseCount > 0 || metrics.budgetLineCount > 0;
  const driverSections = [
    {
      drivers: overview.costDrivers.PROVIDER.map((driver) => ({ ...driver, currency: preferredCurrency, total: convertToPreferred(driver.total, driver.currency) })),
      emptyMessage: t.kpis.noProviderExpenses,
      title: t.kpis.topCostDrivers.providers,
    },
    {
      drivers: overview.costDrivers.ACCOUNTING_ACCOUNT.map((driver) => ({ ...driver, currency: preferredCurrency, total: convertToPreferred(driver.total, driver.currency) })),
      emptyMessage: t.kpis.noAccountingAccountExpenses,
      title: t.kpis.topCostDrivers.accountingAccounts,
    },
    {
      drivers: overview.costDrivers.UNIT.map((driver) => ({ ...driver, currency: preferredCurrency, total: convertToPreferred(driver.total, driver.currency) })),
      emptyMessage: t.kpis.noUnitExpenses,
      title: t.kpis.topCostDrivers.units,
    },
    {
      drivers: overview.costDrivers.BUSINESS.map((driver) => ({ ...driver, currency: preferredCurrency, total: convertToPreferred(driver.total, driver.currency) })),
      emptyMessage: t.kpis.noBusinessExpenses,
      title: t.kpis.topCostDrivers.businesses,
    },
  ];
  const driverTypeLabels: Record<FinancialOverviewCostDriverType, string> = {
    ACCOUNTING_ACCOUNT: t.kpis.costDrivers.accountingAccounts,
    BUSINESS: t.kpis.costDrivers.businesses,
    PAYMENT_ACCOUNT: t.kpis.costDrivers.paymentAccounts,
    PROVIDER: t.kpis.costDrivers.providers,
    UNIT: t.kpis.costDrivers.units,
  };
  const cashRequirements = overview.cashRequirements.map(item => ({
    ...item,
    amount: convertToPreferred(item.amount, currency),
    description: t.kpis.cashRequirementCopy[item.id]?.description ?? item.description,
    label: t.kpis.cashRequirementCopy[item.id]?.label ?? item.label,
  }));
  const preferredBudgetHealthRows = overview.budgetHealthRows.map((row) => ({
    ...row,
    actual: convertToPreferred(row.actual, row.currency),
    available: convertToPreferred(row.available, row.currency),
    committed: convertToPreferred(row.committed, row.currency),
    currency: preferredCurrency,
    planned: convertToPreferred(row.planned, row.currency),
  }));
  const preferredConcentrationRisks = overview.concentrationRisks.map((risk) => ({
    ...risk,
    total: convertToPreferred(risk.total, currency),
  }));
  const budgetHealthLabels = {
    actual: t.kpis.actual,
    available: t.kpis.available,
    committed: t.kpis.committed,
    consumption: t.kpis.consumption,
    empty: t.budgets.messages.emptyMessage,
    health: t.budgets.health,
    line: t.kpis.budgetLine,
    planned: t.kpis.planned,
    used: t.kpis.used,
  };
  const translatedHealthLabels = {
    EXCEEDED: t.kpis.healthLabels.exceeded,
    ON_TRACK: t.kpis.healthLabels.onTrack,
    WARNING: t.kpis.healthLabels.warning,
  };
  const periodLabel = periodFilter === 'custom'
    ? `${customStartDate || '...'} - ${customEndDate || '...'}`
    : {
      custom: t.periods.custom,
      last_month: t.periods.lastMonth,
      last_year: t.periods.lastYear,
      this_month: t.periods.thisMonth,
      this_year: t.periods.thisYear,
      two_months_ago: t.periods.twoMonthsAgo,
    }[periodFilter];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#147514]/20 bg-[#147514]/10 p-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-3xl sm:text-4xl">📊</span>
            <div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{t.kpis.headerTitle}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                {t.kpis.headerSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={overview.isLoading}
            onClick={() => downloadFinancialOverviewPdf({ copy: t, locale, overview, periodLabel })}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#147514]/20 bg-white px-4 text-sm font-bold text-[#147514] shadow-sm transition hover:bg-[#147514]/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/20 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-400/10 sm:w-fit"
          >
            <Printer className="h-4 w-4" />
            {t.kpis.printPdf}
          </button>
        </div>
      </section>

      <FinancialOverviewPeriodFilter
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        periodFilter={periodFilter}
        resultCount={metrics.expenseCount + metrics.budgetLineCount}
        text={t}
        onCustomEndDateChange={setCustomEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onPeriodFilterChange={setPeriodFilter}
      />

      {overview.isLoading ? <LoadingOverview /> : null}

      {!overview.isLoading && !hasAnyData ? (
        <KpiEmptyState message={t.kpis.empty} />
      ) : null}

      {!overview.isLoading && hasAnyData ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-x-4 gap-y-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                <OverviewMetric icon={<CircleDollarSign className="h-4 w-4" />} label={t.kpis.planned} value={displayMoney(metrics.planned)} />
                <OverviewMetric icon={<ClipboardList className="h-4 w-4" />} label={t.kpis.committed} value={displayMoney(metrics.committed)} valueClassName="text-blue-600 dark:text-blue-300" />
                <OverviewMetric icon={<Gauge className="h-4 w-4" />} label={t.kpis.actual} value={displayMoney(metrics.actual)} helper={overview.metrics.actualFallbackUsed ? t.kpis.fallback : undefined} valueClassName="text-[#147514] dark:text-emerald-300" />
                <OverviewMetric icon={<Banknote className="h-4 w-4" />} label={t.kpis.available} value={displayMoney(metrics.available)} valueClassName={metrics.available < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-[#147514] dark:text-emerald-300'} />
                <OverviewMetric icon={<WalletCards className="h-4 w-4" />} label={t.kpis.pending} value={displayMoney(metrics.pendingPayments)} valueClassName="text-amber-600 dark:text-amber-300" />
                <OverviewMetric icon={<AlertTriangle className="h-4 w-4" />} label={t.kpis.overdue} value={displayMoney(metrics.overdueAmount)} valueClassName="text-rose-600 dark:text-rose-300" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                <span className="rounded-full border border-[#59C3A5]/25 bg-[#E7F3F2] px-3 py-1 text-[#257B68] dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]">Totales en {preferredCurrency}</span>
                <span>{rateContext.label} · {rateContext.effectiveDate}</span>
                {currency !== preferredCurrency ? <span>Moneda nativa analizada: {currency}</span> : null}
              </div>
              <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {formatKpiPercent(utilization)} {t.kpis.used}
              </span>
            </div>

            <FinancialStatusBar
              segments={[
                { colorClassName: 'bg-[#147514]', label: t.kpis.actual, value: metrics.actual },
                { colorClassName: 'bg-blue-500', label: t.kpis.committed, value: metrics.committed },
                { colorClassName: 'bg-emerald-300', label: t.kpis.available, value: Math.max(metrics.available, 0) },
                { colorClassName: 'bg-rose-500', label: t.kpis.overdue, value: metrics.overdueAmount },
              ]}
            />

            <div className="mt-4 rounded-lg border border-[#147514]/20 bg-[#147514]/5 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {buildInsight({ ...metrics, text: t.kpis.insights })}
              </p>
            </div>

            {overview.errorMessage || overview.fallbackWarnings.length > 0 ? (
              <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {t.kpis.dataFallback(overview.fallbackWarnings.join(', ') || t.kpis.fallbackService)}
              </p>
            ) : null}
          </section>

          <KpiPanel icon={<AlertTriangle className="h-5 w-5" />} title={t.kpis.executiveSignal}>
            <ExecutiveSignalList alerts={overview.alerts} />
          </KpiPanel>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <KpiPanel icon={<BarChart3 className="h-5 w-5" />} title={t.kpis.budgetHealth}>
                <BudgetHealthTable currency={preferredCurrency} healthLabels={translatedHealthLabels} labels={budgetHealthLabels} locale={locale} rows={preferredBudgetHealthRows} />
              </KpiPanel>
            </div>

            <KpiPanel icon={<CalendarClock className="h-5 w-5" />} title={t.kpis.cashRequirements}>
              <CashRequirementGrid countLabel={t.kpis.countLabel} currency={preferredCurrency} items={cashRequirements} locale={locale} />
            </KpiPanel>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <KpiPanel icon={<ClipboardList className="h-5 w-5" />} title={t.kpis.financialSummary}>
              <FinancialSummaryCard budgetHealthRows={overview.budgetHealthRows} concentrationRisks={overview.concentrationRisks} copy={t.kpis.summaryCopy} metrics={metrics} />
            </KpiPanel>

            <KpiPanel icon={<AlertTriangle className="h-5 w-5" />} title={t.kpis.concentrationRisk}>
              <ConcentrationRiskList currency={preferredCurrency} emptyMessage={t.kpis.insights.stable} labels={driverTypeLabels} locale={locale} risks={preferredConcentrationRisks} />
            </KpiPanel>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {driverSections.map(section => (
              <KpiPanel key={section.title} icon={<PieChart className="h-5 w-5" />} title={section.title}>
                <CostDriverList currency={preferredCurrency} drivers={section.drivers} emptyMessage={section.emptyMessage} locale={locale} recordsLabel={t.kpis.records} />
              </KpiPanel>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
