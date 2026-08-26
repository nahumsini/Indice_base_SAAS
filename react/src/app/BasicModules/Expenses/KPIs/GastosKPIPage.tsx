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
  RefreshCcw,
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
import { LearningModeTitleBarBridge } from '../../../learningMode';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregate, useKpiMonetaryAggregates, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';

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

const toneStyles: Record<Tone, { badge: string; bar: string; label: string }> = {
  critical: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
    bar: 'bg-rose-500',
    label: 'Crítico',
  },
  healthy: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    label: 'Saludable',
  },
  review: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    bar: 'bg-amber-500',
    label: 'En revisión',
  },
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 'Sin cambio frente al periodo anterior' : 'Sin base comparable anterior';
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(0)}% frente al periodo anterior`;
};

function MetricCard({
  description,
  helper,
  icon,
  progress,
  title,
  tone,
  value,
}: {
  description: string;
  helper: string;
  icon: ReactNode;
  progress: number;
  title: string;
  tone: Tone;
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
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${styles.badge}`}>{styles.label}</span>
      </div>
      <p className="mt-3 pl-14 text-3xl font-medium tracking-tight text-slate-950 dark:text-white">{value}</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${clampPercent(progress)}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-200">{Math.round(clampPercent(progress))}%</span>
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

function FilterSelect({ label, onChange, options, value }: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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

export default function GastosKPIPage({ expenses, providers, refreshKey = 0 }: GastosKPIPageProps) {
  const t = useKpisTranslations();
  const locale = useKpisResolvedLocale();
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const { preferredCurrency } = usePreferredBusinessCurrency();
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
  const { metrics, sources } = overview;
  const displayMoney = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: preferredCurrency }).format(amount);
  const filteredIds = overview.filteredExpenses.map((expense) => expense.id);
  const comparisonIds = overview.comparisonExpenses.map((expense) => expense.id);
  const totalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TOTAL', preferredCurrency, ids: filteredIds });
  const paidAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_PAID', preferredCurrency, ids: filteredIds });
  const balanceAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency, ids: filteredIds });
  const overdueAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids: filteredIds });
  const previousTotalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TOTAL', preferredCurrency, ids: comparisonIds });
  const previousPaidAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_PAID', preferredCurrency, ids: comparisonIds });
  const previousBalanceAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency, ids: comparisonIds });
  const previousOverdueAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids: comparisonIds });
  const subtotalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_SUBTOTAL', preferredCurrency, ids: filteredIds });
  const taxAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TAX', preferredCurrency, ids: filteredIds });
  const visibleBudgetLineIds = overview.budgetHealthRows.slice(0, 7).map((row) => row.id);
  const plannedBudgetAggregate = useKpiMonetaryAggregate({ metric: 'BUDGET_PLANNED', preferredCurrency, ids: visibleBudgetLineIds });
  const actualBudgetAggregate = useKpiMonetaryAggregate({ metric: 'BUDGET_ACTUAL', preferredCurrency, ids: visibleBudgetLineIds });
  const totalManaged = totalAggregate.data?.preferredTotal ?? 0;
  const totalPaid = paidAggregate.data?.preferredTotal ?? 0;
  const pendingPayments = balanceAggregate.data?.preferredTotal ?? 0;
  const overdueAmount = overdueAggregate.data?.preferredTotal ?? 0;
  const previousManaged = previousTotalAggregate.data?.preferredTotal ?? 0;
  const previousPaid = previousPaidAggregate.data?.preferredTotal ?? 0;
  const plannedBudget = plannedBudgetAggregate.data?.preferredTotal ?? 0;
  const actualBudget = actualBudgetAggregate.data?.preferredTotal ?? 0;
  const paymentCompliance = totalManaged > 0 ? (totalPaid / totalManaged) * 100 : 0;
  const budgetConsumption = plannedBudget > 0 ? (actualBudget / plannedBudget) * 100 : 0;
  const overdueRisk = totalManaged > 0 ? (overdueAmount / totalManaged) * 100 : 0;
  const evidenceCount = overview.filteredExpenses.filter(expense => (expense.attachmentCount ?? expense.attachments.length) > 0).length;
  const evidenceCoverage = metrics.expenseCount > 0 ? (evidenceCount / metrics.expenseCount) * 100 : 0;
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
  const allOption = { label: 'Todos', value: 'all' };
  const activeBusinesses = unitId === 'all' ? sources.referenceData.businesses : sources.referenceData.businesses.filter(item => item.unitId === unitId);
  const monetaryGroups = useMemo(() => {
    const byStatus = new Map<string, FinanceExpense[]>();
    const byDate = new Map<string, FinanceExpense[]>();
    const byUnit = new Map<string, FinanceExpense[]>();
    const byRankingUser = new Map<string, FinanceExpense[]>();
    const byAging = new Map<string, FinanceExpense[]>();
    const byForecast = new Map<string, FinanceExpense[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    overview.filteredExpenses.forEach((expense) => {
      byStatus.set(expense.paymentStatus, [...(byStatus.get(expense.paymentStatus) ?? []), expense]);
      const date = expense.expenseDate.slice(0, 10);
      byDate.set(date, [...(byDate.get(date) ?? []), expense]);
      const unit = expense.unitId ?? 'unassigned';
      byUnit.set(unit, [...(byUnit.get(unit) ?? []), expense]);
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
    const topDates = Array.from(byDate.keys()).sort().slice(-14);
    const topUnits = Array.from(byUnit.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    const topUsers = Array.from(byRankingUser.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    return { byAging, byDate, byForecast, byRankingUser, byStatus, byUnit, topDates, topUnits, topUsers };
  }, [overview.filteredExpenses, rankingRole]);
  const groupQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const queries: KpiMonetaryBatchQuery[] = [];
    monetaryGroups.byStatus.forEach((rows, status) => queries.push({ key: `status-${status}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.topDates.forEach((date) => {
      const ids = (monetaryGroups.byDate.get(date) ?? []).map((row) => row.id);
      queries.push({ key: `date-total-${date}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids });
      queries.push({ key: `date-paid-${date}`, metric: 'EXPENSE_PAID', preferredCurrency, ids });
    });
    monetaryGroups.topUnits.forEach(([unit, rows]) => queries.push({ key: `unit-${unit}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.topUsers.forEach(([user, rows]) => {
      const ids = rows.map((row) => row.id);
      queries.push({ key: `user-total-${user}`, metric: 'EXPENSE_TOTAL', preferredCurrency, ids });
      queries.push({ key: `user-paid-${user}`, metric: 'EXPENSE_PAID', preferredCurrency, ids });
      queries.push({ key: `user-overdue-${user}`, metric: 'EXPENSE_OVERDUE_BALANCE', preferredCurrency, ids });
    });
    monetaryGroups.byAging.forEach((rows, bucket) => queries.push({ key: `aging-${bucket}`, metric: 'EXPENSE_BALANCE', preferredCurrency, ids: rows.map((row) => row.id) }));
    monetaryGroups.byForecast.forEach((rows, bucket) => queries.push({ key: `forecast-${bucket}`, metric: 'EXPENSE_BALANCE', preferredCurrency, ids: rows.map((row) => row.id) }));
    overview.budgetHealthRows.slice(0, 7).forEach((row) => {
      queries.push({ key: `budget-planned-${row.id}`, metric: 'BUDGET_PLANNED', preferredCurrency, ids: [row.id] });
      queries.push({ key: `budget-actual-${row.id}`, metric: 'BUDGET_ACTUAL', preferredCurrency, ids: [row.id] });
    });
    return queries.slice(0, 100);
  }, [monetaryGroups, overview.budgetHealthRows, preferredCurrency]);
  const groupAggregates = useKpiMonetaryAggregates(groupQueries);

  const paymentMix = useMemo(() => {
    const rows = [
      { color: '#147514', key: 'PAID', name: 'Pagado', value: 0 },
      { color: '#0ea5e9', key: 'PARTIALLY_PAID', name: 'Pago parcial', value: 0 },
      { color: '#f59e0b', key: 'UNPAID', name: 'Pendiente', value: 0 },
      { color: '#f43f5e', key: 'OVERDUE', name: 'Vencido', value: 0 },
    ];
    rows.forEach((row) => { row.value = groupAggregates.data[`status-${row.key}`]?.preferredTotal ?? 0; });
    return rows.filter(row => row.value > 0);
  }, [groupAggregates.data]);

  const trendData = useMemo(() => {
    return monetaryGroups.topDates.map((date) => ({
      amount: groupAggregates.data[`date-total-${date}`]?.preferredTotal ?? 0,
      paid: groupAggregates.data[`date-paid-${date}`]?.preferredTotal ?? 0,
      date: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)),
    }));
  }, [groupAggregates.data, locale, monetaryGroups.topDates]);

  const unitNames = new Map(sources.referenceData.units.map((unit) => [unit.id, unit.name]));
  const unitData = monetaryGroups.topUnits.map(([unit]) => ({ name: unitNames.get(unit) ?? 'Sin unidad', total: groupAggregates.data[`unit-${unit}`]?.preferredTotal ?? 0 }));
  const budgetData = overview.budgetHealthRows.slice(0, 7).map(row => ({
    Ejecutado: groupAggregates.data[`budget-actual-${row.id}`]?.preferredTotal ?? 0,
    Planeado: groupAggregates.data[`budget-planned-${row.id}`]?.preferredTotal ?? 0,
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
  };
  const periodLabel = periodFilter === 'custom'
    ? `${customStartDate || '...'} - ${customEndDate || '...'}`
    : periodOptions.find(option => option.value === periodFilter)?.label ?? periodFilter;

  const metricCards = [
    { description: 'Valor total de los gastos dentro del alcance seleccionado.', helper: `${metrics.expenseCount} movimientos · ${percentageChange(totalManaged, previousManaged)}`, icon: <CircleDollarSign className="h-5 w-5" />, progress: Math.min(100, metrics.expenseCount * 5), title: 'Gasto gestionado', tone: totalManaged > 0 ? 'healthy' : 'review', value: displayMoney(totalManaged) },
    { description: 'Importe liquidado respecto del total gestionado.', helper: percentageChange(totalPaid, previousPaid), icon: <CheckCircle2 className="h-5 w-5" />, progress: paymentCompliance, title: 'Pagado', tone: paymentCompliance >= 80 ? 'healthy' : paymentCompliance >= 50 ? 'review' : 'critical', value: displayMoney(totalPaid) },
    { description: 'Saldo abierto que aún requiere programación o pago.', helper: `${metrics.unpaidExpenseCount} cuentas · ${percentageChange(pendingPayments, previousBalanceAggregate.data?.preferredTotal ?? 0)}`, icon: <WalletCards className="h-5 w-5" />, progress: totalManaged > 0 ? (pendingPayments / totalManaged) * 100 : 0, title: 'Pendiente por pagar', tone: pendingPayments <= totalManaged * 0.2 ? 'healthy' : pendingPayments <= totalManaged * 0.5 ? 'review' : 'critical', value: displayMoney(pendingPayments) },
    { description: 'Cuentas fuera de fecha que requieren atención inmediata.', helper: `${metrics.overdueExpenseCount} cuentas · ${percentageChange(overdueAmount, previousOverdueAggregate.data?.preferredTotal ?? 0)}`, icon: <AlertTriangle className="h-5 w-5" />, progress: overdueRisk, title: 'Saldo vencido', tone: overdueRisk === 0 ? 'healthy' : overdueRisk <= 15 ? 'review' : 'critical', value: displayMoney(overdueAmount) },
    { description: 'Pagos completados antes o en su fecha de vencimiento.', helper: `${punctuality.onTime} de ${punctuality.count} pagos comparables`, icon: <ClipboardCheck className="h-5 w-5" />, progress: punctuality.percent, title: 'Puntualidad de pago', tone: punctuality.count === 0 ? 'review' : punctuality.percent >= 85 ? 'healthy' : punctuality.percent >= 60 ? 'review' : 'critical', value: `${Math.round(punctuality.percent)}%` },
    { description: 'Diferencia entre presupuesto planeado y ejecución registrada.', helper: `${metrics.budgetLineCount} líneas · Planeado ${displayMoney(plannedBudget)}`, icon: <Banknote className="h-5 w-5" />, progress: budgetConsumption, title: 'Variación presupuestal', tone: budgetConsumption > 100 ? 'critical' : budgetConsumption >= 80 ? 'review' : 'healthy', value: displayMoney(actualBudget - plannedBudget) },
    { description: 'Saldo acumulado que vence dentro de los próximos 30 días.', helper: `7 días: ${displayMoney(cashForecast[0]?.total ?? 0)}`, icon: <CalendarClock className="h-5 w-5" />, progress: totalManaged > 0 ? ((cashForecast[2]?.total ?? 0) / totalManaged) * 100 : 0, title: 'Caja requerida a 30 días', tone: (cashForecast[2]?.total ?? 0) === 0 ? 'healthy' : (cashForecast[2]?.total ?? 0) <= totalManaged * 0.25 ? 'review' : 'critical', value: displayMoney(cashForecast[2]?.total ?? 0) },
    { description: 'Puntaje combinado de pagos, vencimientos y evidencias.', helper: `${Math.round(evidenceCoverage)}% con evidencia adjunta`, icon: <ShieldCheck className="h-5 w-5" />, progress: healthScore, title: 'Salud financiera', tone: rankTone(healthScore), value: `${healthScore}/100` },
  ] as const;

  if (overview.isLoading) {
    return <div className="space-y-5"><div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div></div>;
  }

  const titleAction = (
    <button
      type="button"
      disabled={!isCompanyPrintIdentityReady}
      onClick={() => void downloadFinancialOverviewPdf({ companyIdentity: companyPrintIdentity, copy: t, locale, overview, periodLabel })}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#147514]/20 bg-white px-4 text-sm font-medium text-[#147514] transition hover:bg-[#147514]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-emerald-300"
    >
      <Printer className="h-4 w-4" /> Imprimir reporte
    </button>
  );

  return (
    <div className="space-y-6">
      <LearningModeTitleBarBridge actions={titleAction}>
      <section className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-4 py-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#147514]/20 bg-white text-2xl shadow-sm dark:bg-slate-900" aria-hidden="true">📊</span>
            <div>
              <h2 className="text-xl font-medium text-slate-950 dark:text-white">Indicadores</h2>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Visión integral del gasto, presupuesto y desempeño financiero.</p>
            </div>
          </div>
          {titleAction}
        </div>
      </section>
      </LearningModeTitleBarBridge>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-medium text-slate-900 dark:text-white">Filtros</h3>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">El periodo y el alcance se aplican a todos los indicadores.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{metrics.expenseCount} resultados</span>
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-[#147514] dark:text-slate-400 dark:hover:text-emerald-300"><RefreshCcw className="h-3.5 w-3.5" /> Limpiar</button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterSelect label="Periodo" value={periodFilter} onChange={value => setPeriodFilter(value as PeriodFilter)} options={periodOptions} />
          <FilterSelect label="Unidad" value={unitId} onChange={(value) => { setUnitId(value); setBusinessId('all'); }} options={[allOption, ...sources.referenceData.units.map(item => ({ label: item.name, value: item.id }))]} />
          <FilterSelect label="Negocio" value={businessId} onChange={setBusinessId} options={[allOption, ...activeBusinesses.map(item => ({ label: item.name, value: item.id }))]} />
          <FilterSelect label="Proveedor" value={providerId} onChange={setProviderId} options={[allOption, ...sources.providers.map(item => ({ label: item.name, value: item.id }))]} />
          <FilterSelect label="Cuenta contable" value={accountingAccountId} onChange={setAccountingAccountId} options={[allOption, ...sources.accountingAccounts.map(item => ({ label: `${item.code} · ${item.name}`, value: item.id }))]} />
          <FilterSelect label="Estado de pago" value={paymentStatus} onChange={setPaymentStatus} options={[allOption, { label: 'Pagado', value: 'PAID' }, { label: 'Pago parcial', value: 'PARTIALLY_PAID' }, { label: 'Pendiente', value: 'UNPAID' }, { label: 'Vencido', value: 'OVERDUE' }]} />
        </div>
        {periodFilter === 'custom' ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl"><label className="min-w-0"><span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Desde</span><input type="date" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label><label className="min-w-0"><span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Hasta</span><input type="date" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label></div> : null}
      </section>

      {overview.errorMessage || overview.fallbackWarnings.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">Algunas fuentes no respondieron; se muestran los datos disponibles del módulo.</div> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#59C3A5]/30 bg-[#E7F3F2] px-5 py-4 text-sm text-[#257B68] dark:border-[#59C3A5]/20 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA] md:flex-row md:items-center md:justify-between">
        <p className="font-medium">Consolidado en {preferredCurrency} · {overview.currencies.length} {overview.currencies.length === 1 ? 'divisa de origen' : 'divisas de origen'}: {overview.currencies.join(' / ') || preferredCurrency}</p>
        <p className="text-xs font-medium">Tipo de cambio {totalAggregate.data?.exchangeRate.mode === 'configured' ? 'configurado' : 'diario'} · Fecha efectiva {totalAggregate.data?.exchangeRate.effectiveDate ?? '—'} · Actualizado {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(overview.generatedAt))}{totalAggregate.data?.partial ? ' · Consolidado parcial' : ''}</p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => <MetricCard key={card.title} {...card} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Mezcla de pagos" subtitle="Distribución del gasto por estado de liquidación." icon={<BadgeDollarSign className="h-5 w-5" />}>
          <div className="h-[330px]">
            {paymentMix.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={75} outerRadius={112} paddingAngle={2}>{paymentMix.map(row => <Cell key={row.key} fill={row.color} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin movimientos en el periodo.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Comparativo por unidad" subtitle={`Gasto gestionado por unidad en ${preferredCurrency}.`} icon={<Building2 className="h-5 w-5" />}>
          <div className="h-[330px]">
            {unitData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={unitData} layout="vertical" margin={{ left: 16, right: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="total" name="Gasto" fill="#59C3A5" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin unidades para comparar.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Evolución del gasto" subtitle="Comportamiento diario del gasto registrado y pagado." icon={<TrendingUp className="h-5 w-5" />}>
          <div className="h-[330px]">
            {trendData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ left: 4, right: 12 }}><defs><linearGradient id="managedArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#147514" stopOpacity={0.28} /><stop offset="95%" stopColor="#147514" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip /><Legend /><Area type="monotone" dataKey="amount" name="Gestionado" stroke="#147514" fill="url(#managedArea)" strokeWidth={3} /><Area type="monotone" dataKey="paid" name="Pagado" stroke="#0ea5e9" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin datos para construir la tendencia.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Presupuesto vs ejecución" subtitle="Comparación de líneas presupuestales con mayor actividad." icon={<BarChart3 className="h-5 w-5" />}>
          <div className="h-[330px]">
            {budgetData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={budgetData} margin={{ left: 4, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip /><Legend /><Bar dataKey="Planeado" fill="#cbd5e1" radius={[6, 6, 0, 0]} /><Bar dataKey="Ejecutado" fill="#147514" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Sin líneas presupuestales en el alcance.</div>}
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
          <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={cashForecast} margin={{ left: 4, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip /><Bar dataKey="total" name="Caja requerida" fill="#0ea5e9" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
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
          { onSelect: setProviderId, rows: overview.costDrivers.PROVIDER, title: 'Top proveedores', subtitle: 'Mayor concentración de gasto' },
          { onSelect: setAccountingAccountId, rows: overview.costDrivers.ACCOUNTING_ACCOUNT, title: 'Top cuentas contables', subtitle: 'Rubros con mayor consumo' },
          { onSelect: setBusinessId, rows: overview.costDrivers.BUSINESS, title: 'Top negocios', subtitle: 'Participación en el gasto total' },
        ].map(group => <SectionCard key={group.title} title={group.title} subtitle={group.subtitle} icon={<Gauge className="h-5 w-5" />}><div className="space-y-4">{group.rows.slice(0, 5).map((row, index) => <button type="button" key={row.id} disabled={row.id.startsWith('missing-')} onClick={() => group.onSelect(row.id)} className="block w-full rounded-lg text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#147514]/20 disabled:cursor-default dark:hover:bg-slate-900/40"><div className="mb-2 flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">{index + 1}</span><span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{row.name}</span></div><span className="shrink-0 text-sm font-medium text-slate-950 dark:text-white">{displayMoney(row.total)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${clampPercent(row.percentage)}%` }} /></div></button>)}{group.rows.length === 0 ? <p className="py-8 text-center text-sm font-medium text-slate-400">Sin información disponible.</p> : null}</div></SectionCard>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">Desempeño por responsable</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Puntaje: 55% avance de pago, 25% control de vencimiento y 20% cobertura de evidencia.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-xs font-medium text-slate-500"><span>Evaluar por</span><select value={rankingRole} onChange={event => setRankingRole(event.target.value as RankingRole)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="requested">Solicitante</option><option value="approved">Autorizador</option><option value="performed">Responsable de pago</option></select></label><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Users className="h-4 w-4" /> {rankingRows.length} responsables</span></div></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th className="px-5 py-4">Posición</th><th className="px-5 py-4">Responsable</th><th className="px-5 py-4">Puntuación</th><th className="px-5 py-4">Movimientos</th><th className="px-5 py-4">Pago</th><th className="px-5 py-4">Evidencia</th><th className="px-5 py-4">Vencido</th><th className="px-5 py-4">Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pagination.paginatedRows.map(row => { const tone = rankTone(row.score); return <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30"><td className="px-5 py-4 text-lg font-medium text-slate-800 dark:text-white">#{row.position}</td><td className="px-5 py-4"><p className="font-medium text-slate-900 dark:text-white">{row.name}</p><p className="mt-1 text-xs text-slate-500">{displayMoney(row.total)} gestionado</p></td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full ${toneStyles[tone].bar}`} style={{ width: `${row.score}%` }} /></div><span className="font-medium">{row.score}</span></div></td><td className="px-5 py-4 font-medium">{row.count}</td><td className="px-5 py-4 font-medium">{Math.round(row.paymentRatio)}%</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-medium"><Paperclip className="h-4 w-4 text-emerald-500" /> {Math.round(row.evidenceRatio)}%</span></td><td className="px-5 py-4 font-medium text-rose-600 dark:text-rose-300">{displayMoney(row.overdue)}</td><td className="px-5 py-4"><span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneStyles[tone].badge}`}>{toneStyles[tone].label}</span></td></tr>; })}
              {pagination.totalCount === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm font-medium text-slate-400">No hay responsables con actividad en el alcance seleccionado.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <DataTablePagination currentPage={pagination.currentPage} onPageChange={pagination.onPageChange} onPageSizeChange={pagination.onPageSizeChange} pageEnd={pagination.pageEnd} pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions} pageStart={pagination.pageStart} totalCount={pagination.totalCount} totalPages={pagination.totalPages} itemLabel="responsables" />
      </section>
    </div>
  );
}
