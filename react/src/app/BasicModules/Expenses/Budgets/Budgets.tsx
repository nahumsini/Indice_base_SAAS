import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Expense } from '../types/expenses.types';
import type { ColumnConfig } from '../types/expenseView.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import BudgetTable from './BudgetTable';
import { useBudgetsTranslations } from './hooks/useBudgetsTranslations';

interface BudgetsProps {
  expenses: Expense[];
  loadError?: string;
  onRetryLoad?: () => void;
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  providers?: ProviderRecord[];
}

export default function Budgets({ expenses, loadError, onExpensesChange, onProvidersChange, onRetryLoad, providers }: BudgetsProps) {
  const t = useBudgetsTranslations();
  const budgetColumns = useMemo<ColumnConfig[]>(() => [
    { key: 'folio', label: t.budgets.columns.folio.label, visible: true },
    { key: 'concept', label: t.budgets.columns.concept.label, visible: true },
    { key: 'businessUnit', label: t.budgets.columns.businessUnit.label, visible: false },
    { key: 'providerName', label: t.budgets.columns.providerName.label, visible: false },
    { key: 'accountingAccount', label: t.budgets.columns.accountingAccount.label, visible: false },
    { key: 'plannedAmount', label: t.budgets.planned, visible: true },
    { key: 'committedAmount', label: t.budgets.committed, visible: false },
    { key: 'actualExpenseAmount', label: t.budgets.actual, visible: true },
    { key: 'availableAmount', label: t.budgets.available, visible: true },
    { key: 'health', label: t.budgets.health, visible: true },
    { key: 'status', label: t.filters.status, visible: false },
    { key: 'dueDate', label: t.budgets.columns.dueDate.label, visible: true },
    { key: 'actions', label: t.budgets.columns.actions.label, visible: true, fixed: true },
  ], [t]);
  const budgetColumnSignature = budgetColumns.map(column => column.key).join('|');

  return (
    <BudgetTable
      key={budgetColumnSignature}
      columns={budgetColumns}
      expenses={expenses}
      loadError={loadError}
      onExpensesChange={onExpensesChange}
      onProvidersChange={onProvidersChange}
      onRetryLoad={onRetryLoad}
      providers={providers}
    />
  );
}
