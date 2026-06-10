import type { Dispatch, SetStateAction } from 'react';
import type { Expense } from '../types/expenses.types';
import type { ColumnConfig } from '../types/expenseView.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import BudgetTable from './BudgetTable';

interface BudgetsProps {
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  providers?: ProviderRecord[];
}

const budgetColumns: ColumnConfig[] = [
  { key: 'folio', label: 'Folio', visible: true },
  { key: 'businessUnit', label: 'Unidad', visible: true },
  { key: 'business', label: 'Negocio', visible: true },
  { key: 'providerName', label: 'Proveedor', visible: true },
  { key: 'concept', label: 'Concepto', visible: true },
  { key: 'description', label: 'Descripción', visible: true },
  { key: 'total', label: 'Total', visible: true },
  { key: 'taxes', label: 'Impuestos (IVA / HST / VAT)', visible: true },
  { key: 'amount', label: 'Monto', visible: true },
  { key: 'dueDate', label: 'Fecha de vencimiento', visible: true },
  { key: 'accountingAccount', label: 'Cuenta contable', visible: true },
  { key: 'authorizer', label: 'Autoriza', visible: true },
  { key: 'performer', label: 'Realiza', visible: true },
  { key: 'actions', label: 'Acciones', visible: true, fixed: true },
];

export default function Budgets({ expenses, onExpensesChange, providers }: BudgetsProps) {
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
