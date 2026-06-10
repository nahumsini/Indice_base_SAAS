import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { Expense } from '../types/expenses.types';
import {
  type BudgetDraft,
  generateProjectedBudgetEntries,
  getNextMonthRange,
  getNextQuarterRange,
} from './budgetUtils';

export type BudgetFutureFilter = 'next_month' | 'next_quarter' | 'custom';
export const MISSING_ACCOUNTING_ACCOUNT_FILTER = '__missing_accounting_account__';

interface UseBudgetLogicParams {
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
}

const isWithinRange = (date: Date, start: Date, end: Date) => {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

export function useBudgetLogic({ expenses, onExpensesChange }: UseBudgetLogicParams) {
  const [futureFilter, setFutureFilter] = useState<BudgetFutureFilter>('next_month');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('all');
  const [accountingAccountFilter, setAccountingAccountFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const budgetExpenses = useMemo(() => {
    return expenses.filter(expense => expense.type === 'budget');
  }, [expenses]);

  const filteredBudgetExpenses = useMemo(() => {
    const now = new Date();
    const customStart = customStartDate ? new Date(`${customStartDate}T00:00:00`) : getNextMonthRange(now).start;
    const customEnd = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date(2999, 11, 31);
    const range = futureFilter === 'next_quarter'
      ? getNextQuarterRange(now)
      : futureFilter === 'custom'
        ? { start: customStart, end: customEnd }
        : getNextMonthRange(now);

    return budgetExpenses.filter(expense => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search ||
        expense.folio.toLowerCase().includes(search) ||
        expense.concept.toLowerCase().includes(search) ||
        expense.description?.toLowerCase().includes(search) ||
        expense.providerName?.toLowerCase().includes(search);
      const matchesBusinessUnit = businessUnitFilter === 'all' || expense.businessUnit === businessUnitFilter;
      const matchesBusiness = businessFilter === 'all' || expense.business === businessFilter;
      const matchesProvider = providerFilter === 'all' || expense.providerId === providerFilter;
      const accountingAccount = expense.accountingAccount?.trim() || MISSING_ACCOUNTING_ACCOUNT_FILTER;
      const matchesAccountingAccount = accountingAccountFilter === 'all' || accountingAccount === accountingAccountFilter;

      return (
        isWithinRange(expense.dueDate, range.start, range.end) &&
        matchesSearch &&
        matchesBusinessUnit &&
        matchesBusiness &&
        matchesProvider &&
        matchesAccountingAccount
      );
    });
  }, [
    accountingAccountFilter,
    budgetExpenses,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    futureFilter,
    providerFilter,
    searchTerm,
  ]);

  const addBudgetEntries = (draft: BudgetDraft) => {
    const entries = generateProjectedBudgetEntries(draft, budgetExpenses.length);
    onExpensesChange(prevExpenses => [...prevExpenses, ...entries]);
    return entries;
  };

  return {
    accountingAccountFilter,
    addBudgetEntries,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    filteredBudgetExpenses,
    futureFilter,
    providerFilter,
    searchTerm,
    setAccountingAccountFilter,
    setBusinessFilter,
    setBusinessUnitFilter,
    setCustomEndDate,
    setCustomStartDate,
    setFutureFilter,
    setProviderFilter,
    setSearchTerm,
  };
}
