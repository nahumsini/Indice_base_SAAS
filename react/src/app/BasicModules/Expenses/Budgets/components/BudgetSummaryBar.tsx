import { AlertTriangle, CircleDollarSign, ClipboardList, Info, ShieldCheck, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';
import type { Expense } from '../../types/expenses.types';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import {
  getOperationalKpiCurrencyCopy,
  OperationalKpiArea,
  type OperationalAlertChip,
} from '../../../shared/operational';
import {
  useKpiMonetaryAggregates,
  type KpiMonetaryAggregate,
  type KpiMonetaryBatchQuery,
} from '../../../shared/kpiMonetaryApi';
import { useBudgetsResolvedLocale, useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import { formatBudgetCurrency } from '../budgetFormatting';

type BudgetSummaryBarProps = {
  expenses: Expense[];
  healthFilter: string;
  onHealthChange: (health: string) => void;
};

type BudgetHealthTotals = {
  exceededCount: number;
  warningCount: number;
};

export function BudgetSummaryBar({ expenses, healthFilter, onHealthChange }: BudgetSummaryBarProps) {
  const t = useBudgetsTranslations();
  const locale = useBudgetsResolvedLocale();
  const currencyCopy = getOperationalKpiCurrencyCopy(locale);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const healthTotals = buildBudgetHealthTotals(expenses);
  const budgetLineIds = useMemo(() => expenses.map(getBudgetLineNumericId).filter((id): id is number => id !== null), [expenses]);
  const queries = useMemo<KpiMonetaryBatchQuery[]>(() => [
    { key: 'planned', metric: 'BUDGET_PLANNED', preferredCurrency, ids: budgetLineIds },
    { key: 'committed', metric: 'BUDGET_COMMITTED', preferredCurrency, ids: budgetLineIds },
    { key: 'actual', metric: 'BUDGET_ACTUAL', preferredCurrency, ids: budgetLineIds },
    { key: 'available', metric: 'BUDGET_AVAILABLE', preferredCurrency, ids: budgetLineIds },
  ], [budgetLineIds, preferredCurrency]);
  const aggregates = useKpiMonetaryAggregates(queries);
  const planned = aggregates.data.planned;
  const committed = aggregates.data.committed;
  const actual = aggregates.data.actual;
  const available = aggregates.data.available;
  const plannedTotal = planned?.preferredTotal ?? 0;
  const committedTotal = committed?.preferredTotal ?? 0;
  const actualTotal = actual?.preferredTotal ?? 0;
  const availableTotal = available?.preferredTotal ?? 0;
  const moneyLabel = (aggregate?: KpiMonetaryAggregate) => aggregate && !aggregates.loading
    ? formatBudgetCurrency(aggregate.preferredTotal, preferredCurrency, locale)
    : '—';
  const attentionCount = healthTotals.warningCount + healthTotals.exceededCount;
  const alertChips: OperationalAlertChip[] = [{
    id: 'budget-lines',
    label: t.budgets.summary.budgetLines(expenses.length),
    tone: 'neutral',
    active: healthFilter === 'all',
    onClick: () => onHealthChange('all'),
  }];

  if (healthTotals.exceededCount > 0) {
    alertChips.push({
      id: 'exceeded',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${healthTotals.exceededCount} ${t.budgets.healthLabels.EXCEEDED}`,
      tone: 'danger',
      active: healthFilter === 'EXCEEDED',
      onClick: () => onHealthChange('EXCEEDED'),
    });
  }
  if (healthTotals.warningCount > 0) {
    alertChips.push({
      id: 'warning',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `${healthTotals.warningCount} ${t.budgets.healthLabels.WARNING}`,
      tone: 'warning',
      active: healthFilter === 'WARNING',
      onClick: () => onHealthChange('WARNING'),
    });
  }

  const nativeBreakdown = planned?.nativeTotals
    .map(({ amount, currency }) => formatBudgetCurrency(amount, currency, locale))
    .join(' / ') || preferredCurrency;

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      currencyContext={{
        preferredCurrency,
        nativeBreakdown,
        rateLabel: planned?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
        effectiveDate: planned?.exchangeRate.effectiveDate,
        source: planned?.exchangeRate.source,
        isPartial: Boolean(aggregates.error || planned?.partial),
        excludedCount: planned?.excludedRecords ?? (aggregates.error ? expenses.length : 0),
        labels: currencyCopy,
      }}
      distributionSegments={[
        { id: 'actual', label: t.budgets.actual, count: Math.max(actualTotal, 0), className: 'bg-blue-500' },
        { id: 'committed', label: t.budgets.committed, count: Math.max(committedTotal, 0), className: 'bg-amber-400' },
        { id: 'available', label: t.budgets.available, count: Math.max(availableTotal, 0), className: 'bg-[#147514]' },
      ]}
      insight={buildInsight(healthTotals, plannedTotal, t.kpis.summaryCopy)}
      insightIcon={<Info className="h-4 w-4" />}
      metrics={[
        { id: 'planned', icon: <CircleDollarSign className="h-4 w-4" />, label: t.budgets.planned, value: moneyLabel(planned) },
        { id: 'committed', icon: <ClipboardList className="h-4 w-4" />, label: t.budgets.committed, value: moneyLabel(committed), valueClassName: 'text-amber-600 dark:text-amber-300' },
        { id: 'actual', icon: <TrendingDown className="h-4 w-4" />, label: t.budgets.actual, value: moneyLabel(actual), valueClassName: 'text-blue-600 dark:text-blue-300' },
        {
          id: 'available',
          icon: <ShieldCheck className="h-4 w-4" />,
          label: t.budgets.available,
          value: moneyLabel(available),
          valueClassName: availableTotal < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-[#147514] dark:text-emerald-300',
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

function getBudgetLineNumericId(expense: Expense) {
  const candidate = expense.budgetLineId ?? /^budget-line-(\d+)$/.exec(expense.id)?.[1];
  const numericId = Number(candidate);
  return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
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
  if (healthTotals.exceededCount > 0) return summaryCopy.budgetExceeded;
  if (healthTotals.warningCount > 0) return summaryCopy.budgetWarning;
  if (plannedTotal <= 0) return summaryCopy.noBudget;
  return summaryCopy.budgetStable;
}
