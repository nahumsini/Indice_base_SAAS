import type { Expense } from '../../types/expenses.types';

export type BudgetLineTableRow = {
  accountingAccount?: string;
  actualExpenseAmount: number;
  availableAmount: number;
  business: string;
  businessUnit: string;
  unitId?: string;
  committedAmount: number;
  concept: string;
  createdAt: Date;
  currency: string;
  description?: string;
  dueDate: Date;
  folio: string;
  healthStatus?: string;
  id: string;
  version?: number;
  plannedAmount: number;
  providerName?: string;
  status: string;
};

/**
 * Transitional boundary between the legacy shared Expense collection and the
 * budget-specific table contract. The table must not treat planned budget
 * lines as real expenses.
 */
export function toBudgetLineTableRow(expense: Expense): BudgetLineTableRow {
  return {
    accountingAccount: expense.accountingAccount,
    actualExpenseAmount: expense.actualExpenseAmount ?? expense.amountPaid ?? 0,
    availableAmount: expense.availableAmount ?? expense.total,
    business: expense.business,
    businessUnit: expense.businessUnit,
    unitId: expense.businessUnit || undefined,
    committedAmount: expense.committedAmount ?? 0,
    concept: expense.concept,
    createdAt: expense.createdAt,
    currency: expense.currency,
    description: expense.description,
    dueDate: expense.dueDate,
    folio: expense.folio,
    healthStatus: expense.budgetHealthStatus,
    id: expense.id,
    version: expense.version,
    plannedAmount: expense.total,
    providerName: expense.providerName,
    status: expense.budgetStatus ?? expense.status,
  };
}
