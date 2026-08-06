import { AlertTriangle, CircleDollarSign, ClipboardList, Coins, Info, ShieldCheck, TrendingDown } from 'lucide-react';
import type { Expense } from '../../types/expenses.types';
import { OperationalKpiArea, type OperationalAlertChip } from '../../../shared/operational';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
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
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const healthTotals = buildBudgetHealthTotals(expenses);
  const budgetLineIds = expenses.map((expense) => expense.budgetLineId ?? expense.id);
  const planned = useKpiMonetaryAggregate({ metric: 'BUDGET_PLANNED', preferredCurrency, ids: budgetLineIds });
  const committed = useKpiMonetaryAggregate({ metric: 'BUDGET_COMMITTED', preferredCurrency, ids: budgetLineIds });
  const actual = useKpiMonetaryAggregate({ metric: 'BUDGET_ACTUAL', preferredCurrency, ids: budgetLineIds });
  const available = useKpiMonetaryAggregate({ metric: 'BUDGET_AVAILABLE', preferredCurrency, ids: budgetLineIds });
  const plannedTotal = planned.data?.preferredTotal ?? 0;
  const committedTotal = committed.data?.preferredTotal ?? 0;
  const actualTotal = actual.data?.preferredTotal ?? 0;
  const availableTotal = available.data?.preferredTotal ?? 0;
  const moneyLabel = (aggregate: typeof planned) => aggregate.data && !aggregate.loading
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: preferredCurrency }).format(aggregate.data.preferredTotal)
    : '—';
  const attentionCount = healthTotals.warningCount + healthTotals.exceededCount;
  const alertChips: OperationalAlertChip[] = [
    {
      id: 'budget-lines',
      label: t.budgets.summary.budgetLines(expenses.length),
      tone: 'neutral',
    },
  ];

  if (planned.data?.nativeTotals.length) {
    alertChips.push({
      id: 'native-breakdown',
      icon: <Coins className="h-3.5 w-3.5" />,
      label: `${t.expenses.summary.metricNative}: ${planned.data.nativeTotals.map(({ amount, currency }) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)).join(' / ')}`,
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

  if (planned.data?.partial) {
    alertChips.push({
      id: 'rate-warning',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${planned.data.excludedRecords} registros excluidos por falta de tipo de cambio`,
      tone: 'warning',
    });
  }

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      distributionSegments={[
        { id: 'actual', label: t.budgets.actual, count: Math.max(actualTotal, 0), className: 'bg-blue-500' },
        { id: 'committed', label: t.budgets.committed, count: Math.max(committedTotal, 0), className: 'bg-amber-400' },
        { id: 'available', label: t.budgets.available, count: Math.max(availableTotal, 0), className: 'bg-[#147514]' },
      ]}
      insight={`${buildInsight(healthTotals, plannedTotal, t.kpis.summaryCopy)} · ${t.expenses.preferredCurrency}: ${preferredCurrency}`}
      insightIcon={<Info className="h-4 w-4" />}
      metrics={[
        {
          id: 'planned',
          icon: <CircleDollarSign className="h-4 w-4" />,
          label: t.budgets.planned,
          value: moneyLabel(planned),
        },
        {
          id: 'committed',
          icon: <ClipboardList className="h-4 w-4" />,
          label: t.budgets.committed,
          value: moneyLabel(committed),
          valueClassName: 'text-amber-600 dark:text-amber-300',
        },
        {
          id: 'actual',
          icon: <TrendingDown className="h-4 w-4" />,
          label: t.budgets.actual,
          value: moneyLabel(actual),
          valueClassName: 'text-blue-600 dark:text-blue-300',
        },
        {
          id: 'available',
          icon: <ShieldCheck className="h-4 w-4" />,
          label: t.budgets.available,
          value: moneyLabel(available),
          valueClassName: availableTotal < 0
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
