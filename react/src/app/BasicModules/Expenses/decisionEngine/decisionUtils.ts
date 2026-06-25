import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { defaultBusinessCurrency, formatBusinessCurrencyAmount } from '../../shared/businessCurrency';
export type DecisionType = 'warning' | 'alert' | 'opportunity';
export type DecisionImpact = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high';

export type Decision = {
  type: DecisionType;
  title: string;
  description: string;
  recommendation: string;
  impact: DecisionImpact;
};

export type DecisionCandidate = Decision & {
  ruleId: string;
  severity: number;
};

export type DecisionSummary = {
  riskLevel: RiskLevel;
  totalIssues: number;
  totalOpportunities: number;
};

export type DecisionThresholds = {
  budgetOverspendRatio: number;
  budgetUnderspendRatio: number;
  highPendingRatio: number;
  overdueCount: number;
  providerDependencyRatio: number;
};

export type DecisionEngineOptions = {
  expectedBalance?: number;
  referenceDate?: Date;
  thresholds?: Partial<DecisionThresholds>;
};

export type MonthlyDecisionMetrics = {
  budgetSpend: number;
  monthKey: string;
  realSpend: number;
  variance: number;
};

export type CategoryDecisionMetrics = {
  category: string;
  percentage: number;
  total: number;
};

export type ProviderDecisionMetrics = {
  percentage: number;
  providerId?: string;
  providerName: string;
  providerStatus?: ProviderRecord['status'];
  total: number;
};

export type DecisionMetrics = {
  budgets: Expense[];
  categoryTotals: CategoryDecisionMetrics[];
  currentBudgetSpend: number;
  currentMonthKey: string;
  currentRealSpend: number;
  expectedBalance?: number;
  monthlyTotals: MonthlyDecisionMetrics[];
  overdueAmount: number;
  overdueCount: number;
  pendingAmount: number;
  projectedExpenses: number;
  providerTotals: ProviderDecisionMetrics[];
  realExpenses: Expense[];
  totalPaid: number;
  totalSpend: number;
};

export const DEFAULT_DECISION_THRESHOLDS: DecisionThresholds = {
  budgetOverspendRatio: 1.1,
  budgetUnderspendRatio: 0.7,
  highPendingRatio: 0.3,
  overdueCount: 0,
  providerDependencyRatio: 0.4,
};

export const mergeDecisionThresholds = (thresholds?: Partial<DecisionThresholds>): DecisionThresholds => ({
  ...DEFAULT_DECISION_THRESHOLDS,
  ...thresholds,
});

export const formatDecisionCurrency = (amount: number, currency = defaultBusinessCurrency) => {
  return formatBusinessCurrencyAmount(amount, currency, {
    maximumFractionDigits: 0,
  });
};

export const formatDecisionPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

export const getExpenseAmount = (expense: Expense) => {
  return Number(expense.total ?? expense.amount ?? 0);
};

export const getPaidAmount = (expense: Expense) => {
  return Math.max(0, Number(expense.amountPaid ?? 0));
};

export const getPendingAmount = (expense: Expense) => {
  return Math.max(getExpenseAmount(expense) - getPaidAmount(expense), 0);
};

export const isBudgetExpense = (expense: Expense) => {
  return expense.type === 'budget';
};

export const isRealExpense = (expense: Expense) => {
  return expense.type !== 'budget';
};

export const getMonthKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getNextMonthKey = (referenceDate: Date) => {
  return getMonthKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1));
};

export const isOverdueExpense = (expense: Expense, referenceDate: Date) => {
  return expense.status === 'overdue' || (getPendingAmount(expense) > 0 && expense.dueDate < referenceDate);
};

const getCategoryKey = (expense: Expense) => {
  return expense.accountingAccount || expense.category?.name || 'Sin categoría';
};

const createProviderLookup = (providers: ProviderRecord[]) => {
  return new Map(providers.map(provider => [provider.id, provider]));
};

const aggregateMonthlyTotals = (realExpenses: Expense[], budgets: Expense[]) => {
  const totals = new Map<string, MonthlyDecisionMetrics>();

  const ensureMonth = (monthKey: string) => {
    if (!totals.has(monthKey)) {
      totals.set(monthKey, {
        budgetSpend: 0,
        monthKey,
        realSpend: 0,
        variance: 0,
      });
    }

    return totals.get(monthKey)!;
  };

  realExpenses.forEach(expense => {
    const month = ensureMonth(getMonthKey(expense.date));
    month.realSpend += getExpenseAmount(expense);
    month.variance = month.realSpend - month.budgetSpend;
  });

  budgets.forEach(expense => {
    const month = ensureMonth(getMonthKey(expense.date));
    month.budgetSpend += getExpenseAmount(expense);
    month.variance = month.realSpend - month.budgetSpend;
  });

  return Array.from(totals.values()).sort((left, right) => left.monthKey.localeCompare(right.monthKey));
};

const aggregateCategoryTotals = (expenses: Expense[]) => {
  const totalSpend = expenses.reduce((total, expense) => total + getExpenseAmount(expense), 0);
  const totals = expenses.reduce<Record<string, number>>((result, expense) => {
    const category = getCategoryKey(expense);
    result[category] = (result[category] ?? 0) + getExpenseAmount(expense);
    return result;
  }, {});

  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      percentage: totalSpend === 0 ? 0 : total / totalSpend,
      total,
    }))
    .sort((left, right) => right.total - left.total);
};

const aggregateProviderTotals = (expenses: Expense[], providers: ProviderRecord[]) => {
  const totalSpend = expenses.reduce((total, expense) => total + getExpenseAmount(expense), 0);
  const providerLookup = createProviderLookup(providers);
  const totals = expenses.reduce<Record<string, ProviderDecisionMetrics>>((result, expense) => {
    const providerId = expense.providerId ?? 'without-provider';
    const provider = providerLookup.get(providerId);
    const providerName = expense.providerName || provider?.name || 'Sin proveedor';

    if (!result[providerId]) {
      result[providerId] = {
        percentage: 0,
        providerId: expense.providerId,
        providerName,
        providerStatus: provider?.status,
        total: 0,
      };
    }

    result[providerId].total += getExpenseAmount(expense);
    return result;
  }, {});

  return Object.values(totals)
    .map(providerTotal => ({
      ...providerTotal,
      percentage: totalSpend === 0 ? 0 : providerTotal.total / totalSpend,
    }))
    .sort((left, right) => right.total - left.total);
};

export const buildDecisionMetrics = (
  records: Expense[],
  providers: ProviderRecord[],
  options: DecisionEngineOptions = {},
): DecisionMetrics => {
  const referenceDate = options.referenceDate ?? new Date();
  const currentMonthKey = getMonthKey(referenceDate);
  const nextMonthKey = getNextMonthKey(referenceDate);
  const realExpenses = records.filter(isRealExpense);
  const budgets = records.filter(isBudgetExpense);
  const currentRealExpenses = realExpenses.filter(expense => getMonthKey(expense.date) === currentMonthKey);
  const currentBudgets = budgets.filter(expense => getMonthKey(expense.date) === currentMonthKey);
  const nextMonthBudgets = budgets.filter(expense => getMonthKey(expense.date) === nextMonthKey);
  const currentRealSpend = currentRealExpenses.reduce((total, expense) => total + getExpenseAmount(expense), 0);
  const currentBudgetSpend = currentBudgets.reduce((total, expense) => total + getExpenseAmount(expense), 0);
  const totalSpend = realExpenses.reduce((total, expense) => total + getExpenseAmount(expense), 0);
  const totalPaid = realExpenses.reduce((total, expense) => total + getPaidAmount(expense), 0);
  const pendingAmount = realExpenses.reduce((total, expense) => total + getPendingAmount(expense), 0);
  const overdueExpenses = realExpenses.filter(expense => isOverdueExpense(expense, referenceDate));
  const overdueAmount = overdueExpenses.reduce((total, expense) => total + getPendingAmount(expense), 0);
  const projectedExpenses = nextMonthBudgets.reduce((total, expense) => total + getExpenseAmount(expense), 0);

  return {
    budgets,
    categoryTotals: aggregateCategoryTotals(currentRealExpenses),
    currentBudgetSpend,
    currentMonthKey,
    currentRealSpend,
    expectedBalance: options.expectedBalance,
    monthlyTotals: aggregateMonthlyTotals(realExpenses, budgets),
    overdueAmount,
    overdueCount: overdueExpenses.length,
    pendingAmount,
    projectedExpenses,
    providerTotals: aggregateProviderTotals(currentRealExpenses, providers),
    realExpenses,
    totalPaid,
    totalSpend,
  };
};

export const sortDecisionCandidates = (decisions: DecisionCandidate[]) => {
  const impactRank: Record<DecisionImpact, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...decisions].sort((left, right) => {
    const impactDifference = impactRank[right.impact] - impactRank[left.impact];
    if (impactDifference !== 0) return impactDifference;
    return right.severity - left.severity;
  });
};

export const toPublicDecision = (candidate: DecisionCandidate): Decision => {
  const { impact, type, title, description, recommendation } = candidate;
  return {
    description,
    impact,
    recommendation,
    title,
    type,
  };
};

export const summarizeDecisions = (decisions: Decision[]): DecisionSummary => {
  const totalOpportunities = decisions.filter(decision => decision.type === 'opportunity').length;
  const totalIssues = decisions.length - totalOpportunities;
  const hasHighImpactIssue = decisions.some(decision => decision.type !== 'opportunity' && decision.impact === 'high');
  const hasMediumImpactIssue = decisions.some(decision => decision.type !== 'opportunity' && decision.impact === 'medium');

  return {
    riskLevel: hasHighImpactIssue ? 'high' : hasMediumImpactIssue ? 'medium' : 'low',
    totalIssues,
    totalOpportunities,
  };
};
