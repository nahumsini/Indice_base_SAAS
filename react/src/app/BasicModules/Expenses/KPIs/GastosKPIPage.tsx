import { useMemo, useState, type ReactNode } from 'react';
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
import { useCurrencyAwareMoney } from '../../shared/useCurrencyAwareMoney';

interface GastosKPIPageProps {
  expenses: Expense[];
  providers: ProviderRecord[];
  refreshKey?: number;
}

type Tone = 'critical' | 'healthy' | 'review';
type RankingRole = 'approved' | 'performed' | 'requested';

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
          <h3 className="pt-1 text-sm font-bold leading-5 text-slate-600 dark:text-slate-200">{title}</h3>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles.badge}`}>{styles.label}</span>
      </div>
      <p className="mt-3 pl-14 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${clampPercent(progress)}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-black text-slate-700 dark:text-slate-200">{Math.round(clampPercent(progress))}%</span>
      </div>
      <p className="mt-5 text-xs font-bold text-slate-500 dark:text-slate-400">{helper}</p>
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
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
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
          <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
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
  const { convertToPreferred, formatPreferred, preferredCurrency, rateContext } = useCurrencyAwareMoney();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [unitId, setUnitId] = useState('all');
  const [businessId, setBusinessId] = useState('all');
  const [providerId, setProviderId] = useState('all');
  const [accountingAccountId, setAccountingAccountId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [rankingRole, setRankingRole] = useState<RankingRole>('requested');

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
    targetCurrency: preferredCurrency,
    unitId,
    convertAmount: convertToPreferred,
  });
  const { metrics, sources } = overview;
  const displayMoney = (amount: number) => formatPreferred(amount, preferredCurrency);
  const expenseMoney = (expense: FinanceExpense, amount: number) => convertToPreferred(amount, expense.currency);

  const totalManaged = useMemo(() => overview.filteredExpenses.reduce((sum, expense) => sum + expenseMoney(expense, expense.total), 0), [overview.filteredExpenses, convertToPreferred]);
  const totalPaid = useMemo(() => overview.filteredExpenses.reduce((sum, expense) => sum + expenseMoney(expense, expense.paidAmount), 0), [overview.filteredExpenses, convertToPreferred]);
  const previousManaged = useMemo(() => overview.comparisonExpenses.reduce((sum, expense) => sum + expenseMoney(expense, expense.total), 0), [overview.comparisonExpenses, convertToPreferred]);
  const previousPaid = useMemo(() => overview.comparisonExpenses.reduce((sum, expense) => sum + expenseMoney(expense, expense.paidAmount), 0), [overview.comparisonExpenses, convertToPreferred]);
  const paymentCompliance = totalManaged > 0 ? (totalPaid / totalManaged) * 100 : 0;
  const budgetConsumption = metrics.planned > 0 ? ((metrics.planned - metrics.available) / metrics.planned) * 100 : 0;
  const overdueRisk = totalManaged > 0 ? (metrics.overdueAmount / totalManaged) * 100 : 0;
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
  const filtersKey = [periodFilter, customStartDate, customEndDate, unitId, businessId, providerId, accountingAccountId, paymentStatus].join('|');

  const paymentMix = useMemo(() => {
    const rows = [
      { color: '#147514', key: 'PAID', name: 'Pagado', value: 0 },
      { color: '#0ea5e9', key: 'PARTIALLY_PAID', name: 'Pago parcial', value: 0 },
      { color: '#f59e0b', key: 'UNPAID', name: 'Pendiente', value: 0 },
      { color: '#f43f5e', key: 'OVERDUE', name: 'Vencido', value: 0 },
    ];
    overview.filteredExpenses.forEach((expense) => {
      const row = rows.find(item => item.key === expense.paymentStatus);
      if (row) row.value += expenseMoney(expense, expense.total);
    });
    return rows.filter(row => row.value > 0);
  }, [overview.filteredExpenses, convertToPreferred]);

  const trendData = useMemo(() => {
    const grouped = new Map<string, { amount: number; paid: number }>();
    overview.filteredExpenses.forEach((expense) => {
      const key = expense.expenseDate.slice(0, 10);
      const row = grouped.get(key) ?? { amount: 0, paid: 0 };
      row.amount += expenseMoney(expense, expense.total);
      row.paid += expenseMoney(expense, expense.paidAmount);
      grouped.set(key, row);
    });
    return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right)).slice(-14).map(([date, values]) => ({
      ...values,
      date: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)),
    }));
  }, [locale, overview.filteredExpenses, convertToPreferred]);

  const unitData = overview.costDrivers.UNIT.slice(0, 8).map(driver => ({ name: driver.name, total: driver.total }));
  const budgetData = overview.budgetHealthRows.slice(0, 7).map(row => ({
    Ejecutado: row.actual,
    Planeado: row.planned,
    name: row.name.length > 18 ? `${row.name.slice(0, 16)}…` : row.name,
  }));

  const agingData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = [
      { color: 'bg-emerald-500', label: 'Por vencer', max: Number.POSITIVE_INFINITY, min: 0, total: 0 },
      { color: 'bg-amber-400', label: '1–30 días', max: 30, min: 1, total: 0 },
      { color: 'bg-orange-500', label: '31–60 días', max: 60, min: 31, total: 0 },
      { color: 'bg-rose-500', label: '61–90 días', max: 90, min: 61, total: 0 },
      { color: 'bg-rose-700', label: 'Más de 90', max: Number.POSITIVE_INFINITY, min: 91, total: 0 },
      { color: 'bg-slate-400', label: 'Sin vencimiento', max: 0, min: 0, total: 0 },
    ];
    overview.filteredExpenses.filter(expense => expense.balance > 0).forEach((expense) => {
      const due = expense.dueDate ? new Date(`${expense.dueDate.slice(0, 10)}T00:00:00`) : null;
      if (!due) {
        buckets[5].total += expenseMoney(expense, expense.balance);
        return;
      }
      const days = due ? Math.floor((today.getTime() - due.getTime()) / 86_400_000) : 0;
      const index = days <= 0 ? 0 : buckets.findIndex((bucket, bucketIndex) => bucketIndex > 0 && days >= bucket.min && days <= bucket.max);
      buckets[index >= 0 ? index : 0].total += expenseMoney(expense, expense.balance);
    });
    return buckets;
  }, [overview.filteredExpenses, convertToPreferred]);

  const cashForecast = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = [
      { days: 7, name: '7 días', total: 0 },
      { days: 15, name: '15 días', total: 0 },
      { days: 30, name: '30 días', total: 0 },
      { days: 60, name: '60 días', total: 0 },
    ];
    overview.filteredExpenses.filter(expense => expense.balance > 0 && expense.dueDate).forEach((expense) => {
      const due = new Date(`${expense.dueDate!.slice(0, 10)}T00:00:00`);
      const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
      if (days < 0) return;
      buckets.forEach(bucket => { if (days <= bucket.days) bucket.total += expenseMoney(expense, expense.balance); });
    });
    return buckets;
  }, [overview.filteredExpenses, convertToPreferred]);

  const taxSummary = useMemo(() => {
    const subtotal = overview.filteredExpenses.reduce((sum, expense) => sum + expenseMoney(expense, expense.subtotal), 0);
    const taxes = overview.filteredExpenses.reduce((sum, expense) => sum + expenseMoney(expense, expense.tax), 0);
    return { effectiveRate: subtotal > 0 ? (taxes / subtotal) * 100 : 0, subtotal, taxes };
  }, [overview.filteredExpenses, convertToPreferred]);

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
      const total = expenseMoney(expense, expense.total);
      row.count += 1;
      row.total += total;
      row.paid += expenseMoney(expense, expense.paidAmount);
      row.evidence += (expense.attachmentCount ?? expense.attachments.length) > 0 ? 1 : 0;
      row.overdue += expense.paymentStatus === 'OVERDUE' ? expenseMoney(expense, expense.balance) : 0;
      grouped.set(key, row);
    });
    return Array.from(grouped.entries()).map(([id, row]) => {
      const paidRatio = row.total > 0 ? row.paid / row.total : 0;
      const overdueRatio = row.total > 0 ? row.overdue / row.total : 0;
      const evidenceRatio = row.count > 0 ? row.evidence / row.count : 0;
      return {
        ...row,
        evidenceRatio: evidenceRatio * 100,
        id,
        paymentRatio: paidRatio * 100,
        score: Math.round(clampPercent((paidRatio * 55) + ((1 - overdueRatio) * 25) + (evidenceRatio * 20))),
      };
    }).sort((left, right) => right.score - left.score).map((row, index) => ({ ...row, position: index + 1 }));
  }, [overview.filteredExpenses, rankingRole, sources.referenceData.users, convertToPreferred]);

  const pagination = useTablePagination({ rows: rankingRows, initialPageSize: 10, resetKey: filtersKey });
  const resetFilters = () => {
    setPeriodFilter('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
    setUnitId('all');
    setBusinessId('all');
    setProviderId('all');
    setAccountingAccountId('all');
    setPaymentStatus('all');
  };
  const periodLabel = periodFilter === 'custom'
    ? `${customStartDate || '...'} - ${customEndDate || '...'}`
    : periodOptions.find(option => option.value === periodFilter)?.label ?? periodFilter;

  const metricCards = [
    { description: 'Valor total de los gastos dentro del alcance seleccionado.', helper: `${metrics.expenseCount} movimientos · ${percentageChange(totalManaged, previousManaged)}`, icon: <CircleDollarSign className="h-5 w-5" />, progress: Math.min(100, metrics.expenseCount * 5), title: 'Gasto gestionado', tone: totalManaged > 0 ? 'healthy' : 'review', value: displayMoney(totalManaged) },
    { description: 'Importe liquidado respecto del total gestionado.', helper: percentageChange(totalPaid, previousPaid), icon: <CheckCircle2 className="h-5 w-5" />, progress: paymentCompliance, title: 'Pagado', tone: paymentCompliance >= 80 ? 'healthy' : paymentCompliance >= 50 ? 'review' : 'critical', value: displayMoney(totalPaid) },
    { description: 'Saldo abierto que aún requiere programación o pago.', helper: `${metrics.unpaidExpenseCount} cuentas · ${percentageChange(metrics.pendingPayments, overview.comparisonOverview.metrics.pendingPayments)}`, icon: <WalletCards className="h-5 w-5" />, progress: totalManaged > 0 ? (metrics.pendingPayments / totalManaged) * 100 : 0, title: 'Pendiente por pagar', tone: metrics.pendingPayments <= totalManaged * 0.2 ? 'healthy' : metrics.pendingPayments <= totalManaged * 0.5 ? 'review' : 'critical', value: displayMoney(metrics.pendingPayments) },
    { description: 'Cuentas fuera de fecha que requieren atención inmediata.', helper: `${metrics.overdueExpenseCount} cuentas · ${percentageChange(metrics.overdueAmount, overview.comparisonOverview.metrics.overdueAmount)}`, icon: <AlertTriangle className="h-5 w-5" />, progress: overdueRisk, title: 'Saldo vencido', tone: overdueRisk === 0 ? 'healthy' : overdueRisk <= 15 ? 'review' : 'critical', value: displayMoney(metrics.overdueAmount) },
    { description: 'Pagos completados antes o en su fecha de vencimiento.', helper: `${punctuality.onTime} de ${punctuality.count} pagos comparables`, icon: <ClipboardCheck className="h-5 w-5" />, progress: punctuality.percent, title: 'Puntualidad de pago', tone: punctuality.count === 0 ? 'review' : punctuality.percent >= 85 ? 'healthy' : punctuality.percent >= 60 ? 'review' : 'critical', value: `${Math.round(punctuality.percent)}%` },
    { description: 'Diferencia entre presupuesto planeado y ejecución registrada.', helper: `${metrics.budgetLineCount} líneas · Planeado ${displayMoney(metrics.planned)}`, icon: <Banknote className="h-5 w-5" />, progress: budgetConsumption, title: 'Variación presupuestal', tone: budgetConsumption > 100 ? 'critical' : budgetConsumption >= 80 ? 'review' : 'healthy', value: displayMoney(metrics.actual - metrics.planned) },
    { description: 'Saldo acumulado que vence dentro de los próximos 30 días.', helper: `7 días: ${displayMoney(cashForecast[0]?.total ?? 0)}`, icon: <CalendarClock className="h-5 w-5" />, progress: totalManaged > 0 ? ((cashForecast[2]?.total ?? 0) / totalManaged) * 100 : 0, title: 'Caja requerida a 30 días', tone: (cashForecast[2]?.total ?? 0) === 0 ? 'healthy' : (cashForecast[2]?.total ?? 0) <= totalManaged * 0.25 ? 'review' : 'critical', value: displayMoney(cashForecast[2]?.total ?? 0) },
    { description: 'Puntaje combinado de pagos, vencimientos y evidencias.', helper: `${Math.round(evidenceCoverage)}% con evidencia adjunta`, icon: <ShieldCheck className="h-5 w-5" />, progress: healthScore, title: 'Salud financiera', tone: rankTone(healthScore), value: `${healthScore}/100` },
  ] as const;

  if (overview.isLoading) {
    return <div className="space-y-5"><div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div></div>;
  }

  const titleAction = (
    <button type="button" onClick={() => downloadFinancialOverviewPdf({ copy: t, locale, overview, periodLabel })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#147514]/20 bg-white px-4 text-sm font-bold text-[#147514] transition hover:bg-[#147514]/5 dark:bg-slate-900 dark:text-emerald-300">
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
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Indicadores</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Visión integral del gasto, presupuesto y desempeño financiero.</p>
            </div>
          </div>
          {titleAction}
        </div>
      </section>
      </LearningModeTitleBarBridge>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Filtros</h3>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">El periodo y el alcance se aplican a todos los indicadores.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{metrics.expenseCount} resultados</span>
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#147514] dark:text-slate-400 dark:hover:text-emerald-300"><RefreshCcw className="h-3.5 w-3.5" /> Limpiar</button>
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
        {periodFilter === 'custom' ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl"><label className="min-w-0"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Desde</span><input type="date" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label><label className="min-w-0"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Hasta</span><input type="date" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label></div> : null}
      </section>

      {overview.errorMessage || overview.fallbackWarnings.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">Algunas fuentes no respondieron; se muestran los datos disponibles del módulo.</div> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#59C3A5]/30 bg-[#E7F3F2] px-5 py-4 text-sm text-[#257B68] dark:border-[#59C3A5]/20 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA] md:flex-row md:items-center md:justify-between">
        <p className="font-bold">Consolidado en {preferredCurrency} · {overview.currencies.length} {overview.currencies.length === 1 ? 'divisa de origen' : 'divisas de origen'}: {overview.currencies.join(' / ') || preferredCurrency}</p>
        <p className="text-xs font-semibold">Tipo de cambio {rateContext.mode === 'manual' ? 'manual' : 'diario'} · Fecha efectiva {rateContext.effectiveDate} · Actualizado {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(overview.generatedAt))}{rateContext.hasWarnings ? ' · Con respaldo interno' : ''}</p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => <MetricCard key={card.title} {...card} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Mezcla de pagos" subtitle="Distribución del gasto por estado de liquidación." icon={<BadgeDollarSign className="h-5 w-5" />}>
          <div className="h-[330px]">
            {paymentMix.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={75} outerRadius={112} paddingAngle={2}>{paymentMix.map(row => <Cell key={row.key} fill={row.color} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">Sin movimientos en el periodo.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Comparativo por unidad" subtitle={`Gasto gestionado por unidad en ${preferredCurrency}.`} icon={<Building2 className="h-5 w-5" />}>
          <div className="h-[330px]">
            {unitData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={unitData} layout="vertical" margin={{ left: 16, right: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="total" name="Gasto" fill="#59C3A5" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">Sin unidades para comparar.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Evolución del gasto" subtitle="Comportamiento diario del gasto registrado y pagado." icon={<TrendingUp className="h-5 w-5" />}>
          <div className="h-[330px]">
            {trendData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ left: 4, right: 12 }}><defs><linearGradient id="managedArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#147514" stopOpacity={0.28} /><stop offset="95%" stopColor="#147514" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip /><Legend /><Area type="monotone" dataKey="amount" name="Gestionado" stroke="#147514" fill="url(#managedArea)" strokeWidth={3} /><Area type="monotone" dataKey="paid" name="Pagado" stroke="#0ea5e9" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">Sin datos para construir la tendencia.</div>}
          </div>
        </SectionCard>
        <SectionCard title="Presupuesto vs ejecución" subtitle="Comparación de líneas presupuestales con mayor actividad." icon={<BarChart3 className="h-5 w-5" />}>
          <div className="h-[330px]">
            {budgetData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={budgetData} margin={{ left: 4, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip /><Legend /><Bar dataKey="Planeado" fill="#cbd5e1" radius={[6, 6, 0, 0]} /><Bar dataKey="Ejecutado" fill="#147514" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">Sin líneas presupuestales en el alcance.</div>}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Antigüedad de saldos" subtitle="Distribución de las cuentas abiertas según sus días de vencimiento." icon={<AlertTriangle className="h-5 w-5" />}>
          <div className="space-y-4">
            {agingData.map((bucket) => {
              const max = Math.max(...agingData.map(item => item.total), 1);
              return <div key={bucket.label}><div className="mb-2 flex items-center justify-between gap-4"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{bucket.label}</span><span className="text-sm font-black text-slate-950 dark:text-white">{displayMoney(bucket.total)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${(bucket.total / max) * 100}%` }} /></div></div>;
            })}
          </div>
        </SectionCard>
        <SectionCard title="Proyección de caja" subtitle="Necesidad acumulada para cubrir compromisos próximos." icon={<CalendarClock className="h-5 w-5" />}>
          <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={cashForecast} margin={{ left: 4, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 11 }} width={55} /><Tooltip /><Bar dataKey="total" name="Caja requerida" fill="#0ea5e9" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Impuestos del periodo" subtitle="Lectura consolidada del subtotal y la carga fiscal registrada." icon={<ReceiptText className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-3">
            {[{ label: 'Subtotal', value: displayMoney(taxSummary.subtotal) }, { label: 'Impuestos', value: displayMoney(taxSummary.taxes) }, { label: 'Tasa efectiva', value: `${taxSummary.effectiveRate.toFixed(1)}%` }].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{item.label}</p><p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{item.value}</p></div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">La tasa efectiva se calcula sobre los subtotales capturados. Los montos se presentan en la divisa preferida.</p>
        </SectionCard>
        <SectionCard title="Excepciones de calidad" subtitle="Registros que requieren completar información o seguimiento." icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {exceptions.map(item => <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-black ${item.count === 0 ? toneStyles.healthy.badge : toneStyles[item.tone].badge}`}>{item.count}</span></div>)}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          { onSelect: setProviderId, rows: overview.costDrivers.PROVIDER, title: 'Top proveedores', subtitle: 'Mayor concentración de gasto' },
          { onSelect: setAccountingAccountId, rows: overview.costDrivers.ACCOUNTING_ACCOUNT, title: 'Top cuentas contables', subtitle: 'Rubros con mayor consumo' },
          { onSelect: setBusinessId, rows: overview.costDrivers.BUSINESS, title: 'Top negocios', subtitle: 'Participación en el gasto total' },
        ].map(group => <SectionCard key={group.title} title={group.title} subtitle={group.subtitle} icon={<Gauge className="h-5 w-5" />}><div className="space-y-4">{group.rows.slice(0, 5).map((row, index) => <button type="button" key={row.id} disabled={row.id.startsWith('missing-')} onClick={() => group.onSelect(row.id)} className="block w-full rounded-lg text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#147514]/20 disabled:cursor-default dark:hover:bg-slate-900/40"><div className="mb-2 flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-700 dark:text-slate-200">{index + 1}</span><span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{row.name}</span></div><span className="shrink-0 text-sm font-black text-slate-950 dark:text-white">{displayMoney(row.total)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${clampPercent(row.percentage)}%` }} /></div></button>)}{group.rows.length === 0 ? <p className="py-8 text-center text-sm font-semibold text-slate-400">Sin información disponible.</p> : null}</div></SectionCard>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-lg font-black text-slate-950 dark:text-white">Desempeño por responsable</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Puntaje: 55% avance de pago, 25% control de vencimiento y 20% cobertura de evidencia.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-xs font-bold text-slate-500"><span>Evaluar por</span><select value={rankingRole} onChange={event => setRankingRole(event.target.value as RankingRole)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="requested">Solicitante</option><option value="approved">Autorizador</option><option value="performed">Responsable de pago</option></select></label><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Users className="h-4 w-4" /> {rankingRows.length} responsables</span></div></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th className="px-5 py-4">Posición</th><th className="px-5 py-4">Responsable</th><th className="px-5 py-4">Puntuación</th><th className="px-5 py-4">Movimientos</th><th className="px-5 py-4">Pago</th><th className="px-5 py-4">Evidencia</th><th className="px-5 py-4">Vencido</th><th className="px-5 py-4">Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pagination.paginatedRows.map(row => { const tone = rankTone(row.score); return <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30"><td className="px-5 py-4 text-lg font-black text-slate-800 dark:text-white">#{row.position}</td><td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-white">{row.name}</p><p className="mt-1 text-xs text-slate-500">{displayMoney(row.total)} gestionado</p></td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full ${toneStyles[tone].bar}`} style={{ width: `${row.score}%` }} /></div><span className="font-black">{row.score}</span></div></td><td className="px-5 py-4 font-semibold">{row.count}</td><td className="px-5 py-4 font-semibold">{Math.round(row.paymentRatio)}%</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-semibold"><Paperclip className="h-4 w-4 text-emerald-500" /> {Math.round(row.evidenceRatio)}%</span></td><td className="px-5 py-4 font-bold text-rose-600 dark:text-rose-300">{displayMoney(row.overdue)}</td><td className="px-5 py-4"><span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${toneStyles[tone].badge}`}>{toneStyles[tone].label}</span></td></tr>; })}
              {pagination.totalCount === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-slate-400">No hay responsables con actividad en el alcance seleccionado.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <DataTablePagination currentPage={pagination.currentPage} onPageChange={pagination.onPageChange} onPageSizeChange={pagination.onPageSizeChange} pageEnd={pagination.pageEnd} pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions} pageStart={pagination.pageStart} totalCount={pagination.totalCount} totalPages={pagination.totalPages} itemLabel="responsables" />
      </section>
    </div>
  );
}
