import type { ProviderRecord } from '../Providers/useProveedoresLogic';

export type FinancialSummary = {
  budgetDeviationPercent: number | null;
  budgetVariance: number;
  currentBudgeted: number;
  currentSpent: number;
  overdueCount: number;
  totalOverdue: number;
  totalPaid: number;
  totalPending: number;
};

export type MonthlyBudgetComparison = {
  budget: number;
  deviation: number;
  deviationPercent: number | null;
  month: string;
  real: number;
};

export type CategorySpend = {
  account: string;
  percentage: number;
  total: number;
};

export type ProviderSpend = {
  percentage: number;
  providerId?: string;
  providerName: string;
  providerStatus?: ProviderRecord['status'];
  total: number;
};

export type KPIAlert = {
  id: string;
  message: string;
  recommendation: string;
  title: string;
  type: 'critical' | 'warning' | 'info';
};

export type ExpenseProjection = {
  estimatedCashFlow: number;
  expectedNextMonth: number;
  nextMonthBudgetCount: number;
  pendingCarryOver: number;
};
