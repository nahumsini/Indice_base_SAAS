import type { Expense } from '../types/expenses.types';
import type { ExpenseWorkflowState } from '../Expenses/components/EditableExpenseRow';

export type SortDirection = 'asc' | 'desc' | null;

export const getDefaultExpenseWorkflow = (expense: Expense): ExpenseWorkflowState => ({
  authorizer: expense.approvedByUserId ?? '',
  performer: expense.performedByUserId ?? '',
  auditNotes: '',
});

export const compareSortValues = (
  leftValue: unknown,
  rightValue: unknown,
  direction: Exclude<SortDirection, null>,
) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (leftValue instanceof Date && rightValue instanceof Date) {
    return (leftValue.getTime() - rightValue.getTime()) * multiplier;
  }

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * multiplier;
};
