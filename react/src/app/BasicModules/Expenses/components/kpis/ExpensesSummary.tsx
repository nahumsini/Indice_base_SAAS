import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock3, Percent, ReceiptText, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Expense, ExpenseStatus } from '../../types/expenses.types';
import type { ExpenseTotals } from '../../types/expenseView.types';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import {
  convertBusinessCurrencyAmount,
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  formatBusinessCurrencyBreakdown,
  normalizeBusinessCurrencyCode,
  type BusinessExchangeRatesPerUsd,
} from '../../../shared/businessCurrency';
import { getEffectiveExpenseStatus, getExpenseBalance, getExpensePaidAmount, isExpenseEffectivelyOverdue } from '../../utils/expenseFilters';
import { useLearningModeHeaderActions } from '../../../../learningMode';

type ExpensesSummaryProps = {
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd;
  expenses: Expense[];
  preferredCurrency?: string;
  totals: ExpenseTotals;
};

type StatusMetric = {
  amount: number;
  amountLabel: string;
  barClass: string;
  count: number;
  dotClass: string;
  label: string;
  percentage: number;
  status: ExpenseStatus;
  valueClassName: string;
};

const statusConfig: Array<Omit<StatusMetric, 'amount' | 'amountLabel' | 'count' | 'label' | 'percentage'>> = [
  { status: 'paid', dotClass: 'bg-[#147514]', barClass: 'bg-[#147514]', valueClassName: 'text-[#147514]' },
  { status: 'pending', dotClass: 'bg-amber-500', barClass: 'bg-amber-500', valueClassName: 'text-amber-600 dark:text-amber-400' },
  { status: 'partial', dotClass: 'bg-sky-500', barClass: 'bg-sky-500', valueClassName: 'text-sky-600 dark:text-sky-400' },
  { status: 'overdue', dotClass: 'bg-rose-500', barClass: 'bg-rose-500', valueClassName: 'text-rose-600 dark:text-rose-400' },
];

export function ExpensesSummary({
  exchangeRatesPerUsd,
  expenses,
  preferredCurrency = defaultBusinessCurrency,
  totals,
}: ExpensesSummaryProps) {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const t = useExpensesTranslations();
  const normalizedPreferredCurrency = normalizeBusinessCurrencyCode(preferredCurrency, defaultBusinessCurrency);
  const convertExpenseDisplayAmount = (amount: number, expense: Expense) => convertBusinessCurrencyAmount(
    amount,
    normalizeBusinessCurrencyCode(expense.currency),
    normalizedPreferredCurrency,
    exchangeRatesPerUsd,
  );
  const totalAmount = Math.max(totals.total, 0);
  const paidPercentage = totalAmount > 0 ? Math.min(100, Math.max(0, (totals.paid / totalAmount) * 100)) : 0;
  const totalAmountLabel = formatBusinessCurrencyAmount(totalAmount, normalizedPreferredCurrency);
  const paidAmountLabel = formatBusinessCurrencyAmount(totals.paid, normalizedPreferredCurrency);
  const openAmountLabel = formatBusinessCurrencyAmount(totals.pending, normalizedPreferredCurrency);
  const nativeTotalAmountLabel = formatBusinessCurrencyBreakdown(expenses, (expense) => expense.total, (expense) => expense.currency);
  const nativeOpenAmountLabel = formatBusinessCurrencyBreakdown(
    expenses,
    (expense) => getExpenseBalance(expense),
    (expense) => expense.currency,
  );
  const overdueExpenses = expenses.filter(expense => isExpenseEffectivelyOverdue(expense));
  const overdueAmountLabel = formatBusinessCurrencyAmount(totals.overdue, normalizedPreferredCurrency);
  const nativeCurrencies = new Set(expenses.map(expense => normalizeBusinessCurrencyCode(expense.currency)));
  const showNativeBreakdown = nativeCurrencies.size > 1 || (nativeCurrencies.size === 1 && !nativeCurrencies.has(normalizedPreferredCurrency));

  if (learningModeActive) {
    return null;
  }
  const statusMetrics = statusConfig.map(config => {
    const statusExpenses = expenses.filter(expense => getEffectiveExpenseStatus(expense) === config.status);
    const amount = config.status === 'paid'
      ? statusExpenses.reduce((sum, expense) => sum + convertExpenseDisplayAmount(getExpensePaidAmount(expense), expense), 0)
      : statusExpenses.reduce((sum, expense) => sum + convertExpenseDisplayAmount(getExpenseBalance(expense), expense), 0);
    return {
      ...config,
      amount,
      amountLabel: formatBusinessCurrencyAmount(amount, normalizedPreferredCurrency),
      count: statusExpenses.length,
      label: t.expenses.table.statuses[config.status] ?? config.status,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    };
  });

  const openPaymentCount = expenses.filter(expense => getExpenseBalance(expense) > 0 && getEffectiveExpenseStatus(expense) !== 'paid').length;
  const insight = totals.overdueCount > 0
    ? t.expenses.summary.insightOverdue(totals.overdueCount, overdueAmountLabel)
    : openPaymentCount > 0
      ? t.expenses.summary.insightOpenBalance(openPaymentCount, paidPercentage.toFixed(0))
      : t.expenses.summary.insightAllSettled;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={<ReceiptText className="h-4 w-4" />} label={t.expenses.summary.metricTotalVisible(expenses.length)} value={totalAmountLabel} />
            <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={t.expenses.summary.metricPaid} value={paidAmountLabel} valueClassName="text-[#147514]" />
            <Metric icon={<CircleDollarSign className="h-4 w-4" />} label={t.expenses.summary.metricOpenBalance} value={openAmountLabel} valueClassName="text-amber-600 dark:text-amber-400" />
            <Metric icon={<Clock3 className="h-4 w-4" />} label={t.expenses.summary.metricOverdue} value={overdueAmountLabel} valueClassName="text-rose-600 dark:text-rose-400" />
            <Metric icon={<Percent className="h-4 w-4" />} label={t.expenses.summary.metricCompliance} value={`${paidPercentage.toFixed(0)}%`} valueClassName="text-sky-600 dark:text-sky-400" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totals.overdueCount > 0 ? (
              <AlertChip tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                {t.expenses.summary.overdue(totals.overdueCount)}
              </AlertChip>
            ) : null}
            {openPaymentCount > 0 ? (
              <AlertChip tone="warning" icon={<Clock3 className="h-3.5 w-3.5" />}>
                {t.expenses.summary.openBalanceChip(openPaymentCount)}
              </AlertChip>
            ) : null}
            {totalAmount > 0 ? (
              <AlertChip tone={paidPercentage >= 80 ? 'success' : 'warning'} icon={<WalletCards className="h-3.5 w-3.5" />}>
                {t.expenses.summary.paidPercentageChip(paidPercentage.toFixed(0))}
              </AlertChip>
            ) : null}
            {showNativeBreakdown ? (
              <AlertChip tone="success" icon={<WalletCards className="h-3.5 w-3.5" />}>
                {t.expenses.summary.metricNative}: {nativeTotalAmountLabel}
              </AlertChip>
            ) : null}
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="flex h-full w-full">
            {statusMetrics.map(metric => (
              <div
                key={metric.status}
                className={`${metric.barClass} transition-all duration-300`}
                style={{ width: `${metric.percentage}%` }}
                title={`${metric.label}: ${metric.amountLabel} - ${metric.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {statusMetrics.map(metric => (
              <span key={metric.status} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${metric.dotClass}`} />
                {metric.label}
              </span>
            ))}
          </div>
          <div className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-slate-200">
            {showNativeBreakdown ? `${insight} ${t.expenses.summary.nativeBalance(nativeOpenAmountLabel)}` : insight}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#147514] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`truncate text-sm font-extrabold ${valueClassName}`}>{value}</p>
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function AlertChip({ children, icon, tone }: { children: ReactNode; icon: ReactNode; tone: 'danger' | 'success' | 'warning' }) {
  const toneClass = tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300'
    : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${toneClass}`}>
      {icon}
      {children}
    </span>
  );
}
