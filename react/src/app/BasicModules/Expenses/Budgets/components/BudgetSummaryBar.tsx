import { AlertTriangle, CircleDollarSign, ClipboardList, Coins, Info, ShieldCheck, TrendingDown } from 'lucide-react';
import type { Expense } from '../../types/expenses.types';
import { OperationalKpiArea, type OperationalAlertChip } from '../../../shared/operational';
import { useCurrencyAwareMoney } from '../../../shared/useCurrencyAwareMoney';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';

type BudgetSummaryBarProps = {
  expenses: Expense[];
};

type BudgetHealthTotals = {
  exceededCount: number;
  warningCount: number;
};

export function BudgetSummaryBar({ expenses }: BudgetSummaryBarProps) {
  const t = useBudgetsTranslations();
  const { preferredCurrency, rateContext, summarize } = useCurrencyAwareMoney();
  const healthTotals = buildBudgetHealthTotals(expenses);
  const planned = summarizeAmounts(expenses, expense => expense.total, summarize);
  const committed = summarizeAmounts(expenses, expense => expense.committedAmount ?? 0, summarize);
  const actual = summarizeAmounts(expenses, expense => expense.actualExpenseAmount ?? expense.amountPaid ?? 0, summarize);
  const available = summarizeAmounts(expenses, expense => expense.availableAmount ?? expense.total, summarize);
  const attentionCount = healthTotals.warningCount + healthTotals.exceededCount;
  const alertChips: OperationalAlertChip[] = [
    {
      id: 'budget-lines',
      label: t.budgets.summary.budgetLines(expenses.length),
      tone: 'neutral',
    },
  ];

  if (planned.nativeBreakdown) {
    alertChips.push({
      id: 'native-breakdown',
      icon: <Coins className="h-3.5 w-3.5" />,
      label: `${t.expenses.summary.metricNative}: ${planned.nativeBreakdown}`,
      tone: 'info',
    });
  }

  if (healthTotals.exceededCount > 0) {
    alertChips.push({
      id: 'exceeded',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${healthTotals.exceededCount} ${t.budgets.healthLabels.EXCEEDED}`,
      tone: 'danger',
    });
  } else if (healthTotals.warningCount > 0) {
    alertChips.push({
      id: 'warning',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${healthTotals.warningCount} ${t.budgets.healthLabels.WARNING}`,
      tone: 'warning',
    });
  }

  if (rateContext.hasWarnings) {
    alertChips.push({
      id: 'rate-warning',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${rateContext.source} · ${rateContext.effectiveDate}`,
      tone: 'warning',
    });
  }

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      distributionSegments={[
        { id: 'actual', label: t.budgets.actual, count: Math.max(actual.preferredTotal, 0), className: 'bg-blue-500' },
        { id: 'committed', label: t.budgets.committed, count: Math.max(committed.preferredTotal, 0), className: 'bg-amber-400' },
        { id: 'available', label: t.budgets.available, count: Math.max(available.preferredTotal, 0), className: 'bg-[#147514]' },
      ]}
      insight={`${buildInsight(healthTotals, planned.preferredTotal, t.kpis.summaryCopy)} · ${t.expenses.preferredCurrency}: ${preferredCurrency}`}
      insightIcon={<Info className="h-4 w-4" />}
      metrics={[
        {
          id: 'planned',
          icon: <CircleDollarSign className="h-4 w-4" />,
          label: t.budgets.planned,
          value: planned.preferredTotalLabel,
        },
        {
          id: 'committed',
          icon: <ClipboardList className="h-4 w-4" />,
          label: t.budgets.committed,
          value: committed.preferredTotalLabel,
          valueClassName: 'text-amber-600 dark:text-amber-300',
        },
        {
          id: 'actual',
          icon: <TrendingDown className="h-4 w-4" />,
          label: t.budgets.actual,
          value: actual.preferredTotalLabel,
          valueClassName: 'text-blue-600 dark:text-blue-300',
        },
        {
          id: 'available',
          icon: <ShieldCheck className="h-4 w-4" />,
          label: t.budgets.available,
          value: available.preferredTotalLabel,
          valueClassName: available.preferredTotal < 0
            ? 'text-rose-600 dark:text-rose-300'
            : 'text-[#147514] dark:text-emerald-300',
        },
        {
          id: 'health',
          icon: <AlertTriangle className="h-4 w-4" />,
          label: t.budgets.health,
          value: attentionCount,
          valueClassName: healthTotals.exceededCount > 0
            ? 'text-rose-600 dark:text-rose-300'
            : healthTotals.warningCount > 0
              ? 'text-amber-600 dark:text-amber-300'
              : 'text-[#147514] dark:text-emerald-300',
        },
      ]}
    />
  );
}

function buildBudgetHealthTotals(expenses: Expense[]): BudgetHealthTotals {
  return expenses.reduce<BudgetHealthTotals>((totals, expense) => {
    const health = expense.budgetHealthStatus ?? 'ON_TRACK';
    return {
      warningCount: totals.warningCount + (health === 'WARNING' ? 1 : 0),
      exceededCount: totals.exceededCount + (health === 'EXCEEDED' ? 1 : 0),
    };
  }, { exceededCount: 0, warningCount: 0 });
}

function summarizeAmounts(
  expenses: Expense[],
  getAmount: (expense: Expense) => number,
  summarize: ReturnType<typeof useCurrencyAwareMoney>['summarize'],
) {
  return summarize(expenses.map(expense => ({
    amount: getAmount(expense),
    currency: expense.currency,
  })));
}

function buildInsight(
  healthTotals: BudgetHealthTotals,
  plannedTotal: number,
  summaryCopy: ReturnType<typeof useBudgetsTranslations>['kpis']['summaryCopy'],
) {
  if (healthTotals.exceededCount > 0) {
    return summaryCopy.budgetExceeded;
  }
  if (healthTotals.warningCount > 0) {
    return summaryCopy.budgetWarning;
  }
  if (plannedTotal <= 0) {
    return summaryCopy.noBudget;
  }
  return summaryCopy.budgetStable;
}
