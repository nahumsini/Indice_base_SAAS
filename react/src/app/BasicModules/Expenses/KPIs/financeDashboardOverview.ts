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
} from '../services';
import type { PeriodFilter } from '../types/expenseView.types';
import type { FinanceBudget, FinanceBudgetLine, FinanceExpense } from '../types/finance-domain.types';
import type { FinanceReferenceData } from '../types/finance-reference.types';
import type { FinancialOverviewDataSet } from '../types/financial-overview.types';
import { getFinanceTranslations, type FinanceLocale } from '../translations';
import { buildFinancialOverviewData } from './financialOverviewCalculations';

interface FinancialOverviewSources {
  accountingAccounts: AccountingAccount[];
  budgetLines: FinanceBudgetLine[];
  budgets: FinanceBudget[];
  expenses: FinanceExpense[];
  paymentAccounts: PaymentAccount[];
  providers: ProviderRecord[];
  referenceData: FinanceReferenceData;
}

interface LoadFinanceDashboardOverviewParams {
  currentDate?: Date;
  locale?: FinanceLocale | string;
  periodFilter?: PeriodFilter;
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

const filterSourcesByPeriod = (
  sources: FinancialOverviewSources,
  range: { start: Date; end: Date },
): FinancialOverviewSources => {
  const budgetsById = new Map(sources.budgets.map(budget => [budget.id, budget]));
  const expenses = sources.expenses.filter(expense => (
    isWithinRange(parseLocalDate(expense.expenseDate), range)
  ));
  const budgetLines = sources.budgetLines.filter((line) => {
    const budget = budgetsById.get(line.budgetId);
    const budgetStart = parseLocalDate(budget?.periodStart);
    const budgetEnd = parseLocalDate(budget?.periodEnd);

    if (budgetStart && budgetEnd) {
      return rangesOverlap({ start: budgetStart, end: endOfDay(budgetEnd) }, range);
    }

    return isWithinRange(parseLocalDate(line.period), range) || !line.period;
  });

  return {
    ...sources,
    budgetLines,
    expenses,
  };
};

export async function loadFinanceDashboardOverview({
  currentDate = new Date(),
  locale = 'en-CA',
  periodFilter = 'this_month',
}: LoadFinanceDashboardOverviewParams = {}): Promise<FinancialOverviewDataSet> {
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
  const sources: FinancialOverviewSources = {
    accountingAccounts: fulfilled(accountingAccountsResult) ? accountingAccountsResult.value : [],
    budgetLines: fulfilled(budgetLinesResult) ? budgetLinesResult.value : [],
    budgets: fulfilled(budgetsResult) ? budgetsResult.value : [],
    expenses: fulfilled(expensesResult) ? expensesResult.value : [],
    paymentAccounts: fulfilled(paymentAccountsResult) ? paymentAccountsResult.value : [],
    providers: fulfilled(providersResult) ? providersResult.value : [],
    referenceData: fulfilled(referenceDataResult) ? referenceDataResult.value : emptyReferenceData,
  };
  const range = getPeriodRange(periodFilter, currentDate);
  const filteredSources = filterSourcesByPeriod(sources, range);

  return buildFinancialOverviewData({
    ...filteredSources,
    alertCopy: getFinanceTranslations(locale).kpis.alertCopy,
    currentDate,
    locale: getFinanceTranslations(locale).locale as FinanceLocale,
  });
}
