import { BudgetStatus } from '../types/finance-status.types';
import type { FinanceBudget } from '../types/finance-domain.types';
import { compactObject, numericId, optionalString } from './adapter.utils';
import type { BudgetApiDto, BudgetApiRequest } from '../types/finance-api.types';

export type BudgetMasterDraft = {
  businessId?: string;
  currencyCode: string;
  description?: string;
  name: string;
  periodEnd: string;
  periodStart: string;
  unitId?: string;
};

export const toFinanceBudget = (budget: BudgetApiDto): FinanceBudget => ({
  id: String(budget.id),
  companyId: String(budget.companyId),
  unitId: budget.unitId ? String(budget.unitId) : undefined,
  businessId: budget.businessId ? String(budget.businessId) : undefined,
  name: budget.name,
  description: budget.description ?? undefined,
  period: `${budget.periodStart} / ${budget.periodEnd}`,
  periodStart: budget.periodStart,
  periodEnd: budget.periodEnd,
  plannedAmount: 0,
  actualAmount: 0,
  currencyCode: budget.currencyCode,
  status: (budget.status ?? BudgetStatus.ACTIVE) as BudgetStatus,
  createdAt: budget.createdAt ?? undefined,
  updatedAt: budget.updatedAt ?? undefined,
});

export const toBudgetApiRequest = (budget: BudgetMasterDraft): BudgetApiRequest => ({
  unitId: numericId(budget.unitId) ?? null,
  businessId: numericId(budget.businessId) ?? null,
  name: budget.name.trim(),
  description: optionalString(budget.description),
  periodStart: budget.periodStart,
  periodEnd: budget.periodEnd,
  currencyCode: budget.currencyCode.slice(0, 3).toUpperCase(),
  status: 'ACTIVE',
  customFields: compactObject({}),
  metadata: { source: 'expenses-frontend' },
});

export const toBudgetOptionLabel = (budget: FinanceBudget) => (
  `${budget.name} (${budget.periodStart ?? budget.period})`
);
