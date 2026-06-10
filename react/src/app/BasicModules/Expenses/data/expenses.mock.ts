import type { Expense, ExpenseStatus } from '../types/expenses.types';
export { mockProviders } from './providers.mock';
import { mockProviders } from './providers.mock';
import { mockExpensePart1 } from './expenses.part1.mock';
import { mockExpensePart2 } from './expenses.part2.mock';
import { mockExpensePart3 } from './expenses.part3.mock';
import { mockExpensePart4 } from './expenses.part4.mock';
import { mockExpensePart5 } from './expenses.part5.mock';
import { mockExpensePart6 } from './expenses.part6.mock';
import { mockExpensePart7 } from './expenses.part7.mock';
import { mockExpensePart8 } from './expenses.part8.mock';

export const mockExpenses: Expense[] = [
  mockExpensePart1,
  mockExpensePart2,
  mockExpensePart3,
  mockExpensePart4,
  mockExpensePart5,
  mockExpensePart6,
  mockExpensePart7,
  mockExpensePart8
].flat();

export const getProviderById = (id: string) => {
  return mockProviders.find(provider => provider.id === id);
};

export const getExpensesByProvider = (providerId: string): Expense[] => {
  return mockExpenses.filter(expense => expense.providerId === providerId);
};

export const getExpensesByCategory = (categoryId: string): Expense[] => {
  return mockExpenses.filter(expense => expense.category.id === categoryId);
};

export const getExpensesByStatus = (status: ExpenseStatus): Expense[] => {
  return mockExpenses.filter(expense => expense.status === status);
};

export const getTotalExpenses = (): number => {
  return mockExpenses.reduce((sum, expense) => sum + expense.amount, 0);
};

export const getTotalExpensesByCategory = (categoryId: string): number => {
  return getExpensesByCategory(categoryId).reduce((sum, expense) => sum + expense.amount, 0);
};
