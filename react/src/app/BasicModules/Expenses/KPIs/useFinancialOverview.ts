import { useEffect, useMemo, useState } from 'react';
import type { AccountingAccount } from '../AccountingAccounts/types';
import type { PaymentAccount } from '../PaymentAccounts/types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { toFinanceExpense } from '../adapters/expense.adapter';
import {
  accountingAccountsService,
  budgetLinesService,
  budgetsService,
  expensesService,
  financeReferenceDataService,
  paymentAccountsService,
  providersService,
  toFinanceApiErrorMessage,
} from '../services';
import type { Expense } from '../types/expenses.types';
import type { FinanceBudget, FinanceBudgetLine, FinanceExpense } from '../types/finance-domain.types';
import type { FinanceReferenceData } from '../types/finance-reference.types';
import { BudgetStatus } from '../types/finance-status.types';
import { getFinanceTranslations, type FinanceLocale, type FinanceTranslations } from '../translations';
import type { PeriodFilter } from '../types/expenseView.types';
import { buildFinancialOverviewData, deriveBudgetHealthStatus } from './financialOverviewCalculations';

interface FinancialOverviewSources {
  accountingAccounts: AccountingAccount[];
  budgetLines: FinanceBudgetLine[];
  budgets: FinanceBudget[];
  expenses: FinanceExpense[];
  paymentAccounts: PaymentAccount[];
  providers: ProviderRecord[];
  referenceData: FinanceReferenceData;
}

interface UseFinancialOverviewParams {
  alertCopy?: FinanceTranslations['kpis']['alertCopy'];
  customEndDate?: string;
  customStartDate?: string;
  currentDate?: Date;
  fallbackExpenses: Expense[];
  fallbackProviders: ProviderRecord[];
  locale?: FinanceLocale;
  periodFilter?: PeriodFilter;
  refreshKey?: number;
}

const emptyReferenceData: FinanceReferenceData = {
  businesses: [],
  units: [],
  users: [],
};

const fulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => (
  result.status === 'fulfilled'
);

const dateText = (date?: Date) => (date ? date.toISOString().slice(0, 10) : '');

const parseLocalDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getPeriodRange = (
  periodFilter: PeriodFilter,
  currentDate: Date,
  customStartDate?: string,
  customEndDate?: string,
) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  switch (periodFilter) {
    case 'last_month':
      return {
        end: endOfDay(new Date(year, month, 0)),
        start: new Date(year, month - 1, 1),
      };
    case 'two_months_ago':
      return {
        end: endOfDay(new Date(year, month - 1, 0)),
        start: new Date(year, month - 2, 1),
      };
    case 'this_year':
      return {
        end: endOfDay(new Date(year, 11, 31)),
        start: new Date(year, 0, 1),
      };
    case 'last_year':
      return {
        end: endOfDay(new Date(year - 1, 11, 31)),
        start: new Date(year - 1, 0, 1),
      };
    case 'custom':
      return {
        end: customEndDate ? endOfDay(parseLocalDate(customEndDate) ?? currentDate) : endOfDay(new Date(2999, 11, 31)),
        start: customStartDate ? parseLocalDate(customStartDate) ?? new Date(1900, 0, 1) : new Date(1900, 0, 1),
      };
    case 'this_month':
    default:
      return {
        end: endOfDay(new Date(year, month + 1, 0)),
        start: new Date(year, month, 1),
      };
  }
};

const isWithinRange = (date: Date | null, range: { start: Date; end: Date }) => (
  Boolean(date && date >= range.start && date <= range.end)
);

const rangesOverlap = (
  left: { start: Date; end: Date },
  right: { start: Date; end: Date },
) => left.start <= right.end && right.start <= left.end;

const fallbackBudgetLineFromExpense = (expense: Expense): FinanceBudgetLine => {
  const available = Math.max((expense.total || expense.amount) - (expense.amountPaid ?? 0), 0);

  return {
    actualExpenseAmount: expense.amountPaid ?? 0,
    availableAmount: available,
    budgetId: expense.budgetId ?? 'fallback-budget',
    businessId: expense.business || undefined,
    committedAmount: 0,
    companyId: 'fallback-company',
    createdAt: dateText(expense.createdAt),
    currencyCode: expense.currency,
    id: expense.id,
    name: expense.concept,
    period: dateText(expense.startDate ?? expense.date),
    pettyCashIssuedAmount: 0,
    pettyCashSettledAmount: 0,
    plannedAmount: expense.total || expense.amount,
    status: BudgetStatus.ACTIVE,
    unitId: expense.businessUnit || undefined,
    updatedAt: dateText(expense.updatedAt),
    healthStatus: deriveBudgetHealthStatus(expense.total || expense.amount, available),
  };
};

const buildFallbackSources = (
  fallbackExpenses: Expense[],
  fallbackProviders: ProviderRecord[],
): FinancialOverviewSources => ({
  accountingAccounts: [],
  budgetLines: fallbackExpenses
    .filter(expense => expense.type === 'budget')
    .map(fallbackBudgetLineFromExpense),
  budgets: [],
  expenses: fallbackExpenses
    .filter(expense => expense.type !== 'budget')
    .map(expense => toFinanceExpense(expense, 'fallback-company')),
  paymentAccounts: [],
  providers: fallbackProviders,
  referenceData: emptyReferenceData,
});

export function useFinancialOverview({
  alertCopy = getFinanceTranslations('en-CA').kpis.alertCopy,
  customEndDate,
  customStartDate,
  currentDate,
  fallbackExpenses,
  fallbackProviders,
  locale = 'en-CA',
  periodFilter = 'this_month',
  refreshKey = 0,
}: UseFinancialOverviewParams) {
  const [sources, setSources] = useState<FinancialOverviewSources>(() => (
    buildFallbackSources(fallbackExpenses, fallbackProviders)
  ));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackWarnings, setFallbackWarnings] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setIsLoading(true);
      const [
        providersResult,
        expensesResult,
        budgetLinesResult,
        budgetsResult,
        accountingAccountsResult,
        paymentAccountsResult,
        referenceDataResult,
      ] = await Promise.allSettled([
        providersService.getProviderRecords(),
        expensesService.getFinanceExpenses(),
        budgetLinesService.getBudgetLines(),
        budgetsService.getBudgets(),
        accountingAccountsService.getAccountingAccounts(),
        paymentAccountsService.getPaymentAccounts(),
        financeReferenceDataService.getReferenceData(),
      ]);

      if (!isMounted) return;

      const fallbackSources = buildFallbackSources(fallbackExpenses, fallbackProviders);
      const nextWarnings: string[] = [];
      const rejectedResults = [
        providersResult,
        expensesResult,
        budgetLinesResult,
        budgetsResult,
        accountingAccountsResult,
        paymentAccountsResult,
        referenceDataResult,
      ].filter(result => result.status === 'rejected') as PromiseRejectedResult[];

      if (!fulfilled(providersResult)) nextWarnings.push('providers');
      if (!fulfilled(expensesResult)) nextWarnings.push('expenses');
      if (!fulfilled(budgetLinesResult)) nextWarnings.push('budget lines');
      if (!fulfilled(budgetsResult)) nextWarnings.push('budgets');
      if (!fulfilled(accountingAccountsResult)) nextWarnings.push('accounting accounts');
      if (!fulfilled(paymentAccountsResult)) nextWarnings.push('payment accounts');
      if (!fulfilled(referenceDataResult)) nextWarnings.push('organization references');

      setSources({
        accountingAccounts: fulfilled(accountingAccountsResult) ? accountingAccountsResult.value : [],
        budgetLines: fulfilled(budgetLinesResult) ? budgetLinesResult.value : fallbackSources.budgetLines,
        budgets: fulfilled(budgetsResult) ? budgetsResult.value : fallbackSources.budgets,
        expenses: fulfilled(expensesResult) ? expensesResult.value : fallbackSources.expenses,
        paymentAccounts: fulfilled(paymentAccountsResult) ? paymentAccountsResult.value : [],
        providers: fulfilled(providersResult) ? providersResult.value : fallbackSources.providers,
        referenceData: fulfilled(referenceDataResult) ? referenceDataResult.value : emptyReferenceData,
      });
      setFallbackWarnings(nextWarnings);
      setErrorMessage(rejectedResults[0] ? toFinanceApiErrorMessage(rejectedResults[0].reason) : '');
      setIsLoading(false);
    };

    loadOverview().catch((error) => {
      if (!isMounted) return;
      setSources(buildFallbackSources(fallbackExpenses, fallbackProviders));
      setFallbackWarnings(['overview']);
      setErrorMessage(toFinanceApiErrorMessage(error));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [fallbackExpenses, fallbackProviders, refreshKey]);

  const overview = useMemo(() => {
    const referenceDate = currentDate ?? new Date();
    const periodRange = getPeriodRange(periodFilter, referenceDate, customStartDate, customEndDate);
    const budgetsById = new Map(sources.budgets.map(budget => [budget.id, budget]));
    const filteredExpenses = sources.expenses.filter(expense => (
      isWithinRange(parseLocalDate(expense.expenseDate), periodRange)
    ));
    const filteredBudgetLines = sources.budgetLines.filter((line) => {
      const budget = budgetsById.get(line.budgetId);
      const budgetStart = parseLocalDate(budget?.periodStart);
      const budgetEnd = parseLocalDate(budget?.periodEnd);

      if (budgetStart && budgetEnd) {
        return rangesOverlap({ start: budgetStart, end: endOfDay(budgetEnd) }, periodRange);
      }

      return isWithinRange(parseLocalDate(line.period), periodRange) || !line.period;
    });

    return buildFinancialOverviewData({
      ...sources,
      alertCopy,
      budgetLines: filteredBudgetLines,
      currentDate: referenceDate,
      expenses: filteredExpenses,
      locale,
    });
  }, [alertCopy, currentDate, customEndDate, customStartDate, locale, periodFilter, sources]);

  return {
    ...overview,
    errorMessage,
    fallbackWarnings,
    isLoading,
  };
}
