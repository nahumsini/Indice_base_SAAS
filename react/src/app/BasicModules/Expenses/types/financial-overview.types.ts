import { BudgetHealthStatus } from './finance-status.types';
import type { FinanceCurrency } from './finance-domain.types';
import { DEFAULT_FINANCE_CURRENCY } from '../constants/financeCurrencyOptions';

export interface FinancialOverviewAmount {
  amount: number;
  currency: FinanceCurrency;
}

export interface FinancialOverviewPeriod {
  from: string;
  to: string;
}

export type FinancialOverviewCostDriverType =
  | 'ACCOUNTING_ACCOUNT'
  | 'BUSINESS'
  | 'PAYMENT_ACCOUNT'
  | 'PROVIDER'
  | 'UNIT';

export type FinancialOverviewAlertTone = 'critical' | 'info' | 'success' | 'warning';

export interface FinancialOverviewMetrics {
  actual: number;
  actualFallbackUsed: boolean;
  available: number;
  budgetLineCount: number;
  committed: number;
  dueIn7Days: number;
  dueIn30Days: number;
  expenseCount: number;
  overdueAmount: number;
  overdueExpenseCount: number;
  pendingPayments: number;
  planned: number;
  unpaidExpenseCount: number;
}

export interface FinancialOverviewBudgetHealthRow {
  actual: number;
  available: number;
  budgetId: string;
  budgetName?: string;
  committed: number;
  currency: FinanceCurrency;
  healthStatus: BudgetHealthStatus;
  id: string;
  name: string;
  planned: number;
  usagePercent: number;
}

export interface FinancialOverviewCashRequirement {
  amount: number;
  count: number;
  description: string;
  id: 'due7' | 'due30' | 'overdue' | 'pending';
  label: string;
  tone: FinancialOverviewAlertTone;
}

export interface FinancialOverviewCostDriver {
  count: number;
  currency: FinanceCurrency;
  driverType: FinancialOverviewCostDriverType;
  id: string;
  name: string;
  percentage: number;
  total: number;
}

export interface FinancialOverviewConcentrationRisk {
  driverType: FinancialOverviewCostDriverType;
  id: string;
  name: string;
  percentage: number;
  tone: FinancialOverviewAlertTone;
  total: number;
}

export interface FinancialOverviewAlert {
  id: string;
  message: string;
  recommendation: string;
  title: string;
  tone: FinancialOverviewAlertTone;
}

export interface FinancialOverviewDataSet {
  alerts: FinancialOverviewAlert[];
  budgetHealthRows: FinancialOverviewBudgetHealthRow[];
  cashRequirements: FinancialOverviewCashRequirement[];
  concentrationRisks: FinancialOverviewConcentrationRisk[];
  costDrivers: Record<FinancialOverviewCostDriverType, FinancialOverviewCostDriver[]>;
  currencies: FinanceCurrency[];
  currency: FinanceCurrency;
  generatedAt: string;
  metrics: FinancialOverviewMetrics;
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
  currency: FinanceCurrency = DEFAULT_FINANCE_CURRENCY,
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
