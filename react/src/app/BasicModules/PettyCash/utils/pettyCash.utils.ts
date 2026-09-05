import type {
  CashFund,
  CashFundStatus,
  PettyCashAuditStatus,
  PettyCashExpense,
  PettyCashExpenseStatus,
  PettyCashFund,
  PettyCashFundStatus,
  PettyCashMovement,
  PettyCashMovementType,
  PettyCashSettlementLine,
  PettyCashSettlementLineStatus,
  PettyCashStatement,
  PettyCashStatementStatus,
} from '../types/pettyCash.types';
import {
  formatBusinessCurrencyBreakdown,
} from '../../shared/businessCurrency';

export function formatPettyCashCurrency(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
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

export function formatPettyCashIsoDate(date?: string) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
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

export const pettyCashFundStatusLabels: Record<PettyCashFundStatus, string> = {
  OPEN: 'Open',
  LOW_BALANCE: 'Low balance',
  NEEDS_RECONCILIATION: 'Needs reconciliation',
  CLOSED: 'Closed',
};

export const pettyCashStatementStatusLabels: Record<PettyCashStatementStatus, string> = {
  OPEN: 'Open',
  CUT_PENDING: 'Statement pending',
  PARTIALLY_SETTLED: 'Partially settled',
  SETTLED: 'Settled',
  SHORTAGE: 'Shortage',
  FORGIVEN_SHORTAGE: 'Shortage forgiven',
  CHARGED_TO_EMPLOYEE: 'Charged to employee',
  TRANSFERRED_TO_NEXT_CUT: 'Transferred to next statement',
  CLOSED: 'Closed',
};

export const pettyCashMovementTypeLabels: Record<PettyCashMovementType, string> = {
  INITIAL_FUNDING: 'Opening funding',
  ADDITIONAL_DEPOSIT: 'Additional deposit',
  RETURN_TO_SOURCE: 'Return to source',
  CARRY_FORWARD: 'Carry forward',
  SHORTAGE_ADJUSTMENT: 'Shortage adjustment',
  FORGIVEN_SHORTAGE: 'Shortage forgiven',
  EMPLOYEE_CHARGE: 'Employee charge',
};

export const pettyCashSettlementLineStatusLabels: Record<PettyCashSettlementLineStatus, string> = {
  DRAFT: 'Captured',
  RECEIPT_ATTACHED: 'With support',
  VALIDATED: 'Approved',
  EXPENSE_CREATED: 'Expense created',
  REJECTED: 'Rejected',
  REVERSED: 'Reversed',
};

export const pettyCashFundStatusClasses: Record<PettyCashFundStatus, string> = {
  OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  LOW_BALANCE: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  NEEDS_RECONCILIATION: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  CLOSED: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const pettyCashStatementStatusClasses: Record<PettyCashStatementStatus, string> = {
  OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  CUT_PENDING: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  PARTIALLY_SETTLED: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  SETTLED: 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
  SHORTAGE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  FORGIVEN_SHORTAGE: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200',
  CHARGED_TO_EMPLOYEE: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200',
  TRANSFERRED_TO_NEXT_CUT: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200',
  CLOSED: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const pettyCashSettlementLineStatusClasses: Record<PettyCashSettlementLineStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  RECEIPT_ATTACHED: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  VALIDATED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  EXPENSE_CREATED: 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
  REJECTED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  REVERSED: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
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

export function formatPettyCashNativeBreakdown<TItem>(
  items: TItem[],
  getAmount: (item: TItem) => number,
  getCurrency: (item: TItem) => string | null | undefined,
) {
  return formatBusinessCurrencyBreakdown(items, getAmount, getCurrency);
}

export function getStatementSettlementBalance(statement: PettyCashStatement) {
  return Math.max(
    0,
    statement.estimatedUsageAmount
      - statement.verifiedExpenseAmount
      - statement.returnedAmount
      - statement.shortageAmount,
  );
}

export function getFundById(funds: PettyCashFund[], fundId: string) {
  return funds.find(fund => fund.id === fundId);
}

export function getStatementLines(statementId: string, settlementLines: PettyCashSettlementLine[]) {
  return settlementLines.filter(line => line.pettyCashStatementId === statementId);
}

export function getFundMovements(fundId: string, movements: PettyCashMovement[]) {
  return movements.filter(movement => movement.pettyCashFundId === fundId);
}
