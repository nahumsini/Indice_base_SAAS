export type ExpenseInsightType = 'info' | 'warning' | 'critical';

export type ExpenseInsightRuleId =
  | 'no-expenses-data'
  | 'high-pending-ratio'
  | 'overdue-expenses'
  | 'rapid-monthly-growth'
  | 'low-payment-rate'
  | 'category-concentration';

export interface ExpenseCategoryBreakdownItem {
  categoryId?: string;
  categoryName: string;
  amount: number;
  count?: number;
}

export interface ExpenseInsightInput {
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
  overdueCount: number;
  totalRecords: number;
  previousMonthExpenses?: number | null;
  categoryBreakdown?: ExpenseCategoryBreakdownItem[];
}

export interface ExpenseInsight {
  id: ExpenseInsightRuleId;
  type: ExpenseInsightType;
  title: string;
  message: string;
  recommendation: string;
  priority: number;
  metadata?: {
    amount?: number;
    categoryName?: string;
    count?: number;
    growthRatio?: number;
    ratio?: number;
    threshold?: number;
  };
}

export interface ExpenseInsightThresholds {
  pendingHighRatio: number;
  pendingCriticalRatio: number;
  overdueCriticalCount: number;
  growthAlertRatio: number;
  growthCriticalRatio: number;
  paymentRateLowRatio: number;
  paymentRateCriticalRatio: number;
  categoryConcentrationHighRatio: number;
  minimumRecordsForCategoryAnalysis: number;
}

export interface ExpenseInsightRule {
  id: ExpenseInsightRuleId;
  evaluate: (
    data: ExpenseInsightInput,
    thresholds: ExpenseInsightThresholds,
  ) => ExpenseInsight | null;
}
