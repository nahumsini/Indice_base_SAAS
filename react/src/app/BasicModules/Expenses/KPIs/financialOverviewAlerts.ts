import { BudgetHealthStatus } from '../types/finance-status.types';
import type { FinanceCurrency } from '../types/finance-domain.types';
import type { FinancialOverviewAlert, FinancialOverviewAlertTone, FinancialOverviewDataSet } from '../types/financial-overview.types';
import type { FinanceLocale, FinanceTranslations } from '../translations';

export const formatOverviewMoney = (
  amount: number,
  currency: FinanceCurrency,
  locale: FinanceLocale = 'en-CA',
) => (
  new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount)
);

const tonePriority: Record<FinancialOverviewAlertTone, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export const buildFinancialOverviewAlerts = (
  overview: Omit<FinancialOverviewDataSet, 'alerts'>,
  excludedCurrencies: FinanceCurrency[],
  alertCopy: FinanceTranslations['kpis']['alertCopy'],
  locale: FinanceLocale = 'en-CA',
): FinancialOverviewAlert[] => {
  const alerts: FinancialOverviewAlert[] = [];
  const exceeded = overview.budgetHealthRows.filter(row => row.healthStatus === BudgetHealthStatus.EXCEEDED);
  const warning = overview.budgetHealthRows.filter(row => row.healthStatus === BudgetHealthStatus.WARNING);
  const topProvider = overview.costDrivers.PROVIDER[0];
  const topAccount = overview.costDrivers.ACCOUNTING_ACCOUNT[0];
  const topUnit = overview.costDrivers.UNIT[0];

  if (excludedCurrencies.length > 0) {
    const copy = alertCopy.multiCurrency(excludedCurrencies.join(', '), overview.currency);
    alerts.push({
      id: 'multi-currency',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'warning',
    });
  }

  if (overview.metrics.overdueAmount > 0) {
    const copy = alertCopy.overduePayments(
      overview.metrics.overdueExpenseCount,
      formatOverviewMoney(overview.metrics.overdueAmount, overview.currency, locale),
    );
    alerts.push({
      id: 'overdue-payments',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'critical',
    });
  }

  if (exceeded.length > 0) {
    const copy = alertCopy.budgetExceeded(exceeded.length);
    alerts.push({
      id: 'budget-exceeded',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'critical',
    });
  } else if (warning.length > 0) {
    const copy = alertCopy.budgetWarning(warning.length);
    alerts.push({
      id: 'budget-warning',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'warning',
    });
  }

  if (overview.metrics.dueIn7Days > 0) {
    const copy = alertCopy.cashNext7(formatOverviewMoney(overview.metrics.dueIn7Days, overview.currency, locale));
    alerts.push({
      id: 'cash-next-7',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'warning',
    });
  }

  if (topProvider && topProvider.percentage >= 40) {
    const copy = alertCopy.providerConcentration(topProvider.name, topProvider.percentage.toFixed(1));
    alerts.push({
      id: 'provider-concentration',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: topProvider.percentage > 50 ? 'warning' : 'info',
    });
  }

  if (topAccount && topAccount.percentage > 50) {
    const copy = alertCopy.accountConcentration(topAccount.name, topAccount.percentage.toFixed(1));
    alerts.push({
      id: 'account-concentration',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'warning',
    });
  }

  if (topUnit && topUnit.percentage > 50) {
    const copy = alertCopy.unitConcentration(topUnit.name, topUnit.percentage.toFixed(1));
    alerts.push({
      id: 'unit-concentration',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'warning',
    });
  }

  if (overview.metrics.unpaidExpenseCount > 0) {
    const copy = alertCopy.unpaidExpenses(overview.metrics.unpaidExpenseCount);
    alerts.push({
      id: 'unpaid-expenses',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: overview.metrics.overdueExpenseCount > 0 ? 'critical' : 'warning',
    });
  }

  if (overview.metrics.planned === 0 && overview.metrics.expenseCount > 0) {
    const copy = alertCopy.noBudget;
    alerts.push({
      id: 'no-budget',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'warning',
    });
  }

  if (alerts.length === 0) {
    const copy = alertCopy.healthy;
    alerts.push({
      id: 'healthy',
      message: copy.message,
      recommendation: copy.recommendation,
      title: copy.title,
      tone: 'success',
    });
  }

  return alerts
    .sort((left, right) => tonePriority[left.tone] - tonePriority[right.tone])
    .slice(0, 5);
};
