import type { Expense } from '../types/expenses.types';
import type { ExpenseListFilters, ExpenseTotals } from '../types/expenseView.types';
import {
  convertBusinessCurrencyAmount,
  defaultBusinessCurrency,
  normalizeBusinessCurrencyCode,
  type BusinessExchangeRatesPerUsd,
} from '../../shared/businessCurrency';

const includesSearch = (value: string | undefined, search: string) =>
  Boolean(value?.toLowerCase().includes(search));

const startOfLocalDay = (dateValue: Date) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getExpensePaidAmount = (expense: Expense) => Math.max(expense.amountPaid ?? 0, 0);

export const getExpenseBalance = (expense: Expense) => Math.max(expense.total - getExpensePaidAmount(expense), 0);

const convertExpenseAmount = (
  amount: number,
  expense: Expense,
  preferredCurrency = defaultBusinessCurrency,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) => convertBusinessCurrencyAmount(
  amount,
  normalizeBusinessCurrencyCode(expense.currency),
  normalizeBusinessCurrencyCode(preferredCurrency),
  exchangeRatesPerUsd,
);

export const isExpensePastDue = (expense: Expense, referenceDate = new Date()) => (
  Boolean(expense.dueDate)
  && startOfLocalDay(expense.dueDate).getTime() < startOfLocalDay(referenceDate).getTime()
);

export const isExpenseEffectivelyOverdue = (expense: Expense, referenceDate = new Date()) => (
  expense.status === 'overdue'
  || (
    expense.status !== 'paid'
    && expense.status !== 'audited'
    && getExpenseBalance(expense) > 0
    && isExpensePastDue(expense, referenceDate)
  )
);

export const getEffectiveExpenseStatus = (expense: Expense): Expense['status'] => {
  if (expense.status === 'audited') return 'audited';
  if (getExpenseBalance(expense) <= 0) return 'paid';
  if (getExpensePaidAmount(expense) > 0 || expense.status === 'partial') return 'partial';
  if (isExpenseEffectivelyOverdue(expense)) return 'overdue';
  return 'pending';
};

const isInPeriod = (dateValue: Date, periodFilter: ExpenseListFilters['periodFilter']) => {
  const date = new Date(dateValue);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (periodFilter) {
    case 'this_month':
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    case 'last_month': {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }
    case 'two_months_ago': {
      const twoMonthsAgo = currentMonth - 2;
      const targetMonth = twoMonthsAgo < 0 ? 12 + twoMonthsAgo : twoMonthsAgo;
      const targetYear = twoMonthsAgo < 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
    }
    case 'this_year':
      return date.getFullYear() === currentYear;
    case 'last_year':
      return date.getFullYear() === currentYear - 1;
    case 'custom':
    default:
      return true;
  }
};

export const filterExpenses = (expenses: Expense[], filters: ExpenseListFilters) => {
  const search = filters.searchTerm.toLowerCase();

  return expenses.filter((expense) => {
    const matchesSearch = !search
      || includesSearch(expense.folio, search)
      || includesSearch(expense.concept, search)
      || includesSearch(expense.description, search)
      || includesSearch(expense.providerName, search);
    const matchesPeriod = isInPeriod(expense.date, filters.periodFilter);
    const matchesUnit = filters.businessUnitFilter === 'all' || expense.businessUnit === filters.businessUnitFilter;
    const matchesBusiness = filters.businessFilter === 'all' || expense.business === filters.businessFilter;
    const matchesProvider = filters.providerFilter === 'all' || expense.providerId === filters.providerFilter;
    const effectiveStatus = getEffectiveExpenseStatus(expense);
    const hasOverdueBalance = isExpenseEffectivelyOverdue(expense);
    const matchesStatus = filters.statusFilter === 'all'
      || (filters.statusFilter === 'pending_and_overdue' && (effectiveStatus === 'pending' || hasOverdueBalance))
      || (filters.statusFilter === 'overdue' && hasOverdueBalance)
      || effectiveStatus === filters.statusFilter;

    return matchesSearch && matchesPeriod && matchesUnit && matchesBusiness && matchesProvider && matchesStatus;
  });
};

export const calculateExpenseTotals = (
  expenses: Expense[],
  preferredCurrency = defaultBusinessCurrency,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
): ExpenseTotals => {
  const total = expenses.reduce((sum, expense) => (
    sum + convertExpenseAmount(expense.total, expense, preferredCurrency, exchangeRatesPerUsd)
  ), 0);
  const paid = expenses.reduce((sum, expense) => (
    sum + convertExpenseAmount(getExpensePaidAmount(expense), expense, preferredCurrency, exchangeRatesPerUsd)
  ), 0);
  const overdue = expenses
    .filter(expense => isExpenseEffectivelyOverdue(expense))
    .reduce((sum, expense) => (
      sum + convertExpenseAmount(getExpenseBalance(expense), expense, preferredCurrency, exchangeRatesPerUsd)
    ), 0);

  return {
    total,
    paid,
    pending: Math.max(total - paid, 0),
    overdue,
    overdueCount: expenses.filter(expense => isExpenseEffectivelyOverdue(expense)).length,
  };
};
