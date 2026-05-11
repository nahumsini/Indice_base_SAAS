import type { CashFund, CashFundStatus, PettyCashAuditStatus, PettyCashExpense, PettyCashExpenseStatus } from '../types/pettyCash.types';

export function formatPettyCashCurrency(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPettyCashDate(date?: Date) {
  if (!date) return 'Not set';

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export const pettyCashStatusLabels: Record<PettyCashExpenseStatus, string> = {
  pending_receipt: 'Pending receipt',
  submitted: 'Submitted',
  approved: 'Approved',
  settled: 'Settled',
  overdue: 'Overdue',
  rejected: 'Rejected',
};

export const cashFundStatusLabels: Record<CashFundStatus, string> = {
  active: 'Active',
  low_balance: 'Low balance',
  needs_reconciliation: 'Needs reconciliation',
  closed: 'Closed',
};

export const pettyCashAuditStatusLabels: Record<PettyCashAuditStatus, string> = {
  not_reviewed: 'Not reviewed',
  in_review: 'In review',
  audited: 'Audited',
  flagged: 'Flagged',
};

export const pettyCashStatusClasses: Record<PettyCashExpenseStatus, string> = {
  pending_receipt: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  settled: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  rejected: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};

export const cashFundStatusClasses: Record<CashFundStatus, string> = {
  active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  low_balance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  needs_reconciliation: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  closed: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};

export const pettyCashAuditStatusClasses: Record<PettyCashAuditStatus, string> = {
  not_reviewed: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  in_review: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  audited: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  flagged: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
};

export function getPettyCashSummary(expenses: PettyCashExpense[]) {
  const totalIssued = expenses.reduce((sum, expense) => sum + expense.amountIssued, 0);
  const totalSettled = expenses.reduce((sum, expense) => sum + expense.amountSettled, 0);
  const pendingBalance = expenses.reduce((sum, expense) => sum + expense.balance, 0);
  const overdueCount = expenses.filter(expense => expense.status === 'overdue').length;
  const pendingReceiptCount = expenses.filter(expense => expense.status === 'pending_receipt' || expense.status === 'overdue').length;

  return {
    totalIssued,
    totalSettled,
    pendingBalance,
    overdueCount,
    pendingReceiptCount,
  };
}

export function getCashFundSummary(funds: CashFund[]) {
  const totalLimit = funds.reduce((sum, fund) => sum + fund.limit, 0);
  const totalBalance = funds.reduce((sum, fund) => sum + fund.currentBalance, 0);
  const pendingReceipts = funds.reduce((sum, fund) => sum + fund.pendingReceipts, 0);
  const activeFunds = funds.filter(fund => fund.status !== 'closed').length;
  const riskFunds = funds.filter(fund => fund.status === 'low_balance' || fund.status === 'needs_reconciliation').length;

  return {
    totalLimit,
    totalBalance,
    pendingReceipts,
    activeFunds,
    riskFunds,
  };
}
