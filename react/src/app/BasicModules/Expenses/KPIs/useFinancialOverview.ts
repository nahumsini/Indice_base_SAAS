import { useEffect, useMemo, useState } from 'react';
import type { AccountingAccount } from '../AccountingAccounts/types';
import type { PaymentAccount } from '../PaymentAccounts/types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
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
import type { FinanceBudget, FinanceBudgetLine, FinanceCurrency, FinanceExpense } from '../types/finance-domain.types';
import type { FinanceReferenceData } from '../types/finance-reference.types';
import { dateKey, daysAfter, isIncludedExpense, isOpenExpense, isOverdueExpense } from './expenseKpiSelectors';
import { getFinanceTranslations, type FinanceLocale, type FinanceTranslations } from '../translations';
import type { PeriodFilter } from '../types/expenseView.types';
import { buildFinancialOverviewData } from './financialOverviewCalculations';

interface FinancialOverviewSources {
  asOfDate?: string;
  timeZone?: string;
  accountingAccounts: AccountingAccount[];
  budgetLines: FinanceBudgetLine[];
  budgets: FinanceBudget[];
  expenses: FinanceExpense[];
  paymentAccounts: PaymentAccount[];
  providers: ProviderRecord[];
  referenceData: FinanceReferenceData;
}

interface UseFinancialOverviewParams {
  accountingAccountId?: string;
  alertCopy?: FinanceTranslations['kpis']['alertCopy'];
  customEndDate?: string;
  customStartDate?: string;
  currentDate?: Date;
  convertAmount?: (amount: number, nativeCurrency: FinanceCurrency) => number;
  fallbackExpenses: Expense[];
  fallbackProviders: ProviderRecord[];
  locale?: FinanceLocale;
  businessId?: string;
  periodFilter?: PeriodFilter;
  paymentStatus?: string;
  providerId?: string;
  search?: string;
  refreshKey?: number;
  targetCurrency?: FinanceCurrency;
  unitId?: string;
}

const emptyReferenceData: FinanceReferenceData = {
  businesses: [],
  units: [],
  users: [],
};

const fulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => (
  result.status === 'fulfilled'
);

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
        end: customEndDate ? endOfDay(parseLocalDate(customEndDate) ?? currentDate) : endOfDay(new Date(year, month + 1, 0)),
        start: customStartDate ? parseLocalDate(customStartDate) ?? new Date(year, month, 1) : new Date(year, month, 1),
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

const getPreviousPeriodRange = (
  periodFilter: PeriodFilter,
  currentDate: Date,
  range: { start: Date; end: Date },
) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  if (periodFilter === 'this_month') return { end: endOfDay(new Date(year, month, 0)), start: new Date(year, month - 1, 1) };
  if (periodFilter === 'last_month') return { end: endOfDay(new Date(year, month - 1, 0)), start: new Date(year, month - 2, 1) };
  if (periodFilter === 'two_months_ago') return { end: endOfDay(new Date(year, month - 2, 0)), start: new Date(year, month - 3, 1) };
  if (periodFilter === 'this_year') return { end: endOfDay(new Date(year - 1, 11, 31)), start: new Date(year - 1, 0, 1) };
  if (periodFilter === 'last_year') return { end: endOfDay(new Date(year - 2, 11, 31)), start: new Date(year - 2, 0, 1) };
  const dayCount = daysAfter(dateKey(range.end), dateKey(range.start)) + 1;
  const end = endOfDay(new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate() - 1));
  const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate() - dayCount);
  return { end, start };
};

const buildFallbackSources = (
  fallbackExpenses: Expense[],
  fallbackProviders: ProviderRecord[],
): FinancialOverviewSources => ({
  accountingAccounts: [],
  budgetLines: [],
  budgets: [],
  expenses: [],
  paymentAccounts: [],
  providers: [],
  referenceData: emptyReferenceData,
});

export function useFinancialOverview({
  accountingAccountId = 'all',
  alertCopy = getFinanceTranslations('en-CA').kpis.alertCopy,
  customEndDate,
  customStartDate,
  currentDate,
  convertAmount,
  fallbackExpenses,
  fallbackProviders,
  locale = 'en-CA',
  businessId = 'all',
  periodFilter = 'this_month',
  paymentStatus = 'all',
  providerId = 'all',
  refreshKey = 0,
  search = '',
  targetCurrency,
  unitId = 'all',
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
        expensesService.getFinanceExpenseSnapshot(),
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
        expenses: fulfilled(expensesResult) ? expensesResult.value.expenses : fallbackSources.expenses,
        asOfDate: fulfilled(expensesResult) ? expensesResult.value.asOfDate : undefined,
        timeZone: fulfilled(expensesResult) ? expensesResult.value.timeZone : undefined,
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

  const scopedData = useMemo(() => {
    const referenceDate = currentDate ?? parseLocalDate(sources.asOfDate) ?? new Date();
    const periodRange = getPeriodRange(periodFilter, referenceDate, customStartDate, customEndDate);
    const comparisonRange = getPreviousPeriodRange(periodFilter, referenceDate, periodRange);
    const budgetsById = new Map(sources.budgets.map(budget => [budget.id, budget]));
    const matchesPaymentStatus = (expense: FinanceExpense) => (
      paymentStatus === 'all'
      || (paymentStatus === 'OPEN' && isOpenExpense(expense))
      || (paymentStatus === 'OVERDUE' ? isOverdueExpense(expense, sources.asOfDate) : expense.paymentStatus === paymentStatus)
    );
    const matchesDimensions = (expense: FinanceExpense) => (
      (!search.trim() || [expense.folio, expense.concept, expense.description, expense.reference].some(value => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())))
      && (unitId === 'all' || expense.unitId === unitId)
      && (businessId === 'all' || expense.businessId === businessId)
      && (providerId === 'all' || expense.providerId === providerId)
      && (accountingAccountId === 'all' || expense.accountingAccountId === accountingAccountId)
      && matchesPaymentStatus(expense)
    );
    const paymentExpenses = sources.expenses.filter(matchesDimensions);
    const filteredExpenses = sources.expenses.filter(expense => (
      isIncludedExpense(expense) && isWithinRange(parseLocalDate(expense.expenseDate), periodRange) && matchesDimensions(expense)
    ));
    const comparisonExpenses = sources.expenses.filter(expense => (
      isIncludedExpense(expense) && isWithinRange(parseLocalDate(expense.expenseDate), comparisonRange) && matchesDimensions(expense)
    ));
    const filterBudgetLines = (range: { start: Date; end: Date }) => sources.budgetLines.filter((line) => {
      if (unitId !== 'all' && line.unitId !== unitId) return false;
      if (businessId !== 'all' && line.businessId !== businessId) return false;
      const budget = budgetsById.get(line.budgetId);
      const budgetStart = parseLocalDate(budget?.periodStart);
      const budgetEnd = parseLocalDate(budget?.periodEnd);

      if (budgetStart && budgetEnd) {
        return rangesOverlap({ start: budgetStart, end: endOfDay(budgetEnd) }, range);
      }

      return isWithinRange(parseLocalDate(line.period), range) || !line.period;
    });
    const filteredBudgetLines = filterBudgetLines(periodRange);
    const comparisonBudgetLines = filterBudgetLines(comparisonRange);

    return { comparisonBudgetLines, comparisonExpenses, comparisonRange, filteredBudgetLines, filteredExpenses, paymentExpenses, periodRange, referenceDate };
  }, [accountingAccountId, businessId, currentDate, customEndDate, customStartDate, paymentStatus, periodFilter, providerId, search, sources, unitId]);

  const overview = useMemo(() => {
    return buildFinancialOverviewData({
      ...sources,
      alertCopy,
      budgetLines: scopedData.filteredBudgetLines,
      currentDate: scopedData.referenceDate,
      convertAmount,
      expenses: scopedData.filteredExpenses,
      locale,
      targetCurrency,
    });
  }, [alertCopy, convertAmount, locale, scopedData, sources, targetCurrency]);

  const comparisonOverview = useMemo(() => buildFinancialOverviewData({
    ...sources,
    alertCopy,
    budgetLines: scopedData.comparisonBudgetLines,
    currentDate: scopedData.comparisonRange.end,
    convertAmount,
    expenses: scopedData.comparisonExpenses,
    locale,
    targetCurrency,
  }), [alertCopy, convertAmount, locale, scopedData, sources, targetCurrency]);

  return {
    ...overview,
    comparisonExpenses: scopedData.comparisonExpenses,
    paymentExpenses: scopedData.paymentExpenses,
    periodRange: scopedData.periodRange,
    comparisonRange: scopedData.comparisonRange,
    comparisonOverview,
    asOfDate: sources.asOfDate,
    timeZone: sources.timeZone,
    errorMessage,
    fallbackWarnings,
    filteredBudgetLines: scopedData.filteredBudgetLines,
    filteredExpenses: scopedData.filteredExpenses,
    isLoading,
    sources,
  };
}
