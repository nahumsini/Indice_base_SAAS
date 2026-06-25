import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Expense } from '../types/expenses.types';
import type { ColumnConfig } from '../types/expenseView.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import BudgetTable from './BudgetTable';
import { useFinanceTranslations } from '../hooks/useFinanceTranslations';

interface BudgetsProps {
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  providers?: ProviderRecord[];
}

export default function Budgets({ expenses, onExpensesChange, providers }: BudgetsProps) {
  const t = useFinanceTranslations();
  const budgetColumns = useMemo<ColumnConfig[]>(() => [
    { key: 'folio', label: t.budgets.columns.folio.label, visible: true },
    { key: 'businessUnit', label: t.budgets.columns.businessUnit.label, visible: true },
    { key: 'business', label: t.budgets.columns.business.label, visible: true },
    { key: 'providerName', label: t.budgets.columns.providerName.label, visible: true },
    { key: 'concept', label: t.budgets.columns.concept.label, visible: true },
    { key: 'description', label: t.budgets.columns.description.label, visible: true },
    { key: 'total', label: t.budgets.columns.total.label, visible: true },
    { key: 'taxes', label: t.budgets.columns.taxes.label, visible: true },
    { key: 'amount', label: t.budgets.columns.amount.label, visible: true },
    { key: 'dueDate', label: t.budgets.columns.dueDate.label, visible: true },
    { key: 'accountingAccount', label: t.budgets.columns.accountingAccount.label, visible: true },
    { key: 'authorizer', label: t.budgets.columns.authorizer.label, visible: true },
    { key: 'performer', label: t.budgets.columns.performer.label, visible: true },
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
