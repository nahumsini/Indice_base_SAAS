import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  Paperclip,
  Printer,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../hooks/useTablePagination';
import type { Expense } from '../types/expenses.types';
import type { PeriodFilter } from '../types/expenseView.types';
import type { FinanceExpense } from '../types/finance-domain.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { useKpisResolvedLocale, useKpisTranslations } from './hooks/useKpisTranslations';
import { downloadFinancialOverviewPdf } from './financialOverviewPdf';
import { useFinancialOverview } from './useFinancialOverview';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  useKpiMonetaryAggregate,
  useKpiMonetaryAggregates,
  type KpiMonetaryAggregate,
  type KpiMonetaryBatchQuery,
} from '../../shared/kpiMonetaryApi';
import { getOperationalKpiCurrencyCopy, OperationalKpiCurrencyStrip } from '../../shared/operational';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterField,
  IndiceFilterSelect,
  IndiceTitleBar,
  getIndiceFilterControlClassName,
} from '../../../components/frontend-os';
import { BudgetHealthStatus } from '../types/finance-status.types';
import type {
  FinancialOverviewBudgetHealthRow,
  FinancialOverviewCostDriver,
  FinancialOverviewCostDriverType,
  FinancialOverviewDataSet,
} from '../types/financial-overview.types';

interface GastosKPIPageProps {
  expenses: Expense[];
  providers: ProviderRecord[];
  refreshKey?: number;
}

type Tone = 'critical' | 'healthy' | 'review';
type RankingRole = 'approved' | 'performed' | 'requested';

type KpiWorkspaceState = {
  accountingAccountId: string;
  businessId: string;
  customEndDate: string;
  customStartDate: string;
  paymentStatus: string;
  periodFilter: PeriodFilter;
  providerId: string;
  rankingCurrentPage: number;
  rankingPageSize: number;
  rankingRole: RankingRole;
  unitId: string;
};

const kpiWorkspaceDefaults: KpiWorkspaceState = {
  accountingAccountId: 'all',
  businessId: 'all',
  customEndDate: '',
  customStartDate: '',
  paymentStatus: 'all',
  periodFilter: 'this_month',
  providerId: 'all',
  rankingCurrentPage: 1,
  rankingPageSize: 10,
  rankingRole: 'requested',
  unitId: 'all',
};

const kpiWorkspaceUrlFields: Partial<Record<keyof KpiWorkspaceState, string>> = {
  accountingAccountId: 'kpi_account',
  businessId: 'kpi_business',
  customEndDate: 'kpi_end',
  customStartDate: 'kpi_start',
  paymentStatus: 'kpi_status',
  periodFilter: 'kpi_period',
  providerId: 'kpi_provider',
  rankingCurrentPage: 'kpi_page',
  rankingPageSize: 'kpi_rows',
  rankingRole: 'kpi_rank',
  unitId: 'kpi_unit',
};

const toneStyles: Record<Tone, { badge: string; bar: string }> = {
  critical: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
  healthy: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  review: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

const percentageChange = (current: number, previous: number, locale: string) => {
  const isSpanish = locale.toLowerCase().startsWith('es');
  if (previous === 0) return current === 0
    ? (isSpanish ? 'Sin cambio frente al periodo anterior' : 'No change from the previous period')
    : (isSpanish ? 'Sin base comparable anterior' : 'No comparable previous baseline');
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(0)}% ${isSpanish ? 'frente al periodo anterior' : 'from the previous period'}`;
};

function MetricCard({
  actionLabel,
  description,
  helper,
  icon,
  onAction,
  progress,
  title,
  tone,
  toneLabel,
  value,
}: {
  actionLabel?: string;
  description: string;
  helper: string;
  icon: ReactNode;
  onAction?: () => void;
  progress?: number;
  title: string;
  tone: Tone;
  toneLabel: string;
  value: string;
}) {
  const styles = toneStyles[tone];
  return (
    <article className="flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {icon}
          </span>
          <h3 className="pt-1 text-sm font-medium leading-5 text-slate-600 dark:text-slate-200">{title}</h3>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${styles.badge}`}>{toneLabel}</span>
      </div>
      <p className="mt-3 pl-14 text-3xl font-medium tracking-tight text-slate-950 dark:text-white">{value}</p>
      {typeof progress === 'number' ? <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${clampPercent(progress)}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-200">{Math.round(clampPercent(progress))}%</span>
      </div> : null}
      <p className="mt-5 text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-auto pt-4 text-left text-xs font-medium text-[#147514] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514]/30 dark:text-emerald-300"
        >
          {actionLabel ?? title}
        </button>
      ) : null}
    </article>
  );
}

function SectionCard({ children, icon, subtitle, title }: { children: ReactNode; icon: ReactNode; subtitle: string; title: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <span className="text-emerald-500">{icon}</span>
      </div>
      {children}
    </section>
  );
}

const rankTone = (score: number): Tone => score >= 80 ? 'healthy' : score >= 55 ? 'review' : 'critical';

const getBudgetLineNumericId = (id: string) => {
  const candidate = /^budget-line-(\d+)$/.exec(id)?.[1] ?? id;
  const numericId = Number(candidate);
  return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
};

export default function GastosKPIPage({ expenses, providers, refreshKey = 0 }: GastosKPIPageProps) {
  const t = useKpisTranslations();
  const locale = useKpisResolvedLocale();
  const currencyCopy = getOperationalKpiCurrencyCopy(locale);
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [unitId, setUnitId] = useState('all');
  const [businessId, setBusinessId] = useState('all');
  const [providerId, setProviderId] = useState('all');
  const [accountingAccountId, setAccountingAccountId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [rankingRole, setRankingRole] = useState<RankingRole>('requested');
  const [rankingCurrentPage, setRankingCurrentPage] = useState(1);
  const [rankingPageSize, setRankingPageSize] = useState(10);
  const workspaceState = useMemo<KpiWorkspaceState>(() => ({
    accountingAccountId,
    businessId,
    customEndDate,
    customStartDate,
    paymentStatus,
    periodFilter,
    providerId,
    rankingCurrentPage,
    rankingPageSize,
    rankingRole,
    unitId,
  }), [
    accountingAccountId,
    businessId,
    customEndDate,
    customStartDate,
    paymentStatus,
    periodFilter,
    providerId,
    rankingCurrentPage,
    rankingPageSize,
    rankingRole,
    unitId,
  ]);
  const restoreWorkspaceState = useCallback((restoredState: KpiWorkspaceState) => {
    setAccountingAccountId(restoredState.accountingAccountId);
    setBusinessId(restoredState.businessId);
    setCustomEndDate(restoredState.customEndDate);
    setCustomStartDate(restoredState.customStartDate);
    setPaymentStatus(restoredState.paymentStatus);
    setPeriodFilter(restoredState.periodFilter);
    setProviderId(restoredState.providerId);
    setRankingCurrentPage(restoredState.rankingCurrentPage);
    setRankingPageSize(restoredState.rankingPageSize);
    setRankingRole(restoredState.rankingRole);
    setUnitId(restoredState.unitId);
  }, []);
  const handleRankingPaginationChange = useCallback((nextState: { currentPage: number; pageSize: number }) => {
    setRankingCurrentPage(nextState.currentPage);
    setRankingPageSize(nextState.pageSize);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'kpis',
    state: workspaceState,
    defaults: kpiWorkspaceDefaults,
    urlFields: kpiWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
  });

  const overview = useFinancialOverview({
    accountingAccountId,
    alertCopy: t.kpis.alertCopy,
    businessId,
    customEndDate,
    customStartDate,
    fallbackExpenses: expenses,
    fallbackProviders: providers,
    locale,
    paymentStatus,
    periodFilter,
    providerId,
    refreshKey,
    unitId,
  });
  const { sources } = overview;
  const displayMoney = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: preferredCurrency }).format(amount);
  const asLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const periodFrom = asLocalDate(overview.periodRange.start);
  const periodTo = asLocalDate(overview.periodRange.end);
  const paymentIds = overview.paymentExpenses.map((expense) => expense.id);
  const filteredIds = overview.filteredExpenses.map((expense) => expense.id);
  const comparisonIds = overview.comparisonExpenses.map((expense) => expense.id);
  const totalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TOTAL', preferredCurrency, ids: filteredIds });
  const paidAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_PAID', preferredCurrency, ids: paymentIds, from: periodFrom, to: periodTo });
  const cohortPaidAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_PAID_TO_DATE', preferredCurrency, ids: filteredIds });
  const balanceAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency, ids: filteredIds });
  const overdueAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids: filteredIds });
  const previousTotalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TOTAL', preferredCurrency, ids: comparisonIds });
  const previousPaidAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_PAID', preferredCurrency, ids: paymentIds, from: asLocalDate(overview.comparisonRange.start), to: asLocalDate(overview.comparisonRange.end) });
  const previousBalanceAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency, ids: comparisonIds });
  const previousOverdueAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids: comparisonIds });
  const subtotalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_SUBTOTAL', preferredCurrency, ids: filteredIds });
  const taxAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TAX', preferredCurrency, ids: filteredIds });
  const allBudgetLineIds = overview.filteredBudgetLines
    .map((row) => getBudgetLineNumericId(row.id))
    .filter((id): id is number => id !== null);
  const plannedBudgetAggregate = useKpiMonetaryAggregate({ metric: 'BUDGET_PLANNED', preferredCurrency, ids: allBudgetLineIds });
  const committedBudgetAggregate = useKpiMonetaryAggregate({ metric: 'BUDGET_COMMITTED', preferredCurrency, ids: allBudgetLineIds });
  const actualBudgetAggregate = useKpiMonetaryAggregate({ metric: 'BUDGET_ACTUAL', preferredCurrency, ids: allBudgetLineIds });
  const availableBudgetAggregate = useKpiMonetaryAggregate({ metric: 'BUDGET_AVAILABLE', preferredCurrency, ids: allBudgetLineIds });
  const totalManaged = totalAggregate.data?.preferredTotal ?? 0;
  const totalPaid = paidAggregate.data?.preferredTotal ?? 0;
  const pendingPayments = balanceAggregate.data?.preferredTotal ?? 0;
  const overdueAmount = overdueAggregate.data?.preferredTotal ?? 0;
  const previousManaged = previousTotalAggregate.data?.preferredTotal ?? 0;
  const previousPaid = previousPaidAggregate.data?.preferredTotal ?? 0;
  const plannedBudget = plannedBudgetAggregate.data?.preferredTotal ?? 0;
  const committedBudget = committedBudgetAggregate.data?.preferredTotal ?? 0;
  const actualBudget = actualBudgetAggregate.data?.preferredTotal ?? 0;
  const availableBudget = availableBudgetAggregate.data?.preferredTotal ?? 0;
  const paymentCompliance = totalManaged > 0 ? ((cohortPaidAggregate.data?.preferredTotal ?? 0) / totalManaged) * 100 : 0;
  const budgetConsumption = plannedBudget > 0 ? (actualBudget / plannedBudget) * 100 : 0;
  const overdueRisk = totalManaged > 0 ? (overdueAmount / totalManaged) * 100 : 0;
  const evidenceCount = overview.filteredExpenses.filter(expense => (expense.attachmentCount ?? expense.attachments.length) > 0).length;
  const expenseCount = overview.filteredExpenses.length;
  const budgetLineCount = overview.filteredBudgetLines.length;
  const evidenceCoverage = expenseCount > 0 ? (evidenceCount / expenseCount) * 100 : 0;
  const healthScore = Math.round(clampPercent((paymentCompliance * 0.45) + ((100 - overdueRisk) * 0.35) + (evidenceCoverage * 0.2)));
  const punctuality = useMemo(() => {
    const completedWithDueDate = overview.filteredExpenses.filter(expense => expense.paidDate && expense.dueDate && (expense.paymentStatus === 'PAID' || expense.status === 'CLOSED'));
    const onTime = completedWithDueDate.filter(expense => new Date(expense.paidDate!).getTime() <= new Date(expense.dueDate!).getTime()).length;
    return { count: completedWithDueDate.length, onTime, percent: completedWithDueDate.length > 0 ? (onTime / completedWithDueDate.length) * 100 : 0 };
  }, [overview.filteredExpenses]);

  const periodOptions = [
    { label: t.periods.thisMonth, value: 'this_month' },
    { label: t.periods.lastMonth, value: 'last_month' },
    { label: t.periods.twoMonthsAgo, value: 'two_months_ago' },
    { label: t.periods.thisYear, value: 'this_year' },
    { label: t.periods.lastYear, value: 'last_year' },
    { label: t.periods.custom, value: 'custom' },
  ];
  const allOption = { label: t.common.all, value: 'all' };
  const activeBusinesses = unitId === 'all' ? sources.referenceData.businesses : sources.referenceData.businesses.filter(item => item.unitId === unitId);
  const monetaryGroups = useMemo(() => {
    const byStatus = new Map<string, FinanceExpense[]>();
    const byDate = new Map<string, FinanceExpense[]>();
    const byUnit = new Map<string, FinanceExpense[]>();
    const byRankingUser = new Map<string, FinanceExpense[]>();
    const byAging = new Map<string, FinanceExpense[]>();
    const byForecast = new Map<string, FinanceExpense[]>();
    const byProvider = new Map<string, FinanceExpense[]>();
    const byAccountingAccount = new Map<string, FinanceExpense[]>();
    const byBusiness = new Map<string, FinanceExpense[]>();
    const byPaymentAccount = new Map<string, FinanceExpense[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    overview.filteredExpenses.forEach((expense) => {
      byStatus.set(expense.paymentStatus, [...(byStatus.get(expense.paymentStatus) ?? []), expense]);
      const date = expense.expenseDate.slice(0, 10);
      byDate.set(date, [...(byDate.get(date) ?? []), expense]);
      const unit = expense.unitId ?? 'unassigned';
      byUnit.set(unit, [...(byUnit.get(unit) ?? []), expense]);
      const provider = expense.providerId ?? 'missing-provider';
      byProvider.set(provider, [...(byProvider.get(provider) ?? []), expense]);
      const accountingAccount = expense.accountingAccountId ?? 'missing-account';
      byAccountingAccount.set(accountingAccount, [...(byAccountingAccount.get(accountingAccount) ?? []), expense]);
      const business = expense.businessId ?? 'missing-business';
      byBusiness.set(business, [...(byBusiness.get(business) ?? []), expense]);
      const paymentAccount = expense.paymentAccountId ?? 'missing-payment-account';
      byPaymentAccount.set(paymentAccount, [...(byPaymentAccount.get(paymentAccount) ?? []), expense]);
      const user = rankingRole === 'approved'
        ? expense.approvedByUserId ?? expense.approvedBy ?? 'unassigned'
        : rankingRole === 'performed'
          ? expense.performedByUserId ?? expense.performedBy ?? 'unassigned'
          : expense.requestedByUserId ?? expense.requestedBy ?? 'unassigned';
      byRankingUser.set(user, [...(byRankingUser.get(user) ?? []), expense]);
      if (expense.balance > 0) {
        if (!expense.dueDate) {
          byAging.set('none', [...(byAging.get('none') ?? []), expense]);
        } else {
          const due = new Date(`${expense.dueDate.slice(0, 10)}T00:00:00`);
          const pastDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
          const agingKey = pastDays <= 0 ? 'future' : pastDays <= 30 ? '1-30' : pastDays <= 60 ? '31-60' : pastDays <= 90 ? '61-90' : '91+';
          byAging.set(agingKey, [...(byAging.get(agingKey) ?? []), expense]);
          const futureDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
          if (futureDays >= 0) [7, 15, 30, 60].forEach((days) => {
            if (futureDays <= days) byForecast.set(String(days), [...(byForecast.get(String(days)) ?? []), expense]);
          });
        }
      }
    });
    const topDates: string[] = [];
    const lastDay = new Date(Math.min(overview.periodRange.end.getTime(), today.getTime()));
    for (let day = new Date(lastDay); day >= overview.periodRange.start && topDates.length < 14; day.setDate(day.getDate() - 1)) {
      topDates.unshift(asLocalDate(day));
    }
    const topUnits = Array.from(byUnit.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    const topUsers = Array.from(byRankingUser.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    return {
      byAccountingAccount,
      byAging,
      byBusiness,
      byDate,
      byForecast,
      byPaymentAccount,
      byProvider,
      byRankingUser,
      byStatus,
      byUnit,
      topDates,
      topUnits,
      topUsers,
    };
  }, [overview.filteredExpenses, overview.periodRange, rankingRole]);
  const groupQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const queries: KpiMonetaryBatchQuery[] = [];
    monetaryGroups.byStatus.forEach((rows, status) => queries.push({ key: `status-${status}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.topDates.forEach((date) => {
      const ids = (monetaryGroups.byDate.get(date) ?? []).map((row) => row.id);
      queries.push({ key: `date-total-${date}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids });
      queries.push({ key: `date-paid-${date}`, metric: 'EXPENSE_PAID', preferredCurrency, ids: paymentIds, from: date, to: date });
    });
    monetaryGroups.topUnits.forEach(([unit, rows]) => queries.push({ key: `unit-${unit}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.topUsers.forEach(([user, rows]) => {
      const ids = rows.map((row) => row.id);
      queries.push({ key: `user-total-${user}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids });
      queries.push({ key: `user-paid-${user}`, metric: 'EXPENSE_PAID_TO_DATE', preferredCurrency, ids });
      queries.push({ key: `user-overdue-${user}`, metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids });
    });
    monetaryGroups.byAging.forEach((rows, bucket) => queries.push({ key: `aging-${bucket}`, metric: 'EXPENSE_BALANCE', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.byForecast.forEach((rows, bucket) => queries.push({ key: `forecast-${bucket}`, metric: 'EXPENSE_BALANCE', preferredCurrency, ids: rows.map((row) => row.id) }));
    return queries.slice(0, 100);
  }, [monetaryGroups, preferredCurrency, paymentIds]);
  const groupAggregates = useKpiMonetaryAggregates(groupQueries);

  const driverGroups = useMemo(() => ({
    ACCOUNTING_ACCOUNT: Array.from(monetaryGroups.byAccountingAccount.entries()).sort((left, right) => right[1].length - left[1].length).slice(0, 20),
    BUSINESS: Array.from(monetaryGroups.byBusiness.entries()).sort((left, right) => right[1].length - left[1].length).slice(0, 20),
    PAYMENT_ACCOUNT: Array.from(monetaryGroups.byPaymentAccount.entries()).sort((left, right) => right[1].length - left[1].length).slice(0, 20),
    PROVIDER: Array.from(monetaryGroups.byProvider.entries()).sort((left, right) => right[1].length - left[1].length).slice(0, 20),
    UNIT: Array.from(monetaryGroups.byUnit.entries()).sort((left, right) => right[1].length - left[1].length).slice(0, 20),
  }), [monetaryGroups.byAccountingAccount, monetaryGroups.byBusiness, monetaryGroups.byPaymentAccount, monetaryGroups.byProvider, monetaryGroups.byUnit]);
  const driverQueries = useMemo<KpiMonetaryBatchQuery[]>(() => (
    (Object.entries(driverGroups) as Array<[keyof typeof driverGroups, Array<[string, FinanceExpense[]]>]>).flatMap(([type, groups]) => (
      groups.map(([id, rows]) => ({
        key: `driver-${type}-${id}`,
        metric: 'EXPENSE_TOTAL' as const,
        preferredCurrency,
        ids: rows.map((row) => row.id),
      }))
    ))
  ), [driverGroups, preferredCurrency]);
  const driverAggregates = useKpiMonetaryAggregates(driverQueries);
  const driverNameMaps = useMemo(() => ({
    ACCOUNTING_ACCOUNT: new Map(sources.accountingAccounts.map((item) => [item.id, `${item.code} · ${item.name}`])),
    BUSINESS: new Map(sources.referenceData.businesses.map((item) => [item.id, item.name])),
    PAYMENT_ACCOUNT: new Map(sources.paymentAccounts.map((item) => [item.id, item.name])),
    PROVIDER: new Map(sources.providers.map((item) => [item.id, item.name])),
    UNIT: new Map(sources.referenceData.units.map((item) => [item.id, item.name])),
  }), [sources.accountingAccounts, sources.paymentAccounts, sources.providers, sources.referenceData.businesses, sources.referenceData.units]);
  const driverRows = useMemo<Record<FinancialOverviewCostDriverType, FinancialOverviewCostDriver[]>>(() => (
    Object.fromEntries((Object.entries(driverGroups) as Array<[FinancialOverviewCostDriverType, Array<[string, FinanceExpense[]]>]>).map(([type, groups]) => [
      type,
      groups.map(([id, rows]) => {
        const total = driverAggregates.data[`driver-${type}-${id}`]?.preferredTotal ?? 0;
        return {
          count: rows.length,
          currency: preferredCurrency,
          driverType: type,
          id,
          name: driverNameMaps[type].get(id) ?? t.common.unassigned,
          percentage: totalManaged > 0 ? (total / totalManaged) * 100 : 0,
          total,
        };
      }).filter((row) => row.total > 0).sort((left, right) => right.total - left.total),
    ])) as Record<FinancialOverviewCostDriverType, FinancialOverviewCostDriver[]>
  ), [driverAggregates.data, driverGroups, driverNameMaps, preferredCurrency, t.common.unassigned, totalManaged]);

  const visibleBudgetLines = overview.filteredBudgetLines.slice(0, 25);
  const budgetLineQueries = useMemo<KpiMonetaryBatchQuery[]>(() => visibleBudgetLines.flatMap((row) => {
    const id = getBudgetLineNumericId(row.id);
    if (id === null) return [];
    return [
      { key: `budget-planned-${row.id}`, metric: 'BUDGET_PLANNED', preferredCurrency, ids: [id] },
      { key: `budget-committed-${row.id}`, metric: 'BUDGET_COMMITTED', preferredCurrency, ids: [id] },
      { key: `budget-actual-${row.id}`, metric: 'BUDGET_ACTUAL', preferredCurrency, ids: [id] },
      { key: `budget-available-${row.id}`, metric: 'BUDGET_AVAILABLE', preferredCurrency, ids: [id] },
    ] satisfies KpiMonetaryBatchQuery[];
  }), [preferredCurrency, visibleBudgetLines]);
  const budgetLineAggregates = useKpiMonetaryAggregates(budgetLineQueries);

  const paymentMix = useMemo(() => {
    const rows = [
      { color: '#147514', key: 'PAID', name: t.statuses.paid, value: 0 },
      { color: '#0ea5e9', key: 'PARTIALLY_PAID', name: t.statuses.partial, value: 0 },
      { color: '#f59e0b', key: 'UNPAID', name: t.statuses.pending, value: 0 },
      { color: '#f43f5e', key: 'OVERDUE', name: t.statuses.overdue, value: 0 },
    ];
    rows.forEach((row) => { row.value = groupAggregates.data[`status-${row.key}`]?.preferredTotal ?? 0; });
    return rows.filter(row => row.value > 0);
  }, [groupAggregates.data, t.statuses.overdue, t.statuses.paid, t.statuses.partial, t.statuses.pending]);

  const trendData = useMemo(() => {
    return monetaryGroups.topDates.map((date) => ({
      amount: groupAggregates.data[`date-total-${date}`]?.preferredTotal ?? 0,
      paid: groupAggregates.data[`date-paid-${date}`]?.preferredTotal ?? 0,
      date: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)),
    }));
  }, [groupAggregates.data, locale, monetaryGroups.topDates]);

  const unitNames = new Map(sources.referenceData.units.map((unit) => [unit.id, unit.name]));
  const unitData = monetaryGroups.topUnits.map(([unit]) => ({ name: unitNames.get(unit) ?? t.common.unassigned, total: groupAggregates.data[`unit-${unit}`]?.preferredTotal ?? 0 }));
  const budgetHealthRows = useMemo<FinancialOverviewBudgetHealthRow[]>(() => visibleBudgetLines.map((row) => {
    const planned = budgetLineAggregates.data[`budget-planned-${row.id}`]?.preferredTotal ?? 0;
    const committed = budgetLineAggregates.data[`budget-committed-${row.id}`]?.preferredTotal ?? 0;
    const actual = budgetLineAggregates.data[`budget-actual-${row.id}`]?.preferredTotal ?? 0;
    const available = budgetLineAggregates.data[`budget-available-${row.id}`]?.preferredTotal ?? 0;
    const healthStatus = available < 0
      ? BudgetHealthStatus.EXCEEDED
      : planned > 0 && available / planned <= 0.2
        ? BudgetHealthStatus.WARNING
        : BudgetHealthStatus.ON_TRACK;
    return {
      actual,
      available,
      budgetId: row.budgetId,
      committed,
      currency: preferredCurrency,
      healthStatus,
      id: row.id,
      name: row.name,
      planned,
      usagePercent: planned > 0 ? (actual / planned) * 100 : 0,
    };
  }).sort((left, right) => right.actual - left.actual), [budgetLineAggregates.data, preferredCurrency, visibleBudgetLines]);
  const budgetData = budgetHealthRows.slice(0, 7).map(row => ({
    actual: row.actual,
    planned: row.planned,
    name: row.name.length > 18 ? `${row.name.slice(0, 16)}…` : row.name,
  }));

  const agingData = useMemo(() => {
    return [
      { color: 'bg-emerald-500', key: 'future', label: 'Por vencer' },
      { color: 'bg-amber-400', key: '1-30', label: '1–30 días' },
      { color: 'bg-orange-500', key: '31-60', label: '31–60 días' },
      { color: 'bg-rose-500', key: '61-90', label: '61–90 días' },
      { color: 'bg-rose-700', key: '91+', label: 'Más de 90' },
      { color: 'bg-slate-400', key: 'none', label: 'Sin vencimiento' },
    ].map((bucket) => ({ ...bucket, total: groupAggregates.data[`aging-${bucket.key}`]?.preferredTotal ?? 0 }));
  }, [groupAggregates.data]);

  const cashForecast = useMemo(() => {
    return [7, 15, 30, 60].map((days) => ({ days, name: `${days} días`, total: groupAggregates.data[`forecast-${days}`]?.preferredTotal ?? 0 }));
  }, [groupAggregates.data]);

  const taxSummary = useMemo(() => {
    const subtotal = subtotalAggregate.data?.preferredTotal ?? 0;
    const taxes = taxAggregate.data?.preferredTotal ?? 0;
    return { effectiveRate: subtotal > 0 ? (taxes / subtotal) * 100 : 0, subtotal, taxes };
  }, [subtotalAggregate.data, taxAggregate.data]);

  const exceptions = useMemo(() => [
    { count: overview.filteredExpenses.filter(expense => (expense.attachmentCount ?? expense.attachments.length) === 0).length, label: 'Sin evidencia', tone: 'critical' as Tone },
    { count: overview.filteredExpenses.filter(expense => !expense.providerId).length, label: 'Sin proveedor', tone: 'review' as Tone },
    { count: overview.filteredExpenses.filter(expense => !expense.accountingAccountId).length, label: 'Sin cuenta contable', tone: 'review' as Tone },
    { count: overview.filteredExpenses.filter(expense => expense.balance > 0 && !expense.dueDate).length, label: 'Sin fecha de vencimiento', tone: 'review' as Tone },
    { count: overview.filteredExpenses.filter(expense => !expense.requestedByUserId && !expense.requestedBy).length, label: 'Sin responsable', tone: 'critical' as Tone },
    { count: overview.filteredExpenses.filter(expense => expense.status === 'PENDING_APPROVAL').length, label: 'Pendientes de aprobación', tone: 'review' as Tone },
    { count: overview.filteredExpenses.filter(expense => expense.auditStatus && expense.auditStatus !== 'AUDITED').length, label: 'Auditoría pendiente', tone: 'review' as Tone },
  ], [overview.filteredExpenses]);

  const rankingRows = useMemo(() => {
    const usersById = new Map(sources.referenceData.users.map(user => [user.id, user.name]));
    const grouped = new Map<string, {
      count: number;
      evidence: number;
      name: string;
      overdue: number;
      paid: number;
      total: number;
    }>();
    overview.filteredExpenses.forEach((expense) => {
      const roleIdentity = rankingRole === 'approved'
        ? { id: expense.approvedByUserId, name: expense.approvedBy }
        : rankingRole === 'performed'
          ? { id: expense.performedByUserId, name: expense.performedBy }
          : { id: expense.requestedByUserId, name: expense.requestedBy };
      const key = roleIdentity.id || roleIdentity.name || 'unassigned';
      const row = grouped.get(key) ?? {
        count: 0,
        evidence: 0,
        name: usersById.get(roleIdentity.id ?? '') || roleIdentity.name || 'Sin responsable',
        overdue: 0,
        paid: 0,
        total: 0,
      };
      row.count += 1;
      row.evidence += (expense.attachmentCount ?? expense.attachments.length) > 0 ? 1 : 0;
      grouped.set(key, row);
    });
    const visibleUserIds = new Set(monetaryGroups.topUsers.map(([id]) => id));
    return Array.from(grouped.entries()).filter(([id]) => visibleUserIds.has(id)).map(([id, row]) => {
      const total = groupAggregates.data[`user-total-${id}`]?.preferredTotal ?? 0;
      const paid = groupAggregates.data[`user-paid-${id}`]?.preferredTotal ?? 0;
      const overdue = groupAggregates.data[`user-overdue-${id}`]?.preferredTotal ?? 0;
      const paidRatio = total > 0 ? paid / total : 0;
      const overdueRatio = total > 0 ? overdue / total : 0;
      const evidenceRatio = row.count > 0 ? row.evidence / row.count : 0;
      return {
        ...row,
        overdue,
        paid,
        total,
        evidenceRatio: evidenceRatio * 100,
        id,
        paymentRatio: paidRatio * 100,
        score: Math.round(clampPercent((paidRatio * 55) + ((1 - overdueRatio) * 25) + (evidenceRatio * 20))),
      };
    }).sort((left, right) => right.score - left.score).map((row, index) => ({ ...row, position: index + 1 }));
  }, [groupAggregates.data, monetaryGroups.topUsers, overview.filteredExpenses, rankingRole, sources.referenceData.users]);

  const pagination = useTablePagination({
    controlledCurrentPage: rankingCurrentPage,
    controlledPageSize: rankingPageSize,
    onPaginationChange: handleRankingPaginationChange,
    rows: rankingRows,
  });
  const aggregateRequests = [
    totalAggregate,
    paidAggregate,
    cohortPaidAggregate,
    balanceAggregate,
    overdueAggregate,
    previousTotalAggregate,
    previousPaidAggregate,
    previousBalanceAggregate,
    previousOverdueAggregate,
    subtotalAggregate,
    taxAggregate,
    plannedBudgetAggregate,
    committedBudgetAggregate,
    actualBudgetAggregate,
    availableBudgetAggregate,
  ];
  const monetaryDataLoading = aggregateRequests.some(request => request.loading)
    || groupAggregates.loading
    || driverAggregates.loading
    || budgetLineAggregates.loading;
  const monetaryDataError = aggregateRequests.some(request => Boolean(request.error))
    || Boolean(groupAggregates.error)
    || Boolean(driverAggregates.error)
    || Boolean(budgetLineAggregates.error);
  const monetaryDataPartial = aggregateRequests.some(request => Boolean(request.data?.partial));
  const displayAggregateMoney = (aggregate: { data: KpiMonetaryAggregate | null; error: Error | null; loading: boolean }) => (
    aggregate.loading || aggregate.error || !aggregate.data ? '—' : displayMoney(aggregate.data.preferredTotal)
  );
  const openExpenseCount = overview.filteredExpenses.filter(expense => expense.paymentStatus !== 'PAID').length;
  const overdueExpenseCount = overview.filteredExpenses.filter(expense => expense.paymentStatus === 'OVERDUE').length;
  const toneLabels: Record<Tone, string> = {
    critical: t.kpis.healthLabels.exceeded,
    healthy: t.kpis.healthLabels.onTrack,
    review: t.kpis.healthLabels.warning,
  };
  const resetFilters = () => {
    setPeriodFilter('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
    setUnitId('all');
    setBusinessId('all');
    setProviderId('all');
    setAccountingAccountId('all');
    setPaymentStatus('all');
    setRankingCurrentPage(1);
    setIsAdvancedFiltersOpen(false);
  };
  const periodLabel = periodFilter === 'custom'
    ? `${customStartDate || '...'} - ${customEndDate || '...'}`
    : periodOptions.find(option => option.value === periodFilter)?.label ?? periodFilter;
  const activeAdvancedFilterCount = Number(providerId !== 'all') + Number(accountingAccountId !== 'all');
  const hasActiveFilters = periodFilter !== 'this_month'
    || unitId !== 'all'
    || businessId !== 'all'
    || paymentStatus !== 'all'
    || activeAdvancedFilterCount > 0;

  const metricCards = [
    { description: 'Valor total de los gastos dentro del alcance seleccionado.', helper: `${expenseCount} movimientos · ${percentageChange(totalManaged, previousManaged, locale)}`, icon: <CircleDollarSign className="h-5 w-5" />, title: 'Gasto gestionado', tone: totalAggregate.loading || totalAggregate.error ? 'review' : totalManaged > 0 ? 'healthy' : 'review', toneLabel: toneLabels[totalAggregate.loading || totalAggregate.error ? 'review' : totalManaged > 0 ? 'healthy' : 'review'], value: displayAggregateMoney(totalAggregate) },
    { actionLabel: `${t.filters.status}: ${t.statuses.paid}`, description: 'Pagos registrados en el período, incluidos gastos capturados antes.', helper: percentageChange(totalPaid, previousPaid, locale), icon: <CheckCircle2 className="h-5 w-5" />, onAction: () => setPaymentStatus('PAID'), progress: paymentCompliance, title: 'Pagado', tone: paidAggregate.loading || paidAggregate.error ? 'review' : paymentCompliance >= 80 ? 'healthy' : paymentCompliance >= 50 ? 'review' : 'critical', toneLabel: toneLabels[paidAggregate.loading || paidAggregate.error ? 'review' : paymentCompliance >= 80 ? 'healthy' : paymentCompliance >= 50 ? 'review' : 'critical'], value: displayAggregateMoney(paidAggregate) },
    { actionLabel: `${t.filters.status}: ${t.kpis.pending}`, description: 'Saldo abierto que aún requiere programación o pago.', helper: `${openExpenseCount} cuentas · ${percentageChange(pendingPayments, previousBalanceAggregate.data?.preferredTotal ?? 0, locale)}`, icon: <WalletCards className="h-5 w-5" />, onAction: () => setPaymentStatus('OPEN'), progress: totalManaged > 0 ? (pendingPayments / totalManaged) * 100 : 0, title: 'Pendiente por pagar', tone: balanceAggregate.loading || balanceAggregate.error ? 'review' : pendingPayments <= totalManaged * 0.2 ? 'healthy' : pendingPayments <= totalManaged * 0.5 ? 'review' : 'critical', toneLabel: toneLabels[balanceAggregate.loading || balanceAggregate.error ? 'review' : pendingPayments <= totalManaged * 0.2 ? 'healthy' : pendingPayments <= totalManaged * 0.5 ? 'review' : 'critical'], value: displayAggregateMoney(balanceAggregate) },
    { actionLabel: `${t.filters.status}: ${t.statuses.overdue}`, description: 'Cuentas fuera de fecha que requieren atención inmediata.', helper: `${overdueExpenseCount} cuentas · ${percentageChange(overdueAmount, previousOverdueAggregate.data?.preferredTotal ?? 0, locale)}`, icon: <AlertTriangle className="h-5 w-5" />, onAction: () => setPaymentStatus('OVERDUE'), progress: overdueRisk, title: 'Saldo vencido', tone: overdueAggregate.loading || overdueAggregate.error ? 'review' : overdueRisk === 0 ? 'healthy' : overdueRisk <= 15 ? 'review' : 'critical', toneLabel: toneLabels[overdueAggregate.loading || overdueAggregate.error ? 'review' : overdueRisk === 0 ? 'healthy' : overdueRisk <= 15 ? 'review' : 'critical'], value: displayAggregateMoney(overdueAggregate) },
    { description: 'Pagos completados antes o en su fecha de vencimiento.', helper: `${punctuality.onTime} de ${punctuality.count} pagos comparables`, icon: <ClipboardCheck className="h-5 w-5" />, progress: punctuality.percent, title: 'Puntualidad de pago', tone: punctuality.count === 0 ? 'review' : punctuality.percent >= 85 ? 'healthy' : punctuality.percent >= 60 ? 'review' : 'critical', toneLabel: toneLabels[punctuality.count === 0 ? 'review' : punctuality.percent >= 85 ? 'healthy' : punctuality.percent >= 60 ? 'review' : 'critical'], value: `${Math.round(punctuality.percent)}%` },
    { description: 'Diferencia entre presupuesto planeado y ejecución registrada.', helper: `${budgetLineCount} líneas · ${t.kpis.planned} ${displayAggregateMoney(plannedBudgetAggregate)}`, icon: <Banknote className="h-5 w-5" />, progress: budgetConsumption, title: 'Variación presupuestal', tone: plannedBudgetAggregate.loading || plannedBudgetAggregate.error || actualBudgetAggregate.loading || actualBudgetAggregate.error ? 'review' : budgetConsumption > 100 ? 'critical' : budgetConsumption >= 80 ? 'review' : 'healthy', toneLabel: toneLabels[plannedBudgetAggregate.loading || plannedBudgetAggregate.error || actualBudgetAggregate.loading || actualBudgetAggregate.error ? 'review' : budgetConsumption > 100 ? 'critical' : budgetConsumption >= 80 ? 'review' : 'healthy'], value: plannedBudgetAggregate.loading || actualBudgetAggregate.loading || plannedBudgetAggregate.error || actualBudgetAggregate.error ? '—' : displayMoney(actualBudget - plannedBudget) },
    { description: 'Saldo acumulado que vence dentro de los próximos 30 días.', helper: `7 días: ${groupAggregates.loading || groupAggregates.error ? '—' : displayMoney(cashForecast[0]?.total ?? 0)}`, icon: <CalendarClock className="h-5 w-5" />, progress: totalManaged > 0 ? ((cashForecast[2]?.total ?? 0) / totalManaged) * 100 : 0, title: 'Caja requerida a 30 días', tone: groupAggregates.loading || groupAggregates.error ? 'review' : (cashForecast[2]?.total ?? 0) === 0 ? 'healthy' : (cashForecast[2]?.total ?? 0) <= totalManaged * 0.25 ? 'review' : 'critical', toneLabel: toneLabels[groupAggregates.loading || groupAggregates.error ? 'review' : (cashForecast[2]?.total ?? 0) === 0 ? 'healthy' : (cashForecast[2]?.total ?? 0) <= totalManaged * 0.25 ? 'review' : 'critical'], value: groupAggregates.loading || groupAggregates.error ? '—' : displayMoney(cashForecast[2]?.total ?? 0) },
    { description: 'Puntaje combinado de pagos, vencimientos y evidencias.', helper: `45% pagos · 35% sin vencimiento · 20% evidencia (${Math.round(evidenceCoverage)}%)`, icon: <ShieldCheck className="h-5 w-5" />, progress: healthScore, title: 'Salud financiera', tone: monetaryDataLoading || monetaryDataError ? 'review' : rankTone(healthScore), toneLabel: toneLabels[monetaryDataLoading || monetaryDataError ? 'review' : rankTone(healthScore)], value: monetaryDataLoading || monetaryDataError ? '—' : `${healthScore}/100` },
  ] as const;

  const pdfAlerts = useMemo<FinancialOverviewDataSet['alerts']>(() => {
    const alerts: FinancialOverviewDataSet['alerts'] = [];
    if (overdueExpenseCount > 0) {
      alerts.push({ id: 'overdue', tone: 'critical', ...t.kpis.alertCopy.overduePayments(overdueExpenseCount, displayMoney(overdueAmount)) });
    }
    if (openExpenseCount > 0) {
      alerts.push({ id: 'open', tone: 'warning', ...t.kpis.alertCopy.unpaidExpenses(openExpenseCount) });
    }
    const exceededBudgets = budgetHealthRows.filter(row => row.healthStatus === BudgetHealthStatus.EXCEEDED).length;
    const warningBudgets = budgetHealthRows.filter(row => row.healthStatus === BudgetHealthStatus.WARNING).length;
    if (exceededBudgets > 0) alerts.push({ id: 'budget-exceeded', tone: 'critical', ...t.kpis.alertCopy.budgetExceeded(exceededBudgets) });
    else if (warningBudgets > 0) alerts.push({ id: 'budget-warning', tone: 'warning', ...t.kpis.alertCopy.budgetWarning(warningBudgets) });
    if (totalAggregate.data?.partial && totalAggregate.data.excludedCurrencies.length > 0) {
      alerts.push({ id: 'currency-partial', tone: 'warning', ...t.kpis.alertCopy.multiCurrency(totalAggregate.data.excludedCurrencies.join(', '), preferredCurrency) });
    }
    if (alerts.length === 0) alerts.push({ id: 'healthy', tone: 'success', ...t.kpis.alertCopy.healthy });
    return alerts;
  }, [budgetHealthRows, displayMoney, openExpenseCount, overdueAmount, overdueExpenseCount, preferredCurrency, t.kpis.alertCopy, totalAggregate.data]);
  const concentrationRisks = useMemo<FinancialOverviewDataSet['concentrationRisks']>(() => (
    (['PROVIDER', 'ACCOUNTING_ACCOUNT', 'UNIT'] as const).flatMap(type => driverRows[type].slice(0, 1).map(row => ({
      driverType: type,
      id: row.id,
      name: row.name,
      percentage: row.percentage,
      tone: row.percentage >= 50 ? 'critical' as const : row.percentage >= 35 ? 'warning' as const : 'info' as const,
      total: row.total,
    }))).filter(row => row.percentage >= 25)
  ), [driverRows]);
  const overviewForPdf = useMemo<FinancialOverviewDataSet>(() => ({
    ...overview,
    alerts: pdfAlerts,
    budgetHealthRows,
    cashRequirements: [
      { amount: cashForecast[0]?.total ?? 0, count: monetaryGroups.byForecast.get('7')?.length ?? 0, description: t.kpis.cashRequirementCopy.due7.description, id: 'due7', label: t.kpis.cashRequirementCopy.due7.label, tone: 'warning' },
      { amount: cashForecast[2]?.total ?? 0, count: monetaryGroups.byForecast.get('30')?.length ?? 0, description: t.kpis.cashRequirementCopy.due30.description, id: 'due30', label: t.kpis.cashRequirementCopy.due30.label, tone: 'info' },
      { amount: overdueAmount, count: overdueExpenseCount, description: t.kpis.cashRequirementCopy.overdue.description, id: 'overdue', label: t.kpis.cashRequirementCopy.overdue.label, tone: 'critical' },
      { amount: pendingPayments, count: openExpenseCount, description: t.kpis.cashRequirementCopy.pending.description, id: 'pending', label: t.kpis.cashRequirementCopy.pending.label, tone: 'info' },
    ],
    concentrationRisks,
    costDrivers: driverRows,
    currency: preferredCurrency,
    metrics: {
      ...overview.metrics,
      actual: actualBudget,
      actualFallbackUsed: false,
      available: availableBudget,
      budgetLineCount,
      committed: committedBudget,
      dueIn7Days: cashForecast[0]?.total ?? 0,
      dueIn30Days: cashForecast[2]?.total ?? 0,
      expenseCount,
      overdueAmount,
      overdueExpenseCount,
      pendingPayments,
      planned: plannedBudget,
      unpaidExpenseCount: openExpenseCount,
    },
  }), [
    actualBudget,
    availableBudget,
    budgetHealthRows,
    budgetLineCount,
    cashForecast,
    committedBudget,
    concentrationRisks,
    driverRows,
    expenseCount,
    monetaryGroups.byForecast,
    openExpenseCount,
    overdueAmount,
    overdueExpenseCount,
    overview,
    pdfAlerts,
    pendingPayments,
    plannedBudget,
    preferredCurrency,
    t.kpis.cashRequirementCopy,
  ]);

  if (overview.isLoading) {
    return <div className="space-y-5"><div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div></div>;
  }

  const titleAction = (
    <button
      type="button"
      disabled={!isCompanyPrintIdentityReady || monetaryDataLoading || monetaryDataError}
      onClick={() => void downloadFinancialOverviewPdf({ companyIdentity: companyPrintIdentity, copy: t, locale, overview: overviewForPdf, periodLabel })}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#147514]/20 bg-white px-4 text-sm font-medium text-[#147514] transition hover:bg-[#147514]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-emerald-300"
    >
      <Printer className="h-4 w-4" /> {t.kpis.printPdf}
    </button>
  );

  return (
    <div className="space-y-6">
      <IndiceTitleBar
        actions={titleAction}
        icon={<BarChart3 className="h-5 w-5" />}
        subtitle={t.kpis.headerSubtitle}
        title={t.kpis.headerTitle}
        tone="green"
      />

      <IndiceFilterBar
        gridClassName="lg:grid-cols-4"
        title={t.filters.title}
        subtitle={t.kpis.periodFilterHelp}
        summary={(
          <IndiceFilterDisclosureActions
            activeAdvancedCount={activeAdvancedFilterCount}
            advancedLabel={isAdvancedFiltersOpen ? t.common.hideMoreFilters : t.common.moreFilters}
            clearLabel={t.common.clearFilters}
            hasActiveFilters={hasActiveFilters}
            isAdvancedOpen={isAdvancedFiltersOpen}
            onClear={resetFilters}
            onToggleAdvanced={() => setIsAdvancedFiltersOpen(current => !current)}
            resultSummary={t.common.results(expenseCount)}
            tone="green"
          />
        )}
      >
        <IndiceFilterSelect
          label={t.filters.unit}
          value={unitId}
          onValueChange={(value) => { setUnitId(value); setBusinessId('all'); }}
          options={[allOption, ...sources.referenceData.units.map(item => ({ label: item.name, value: item.id }))]}
          tone="green"
        />
        <IndiceFilterSelect
          label={t.filters.business}
          value={businessId}
          onValueChange={setBusinessId}
          options={[allOption, ...activeBusinesses.map(item => ({ label: item.name, value: item.id }))]}
          tone="green"
        />
        <IndiceFilterSelect
          label={t.filters.period}
          value={periodFilter}
          onValueChange={(value) => {
            setPeriodFilter(value as PeriodFilter);
            if (value === 'custom') setIsAdvancedFiltersOpen(true);
          }}
          options={periodOptions}
          tone="green"
        />
        <IndiceFilterSelect
          label={t.filters.status}
          value={paymentStatus}
          onValueChange={setPaymentStatus}
          options={[
            allOption,
            { label: t.kpis.pending, value: 'OPEN' },
            { label: t.statuses.paid, value: 'PAID' },
            { label: t.statuses.partial, value: 'PARTIALLY_PAID' },
            { label: t.statuses.pending, value: 'UNPAID' },
            { label: t.statuses.overdue, value: 'OVERDUE' },
          ]}
          tone="green"
        />
        {isAdvancedFiltersOpen ? (
          <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-4" gridClassName="xl:grid-cols-4">
            <IndiceFilterSelect
              label={t.filters.provider}
              value={providerId}
              onValueChange={setProviderId}
              options={[allOption, ...sources.providers.map(item => ({ label: item.name, value: item.id }))]}
              tone="green"
            />
            <IndiceFilterSelect
              label={t.budgets.filters.accountingAccount}
              value={accountingAccountId}
              onValueChange={setAccountingAccountId}
              options={[allOption, ...sources.accountingAccounts.map(item => ({ label: `${item.code} · ${item.name}`, value: item.id }))]}
              tone="green"
            />
            {periodFilter === 'custom' ? (
              <>
                <IndiceFilterField label={locale.toLowerCase().startsWith('es') ? 'Desde' : 'From'}>
                  <input type="date" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className={getIndiceFilterControlClassName('green')} />
                </IndiceFilterField>
                <IndiceFilterField label={locale.toLowerCase().startsWith('es') ? 'Hasta' : 'To'}>
                  <input type="date" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className={getIndiceFilterControlClassName('green')} />
                </IndiceFilterField>
              </>
            ) : null}
          </IndiceFilterAdvancedSection>
        ) : null}
      </IndiceFilterBar>

      {overview.errorMessage || overview.fallbackWarnings.length > 0 || monetaryDataError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          {locale.toLowerCase().startsWith('es')
            ? 'Algunas fuentes no respondieron; los importes no disponibles se muestran con un guion y no se incluyen en el PDF.'
            : 'Some sources did not respond; unavailable amounts are shown with a dash and are not included in the PDF.'}
        </div>
      ) : null}

      <OperationalKpiCurrencyStrip context={{
        preferredCurrency,
        nativeBreakdown: totalAggregate.data?.nativeTotals.map(({ amount, currency }) => (
          new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
        )).join(' / ') || overview.currencies.join(' / ') || preferredCurrency,
        rateLabel: totalAggregate.data?.exchangeRate.mode === 'daily' || totalAggregate.data?.exchangeRate.mode === 'configured'
          ? currencyCopy.dailyRate
          : currencyCopy.unavailable,
        effectiveDate: totalAggregate.data?.exchangeRate.effectiveDate,
        source: totalAggregate.data?.exchangeRate.source,
        isPartial: monetaryDataPartial || monetaryDataError,
        excludedCount: (totalAggregate.data?.excludedRecords ?? 0) + (plannedBudgetAggregate.data?.excludedRecords ?? 0),
        labels: currencyCopy,
      }} />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => <MetricCard key={card.title} {...card} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Mezcla de pagos" subtitle="Distribución del gasto por estado de liquidación." icon={<BadgeDollarSign className="h-5 w-5" />}>
          <div className="h-[330px]">
            {groupAggregates.loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /> : groupAggregates.error ? <div className="flex h-full items-center justify-center text-sm font-medium text-amber-600">No disponible</div> : paymentMix.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={75} outerRadius={112} paddingAngle={2}>{paymentMix.map(row => <Cell key={row.key} fill={row.color} />)}</Pie><Tooltip formatter={(value) => displayMoney(Number(value))} /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin movimientos en el periodo.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Comparativo por unidad" subtitle={`Gasto gestionado por unidad en ${preferredCurrency}.`} icon={<Building2 className="h-5 w-5" />}>
          <div className="h-[330px]">
            {groupAggregates.loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /> : groupAggregates.error ? <div className="flex h-full items-center justify-center text-sm font-medium text-amber-600">No disponible</div> : unitData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={unitData} layout="vertical" margin={{ left: 16, right: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => displayMoney(Number(value))} /><Bar dataKey="total" name="Gasto" fill="#59C3A5" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin unidades para comparar.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Evolución del gasto" subtitle="Comportamiento diario del gasto registrado y pagado." icon={<TrendingUp className="h-5 w-5" />}>
          <div className="h-[330px]">
            {groupAggregates.loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /> : groupAggregates.error ? <div className="flex h-full items-center justify-center text-sm font-medium text-amber-600">No disponible</div> : trendData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ left: 4, right: 12 }}><defs><linearGradient id="managedArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#147514" stopOpacity={0.28} /><stop offset="95%" stopColor="#147514" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip formatter={(value) => displayMoney(Number(value))} /><Legend /><Area type="monotone" dataKey="amount" name="Gestionado" stroke="#147514" fill="url(#managedArea)" strokeWidth={3} /><Area type="monotone" dataKey="paid" name={t.statuses.paid} stroke="#0ea5e9" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin datos para construir la tendencia.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Presupuesto vs ejecución" subtitle="Comparación de líneas presupuestales con mayor actividad." icon={<BarChart3 className="h-5 w-5" />}>
          <div className="h-[330px]">
            {budgetLineAggregates.loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /> : budgetLineAggregates.error ? <div className="flex h-full items-center justify-center text-sm font-medium text-amber-600">No disponible</div> : budgetData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={budgetData} margin={{ left: 4, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip formatter={(value) => displayMoney(Number(value))} /><Legend /><Bar dataKey="planned" name={t.kpis.planned} fill="#cbd5e1" radius={[6, 6, 0, 0]} /><Bar dataKey="actual" name={t.kpis.actual} fill="#147514" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin líneas presupuestales en el alcance.</div>}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Antigüedad de saldos" subtitle="Distribución de las cuentas abiertas según sus días de vencimiento." icon={<AlertTriangle className="h-5 w-5" />}>
          <div className="space-y-4">
            {agingData.map((bucket) => {
              const max = Math.max(...agingData.map(item => item.total), 1);
              return <div key={bucket.label}><div className="mb-2 flex items-center justify-between gap-4"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{bucket.label}</span><span className="text-sm font-medium text-slate-950 dark:text-white">{displayMoney(bucket.total)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${(bucket.total / max) * 100}%` }} /></div></div>;
            })}
          </div>
        </SectionCard>
        <SectionCard title="Proyección de caja" subtitle="Necesidad acumulada para cubrir compromisos próximos." icon={<CalendarClock className="h-5 w-5" />}>
          <div className="h-[280px]">{groupAggregates.loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /> : groupAggregates.error ? <div className="flex h-full items-center justify-center text-sm font-medium text-amber-600">No disponible</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={cashForecast} margin={{ left: 4, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip formatter={(value) => displayMoney(Number(value))} /><Bar dataKey="total" name={t.kpis.cashRequirements} fill="#0ea5e9" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>}</div>
        </SectionCard>
        <SectionCard title="Impuestos del periodo" subtitle="Lectura consolidada del subtotal y la carga fiscal registrada." icon={<ReceiptText className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-3">
            {[{ label: 'Subtotal', value: displayMoney(taxSummary.subtotal) }, { label: 'Impuestos', value: displayMoney(taxSummary.taxes) }, { label: 'Tasa efectiva', value: `${taxSummary.effectiveRate.toFixed(1)}%` }].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"><p className="text-xs font-medium text-slate-500">{item.label}</p><p className="mt-2 text-xl font-medium text-slate-950 dark:text-white">{item.value}</p></div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">La tasa efectiva se calcula sobre los subtotales capturados. Los montos se presentan en la divisa preferida.</p>
        </SectionCard>
        <SectionCard title="Excepciones de calidad" subtitle="Registros que requieren completar información o seguimiento." icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {exceptions.map(item => <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${item.count === 0 ? toneStyles.healthy.badge : toneStyles[item.tone].badge}`}>{item.count}</span></div>)}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          { onSelect: (id: string) => { setProviderId(id); setIsAdvancedFiltersOpen(true); }, rows: driverRows.PROVIDER, title: t.kpis.topCostDrivers.providers, subtitle: 'Mayor concentración de gasto' },
          { onSelect: (id: string) => { setAccountingAccountId(id); setIsAdvancedFiltersOpen(true); }, rows: driverRows.ACCOUNTING_ACCOUNT, title: t.kpis.topCostDrivers.accountingAccounts, subtitle: 'Rubros con mayor consumo' },
          { onSelect: setBusinessId, rows: driverRows.BUSINESS, title: t.kpis.topCostDrivers.businesses, subtitle: 'Participación en el gasto total' },
        ].map(group => <SectionCard key={group.title} title={group.title} subtitle={group.subtitle} icon={<Gauge className="h-5 w-5" />}><div className="space-y-4">{driverAggregates.loading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /> : driverAggregates.error ? <p className="py-8 text-center text-sm font-medium text-amber-600">No disponible</p> : group.rows.slice(0, 5).map((row, index) => <button type="button" key={row.id} disabled={row.id.startsWith('missing-')} onClick={() => group.onSelect(row.id)} className="block w-full rounded-lg text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#147514]/20 disabled:cursor-default dark:hover:bg-slate-900/40"><div className="mb-2 flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">{index + 1}</span><span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{row.name}</span></div><span className="shrink-0 text-sm font-medium text-slate-950 dark:text-white">{displayMoney(row.total)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${clampPercent(row.percentage)}%` }} /></div></button>)}{!driverAggregates.loading && !driverAggregates.error && group.rows.length === 0 ? <p className="py-8 text-center text-sm font-medium text-slate-400">Sin información disponible.</p> : null}</div></SectionCard>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">Desempeño por responsable</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Puntaje: 55% avance de pago, 25% control de vencimiento y 20% cobertura de evidencia.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-xs font-medium text-slate-500"><span>Evaluar por</span><select value={rankingRole} onChange={event => setRankingRole(event.target.value as RankingRole)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="requested">Solicitante</option><option value="approved">Autorizador</option><option value="performed">Responsable de pago</option></select></label><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Users className="h-4 w-4" /> {rankingRows.length} responsables</span></div></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th className="px-5 py-4">Posición</th><th className="px-5 py-4">Responsable</th><th className="px-5 py-4">Puntuación</th><th className="px-5 py-4">Movimientos</th><th className="px-5 py-4">Pago</th><th className="px-5 py-4">Evidencia</th><th className="px-5 py-4">Vencido</th><th className="px-5 py-4">Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pagination.paginatedRows.map(row => { const tone = rankTone(row.score); return <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30"><td className="px-5 py-4 text-lg font-medium text-slate-800 dark:text-white">#{row.position}</td><td className="px-5 py-4"><p className="font-medium text-slate-900 dark:text-white">{row.name}</p><p className="mt-1 text-xs text-slate-500">{displayMoney(row.total)} gestionado</p></td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full ${toneStyles[tone].bar}`} style={{ width: `${row.score}%` }} /></div><span className="font-medium">{row.score}</span></div></td><td className="px-5 py-4 font-medium">{row.count}</td><td className="px-5 py-4 font-medium">{Math.round(row.paymentRatio)}%</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-medium"><Paperclip className="h-4 w-4 text-emerald-500" /> {Math.round(row.evidenceRatio)}%</span></td><td className="px-5 py-4 font-medium text-rose-600 dark:text-rose-300">{displayMoney(row.overdue)}</td><td className="px-5 py-4"><span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneStyles[tone].badge}`}>{toneLabels[tone]}</span></td></tr>; })}
              {pagination.totalCount === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm font-medium text-slate-400">No hay responsables con actividad en el alcance seleccionado.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <DataTablePagination currentPage={pagination.currentPage} onPageChange={pagination.onPageChange} onPageSizeChange={pagination.onPageSizeChange} pageEnd={pagination.pageEnd} pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions} pageStart={pagination.pageStart} totalCount={pagination.totalCount} totalPages={pagination.totalPages} itemLabel="responsables" />
      </section>
    </div>
  );
}
