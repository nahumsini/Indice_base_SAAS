import { CircleDollarSign } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Expense } from '../../types/expenses.types';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import { formatBusinessCurrencyBreakdown } from '../../../shared/businessCurrency';

type BudgetSummaryBarProps = {
  expenses: Expense[];
};

type BudgetAccountMetric = {
  amount: number;
  barClass: string;
  count: number;
  dotClass: string;
  label: string;
  amountLabel: string;
  percentage: number;
  valueClassName: string;
};

const accountColors = [
  { dotClass: 'bg-[#147514]', barClass: 'bg-[#147514]', valueClassName: 'text-[#147514]' },
  { dotClass: 'bg-cyan-500', barClass: 'bg-cyan-500', valueClassName: 'text-cyan-600 dark:text-cyan-400' },
  { dotClass: 'bg-sky-500', barClass: 'bg-sky-500', valueClassName: 'text-sky-600 dark:text-sky-400' },
  { dotClass: 'bg-amber-500', barClass: 'bg-amber-500', valueClassName: 'text-amber-600 dark:text-amber-400' },
  { dotClass: 'bg-slate-500', barClass: 'bg-slate-500', valueClassName: 'text-slate-600 dark:text-slate-300' },
];

export function BudgetSummaryBar({ expenses }: BudgetSummaryBarProps) {
  const t = useFinanceTranslations();
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.total, 0);
  const safeTotal = Math.max(totalAmount, 0);
  const safeTotalLabel = formatBusinessCurrencyBreakdown(expenses, (expense) => expense.total, (expense) => expense.currency);
  const accountMetrics = buildAccountMetrics(expenses, safeTotal, t.budgets.summary.noAccountingAccount, t.budgets.summary.other);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Metric icon={<CircleDollarSign className="h-4 w-4" />} label={t.budgets.summary.totalEstimated} value={safeTotalLabel} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {accountMetrics.map(metric => (
              <AccountMetricItem key={metric.label} metric={metric} />
            ))}
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="flex h-full w-full">
            {accountMetrics.map(metric => (
              <div
                key={metric.label}
                className={`${metric.barClass} transition-all duration-300`}
                style={{ width: `${metric.percentage}%` }}
                title={`${metric.label}: ${metric.amountLabel} · ${metric.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {accountMetrics.map(metric => (
              <span key={metric.label} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${metric.dotClass}`} />
                {metric.label}
              </span>
            ))}
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {t.budgets.summary.budgetLines(expenses.length)}
          </span>
        </div>
      </div>
    </div>
  );
}

function buildAccountMetrics(expenses: Expense[], safeTotal: number, missingAccountLabel: string, otherLabel: string): BudgetAccountMetric[] {
  const groupedAccounts = expenses.reduce<Record<string, { amount: number; count: number; expenses: Expense[] }>>((groups, expense) => {
    const account = expense.accountingAccount?.trim() || missingAccountLabel;
    const current = groups[account] ?? { amount: 0, count: 0, expenses: [] };
    groups[account] = {
      amount: current.amount + expense.total,
      count: current.count + 1,
      expenses: [...current.expenses, expense],
    };
    return groups;
  }, {});

  const sortedAccounts = Object.entries(groupedAccounts)
    .map(([label, values]) => ({ label, ...values }))
    .sort((first, second) => second.count - first.count || second.amount - first.amount || first.label.localeCompare(second.label));
  const topAccounts = sortedAccounts.slice(0, 4);
  const otherAccounts = sortedAccounts.slice(4);
  const visibleAccounts = otherAccounts.length > 0
    ? [
      ...topAccounts,
      {
        label: otherLabel,
        amount: otherAccounts.reduce((sum, account) => sum + account.amount, 0),
        count: otherAccounts.reduce((sum, account) => sum + account.count, 0),
        expenses: otherAccounts.flatMap((account) => account.expenses),
      },
    ]
    : topAccounts;

  return visibleAccounts.map((account, index) => {
    const color = accountColors[index] ?? accountColors[accountColors.length - 1];
    return {
      ...account,
      ...color,
      amountLabel: formatBusinessCurrencyBreakdown(account.expenses, (expense) => expense.total, (expense) => expense.currency),
      percentage: safeTotal > 0 ? (account.amount / safeTotal) * 100 : 0,
    };
  });
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

function AccountMetricItem({ metric }: { metric: BudgetAccountMetric }) {
  const t = useFinanceTranslations();

  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400" title={`${metric.label}: ${t.budgets.summary.lineCount(metric.count)}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <span className={`h-3 w-3 rounded-full ${metric.dotClass}`} />
      </span>
      <span className={`font-extrabold ${metric.valueClassName}`}>{metric.amountLabel}</span>
      <span className="max-w-[140px] truncate">{metric.label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        {metric.percentage.toFixed(1)}%
      </span>
    </div>
  );
}
