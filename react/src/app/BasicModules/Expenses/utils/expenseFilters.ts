import type { Expense } from '../types/expenses.types';
import type { ExpenseListFilters, ExpenseTotals } from '../types/expenseView.types';

const includesSearch = (value: string | undefined, search: string) =>
  Boolean(value?.toLowerCase().includes(search));

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
    const matchesStatus = filters.statusFilter === 'all' || expense.status === filters.statusFilter;

    return matchesSearch && matchesPeriod && matchesUnit && matchesBusiness && matchesProvider && matchesStatus;
  });
};

export const calculateExpenseTotals = (expenses: Expense[]): ExpenseTotals => {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paid = expenses.reduce((sum, expense) => sum + (expense.amountPaid || 0), 0);
  const overdue = expenses
    .filter(expense => expense.status === 'overdue')
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    total,
    paid,
    pending: total - paid,
    overdue,
    overdueCount: expenses.filter(expense => expense.status === 'overdue').length,
  };
};
