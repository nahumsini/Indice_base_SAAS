import { apiClient } from '../../../lib/apiClient';
import {
  getBudgetLineApiId,
  toBudgetExpense,
  toBudgetLineApiRequest,
  toFinanceBudgetLine,
} from '../adapters/budget-line.adapter';
import type { Expense } from '../types/expenses.types';
import type { FinanceBudgetLine } from '../types/finance-domain.types';
import type { BudgetLineApiDto, BudgetLineListApiResponse } from '../types/finance-api.types';

const budgetLinesPath = '/api/v1/finance/budget-lines';

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const budgetLinesService = {
  async getBudgetLines(): Promise<FinanceBudgetLine[]> {
    const response = await apiClient<BudgetLineListApiResponse>(budgetLinesPath);
    return response.budgetLines.map(toFinanceBudgetLine);
  },

  async getBudgetExpenses(): Promise<Expense[]> {
    const response = await apiClient<BudgetLineListApiResponse>(budgetLinesPath);
    return response.budgetLines.map(toBudgetExpense);
  },

  async getBudgetExpense(expenseId: string): Promise<Expense> {
    const response = await apiClient<BudgetLineApiDto>(`${budgetLinesPath}/${getBudgetLineApiId(expenseId)}`);
    return toBudgetExpense(response);
  },

  async createBudgetLineFromExpense(expense: Expense, budgetId: string): Promise<Expense> {
    const response = await apiClient<BudgetLineApiDto>(
      budgetLinesPath,
      jsonMutation('POST', toBudgetLineApiRequest({ ...expense, budgetId })),
    );
    return toBudgetExpense(response);
  },

  async updateBudgetLineFromExpense(expense: Expense): Promise<Expense> {
    const budgetLineId = getBudgetLineApiId(expense.id);
    const response = await apiClient<BudgetLineApiDto>(
      `${budgetLinesPath}/${budgetLineId}`,
      jsonMutation('PUT', toBudgetLineApiRequest(expense)),
    );
    return toBudgetExpense(response);
  },

  async deleteBudgetLine(expenseId: string): Promise<void> {
    await apiClient(`${budgetLinesPath}/${getBudgetLineApiId(expenseId)}`, { method: 'DELETE' });
  },
};
