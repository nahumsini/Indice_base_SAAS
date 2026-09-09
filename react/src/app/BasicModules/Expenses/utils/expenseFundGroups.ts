import type { Expense } from '../types/expenses.types';
import type { PeriodFilter } from '../types/expenseView.types';
import type { ExpenseSortField } from '../constants/expenseTableConfig';
import { compareSortValues, type SortDirection } from './expenseTableUtils';
import { getEffectiveExpenseStatus, getExpenseBalance } from './expenseFilters';

export type FundMoneyField = 'total' | 'taxes' | 'amount' | 'amountPaid' | 'balance';
export type FundMoney = Record<FundMoneyField, number>;
export type ExpenseFundGroup = {
  kind: 'fund';
  key: string;
  fund: NonNullable<Expense['originFund']>;
  currency: string;
  expenses: Expense[];
};
export type ExpenseDisplayRow = ExpenseFundGroup | { kind: 'expense'; key: string; expense: Expense };

export const isGroupedFundExpense = (expense: Expense) => expense.originFund?.type === 'INTERNAL_COMPANY'
  && ['PAID', 'CLOSED'].includes(expense.backendStatus?.toUpperCase() ?? '');

// These are presentation rows, never replacement Expense records or mutation targets.
export function groupExpenseRows(expenses: Expense[]): ExpenseDisplayRow[] {
  const rows: ExpenseDisplayRow[] = [];
  const funds = new Map<string, ExpenseFundGroup>();
  const seen = new Set<string>();
  for (const expense of expenses) {
    if (seen.has(expense.id) || expense.originFund?.type === 'EXTERNAL_MANAGED') continue;
    seen.add(expense.id);
    if (!isGroupedFundExpense(expense)) {
      rows.push({ kind: 'expense', key: expense.id, expense });
      continue;
    }
    const currency = expense.currency.trim().toUpperCase();
    const key = `fund:${expense.originFund!.id}:${currency}`;
    let group = funds.get(key);
    if (!group) {
      group = { kind: 'fund', key, fund: expense.originFund!, currency, expenses: [] };
      funds.set(key, group);
      rows.push(group);
    }
    group.expenses.push(expense);
  }
  return rows;
}

export function sortExpenseRows(rows: ExpenseDisplayRow[], field: ExpenseSortField | null,
  direction: SortDirection, money: Record<string, FundMoney>): ExpenseDisplayRow[] {
  if (!field || !direction) return rows;
  const value = (row: ExpenseDisplayRow): unknown => {
    if (row.kind === 'expense') return field === 'balance' ? getExpenseBalance(row.expense)
      : field === 'status' ? getEffectiveExpenseStatus(row.expense) : row.expense[field];
    if (['total', 'taxes', 'amount', 'amountPaid', 'balance'].includes(field)) return money[row.key]?.[field as FundMoneyField];
    if (field === 'concept' || field === 'folio') return row.fund.name;
    if (field === 'date') return new Date(Math.min(...row.expenses.map(expense => expense.date.getTime())));
    if (field === 'status') return 'paid';
    if (field === 'dueDate') return undefined;
    const values = row.expenses.map(expense => expense[field as keyof Expense]);
    return values.every(item => item === values[0]) ? values[0] : '';
  };
  return [...rows].sort((a, b) => {
    const left = value(a); const right = value(b);
    // Unknown totals stay last while loading/failing; never sort them as zero.
    if (left == null || right == null) return left == null ? (right == null ? 0 : 1) : -1;
    return compareSortValues(left, right, direction);
  });
}

export function expenseGroupPeriodLabel(period: PeriodFilter, referenceDate: Date, locale: string, fallback: string) {
  if (period === 'custom') return fallback;
  if (period === 'this_year' || period === 'last_year') return String(referenceDate.getFullYear() - Number(period === 'last_year'));
  const offset = period === 'last_month' ? 1 : period === 'two_months_ago' ? 2 : 0;
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    .format(new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1));
}
