import type { ReceivablesKpiSource } from '../services/receivablesApi';
import type { ReceivableAccount, ReceivableInstallment, PeriodFilter } from '../types';

export const receivablesKpiViews = ['overview', 'analysis', 'units', 'details'] as const;
export type ReceivablesKpiView = typeof receivablesKpiViews[number];
export const normalizeKpiView = (value: unknown): ReceivablesKpiView => receivablesKpiViews.includes(value as ReceivablesKpiView) ? value as ReceivablesKpiView : 'overview';
export const defaultKpiScope = { search: '', period: 'this_month' as PeriodFilter, unit: 'all', business: 'all' };
export type KpiScope = typeof defaultKpiScope;
export function normalizeKpiScope(raw: Partial<KpiScope>): KpiScope {
  return { search: typeof raw.search === 'string' ? raw.search : '',
    period: ['all', 'today', 'this_week', 'this_month', 'last_month'].includes(raw.period ?? '') ? raw.period! : 'this_month',
    unit: typeof raw.unit === 'string' ? raw.unit : 'all', business: typeof raw.business === 'string' ? raw.business : 'all' };
}
export const organizationKey = (id?: number | null) => id == null ? 'unassigned' : String(id);
export const customerKey = (row: ReceivableAccount) => row.contactId == null ? `account:${row.id}` : `contact:${row.contactId}`;
export const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const shiftDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const daysLate = (dueDate: string, asOfDate: string) => isDate(dueDate) ? Math.max(0, Math.floor((Date.parse(`${asOfDate}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000)) : null;
export function periodRange(period: PeriodFilter, asOfDate: string) {
  if (period === 'all') return { from: '', to: asOfDate };
  if (period === 'today') return { from: asOfDate, to: asOfDate };
  if (period === 'this_week') return { from: shiftDays(asOfDate, -((new Date(`${asOfDate}T00:00:00Z`).getUTCDay() + 6) % 7)), to: asOfDate };
  const monthStart = `${asOfDate.slice(0, 7)}-01`;
  if (period === 'last_month') { const end = shiftDays(monthStart, -1); return { from: `${end.slice(0, 7)}-01`, to: end }; }
  return { from: monthStart, to: asOfDate };
}
export const agingKeys = ['current', 'days1to30', 'days31to60', 'days61to90', 'days91plus', 'undated'] as const;
export type AgingKey = typeof agingKeys[number];
export function agingKey(row: ReceivableInstallment, asOfDate: string): AgingKey {
  const days = daysLate(row.dueDate, asOfDate);
  return days == null ? 'undated' : days === 0 ? 'current' : days <= 30 ? 'days1to30' : days <= 60 ? 'days31to60' : days <= 90 ? 'days61to90' : 'days91plus';
}
export function selectReceivablesKpis(source: ReceivablesKpiSource, scope: KpiScope) {
  const search = scope.search.trim().toLocaleLowerCase();
  const accounts = source.receivables.filter(row =>
    (scope.unit === 'all' || organizationKey(row.unitId) === scope.unit)
    && (scope.business === 'all' || organizationKey(row.businessId) === scope.business)
    && (!search || [row.saleNumber, row.customerName, row.customerId].join(' ').toLocaleLowerCase().includes(search)));
  const accountIds = new Set(accounts.map(row => row.id));
  const open = accounts.filter(row => row.status !== 'cancelled' && row.balance > 0);
  const openIds = new Set(open.map(row => row.id));
  const installments = source.installments.filter(row => openIds.has(row.receivableId) && row.status !== 'cancelled' && row.balance > 0);
  const overdue = installments.filter(row => (daysLate(row.dueDate, source.asOfDate) ?? 0) > 0);
  const dueSoon = installments.filter(row => isDate(row.dueDate) && row.dueDate >= source.asOfDate && row.dueDate <= shiftDays(source.asOfDate, 30));
  const range = periodRange(scope.period, source.asOfDate);
  // Collections use payment date, including paid accounts and receipts from cancelled contracts.
  const payments = source.payments.filter(row => accountIds.has(row.receivableId) && isDate(row.paymentDate) && row.paymentDate >= range.from && row.paymentDate <= range.to);
  const paymentIssues = source.payments.filter(row => accountIds.has(row.receivableId) && (!isDate(row.paymentDate) || row.paymentDate > source.asOfDate));
  const missingSchedule = open.filter(account => !installments.some(row => row.receivableId === account.id) || installments.some(row => row.receivableId === account.id && !isDate(row.dueDate)));
  const withReceipt = payments.filter(row => Boolean(row.receiptDataUrl || row.receiptImageDataUrl));
  const identifiedCustomers = new Set(open.filter(row => row.contactId != null).map(row => row.contactId));
  return { accounts, open, installments, overdue, dueSoon, payments, paymentIssues, missingSchedule, withReceipt, identifiedCustomers,
    unlinkedCustomers: open.filter(row => row.contactId == null), range, asOfDate: source.asOfDate };
}
export type ReceivablesKpiSelection = ReturnType<typeof selectReceivablesKpis>;
export function groupAccounts(rows: ReceivableAccount[], key: (row: ReceivableAccount) => string) {
  const groups = new Map<string, ReceivableAccount[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return [...groups].map(([key, rows]) => ({ key, rows }));
}
