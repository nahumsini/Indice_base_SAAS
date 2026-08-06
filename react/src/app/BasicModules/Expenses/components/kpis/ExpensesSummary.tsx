import { AlertTriangle, CircleDollarSign, Clock3, Percent, ReceiptText } from 'lucide-react';
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
    <section className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Metric icon={<ReceiptText className="h-4 w-4" />} label={t.expenses.summary.metricTotalVisible(expenses.length)} value={totalAmountLabel} />
          <Metric icon={<CircleDollarSign className="h-4 w-4" />} label={t.expenses.summary.metricOpenBalance} value={openAmountLabel} valueClassName="text-amber-600 dark:text-amber-400" />
          <Metric icon={<Clock3 className="h-4 w-4" />} label={t.expenses.summary.metricOverdue} value={overdueAmountLabel} valueClassName="text-rose-600 dark:text-rose-400" />
          <Metric icon={<Percent className="h-4 w-4" />} label={t.expenses.summary.metricCompliance} value={`${paidPercentage.toFixed(0)}%`} valueClassName="text-sky-600 dark:text-sky-400" />
        </div>
        {(totals.overdueCount > 0 || openPaymentCount > 0 || showNativeBreakdown) ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-700">
            {totals.overdueCount > 0 ? <AlertChip tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />}>{t.expenses.summary.overdue(totals.overdueCount)}</AlertChip> : null}
            {openPaymentCount > 0 ? <AlertChip tone="warning" icon={<Clock3 className="h-3.5 w-3.5" />}>{t.expenses.summary.openBalanceChip(openPaymentCount)}</AlertChip> : null}
            {showNativeBreakdown ? <span className="text-xs text-slate-500">{t.expenses.summary.metricNative}: {nativeTotalAmountLabel}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="flex h-full w-full">
            {statusMetrics.map(metric => <div key={metric.status} className={`${metric.barClass} transition-all duration-300`} style={{ width: `${metric.percentage}%` }} title={`${metric.label}: ${metric.amountLabel} - ${metric.percentage.toFixed(1)}%`} />)}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          {statusMetrics.map(metric => <span key={metric.status} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${metric.dotClass}`} />{metric.label}</span>)}
        </div>
      </div>

      <p className="border-l-2 border-[#147514] px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {showNativeBreakdown ? `${insight} ${t.expenses.summary.nativeBalance(nativeOpenAmountLabel)}` : insight}
      </p>
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
    <div className="flex min-w-0 items-center gap-3 border-b border-r border-slate-100 px-4 py-3.5 text-sm text-slate-600 last:border-r-0 dark:border-slate-700 lg:border-b-0">
      <span className="shrink-0 text-[#147514]">{icon}</span>
      <div className="min-w-0">
        <p className={`truncate text-sm font-medium ${valueClassName}`}>{value}</p>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
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
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      {icon}
      {children}
    </span>
  );
}
