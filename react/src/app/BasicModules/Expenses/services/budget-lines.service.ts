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
import type { FinanceBulkAction } from '../../shared/financeBulkActions.copy';

const budgetLinesPath = '/api/v1/finance/budget-lines';

export interface BudgetObligationReview { budgetLineId: number; name: string; reason: string }
export interface BudgetObligationSyncResult { enabled: boolean; generated: number; reviews: BudgetObligationReview[] }

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const budgetLinesService = {
  async synchronizeObligations(): Promise<BudgetObligationSyncResult> {
    return apiClient<BudgetObligationSyncResult>('/api/v1/finance/expenses/budget-obligations/synchronize', { method: 'POST' });
  },
  async applyBulkAction(action: Exclude<FinanceBulkAction, 'PAYMENT_ACCOUNT'>,
    rows: Array<{ id: string; version?: number }>, targetId: string, reason: string): Promise<Expense[]> {
    const response = await apiClient<BudgetLineListApiResponse>(`${budgetLinesPath}/bulk-actions`, jsonMutation('POST', {
      action,
      rows: rows.map(row => ({ id: getBudgetLineApiId(row.id), expectedVersion: row.version })),
      targetId: targetId ? Number(targetId) : null,
      reason,
    }));
    return response.budgetLines.map(toBudgetExpense);
  },
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
