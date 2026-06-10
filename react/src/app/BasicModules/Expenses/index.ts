// Main module export
export { default } from './ExpensesModule';
export { default as ExpensesModule } from './ExpensesModule';

// Types exports
export type {
  Expense,
  ExpenseCategory,
  Provider,
  Budget,
  ExpenseStatus,
  PaymentMethod,
  BudgetPeriod,
  BudgetCategory,
  ExpenseFilters,
} from './types/expenses.types';

export type {
  ExpenseCategoryBreakdownItem,
  ExpenseInsight,
  ExpenseInsightInput,
  ExpenseInsightRule,
  ExpenseInsightRuleId,
  ExpenseInsightThresholds,
  ExpenseInsightType,
} from './types/insights.types';

// Data exports
export {
  expenseCategories,
  getCategoryById,
  getCategoryColor,
} from './data/categories.data';

export {
  mockProviders,
  mockExpenses,
  getProviderById,
  getExpensesByProvider,
  getExpensesByCategory,
  getExpensesByStatus,
  getTotalExpenses,
  getTotalExpensesByCategory,
} from './data/expenses.mock';

// Utils exports
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getPaymentMethodName,
  calculatePercentage,
  getRatingStars,
  truncateText,
  getInitials,
  sortBy,
  filterBySearch,
  groupBy,
  generateId,
  debounce,
} from './utils/expenses.utils';

// Financial insights exports
export {
  CATEGORY_CONCENTRATION_HIGH_RATIO,
  EXPENSE_INSIGHT_RULES,
  EXPENSE_INSIGHT_THRESHOLDS,
  GROWTH_ALERT_RATIO,
  GROWTH_CRITICAL_RATIO,
  MINIMUM_RECORDS_FOR_CATEGORY_ANALYSIS,
  OVERDUE_CRITICAL_COUNT,
  PAYMENT_RATE_CRITICAL_RATIO,
  PAYMENT_RATE_LOW_RATIO,
  PENDING_CRITICAL_RATIO,
  PENDING_HIGH_RATIO,
  generateInsights,
  normalizeExpenseInsightInput,
} from './services';

export { useExpensesInsights } from './hooks';
export type { UseExpensesInsightsOptions } from './hooks';

// Tab ecosystem exports
export { default as Expenses } from './Expenses';
export { default as Budgets } from './Budgets';
export { default as Providers } from './Providers';
export { default as ExpensesKPIs } from './KPIs';
export { default as AccountingAccounts } from './AccountingAccounts';
export { default as PaymentAccounts } from './PaymentAccounts';

// Backward-compatible tab aliases
export { default as ExpensesList } from './Expenses';
export { default as BudgetsList } from './Budgets';
export { default as ProvidersList } from './Providers';

export {
  FINANCE_CURRENT_UI_TAB_MIGRATION,
  FINANCE_TAB_ALIGNMENT,
  FINANCE_TAB_ALIGNMENT_LIST,
} from './constants/financeTabAlignment';

export type {
  FinanceRowNature,
  FinanceTableCoherence,
  FinanceTableColumnKey,
  FinanceTableSourceKey,
  FinanceTabAlignment,
  FinanceTabBudgetEffect,
  FinanceTabCashEffect,
  FinanceTabEntityName,
  FinanceTabFinancialOverviewEffect,
  FinanceTabKey,
  FinanceTabPurpose,
  FinanceTabReadinessLevel,
  FinanceTabSourceOfTruth,
  FinanceTabStatusKey,
  FinanceUiTabMigration,
  FinanceUiTabRouteKey,
} from './types/finance-tab-alignment.types';
