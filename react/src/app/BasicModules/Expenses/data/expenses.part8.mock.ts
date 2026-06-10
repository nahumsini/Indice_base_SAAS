import type { Expense, ExpenseStatus, PaymentMethod } from '../types/expenses.types';
import { expenseCategories } from './categories.data';

export const mockExpensePart8: Expense[] = [
  {
    id: 'exp-50',
    folio: 'EXP-2026-050',
    businessUnit: 'Operations',
    business: 'Restaurante',
    concept: 'Gas bill',
    description: 'Monthly natural gas for kitchen equipment',
    category: expenseCategories.find(c => c.id === 'utilities')!,
    total: 2280,
    taxes: 380,
    amount: 1900,
    amountPaid: 1900,
    currency: 'USD',
    dueDate: new Date('2026-04-05'),
    paymentDate: new Date('2026-04-05'),
    date: new Date('2026-04-05'),
    paymentMethod: 'transfer' as PaymentMethod,
    accountingAccount: '5600-005',
    status: 'paid' as ExpenseStatus,
    approver: 'Operations Manager',
    notes: 'Monthly gas consumption',
    attachments: ['gas-bill-050.pdf'],
    costCenter: 'Operations',
    createdAt: new Date('2026-04-04'),
    updatedAt: new Date('2026-04-05'),
  },
];
