import { useState } from 'react';
import type { Expense } from '../types/expenses.types';

export function useExpenseAttachments() {
  const [attachmentsExpense, setAttachmentsExpense] = useState<Expense | null>(null);

  const getExpenseAttachments = (expense: Expense) => {
    return expense.attachments ?? [];
  };

  const openAttachmentsModal = (expense: Expense) => {
    setAttachmentsExpense(expense);
  };

  const closeAttachmentsModal = () => {
    setAttachmentsExpense(null);
  };

  return {
    attachmentsExpense,
    closeAttachmentsModal,
    getExpenseAttachments,
    openAttachmentsModal,
  };
}
