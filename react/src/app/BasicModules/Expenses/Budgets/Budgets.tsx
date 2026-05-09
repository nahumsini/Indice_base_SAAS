import type { Dispatch, SetStateAction } from 'react';
import type { Expense } from '../types/expenses.types';
import BudgetTable from './BudgetTable';

interface BudgetsProps {
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
}

const budgetColumns = [
  { key: 'folio', label: 'Folio', visible: true, fixed: true },
  { key: 'businessUnit', label: 'Unidad', visible: true },
  { key: 'business', label: 'Negocio', visible: true },
  { key: 'providerName', label: 'Proveedor', visible: true },
  { key: 'concept', label: 'Concepto', visible: true },
  { key: 'description', label: 'Descripción', visible: true },
  { key: 'total', label: 'Total', visible: true },
  { key: 'taxes', label: 'Impuestos (IVA / HST / VAT)', visible: true },
  { key: 'amount', label: 'Monto', visible: true },
  { key: 'amountPaid', label: 'Abonado', visible: true },
  { key: 'balance', label: 'Saldo', visible: true },
  { key: 'dueDate', label: 'Fecha de vencimiento', visible: true },
  { key: 'paymentDate', label: 'Fecha de pago', visible: true },
  { key: 'paymentMethod', label: 'Método de pago', visible: true },
  { key: 'accountingAccount', label: 'Cuenta contable', visible: true },
  { key: 'status', label: 'Estado', visible: true },
  { key: 'attachments', label: 'Archivos adjuntos', visible: true },
  { key: 'authorizer', label: 'Autoriza', visible: true },
  { key: 'performer', label: 'Realiza', visible: true },
  { key: 'audit', label: 'Auditoría', visible: true },
  { key: 'actions', label: 'Acciones', visible: true, fixed: true },
];

export default function Budgets({ expenses, onExpensesChange }: BudgetsProps) {
  return (
    <BudgetTable
      columns={budgetColumns}
      expenses={expenses}
      onExpensesChange={onExpensesChange}
    />
  );
}
