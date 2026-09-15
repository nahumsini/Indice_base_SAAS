import type { Expense } from '../types/expenses.types';
import type { ExpenseListFilters } from '../types/expenseView.types';

const includesSearch = (value: string | undefined, search: string) =>
  Boolean(value?.toLowerCase().includes(search));

const startOfLocalDay = (dateValue: Date) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getExpensePaidAmount = (expense: Expense) => Math.max(expense.amountPaid ?? 0, 0);

export const getExpenseBalance = (expense: Expense) => Math.max(expense.total - getExpensePaidAmount(expense), 0);

export const canEditExpense = (expense: Expense) => (
  !expense.originFund && !expense.accountingPosted && !expense.purchaseOrderId
  && !['CLOSED', 'CANCELLED', 'REJECTED'].includes(expense.backendStatus?.toUpperCase() ?? '')
);

export const canDeleteExpense = (expense: Expense) => !expense.originFund
  && expense.status !== 'audited' && expense.backendStatus?.toUpperCase() !== 'CLOSED'
  && expense.auditStatus?.toUpperCase() !== 'AUDITED'
  && (!expense.purchaseOrderId || expense.purchaseOrderReceived === false);

export const canPayExpense = (expense: Expense) => !expense.originFund && expense.type !== 'budget'
  && expense.status !== 'audited' && expense.auditStatus?.toUpperCase() !== 'AUDITED'
  && !['CANCELLED', 'REJECTED', 'CLOSED', 'PAID'].includes(expense.backendStatus?.toUpperCase() ?? '')
  && getExpenseBalance(expense) > 0;

export const canReclassifyExpense = (expense: Expense) => (
  /^\d+$/.test(expense.id) && !expense.originFund && !expense.accountingPosted
  && !['CANCELLED', 'REJECTED'].includes(expense.backendStatus?.toUpperCase() ?? '')
  && expense.version !== undefined
);

export const isExpensePastDue = (expense: Expense, referenceDate = new Date()) => (
  Boolean(expense.dueDate)
  && startOfLocalDay(expense.dueDate).getTime() < startOfLocalDay(referenceDate).getTime()
);

export const isExpenseEffectivelyOverdue = (expense: Expense, referenceDate = new Date()) => (
  expense.status !== 'paid'
  && expense.status !== 'audited'
  && !['PAID', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(expense.backendStatus?.toUpperCase() ?? '')
  && getExpenseBalance(expense) > 0
  && (expense.status === 'overdue' || isExpensePastDue(expense, referenceDate))
);

export const getEffectiveExpenseStatus = (expense: Expense, referenceDate = new Date()): Expense['status'] => {
  if (expense.status === 'audited') return 'audited';
  if (getExpenseBalance(expense) <= 0) return 'paid';
  if (getExpensePaidAmount(expense) > 0 || expense.status === 'partial') return 'partial';
  if (isExpenseEffectivelyOverdue(expense, referenceDate)) return 'overdue';
  return 'pending';
};

const isInPeriod = (dateValue: Date, periodFilter: ExpenseListFilters['periodFilter'], now: Date) => {
  const date = new Date(dateValue);
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

// Carryover is a current operational balance, never a change to expense recognition dates.
// Historical period selections retain their original date-based meaning.
export const isExpenseCarryover = (
  expense: Expense,
  periodFilter: ExpenseListFilters['periodFilter'],
  referenceDate = new Date(),
) => periodFilter === 'this_month'
  && new Date(expense.date).getTime() < new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1).getTime()
  && isExpenseEffectivelyOverdue(expense, referenceDate);

export const splitExpensePeriod = (expenses: Expense[], periodFilter: ExpenseListFilters['periodFilter'], referenceDate = new Date()) => ({
  periodExpenses: expenses.filter(expense => isInPeriod(expense.date, periodFilter, referenceDate)),
  carryoverExpenses: expenses.filter(expense => isExpenseCarryover(expense, periodFilter, referenceDate)),
});

export const filterExpenses = (expenses: Expense[], filters: ExpenseListFilters, referenceDate = new Date()) => {
  const search = filters.searchTerm.toLowerCase();

  return expenses.filter((expense) => {
    const matchesSearch = !search
      || includesSearch(expense.folio, search)
      || includesSearch(expense.concept, search)
      || includesSearch(expense.description, search)
      || includesSearch(expense.providerName, search)
      || includesSearch(expense.originFund?.name, search);
    const matchesPeriod = isInPeriod(expense.date, filters.periodFilter, referenceDate)
      || isExpenseCarryover(expense, filters.periodFilter, referenceDate);
    const matchesUnit = filters.businessUnitFilter === 'all' || expense.businessUnit === filters.businessUnitFilter;
    const matchesBusiness = filters.businessFilter === 'all' || expense.business === filters.businessFilter;
    const matchesProvider = filters.providerFilter === 'all' || expense.providerId === filters.providerFilter;
    const effectiveStatus = getEffectiveExpenseStatus(expense, referenceDate);
    const hasOverdueBalance = isExpenseEffectivelyOverdue(expense, referenceDate);
    const matchesStatus = filters.statusFilter === 'all'
      || (filters.statusFilter === 'pending_and_overdue' && (effectiveStatus === 'pending' || hasOverdueBalance))
      || (filters.statusFilter === 'overdue' && hasOverdueBalance)
      || effectiveStatus === filters.statusFilter;

    return matchesSearch && matchesPeriod && matchesUnit && matchesBusiness && matchesProvider && matchesStatus;
  });
};
