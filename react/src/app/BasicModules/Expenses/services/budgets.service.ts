import { apiClient } from '../../../lib/apiClient';
import { toBudgetApiRequest, toFinanceBudget, type BudgetMasterDraft } from '../adapters/budget.adapter';
import type { FinanceBudget } from '../types/finance-domain.types';
import type { BudgetApiDto, BudgetListApiResponse } from '../types/finance-api.types';

const budgetsPath = '/api/v1/finance/budgets';

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const budgetsService = {
  async getBudgets(): Promise<FinanceBudget[]> {
    const response = await apiClient<BudgetListApiResponse>(budgetsPath);
    return response.budgets.map(toFinanceBudget);
  },

  async createBudget(budget: BudgetMasterDraft): Promise<FinanceBudget> {
    const response = await apiClient<BudgetApiDto>(
      budgetsPath,
      jsonMutation('POST', toBudgetApiRequest(budget)),
    );
    return toFinanceBudget(response);
  },

  async updateBudget(budgetId: string, budget: BudgetMasterDraft): Promise<FinanceBudget> {
    const response = await apiClient<BudgetApiDto>(
      `${budgetsPath}/${budgetId}`,
      jsonMutation('PUT', toBudgetApiRequest(budget)),
    );
    return toFinanceBudget(response);
  },

  async deleteBudget(budgetId: string): Promise<void> {
    await apiClient(`${budgetsPath}/${budgetId}`, { method: 'DELETE' });
  },
};
