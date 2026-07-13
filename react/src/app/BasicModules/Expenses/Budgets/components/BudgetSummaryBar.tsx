import { AlertTriangle, CircleDollarSign, ShieldCheck, TrendingDown, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Expense } from '../../types/expenses.types';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import { formatBusinessCurrencyBreakdown } from '../../../shared/businessCurrency';

type BudgetSummaryBarProps = {
  expenses: Expense[];
};

type BudgetTotals = {
  actual: number;
  available: number;
  committed: number;
  exceededCount: number;
  planned: number;
  warningCount: number;
};

export function BudgetSummaryBar({ expenses }: BudgetSummaryBarProps) {
  const t = useBudgetsTranslations();
  const totals = buildBudgetTotals(expenses);
  const consumed = totals.actual + totals.committed;
  const consumedPercentage = totals.planned > 0 ? Math.min((consumed / totals.planned) * 100, 100) : 0;
  const availablePercentage = totals.planned > 0 ? Math.max((totals.available / totals.planned) * 100, 0) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<CircleDollarSign className="h-4 w-4" />} label={t.budgets.planned} value={formatBudgetAmount(expenses, expense => expense.total)} />
        <Metric icon={<WalletCards className="h-4 w-4" />} label={t.budgets.committed} value={formatBudgetAmount(expenses, expense => expense.committedAmount ?? 0)} tone="amber" />
        <Metric icon={<TrendingDown className="h-4 w-4" />} label={t.budgets.actual} value={formatBudgetAmount(expenses, expense => expense.actualExpenseAmount ?? expense.amountPaid ?? 0)} tone="blue" />
        <Metric icon={<ShieldCheck className="h-4 w-4" />} label={t.budgets.available} value={formatBudgetAmount(expenses, expense => expense.availableAmount ?? expense.total)} tone={totals.available < 0 ? 'red' : 'green'} />
        <Metric icon={<AlertTriangle className="h-4 w-4" />} label={t.budgets.health} value={`${totals.warningCount + totals.exceededCount}`} tone={totals.exceededCount > 0 ? 'red' : totals.warningCount > 0 ? 'amber' : 'green'} />
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full w-full">
          <div className="bg-[#147514]" style={{ width: `${availablePercentage}%` }} />
          <div className="bg-blue-500" style={{ width: `${Math.min(consumedPercentage, 100)}%` }} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Legend dotClass="bg-[#147514]" label={t.budgets.available} />
          <Legend dotClass="bg-blue-500" label={`${t.budgets.actual} + ${t.budgets.committed}`} />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {t.budgets.summary.budgetLines(expenses.length)}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        {buildInsight(totals, t.kpis.summaryCopy)}
      </div>
    </div>
  );
}

function buildBudgetTotals(expenses: Expense[]): BudgetTotals {
  return expenses.reduce<BudgetTotals>((totals, expense) => {
    const health = expense.budgetHealthStatus ?? 'ON_TRACK';
    return {
      planned: totals.planned + expense.total,
      committed: totals.committed + (expense.committedAmount ?? 0),
      actual: totals.actual + (expense.actualExpenseAmount ?? expense.amountPaid ?? 0),
      available: totals.available + (expense.availableAmount ?? expense.total),
      warningCount: totals.warningCount + (health === 'WARNING' ? 1 : 0),
      exceededCount: totals.exceededCount + (health === 'EXCEEDED' ? 1 : 0),
    };
  }, { actual: 0, available: 0, committed: 0, exceededCount: 0, planned: 0, warningCount: 0 });
}

function formatBudgetAmount(expenses: Expense[], getAmount: (expense: Expense) => number) {
  return formatBusinessCurrencyBreakdown(expenses, getAmount, expense => expense.currency);
}

function buildInsight(totals: BudgetTotals, summaryCopy: ReturnType<typeof useBudgetsTranslations>['kpis']['summaryCopy']) {
  if (totals.exceededCount > 0) {
    return summaryCopy.budgetExceeded;
  }
  if (totals.warningCount > 0) {
    return summaryCopy.budgetWarning;
  }
  if (totals.planned <= 0) {
    return summaryCopy.noBudget;
  }
  return summaryCopy.budgetStable;
}

function Metric({
  icon,
  label,
  tone = 'base',
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: 'amber' | 'base' | 'blue' | 'green' | 'red';
  value: string;
}) {
  const toneClass = {
    amber: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
    base: 'text-slate-950 bg-slate-50 border-slate-200 dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700',
    blue: 'text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30',
    green: 'text-[#147514] bg-[#147514]/10 border-[#147514]/15 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
    red: 'text-red-700 bg-red-50 border-red-100 dark:text-red-200 dark:bg-red-500/10 dark:border-red-500/30',
  }[tone];

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] opacity-80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function Legend({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
