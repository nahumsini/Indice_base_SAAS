import type { FinanceExpense } from '../types/finance-domain.types';

export const expenseKpiViews = ['overview', 'analysis', 'units', 'control'] as const;
export type ExpenseKpiView = typeof expenseKpiViews[number];
export const resolveExpenseKpiView = (value: unknown): ExpenseKpiView =>
  expenseKpiViews.includes(value as ExpenseKpiView) ? value as ExpenseKpiView : 'overview';

export const isIncludedExpense = (row: FinanceExpense) => !['CANCELLED', 'REJECTED'].includes(row.status);
export const hasEvidence = (row: FinanceExpense) => (row.attachmentCount ?? row.attachments.length) > 0;
export const isOpenExpense = (row: FinanceExpense) => isIncludedExpense(row) && row.balance > 0;
export const isRecognizedExpense = (row: FinanceExpense) => ['APPROVED', 'PARTIALLY_PAID', 'PAID', 'CLOSED'].includes(row.status);
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayNumber = (value: string) => {
  const parsed = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 86_400_000) : NaN;
};
export const daysAfter = (later: string, earlier: string) => dayNumber(later) - dayNumber(earlier);
export const isOverdueExpense = (row: FinanceExpense, asOfDate?: string) =>
  isOpenExpense(row) && Boolean(asOfDate && row.dueDate && daysAfter(asOfDate, row.dueDate) > 0);

export function paymentPunctuality(rows: FinanceExpense[]) {
  const comparable = rows.filter(row => isIncludedExpense(row) && row.balance === 0 && row.paidAmount > 0
    && row.paidDate && row.dueDate && Number.isFinite(daysAfter(row.paidDate, row.dueDate))
    && (row.paymentStatus === 'PAID' || row.status === 'CLOSED'));
  const onTime = comparable.filter(row => daysAfter(row.paidDate!, row.dueDate!) <= 0).length;
  return { count: comparable.length, onTime, percent: comparable.length ? onTime / comparable.length * 100 : null };
}

export type ExpenseIssue = 'all' | 'missingEvidence' | 'missingProvider' | 'missingAccount' | 'missingDueDate'
  | 'missingResponsible' | 'pendingApproval' | 'pendingAudit' | 'open' | 'overdue';
export const expenseIssues: ExpenseIssue[] = ['missingEvidence', 'missingProvider', 'missingAccount', 'missingDueDate', 'missingResponsible', 'pendingApproval', 'pendingAudit'];
export const matchesExpenseIssue = (row: FinanceExpense, issue: ExpenseIssue, asOfDate?: string) => {
  if (!isIncludedExpense(row)) return false;
  switch (issue) {
    case 'missingEvidence': return !hasEvidence(row);
    case 'missingProvider': return !row.providerId;
    case 'missingAccount': return !row.accountingAccountId;
    case 'missingDueDate': return isOpenExpense(row) && !row.dueDate;
    case 'missingResponsible': return !row.requestedByUserId && !row.requestedBy;
    case 'pendingApproval': return row.status === 'PENDING_APPROVAL';
    case 'pendingAudit': return row.paidAmount > 0 && row.balance === 0 && row.status !== 'CLOSED' && row.auditStatus !== 'AUDITED';
    case 'open': return isOpenExpense(row);
    case 'overdue': return isOverdueExpense(row, asOfDate);
    default: return true;
  }
};

// Calendar buckets cover the entire chosen range. Calendar arithmetic avoids DST drift.
export function expenseTrendWindows(start: Date, end: Date) {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) return [];
  const from = dateKey(start), to = dateKey(end);
  const days = daysAfter(to, from) + 1;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  const grain = days <= 31 ? 'day' : months <= 36 ? 'month' : 'year';
  const result: Array<{ from: string; to: string; grain: 'day' | 'month' | 'year' }> = [];
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate()); dateKey(cursor) <= to;) {
    const next = grain === 'day' ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      : grain === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        : new Date(cursor.getFullYear() + 1, 0, 1);
    const last = dateKey(new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1));
    result.push({ from: dateKey(cursor), to: last > to ? to : last, grain });
    cursor = next;
  }
  return result;
}
