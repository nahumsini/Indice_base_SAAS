import type { AccountingAccount } from '../AccountingAccounts/types';
import type { PaymentAccount } from '../PaymentAccounts/types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import type { FinanceBudget, FinanceBudgetLine, FinanceCurrency, FinanceExpense } from '../types/finance-domain.types';
import { DEFAULT_FINANCE_CURRENCY } from '../constants/financeCurrencyOptions';
import type { FinanceReferenceData } from '../types/finance-reference.types';
import type {
  FinancialOverviewCostDriver,
  FinancialOverviewCostDriverType,
  FinancialOverviewConcentrationRisk,
  FinancialOverviewDataSet,
} from '../types/financial-overview.types';
import type { FinanceLocale, FinanceTranslations } from '../translations';
import { BudgetHealthStatus, ExpenseStatus, PaymentStatus } from '../types/finance-status.types';
import { buildFinancialOverviewAlerts } from './financialOverviewAlerts';

interface BuildFinancialOverviewParams {
  accountingAccounts: AccountingAccount[];
  budgetLines: FinanceBudgetLine[];
  budgets: FinanceBudget[];
  currentDate?: Date;
  expenses: FinanceExpense[];
  locale?: FinanceLocale;
  paymentAccounts: PaymentAccount[];
  providers: ProviderRecord[];
  referenceData: FinanceReferenceData;
  alertCopy: FinanceTranslations['kpis']['alertCopy'];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const sum = <T>(items: T[], getValue: (item: T) => number) => (
  items.reduce((total, item) => total + getValue(item), 0)
);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isClosed = (expense: FinanceExpense) => (
  expense.status === ExpenseStatus.CANCELLED || expense.status === ExpenseStatus.REJECTED
);

const isActualExpense = (expense: FinanceExpense) => (
  expense.status === ExpenseStatus.PAID || expense.status === ExpenseStatus.CLOSED
);

const isPaymentOpen = (expense: FinanceExpense) => (
  !isClosed(expense) && expense.paymentStatus !== PaymentStatus.PAID
);

const balanceOf = (expense: FinanceExpense) => {
  if (expense.paymentStatus === PaymentStatus.PAID) return 0;
  return Math.max(expense.balance || expense.total - expense.paidAmount, 0);
};

const availableFor = (line: FinanceBudgetLine) => {
  const formula = line.plannedAmount
    - line.committedAmount
    - line.actualExpenseAmount
    - Math.max(line.pettyCashIssuedAmount - line.pettyCashSettledAmount, 0);

  return line.availableAmount !== 0 || formula === 0 ? line.availableAmount : formula;
};

export const deriveBudgetHealthStatus = (
  plannedAmount: number,
  availableAmount: number,
  explicitStatus?: BudgetHealthStatus,
) => {
  if (availableAmount < 0) return BudgetHealthStatus.EXCEEDED;
  if (plannedAmount > 0 && availableAmount <= plannedAmount * 0.2) return BudgetHealthStatus.WARNING;
  return explicitStatus ?? BudgetHealthStatus.ON_TRACK;
};

const dominantCurrency = (expenses: FinanceExpense[], budgetLines: FinanceBudgetLine[]): FinanceCurrency => {
  const counts = new Map<FinanceCurrency, number>();
  [...expenses.map(expense => expense.currency), ...budgetLines.map(line => line.currencyCode ?? DEFAULT_FINANCE_CURRENCY)]
    .filter(Boolean)
    .forEach(currency => counts.set(currency, (counts.get(currency) ?? 0) + 1));

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? DEFAULT_FINANCE_CURRENCY;
};

const labelFrom = <T extends { id: string; name: string }>(
  records: T[],
  id: string | undefined,
  fallback: string,
) => records.find(record => record.id === id)?.name ?? (id ? `${fallback} ${id}` : `Sin ${fallback.toLowerCase()}`);

const accountLabel = (accounts: AccountingAccount[], id?: string) => {
  const account = accounts.find(item => item.id === id || item.code === id);
  if (!account) return id ? `Cuenta ${id}` : 'Sin cuenta contable';
  return `${account.code} - ${account.name}`;
};

const paymentAccountLabel = (accounts: PaymentAccount[], id?: string) => (
  accounts.find(account => account.id === id)?.name ?? (id ? `Cuenta de pago ${id}` : 'Sin cuenta de pago')
);

const groupDrivers = (
  driverType: FinancialOverviewCostDriverType,
  expenses: FinanceExpense[],
  currency: FinanceCurrency,
  getDriver: (expense: FinanceExpense) => { id: string; name: string },
) => {
  const total = sum(expenses, expense => expense.total);
  const groups = new Map<string, FinancialOverviewCostDriver>();

  expenses.forEach((expense) => {
    const driver = getDriver(expense);
    const current = groups.get(driver.id) ?? {
      count: 0,
      currency,
      driverType,
      id: driver.id,
      name: driver.name,
      percentage: 0,
      total: 0,
    };

    current.count += 1;
    current.total += expense.total;
    groups.set(driver.id, current);
  });

  return Array.from(groups.values())
    .map(driver => ({
      ...driver,
      percentage: total > 0 ? (driver.total / total) * 100 : 0,
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);
};

const buildConcentrationRisks = (
  costDrivers: FinancialOverviewDataSet['costDrivers'],
): FinancialOverviewConcentrationRisk[] => (
  [
    costDrivers.PROVIDER[0],
    costDrivers.ACCOUNTING_ACCOUNT[0],
    costDrivers.UNIT[0],
    costDrivers.BUSINESS[0],
  ]
    .filter((driver): driver is FinancialOverviewCostDriver => Boolean(driver))
    .map(driver => ({
      driverType: driver.driverType,
      id: driver.id,
      name: driver.name,
      percentage: driver.percentage,
      tone: driver.percentage > 50 ? 'warning' as const : 'info' as const,
      total: driver.total,
    }))
    .sort((left, right) => right.percentage - left.percentage)
);

export const buildFinancialOverviewData = ({
  accountingAccounts,
  budgetLines,
  budgets,
  currentDate = new Date(),
  expenses,
  locale = 'en-CA',
  paymentAccounts,
  providers,
  referenceData,
  alertCopy,
}: BuildFinancialOverviewParams): FinancialOverviewDataSet => {
  const currency = dominantCurrency(expenses, budgetLines);
  const currencies = Array.from(new Set([
    ...expenses.map(expense => expense.currency),
    ...budgetLines.map(line => line.currencyCode ?? currency),
  ])).filter(Boolean);
  const excludedCurrencies = currencies.filter(item => item !== currency);
  const visibleExpenses = expenses.filter(expense => !isClosed(expense) && expense.currency === currency);
  const visibleBudgetLines = budgetLines.filter(line => (line.currencyCode ?? currency) === currency);
  const today = startOfDay(currentDate);
  const dueInDays = (expense: FinanceExpense, days: number) => {
    const dueDate = parseDate(expense.dueDate);
    if (!dueDate || !isPaymentOpen(expense)) return false;
    const difference = Math.ceil((startOfDay(dueDate).getTime() - today.getTime()) / MS_PER_DAY);
    return difference >= 0 && difference <= days;
  };
  const isOverdue = (expense: FinanceExpense) => {
    const dueDate = parseDate(expense.dueDate);
    return isPaymentOpen(expense) && (expense.paymentStatus === PaymentStatus.OVERDUE || Boolean(dueDate && dueDate < today));
  };
  const actualFromBudgetLines = sum(visibleBudgetLines, line => line.actualExpenseAmount);
  const actualFromPaidExpenses = sum(visibleExpenses.filter(isActualExpense), expense => expense.total);
  const metrics = {
    actual: actualFromBudgetLines > 0 ? actualFromBudgetLines : actualFromPaidExpenses,
    actualFallbackUsed: actualFromBudgetLines === 0 && actualFromPaidExpenses > 0,
    available: sum(visibleBudgetLines, availableFor),
    budgetLineCount: visibleBudgetLines.length,
    committed: sum(visibleBudgetLines, line => line.committedAmount),
    dueIn7Days: sum(visibleExpenses.filter(expense => dueInDays(expense, 7)), balanceOf),
    dueIn30Days: sum(visibleExpenses.filter(expense => dueInDays(expense, 30)), balanceOf),
    expenseCount: visibleExpenses.length,
    overdueAmount: sum(visibleExpenses.filter(isOverdue), balanceOf),
    overdueExpenseCount: visibleExpenses.filter(isOverdue).length,
    pendingPayments: sum(visibleExpenses.filter(isPaymentOpen), balanceOf),
    planned: sum(visibleBudgetLines, line => line.plannedAmount),
    unpaidExpenseCount: visibleExpenses.filter(isPaymentOpen).length,
  };
  const budgetsById = new Map(budgets.map(budget => [budget.id, budget]));
  const budgetHealthRows = visibleBudgetLines.map((line) => {
    const available = availableFor(line);
    const consumed = line.plannedAmount - available;
    return {
      actual: line.actualExpenseAmount,
      available,
      budgetId: line.budgetId,
      budgetName: budgetsById.get(line.budgetId)?.name,
      committed: line.committedAmount,
      currency,
      healthStatus: deriveBudgetHealthStatus(line.plannedAmount, available, line.healthStatus),
      id: line.id,
      name: line.name,
      planned: line.plannedAmount,
      usagePercent: line.plannedAmount > 0 ? Math.max(0, (consumed / line.plannedAmount) * 100) : 0,
    };
  }).sort((left, right) => right.usagePercent - left.usagePercent);
  const costDrivers = {
    ACCOUNTING_ACCOUNT: groupDrivers('ACCOUNTING_ACCOUNT', visibleExpenses, currency, expense => ({ id: expense.accountingAccountId ?? 'missing-account', name: accountLabel(accountingAccounts, expense.accountingAccountId) })),
    BUSINESS: groupDrivers('BUSINESS', visibleExpenses, currency, expense => ({ id: expense.businessId ?? 'missing-business', name: labelFrom(referenceData.businesses, expense.businessId, 'Negocio') })),
    PAYMENT_ACCOUNT: groupDrivers('PAYMENT_ACCOUNT', visibleExpenses, currency, expense => ({ id: expense.paymentAccountId ?? 'missing-payment-account', name: paymentAccountLabel(paymentAccounts, expense.paymentAccountId) })),
    PROVIDER: groupDrivers('PROVIDER', visibleExpenses, currency, expense => ({ id: expense.providerId ?? 'missing-provider', name: labelFrom(providers, expense.providerId, 'Proveedor') })),
    UNIT: groupDrivers('UNIT', visibleExpenses, currency, expense => ({ id: expense.unitId ?? 'missing-unit', name: labelFrom(referenceData.units, expense.unitId, 'Unidad') })),
  };
  const overviewWithoutAlerts: Omit<FinancialOverviewDataSet, 'alerts'> = {
    budgetHealthRows,
    cashRequirements: [
      { amount: metrics.dueIn7Days, count: visibleExpenses.filter(expense => dueInDays(expense, 7)).length, description: 'Pagos con vencimiento en los próximos 7 días.', id: 'due7', label: '7 días', tone: 'warning' },
      { amount: metrics.dueIn30Days, count: visibleExpenses.filter(expense => dueInDays(expense, 30)).length, description: 'Compromiso de caja dentro de 30 días.', id: 'due30', label: '30 días', tone: 'info' },
      { amount: metrics.overdueAmount, count: metrics.overdueExpenseCount, description: 'Saldo vencido con atención prioritaria.', id: 'overdue', label: 'Vencido', tone: 'critical' },
      { amount: metrics.pendingPayments, count: metrics.unpaidExpenseCount, description: 'Total abierto por pagar o parcial.', id: 'pending', label: 'Pendiente', tone: 'info' },
    ],
    concentrationRisks: buildConcentrationRisks(costDrivers),
    costDrivers,
    currencies,
    currency,
    generatedAt: new Date().toISOString(),
    metrics,
  };

  return {
    ...overviewWithoutAlerts,
    alerts: buildFinancialOverviewAlerts(overviewWithoutAlerts, excludedCurrencies, alertCopy, locale),
  };
};
