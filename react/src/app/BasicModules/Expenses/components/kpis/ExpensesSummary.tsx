import { useEffect, useRef } from 'react';
import { AlertTriangle, CircleDollarSign, Clock3, Percent, ReceiptText } from 'lucide-react';
import type { Expense, ExpenseStatus } from '../../types/expenses.types';
import type { ExpenseListFilters, ExpenseTotals } from '../../types/expenseView.types';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import {
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';
import { getEffectiveExpenseStatus, getExpenseBalance, isExpenseEffectivelyOverdue } from '../../utils/expenseFilters';
import { OperationalKpiArea, getOperationalKpiCurrencyCopy, type OperationalAlertChip } from '../../../shared/operational';
import { useKpiMonetaryAggregate, type KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import { useLanguage } from '../../../../shared/context';

type ExpensesSummaryProps = {
  expenses: Expense[];
  periodExpenses: Expense[];
  carryoverExpenses: Expense[];
  referenceDate: Date;
  preferredCurrency?: string;
  statusFilter: ExpenseListFilters['statusFilter'];
  totals: ExpenseTotals;
  onStatusChange: (status: ExpenseListFilters['statusFilter']) => void;
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
  expenses,
  periodExpenses,
  carryoverExpenses,
  referenceDate,
  onStatusChange,
  preferredCurrency = defaultBusinessCurrency,
  statusFilter,
  totals,
}: ExpensesSummaryProps) {
  const t = useExpensesTranslations();
  const { currentLanguage } = useLanguage();
  const currencyCopy = getOperationalKpiCurrencyCopy(currentLanguage.code);
  const normalizedPreferredCurrency = normalizeBusinessCurrencyCode(preferredCurrency, defaultBusinessCurrency);
  const overdueExpenses = expenses.filter(expense => isExpenseEffectivelyOverdue(expense, referenceDate));
  const ids = expenses.map((expense) => expense.id);
  const totalAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_TOTAL', preferredCurrency: normalizedPreferredCurrency, ids: periodExpenses.map(expense => expense.id) });
  const openAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency: normalizedPreferredCurrency, ids });
  const overdueAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency: normalizedPreferredCurrency, ids: overdueExpenses.map((expense) => expense.id) });
  const carryoverAggregate = useKpiMonetaryAggregate({ metric: 'EXPENSE_BALANCE', preferredCurrency: normalizedPreferredCurrency, ids: carryoverExpenses.map(expense => expense.id) });
  // A partial payment changes amounts without changing the aggregate's selected IDs.
  const balanceRevision = JSON.stringify([referenceDate.toDateString(), expenses.map(expense => [expense.id, expense.total, expense.amountPaid, expense.currency])]);
  const previousBalanceRevision = useRef(balanceRevision);
  const { refresh: refreshTotal } = totalAggregate;
  const { refresh: refreshOpen } = openAggregate;
  const { refresh: refreshOverdue } = overdueAggregate;
  const { refresh: refreshCarryover } = carryoverAggregate;
  useEffect(() => {
    if (previousBalanceRevision.current === balanceRevision) return;
    previousBalanceRevision.current = balanceRevision;
    refreshTotal();
    refreshOpen();
    refreshOverdue();
    refreshCarryover();
  }, [balanceRevision, refreshTotal, refreshOpen, refreshOverdue, refreshCarryover]);
  const aggregates = [totalAggregate, openAggregate, overdueAggregate, carryoverAggregate];
  const formatAggregate = (aggregate: { data: KpiMonetaryAggregate | null; loading: boolean }) => aggregate.data && !aggregate.loading && !aggregate.data.partial
    ? formatBusinessCurrencyAmount(aggregate.data.preferredTotal, normalizedPreferredCurrency)
    : '—';
  const totalAmountLabel = formatAggregate(totalAggregate);
  const openAmountLabel = formatAggregate(openAggregate);
  const overdueAmountLabel = formatAggregate(overdueAggregate);
  const carryoverAmountLabel = formatAggregate(carryoverAggregate);
  const nativeTotalAmountLabel = totalAggregate.data?.nativeTotals
    .map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency)).join(' / ') || normalizedPreferredCurrency;
  const paidCount = periodExpenses.filter((expense) => getEffectiveExpenseStatus(expense, referenceDate) === 'paid').length;
  const paidPercentage = periodExpenses.length > 0 ? (paidCount / periodExpenses.length) * 100 : 0;
  const statusMetrics = statusConfig.map(config => {
    const statusExpenses = expenses.filter(expense => getEffectiveExpenseStatus(expense, referenceDate) === config.status);
    return {
      ...config,
      amount: statusExpenses.length,
      amountLabel: String(statusExpenses.length),
      count: statusExpenses.length,
      label: t.expenses.table.statuses[config.status] ?? config.status,
      percentage: expenses.length > 0 ? (statusExpenses.length / expenses.length) * 100 : 0,
    };
  });

  const openPaymentCount = expenses.filter(expense => getExpenseBalance(expense) > 0 && getEffectiveExpenseStatus(expense, referenceDate) !== 'paid').length;
  const balanceInsight = expenses.length === 0
    ? t.expenses.summary.insightEmpty
    : totals.overdueCount > 0
    ? t.expenses.summary.insightOverdue(totals.overdueCount, overdueAmountLabel)
    : openPaymentCount > 0
      ? t.expenses.summary.insightOpenBalance(openPaymentCount, paidPercentage.toFixed(0))
      : t.expenses.summary.insightAllSettled;
  const insight = carryoverExpenses.length > 0
    ? `${balanceInsight} ${t.expenses.summary.insightCarryover(carryoverExpenses.length, carryoverAmountLabel)}`
    : balanceInsight;

  const alertChips: OperationalAlertChip[] = [];
  if (totals.overdueCount > 0) alertChips.push({
    id: 'overdue',
    tone: 'danger',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: t.expenses.summary.overdue(totals.overdueCount),
    active: statusFilter === 'overdue',
    onClick: () => onStatusChange('overdue'),
  });
  if (openPaymentCount > 0) alertChips.push({
    id: 'open',
    tone: 'warning',
    icon: <Clock3 className="h-3.5 w-3.5" />,
    label: t.expenses.summary.openBalanceChip(openPaymentCount),
    active: statusFilter === 'pending_and_overdue',
    onClick: () => onStatusChange('pending_and_overdue'),
  });

  return <OperationalKpiArea
    alertChips={alertChips}
    metrics={[
      { id: 'total', icon: <ReceiptText className="h-4 w-4" />, label: t.expenses.summary.metricPeriodTotal(periodExpenses.length), value: totalAmountLabel, active: statusFilter === 'all', onClick: () => onStatusChange('all') },
      { id: 'open', icon: <CircleDollarSign className="h-4 w-4" />, label: t.expenses.summary.metricOpenBalance, value: openAmountLabel, valueClassName: 'text-amber-600', active: statusFilter === 'pending_and_overdue', onClick: () => onStatusChange('pending_and_overdue') },
      { id: 'overdue', icon: <Clock3 className="h-4 w-4" />, label: t.expenses.summary.metricOverdue, value: overdueAmountLabel, valueClassName: 'text-rose-600', active: statusFilter === 'overdue', onClick: () => onStatusChange('overdue') },
      ...(carryoverExpenses.length > 0 ? [{ id: 'carryover', icon: <Clock3 className="h-4 w-4" />, label: t.expenses.summary.metricCarryover, value: carryoverAmountLabel, valueClassName: 'text-rose-600' }] : []),
      { id: 'settled', icon: <Percent className="h-4 w-4" />, label: t.expenses.summary.metricCompliance, value: periodExpenses.length > 0 ? `${paidPercentage.toFixed(0)}%` : '—', valueClassName: 'text-sky-600', active: statusFilter === 'paid', onClick: () => onStatusChange('paid') },
    ]}
    distributionSegments={statusMetrics.map((metric) => ({
      id: metric.status,
      label: metric.label,
      count: metric.count,
      className: metric.barClass,
      active: statusFilter === metric.status,
      onClick: () => onStatusChange(metric.status),
    }))}
    insight={insight}
    insightIcon={<AlertTriangle className="h-4 w-4" />}
    currencyContext={{
      preferredCurrency: normalizedPreferredCurrency,
      nativeBreakdown: nativeTotalAmountLabel,
      rateLabel: totalAggregate.data?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
      effectiveDate: totalAggregate.data?.exchangeRate.effectiveDate,
      source: totalAggregate.data?.exchangeRate.source,
      isPartial: aggregates.some(aggregate => Boolean(aggregate.error || aggregate.data?.partial)),
      excludedCount: Math.max(...aggregates.map(aggregate => aggregate.data?.excludedRecords ?? (aggregate.error ? expenses.length : 0))),
      labels: currencyCopy,
    }}
  />;
}
