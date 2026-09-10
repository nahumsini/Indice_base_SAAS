export type BudgetPeriod = 'this_month' | 'next_month' | 'next_quarter' | 'custom';

export function getBudgetPeriodRange(period: BudgetPeriod, from = '', to = '', now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const startMonth = period === 'this_month' ? month
    : period === 'next_quarter' ? (Math.floor(month / 3) + 1) * 3 : month + 1;
  const start = period === 'custom' && from ? new Date(`${from}T00:00:00`)
    : new Date(year, startMonth, 1);
  const end = period === 'custom'
    ? to ? new Date(`${to}T23:59:59.999`) : new Date(2999, 11, 31, 23, 59, 59, 999)
    : new Date(year, startMonth + (period === 'next_quarter' ? 3 : 1), 0, 23, 59, 59, 999);
  return { start, end };
}

export function isBudgetInPeriod(dueDate: Date, range: ReturnType<typeof getBudgetPeriodRange>) {
  return dueDate.getTime() >= range.start.getTime() && dueDate.getTime() <= range.end.getTime();
}
