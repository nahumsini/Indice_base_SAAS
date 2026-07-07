import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Expense } from '../types/expenses.types';
import type { ColumnConfig } from '../types/expenseView.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import BudgetTable from './BudgetTable';
import { useBudgetsTranslations } from './hooks/useBudgetsTranslations';

interface BudgetsProps {
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  providers?: ProviderRecord[];
}

export default function Budgets({ expenses, onExpensesChange, providers }: BudgetsProps) {
  const t = useBudgetsTranslations();
  const budgetColumns = useMemo<ColumnConfig[]>(() => [
    { key: 'folio', label: t.budgets.columns.folio.label, visible: true },
    { key: 'concept', label: t.budgets.columns.concept.label, visible: true },
    { key: 'businessUnit', label: t.budgets.columns.businessUnit.label, visible: true },
    { key: 'providerName', label: t.budgets.columns.providerName.label, visible: true },
    { key: 'accountingAccount', label: t.budgets.columns.accountingAccount.label, visible: true },
    { key: 'plannedAmount', label: t.budgets.planned, visible: true },
    { key: 'committedAmount', label: t.budgets.committed, visible: true },
    { key: 'actualExpenseAmount', label: t.budgets.actual, visible: true },
    { key: 'availableAmount', label: t.budgets.available, visible: true },
    { key: 'health', label: t.budgets.health, visible: true },
    { key: 'status', label: t.filters.status, visible: true },
    { key: 'dueDate', label: t.budgets.columns.dueDate.label, visible: true },
    { key: 'actions', label: t.budgets.columns.actions.label, visible: true, fixed: true },
  ], [t]);
  const budgetColumnSignature = budgetColumns.map(column => column.key).join('|');

  return (
    <BudgetTable
      key={budgetColumnSignature}
      columns={budgetColumns}
      expenses={expenses}
      onExpensesChange={onExpensesChange}
      providers={providers}
    />
  );
}
