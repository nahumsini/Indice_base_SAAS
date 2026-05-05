import type {
  ExpenseInsight,
  ExpenseInsightInput,
  ExpenseInsightRule,
  ExpenseInsightThresholds,
  ExpenseInsightType,
} from '../types/insights.types';

export const PENDING_HIGH_RATIO = 0.5;
export const PENDING_CRITICAL_RATIO = 0.65;
export const OVERDUE_CRITICAL_COUNT = 1;
export const GROWTH_ALERT_RATIO = 0.2;
export const GROWTH_CRITICAL_RATIO = 0.4;
export const PAYMENT_RATE_LOW_RATIO = 0.5;
export const PAYMENT_RATE_CRITICAL_RATIO = 0.25;
export const CATEGORY_CONCENTRATION_HIGH_RATIO = 0.45;
export const MINIMUM_RECORDS_FOR_CATEGORY_ANALYSIS = 3;

export const EXPENSE_INSIGHT_THRESHOLDS = {
  pendingHighRatio: PENDING_HIGH_RATIO,
  pendingCriticalRatio: PENDING_CRITICAL_RATIO,
  overdueCriticalCount: OVERDUE_CRITICAL_COUNT,
  growthAlertRatio: GROWTH_ALERT_RATIO,
  growthCriticalRatio: GROWTH_CRITICAL_RATIO,
  paymentRateLowRatio: PAYMENT_RATE_LOW_RATIO,
  paymentRateCriticalRatio: PAYMENT_RATE_CRITICAL_RATIO,
  categoryConcentrationHighRatio: CATEGORY_CONCENTRATION_HIGH_RATIO,
  minimumRecordsForCategoryAnalysis: MINIMUM_RECORDS_FOR_CATEGORY_ANALYSIS,
} as const satisfies ExpenseInsightThresholds;

const SEVERITY_WEIGHT: Record<ExpenseInsightType, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const toSafeNumber = (value: number | null | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value));
};

const toSafeInteger = (value: number | null | undefined): number => {
  return Math.floor(toSafeNumber(value));
};

const divideSafely = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return value / total;
};

const formatPercent = (ratio: number): string => {
  return `${Math.round(ratio * 100)}%`;
};

export const normalizeExpenseInsightInput = (
  data: ExpenseInsightInput,
): ExpenseInsightInput => ({
  totalExpenses: toSafeNumber(data.totalExpenses),
  totalPaid: toSafeNumber(data.totalPaid),
  totalPending: toSafeNumber(data.totalPending),
  overdueCount: toSafeInteger(data.overdueCount),
  totalRecords: toSafeInteger(data.totalRecords),
  previousMonthExpenses:
    data.previousMonthExpenses === null || data.previousMonthExpenses === undefined
      ? null
      : toSafeNumber(data.previousMonthExpenses),
  categoryBreakdown: data.categoryBreakdown
    ?.map((category) => ({
      ...category,
      categoryName: category.categoryName.trim(),
      amount: toSafeNumber(category.amount),
      count: category.count === undefined ? undefined : toSafeInteger(category.count),
    }))
    .filter((category) => category.categoryName.length > 0 && category.amount > 0),
});

const noExpensesDataRule: ExpenseInsightRule = {
  id: 'no-expenses-data',
  evaluate: (data) => {
    if (data.totalRecords > 0) return null;

    return {
      id: 'no-expenses-data',
      type: 'info',
      title: 'No expenses recorded yet',
      message: 'There is not enough expense activity to generate financial trends.',
      recommendation: 'Start recording expenses so Indice can detect risks and spending patterns.',
      priority: 10,
      metadata: {
        count: data.totalRecords,
      },
    };
  },
};

const overdueExpensesRule: ExpenseInsightRule = {
  id: 'overdue-expenses',
  evaluate: (data, thresholds) => {
    if (data.overdueCount < thresholds.overdueCriticalCount) return null;

    const expenseLabel = data.overdueCount === 1 ? 'expense is' : 'expenses are';

    return {
      id: 'overdue-expenses',
      type: 'critical',
      title: 'Overdue expenses detected',
      message: `${data.overdueCount} overdue ${expenseLabel} waiting for action.`,
      recommendation:
        'Review overdue payments by due date and contact providers before fees or service interruptions occur.',
      priority: 100,
      metadata: {
        count: data.overdueCount,
        threshold: thresholds.overdueCriticalCount,
      },
    };
  },
};

const highPendingRatioRule: ExpenseInsightRule = {
  id: 'high-pending-ratio',
  evaluate: (data, thresholds) => {
    const pendingRatio = divideSafely(data.totalPending, data.totalExpenses);

    if (pendingRatio < thresholds.pendingHighRatio) return null;

    const isCritical = pendingRatio >= thresholds.pendingCriticalRatio;

    return {
      id: 'high-pending-ratio',
      type: isCritical ? 'critical' : 'warning',
      title: isCritical ? 'Critical pending expense level' : 'High pending expense level',
      message: `${formatPercent(pendingRatio)} of current expenses are still pending.`,
      recommendation:
        'Prioritize pending payments by due date and amount to protect cash flow.',
      priority: isCritical ? 95 : 80,
      metadata: {
        amount: data.totalPending,
        ratio: pendingRatio,
        threshold: thresholds.pendingHighRatio,
      },
    };
  },
};

const rapidMonthlyGrowthRule: ExpenseInsightRule = {
  id: 'rapid-monthly-growth',
  evaluate: (data, thresholds) => {
    const previousMonthExpenses = data.previousMonthExpenses ?? 0;

    if (previousMonthExpenses <= 0 || data.totalExpenses <= previousMonthExpenses) {
      return null;
    }

    const growthRatio = (data.totalExpenses - previousMonthExpenses) / previousMonthExpenses;

    if (growthRatio < thresholds.growthAlertRatio) return null;

    const isCritical = growthRatio >= thresholds.growthCriticalRatio;

    return {
      id: 'rapid-monthly-growth',
      type: isCritical ? 'critical' : 'warning',
      title: isCritical ? 'Sharp expense increase' : 'Expense growth needs review',
      message: `Expenses increased ${formatPercent(growthRatio)} compared with the previous month.`,
      recommendation:
        'Compare the largest categories and pause non-essential spending until the variance is explained.',
      priority: isCritical ? 90 : 75,
      metadata: {
        amount: data.totalExpenses - previousMonthExpenses,
        growthRatio,
        threshold: thresholds.growthAlertRatio,
      },
    };
  },
};

const lowPaymentRateRule: ExpenseInsightRule = {
  id: 'low-payment-rate',
  evaluate: (data, thresholds) => {
    if (data.totalExpenses <= 0 || data.totalRecords <= 0) return null;

    const paymentRate = divideSafely(data.totalPaid, data.totalExpenses);

    if (paymentRate > thresholds.paymentRateLowRatio) return null;

    const isCritical = paymentRate <= thresholds.paymentRateCriticalRatio;

    return {
      id: 'low-payment-rate',
      type: isCritical ? 'critical' : 'warning',
      title: isCritical ? 'Very low payment rate' : 'Low payment rate',
      message: `Only ${formatPercent(paymentRate)} of expenses have been paid.`,
      recommendation:
        'Review unpaid expenses and schedule payments before they become overdue.',
      priority: isCritical ? 85 : 70,
      metadata: {
        amount: data.totalPaid,
        ratio: paymentRate,
        threshold: thresholds.paymentRateLowRatio,
      },
    };
  },
};

const categoryConcentrationRule: ExpenseInsightRule = {
  id: 'category-concentration',
  evaluate: (data, thresholds) => {
    const categories = data.categoryBreakdown ?? [];

    if (
      categories.length === 0 ||
      data.totalRecords < thresholds.minimumRecordsForCategoryAnalysis
    ) {
      return null;
    }

    const categoryTotal = categories.reduce((total, category) => total + category.amount, 0);
    const denominator = data.totalExpenses > 0 ? data.totalExpenses : categoryTotal;
    const topCategory = categories.reduce((highest, category) =>
      category.amount > highest.amount ? category : highest,
    );
    const concentrationRatio = divideSafely(topCategory.amount, denominator);

    if (concentrationRatio < thresholds.categoryConcentrationHighRatio) return null;

    return {
      id: 'category-concentration',
      type: 'warning',
      title: 'Spending is concentrated in one category',
      message: `${topCategory.categoryName} represents ${formatPercent(concentrationRatio)} of current expenses.`,
      recommendation: `Review budgets, approvals, and provider terms for ${topCategory.categoryName}.`,
      priority: 65,
      metadata: {
        amount: topCategory.amount,
        categoryName: topCategory.categoryName,
        ratio: concentrationRatio,
        threshold: thresholds.categoryConcentrationHighRatio,
      },
    };
  },
};

export const EXPENSE_INSIGHT_RULES: ExpenseInsightRule[] = [
  noExpensesDataRule,
  overdueExpensesRule,
  highPendingRatioRule,
  rapidMonthlyGrowthRule,
  lowPaymentRateRule,
  categoryConcentrationRule,
];

export const generateInsights = (
  data: ExpenseInsightInput,
  thresholdOverrides: Partial<ExpenseInsightThresholds> = {},
): ExpenseInsight[] => {
  const thresholds: ExpenseInsightThresholds = {
    ...EXPENSE_INSIGHT_THRESHOLDS,
    ...thresholdOverrides,
  };
  const normalizedData = normalizeExpenseInsightInput(data);
  const insightsById = new Map<string, ExpenseInsight>();

  for (const rule of EXPENSE_INSIGHT_RULES) {
    const insight = rule.evaluate(normalizedData, thresholds);

    if (insight && !insightsById.has(insight.id)) {
      insightsById.set(insight.id, insight);
    }
  }

  return Array.from(insightsById.values()).sort((first, second) => {
    if (second.priority !== first.priority) {
      return second.priority - first.priority;
    }

    return SEVERITY_WEIGHT[second.type] - SEVERITY_WEIGHT[first.type];
  });
};
