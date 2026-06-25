import { AlertTriangle, CircleDollarSign } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Expense, ExpenseStatus } from '../../types/expenses.types';
import type { ExpenseTotals } from '../../types/expenseView.types';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import { formatBusinessCurrencyBreakdown } from '../../../shared/businessCurrency';

type ExpensesSummaryProps = {
  expenses: Expense[];
  totals: ExpenseTotals;
};

type StatusMetric = {
  amount: number;
  barClass: string;
  count: number;
  dotClass: string;
  label: string;
  amountLabel: string;
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

export function ExpensesSummary({ expenses, totals }: ExpensesSummaryProps) {
  const t = useFinanceTranslations();
  const totalAmount = Math.max(totals.total, 0);
  const totalAmountLabel = formatBusinessCurrencyBreakdown(expenses, (expense) => expense.amount, (expense) => expense.currency);
  const statusMetrics = statusConfig.map(config => {
    const statusExpenses = expenses.filter(expense => expense.status === config.status);
    const amount = statusExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      ...config,
      amount,
      amountLabel: formatBusinessCurrencyBreakdown(statusExpenses, (expense) => expense.amount, (expense) => expense.currency),
      count: statusExpenses.length,
      label: t.expenses.table.statuses[config.status] ?? config.status,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Metric icon={<CircleDollarSign className="h-4 w-4" />} label={t.expenses.summary.total} value={totalAmountLabel} />
          <div className="flex gap-x-4 gap-y-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {statusMetrics.map(metric => (
              <StatusMetricItem key={metric.status} metric={metric} />
            ))}
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="flex h-full w-full">
            {statusMetrics.map(metric => (
              <div
                key={metric.status}
                className={`${metric.barClass} transition-all duration-300`}
                style={{ width: `${metric.percentage}%` }}
                title={`${metric.label}: ${metric.amountLabel} · ${metric.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {statusMetrics.map(metric => (
              <span key={metric.status} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${metric.dotClass}`} />
                {metric.label}
              </span>
            ))}
          </div>
          <StatusNotes expensesCount={expenses.length} totals={totals} />
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, valueClassName = 'text-slate-900 dark:text-white' }: { icon: ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#147514] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{icon}</span>
      <span className={`font-extrabold ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function StatusMetricItem({ metric }: { metric: StatusMetric }) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <span className={`h-3 w-3 rounded-full ${metric.dotClass}`} />
      </span>
      <span className={`font-extrabold ${metric.valueClassName}`}>{metric.amountLabel}</span>
      <span>{metric.label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        {metric.percentage.toFixed(1)}%
      </span>
    </div>
  );
}

function StatusNotes({ expensesCount, totals }: { expensesCount: number; totals: ExpenseTotals }) {
  const t = useFinanceTranslations();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {totals.overdueCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t.expenses.summary.overdue(totals.overdueCount)}
        </span>
      ) : null}
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {t.expenses.summary.records(expensesCount)}
      </span>
    </div>
  );
}
