import { useState } from 'react';
import type { Expense } from '../types/expenses.types';

export function useExpenseAttachments() {
  const [attachmentsExpense, setAttachmentsExpense] = useState<Expense | null>(null);
  const [attachmentsByExpenseId, setAttachmentsByExpenseId] = useState<Record<string, string[]>>({});

  const getExpenseAttachments = (expense: Expense) => {
    return attachmentsByExpenseId[expense.id] ?? expense.attachments ?? [];
  };

  const openAttachmentsModal = (expense: Expense) => {
    setAttachmentsExpense(expense);
  };

  const closeAttachmentsModal = () => {
    setAttachmentsExpense(null);
  };

  const saveExpenseAttachments = (attachments: string[]) => {
    if (!attachmentsExpense) return;
    setAttachmentsByExpenseId(prev => ({
      ...prev,
      [attachmentsExpense.id]: attachments,
    }));
  };

  return {
    attachmentsExpense,
    closeAttachmentsModal,
    getExpenseAttachments,
    openAttachmentsModal,
    saveExpenseAttachments,
  };
}
