import { BudgetHealthStatus } from './finance-status.types';
import type { FinanceCurrency } from './finance-domain.types';

export interface FinancialOverviewAmount {
  amount: number;
  currency: FinanceCurrency;
}

export interface FinancialOverviewCostDriver {
  id: string;
  name: string;
  total: number;
  percentage: number;
  currency: FinanceCurrency;
  driverType: 'PROVIDER' | 'ACCOUNTING_ACCOUNT' | 'BUDGET_LINE' | 'EXPENSE_TYPE';
}

export interface FinancialOverviewPeriod {
  from: string;
  to: string;
}

export interface FinancialOverview {
  companyId: string;
  period: FinancialOverviewPeriod;
  currency: FinanceCurrency;
  generatedAt: string;
  fixedExpenses: FinancialOverviewAmount;
  variableExpenses: FinancialOverviewAmount;
  pettyCashIssued: FinancialOverviewAmount;
  pettyCashSettled: FinancialOverviewAmount;
  pendingPayments: FinancialOverviewAmount;
  overduePayments: FinancialOverviewAmount;
  committedBudget: FinancialOverviewAmount;
  consumedBudget: FinancialOverviewAmount;
  availableBudget: FinancialOverviewAmount;
  budgetHealth: BudgetHealthStatus;
  upcomingCashRequirements7Days: FinancialOverviewAmount;
  upcomingCashRequirements30Days: FinancialOverviewAmount;
  topCostDrivers: FinancialOverviewCostDriver[];
}

const zeroAmount = (currency: FinanceCurrency): FinancialOverviewAmount => ({
  amount: 0,
  currency,
});

export const createEmptyFinancialOverview = (
  companyId = 'mock-company',
  currency: FinanceCurrency = 'CAD',
): FinancialOverview => ({
  companyId,
  period: { from: '', to: '' },
  currency,
  generatedAt: '',
  fixedExpenses: zeroAmount(currency),
  variableExpenses: zeroAmount(currency),
  pettyCashIssued: zeroAmount(currency),
  pettyCashSettled: zeroAmount(currency),
  pendingPayments: zeroAmount(currency),
  overduePayments: zeroAmount(currency),
  committedBudget: zeroAmount(currency),
  consumedBudget: zeroAmount(currency),
  availableBudget: zeroAmount(currency),
  budgetHealth: BudgetHealthStatus.ON_TRACK,
  upcomingCashRequirements7Days: zeroAmount(currency),
  upcomingCashRequirements30Days: zeroAmount(currency),
  topCostDrivers: [],
});
