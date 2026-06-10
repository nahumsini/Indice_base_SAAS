import type { Expense, ExpenseFrequency, PaymentMethod } from '../types/expenses.types';
import { expenseCategories } from '../data/categories.data';

export interface BudgetDraft {
  amount?: number;
  accountingAccount?: string;
  businessUnit: string;
  business: string;
  concept: string;
  currency?: string;
  description?: string;
  duration: number;
  frequency: ExpenseFrequency;
  periodEnd?: Date;
  providerId?: string;
  providerName?: string;
  startDate: Date;
  taxes?: number;
  taxCountry?: string;
  taxIncluded?: boolean;
  taxMode?: Expense['taxMode'];
  taxName?: string;
  taxProfileId?: string;
  taxRate?: number;
  taxRegion?: string;
  taxSpecialAmount?: number;
  total?: number;
}

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'transfer';

export const budgetFrequencyOptions: Array<{ value: ExpenseFrequency; label: string }> = [
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

export const addFrequencyInterval = (date: Date, frequency: ExpenseFrequency, index: number): Date => {
  const nextDate = new Date(date);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + index);
      return nextDate;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + index * 7);
      return nextDate;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + index * 14);
      return nextDate;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + index);
      return nextDate;
    case 'bimonthly':
      nextDate.setMonth(nextDate.getMonth() + index * 2);
      return nextDate;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + index * 3);
      return nextDate;
    case 'semiannual':
      nextDate.setMonth(nextDate.getMonth() + index * 6);
      return nextDate;
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + index);
      return nextDate;
    case 'once':
    default:
      return nextDate;
  }
};

export const getBudgetScheduleDates = (startDate: Date, endDate: Date, frequency: ExpenseFrequency): Date[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  if (frequency === 'once') return [start];

  const dates: Date[] = [];
  let index = 0;
  let nextDate = addFrequencyInterval(start, frequency, index);

  while (nextDate <= end && dates.length < 400) {
    dates.push(new Date(nextDate));
    index += 1;
    nextDate = addFrequencyInterval(start, frequency, index);
  }

  return dates;
};

export const createBudgetFolio = (date: Date, sequence: number): string => {
  const year = date.getFullYear();
  return `BUD-${year}-${String(sequence + 1).padStart(3, '0')}`;
};

export const generateProjectedBudgetEntries = (draft: BudgetDraft, existingCount = 0): Expense[] => {
  const scheduledDates = draft.periodEnd
    ? getBudgetScheduleDates(draft.startDate, draft.periodEnd, draft.frequency)
    : Array.from({ length: draft.frequency === 'once' ? 1 : Math.max(1, draft.duration) }, (_, index) => addFrequencyInterval(draft.startDate, draft.frequency, index));
  const duration = scheduledDates.length || 1;
  const now = new Date();
  const defaultCategory = expenseCategories[0];

  return scheduledDates.map((scheduledDate, index) => {
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
      taxCountry: draft.taxCountry,
      taxIncluded: draft.taxIncluded,
      taxMode: draft.taxMode,
      taxName: draft.taxName,
      taxProfileId: draft.taxProfileId,
      taxRate: draft.taxRate,
      taxRegion: draft.taxRegion,
      taxSpecialAmount: draft.taxSpecialAmount,
      amount: draft.amount ?? 0,
      amountPaid: 0,
      currency: draft.currency ?? 'USD',
      dueDate: scheduledDate,
      date: scheduledDate,
      paymentMethod: DEFAULT_PAYMENT_METHOD,
      accountingAccount: draft.accountingAccount ?? 'Gastos Operativos',
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
