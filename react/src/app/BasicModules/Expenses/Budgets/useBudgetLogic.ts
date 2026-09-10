import { useCallback, useMemo, useState } from 'react';
import type { Expense } from '../types/expenses.types';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { getBudgetPeriodRange, isBudgetInPeriod, type BudgetPeriod } from './budgetPeriod';

export type BudgetFutureFilter = BudgetPeriod;
export const MISSING_ACCOUNTING_ACCOUNT_FILTER = '__missing_accounting_account__';

interface UseBudgetLogicParams {
  expenses: Expense[];
}

type BudgetsWorkspaceState = {
  accountingAccountFilter: string;
  businessFilter: string;
  businessUnitFilter: string;
  customEndDate: string;
  customStartDate: string;
  futureFilter: BudgetFutureFilter;
  healthFilter: string;
  providerFilter: string;
  searchTerm: string;
  statusFilter: string;
};

const budgetsWorkspaceDefaults: BudgetsWorkspaceState = {
  accountingAccountFilter: 'all',
  businessFilter: 'all',
  businessUnitFilter: 'all',
  customEndDate: '',
  customStartDate: '',
  futureFilter: 'next_month',
  healthFilter: 'all',
  providerFilter: 'all',
  searchTerm: '',
  statusFilter: 'all',
};

const budgetsWorkspaceUrlFields: Partial<Record<keyof BudgetsWorkspaceState, string>> = {
  accountingAccountFilter: 'bu_account',
  businessFilter: 'bu_business',
  businessUnitFilter: 'bu_unit',
  customEndDate: 'bu_end',
  customStartDate: 'bu_start',
  futureFilter: 'bu_period',
  healthFilter: 'bu_health',
  providerFilter: 'bu_provider',
  searchTerm: 'bu_q',
  statusFilter: 'bu_status',
};

export function useBudgetLogic({ expenses }: UseBudgetLogicParams) {
  const [futureFilter, setFutureFilter] = useState<BudgetFutureFilter>('next_month');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('all');
  const [accountingAccountFilter, setAccountingAccountFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const workspaceState = useMemo<BudgetsWorkspaceState>(() => ({
    accountingAccountFilter,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    futureFilter,
    healthFilter,
    providerFilter,
    searchTerm,
    statusFilter,
  }), [
    accountingAccountFilter,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    futureFilter,
    healthFilter,
    providerFilter,
    searchTerm,
    statusFilter,
  ]);
  const restoreWorkspaceState = useCallback((restoredState: BudgetsWorkspaceState) => {
    setAccountingAccountFilter(restoredState.accountingAccountFilter);
    setBusinessFilter(restoredState.businessFilter);
    setBusinessUnitFilter(restoredState.businessUnitFilter);
    setCustomEndDate(restoredState.customEndDate);
    setCustomStartDate(restoredState.customStartDate);
    setFutureFilter(['this_month', 'next_month', 'next_quarter', 'custom'].includes(restoredState.futureFilter) ? restoredState.futureFilter : 'next_month');
    setHealthFilter(restoredState.healthFilter);
    setProviderFilter(restoredState.providerFilter);
    setSearchTerm(restoredState.searchTerm);
    setStatusFilter(restoredState.statusFilter);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'budgets',
    state: workspaceState,
    defaults: budgetsWorkspaceDefaults,
    urlFields: budgetsWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
  });

  const budgetExpenses = useMemo(() => {
    return expenses.filter(expense => expense.type === 'budget');
  }, [expenses]);

  const summaryBudgetExpenses = useMemo(() => {
    const range = getBudgetPeriodRange(futureFilter, customStartDate, customEndDate);

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
      const matchesStatus = statusFilter === 'all' || (expense.budgetStatus ?? expense.status) === statusFilter;

      return (
        isBudgetInPeriod(expense.dueDate, range) &&
        matchesSearch &&
        matchesBusinessUnit &&
        matchesBusiness &&
        matchesProvider &&
        matchesAccountingAccount &&
        matchesStatus
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
    statusFilter,
  ]);

  const filteredBudgetExpenses = useMemo(
    () => summaryBudgetExpenses.filter(expense => (
      healthFilter === 'all' || (expense.budgetHealthStatus ?? 'ON_TRACK') === healthFilter
    )),
    [healthFilter, summaryBudgetExpenses],
  );

  return {
    accountingAccountFilter,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    filteredBudgetExpenses,
    summaryBudgetExpenses,
    futureFilter,
    healthFilter,
    providerFilter,
    searchTerm,
    statusFilter,
    setAccountingAccountFilter,
    setBusinessFilter,
    setBusinessUnitFilter,
    setCustomEndDate,
    setCustomStartDate,
    setFutureFilter,
    setHealthFilter,
    setProviderFilter,
    setSearchTerm,
    setStatusFilter,
  };
}
