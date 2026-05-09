import type { Expense, ExpenseFrequency, PaymentMethod } from '../types/expenses.types';
import { expenseCategories } from '../data/categories.data';

export interface BudgetDraft {
  amount?: number;
  businessUnit: string;
  business: string;
  concept: string;
  description?: string;
  duration: number;
  frequency: ExpenseFrequency;
  providerId?: string;
  providerName?: string;
  startDate: Date;
  taxes?: number;
  total?: number;
}

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'transfer';

export const addFrequencyInterval = (date: Date, frequency: ExpenseFrequency, index: number): Date => {
  const nextDate = new Date(date);

  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + index);
      return nextDate;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + index * 3);
      return nextDate;
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + index);
      return nextDate;
    case 'once':
    default:
      return nextDate;
  }
};

export const createBudgetFolio = (date: Date, sequence: number): string => {
  const year = date.getFullYear();
  return `BUD-${year}-${String(sequence + 1).padStart(3, '0')}`;
};

export const generateProjectedBudgetEntries = (draft: BudgetDraft, existingCount = 0): Expense[] => {
  const duration = draft.frequency === 'once' ? 1 : Math.max(1, draft.duration);
  const now = new Date();
  const defaultCategory = expenseCategories[0];

  return Array.from({ length: duration }, (_, index) => {
    const scheduledDate = addFrequencyInterval(draft.startDate, draft.frequency, index);
    const projected = draft.frequency !== 'once';

    return {
      id: `budget-${Date.now()}-${index}`,
      folio: createBudgetFolio(scheduledDate, existingCount + index),
      businessUnit: draft.businessUnit,
      business: draft.business,
      concept: draft.concept,
      description: draft.description,
      category: defaultCategory,
      providerId: draft.providerId,
      providerName: draft.providerName,
      total: draft.total ?? 0,
      taxes: draft.taxes ?? 0,
      amount: draft.amount ?? 0,
      amountPaid: 0,
      currency: 'USD',
      dueDate: scheduledDate,
      date: scheduledDate,
      paymentMethod: DEFAULT_PAYMENT_METHOD,
      accountingAccount: 'Gastos Operativos',
      status: 'pending',
      attachments: [],
      costCenter: draft.businessUnit,
      type: 'budget',
      frequency: draft.frequency,
      duration,
      startDate: draft.startDate,
      projected,
      createdAt: now,
      updatedAt: now,
    };
  });
};

export const getNextMonthRange = (referenceDate = new Date()) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0);
  return { start, end };
};

export const getNextQuarterRange = (referenceDate = new Date()) => {
  const currentQuarter = Math.floor(referenceDate.getMonth() / 3);
  const nextQuarterStartMonth = (currentQuarter + 1) * 3;
  const start = new Date(referenceDate.getFullYear(), nextQuarterStartMonth, 1);
  const end = new Date(referenceDate.getFullYear(), nextQuarterStartMonth + 3, 0);
  return { start, end };
};
