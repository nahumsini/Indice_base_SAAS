import type { KpiMonetaryAggregate as Money } from '../../BasicModules/shared/kpiMonetaryApi';
export type { Money };
export type Summary = { records: number; active: number; cancelled: number; total: Money; tax: Money; beforeTax: Money; averageTicket: number | null };
export type SaleRow = { sale: { id: number; number: string; date: string; origin: string; channel: string; customer: string; seller: string; unitName: string; businessName: string; currency: string; total: number; tax: number; discount: number; commercialStatus: string; financeStatus: string; inventoryStatus: string; deliveryStatus: string; ticketId: number | null; ticketNumber: string | null }; accounting: { state: string; number: string | null; date: string | null; reversalNumber: string | null } };
export type Workspace = {
  context: { from: string; to: string; asOfDate: string; timeZone: string; definitionVersion: string };
  items: SaleRow[]; total: number; page: number; pageSize: number; summary: Summary;
  channels: { origin: string; channel: string; summary: Summary }[];
  analytics: { granularity: string; comparison: { from: string; to: string; active: number; total: Money; averageTicket: number | null; totalChangePercent: number | null; volumeChangePercent: number | null; averageChangePercent: number | null };
    trend: { from: string; to: string; previousFrom: string; previousTo: string; active: number; total: Money; previousActive: number; previousTotal: Money }[];
    weekdays: { day: number; occurrences: number; active: number; total: Money; averagePerDay: number | null }[] };
  options: { units: { id: number; name: string }[]; businesses: { id: number; unitId: number; name: string }[]; channels: { origin: string; channel: string }[] };
};
export const boardDefaults = { view: 'overview', from: '', to: '', origin: 'ALL', channel: 'ALL', status: 'ALL', unitId: 'ALL', businessId: 'ALL', search: '', page: 1, pageSize: 25, sort: 'date', direction: 'desc', granularity: 'auto' };
export type BoardFilters = typeof boardDefaults;
const allowed = (value: unknown, values: string[], fallback: string) => typeof value === 'string' && values.includes(value) ? value : fallback;
const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value ? value : '';
const id = (value: unknown) => typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value) ? value : 'ALL';
export function normalizeFilters(value: Partial<BoardFilters>): BoardFilters {
  const unitId = id(value.unitId);
  return { view: allowed(value.view, ['overview', 'trends', 'channels', 'sales'], 'overview'), from: date(value.from), to: date(value.to),
    origin: allowed(value.origin, ['ALL', 'SALES', 'POS', 'UNKNOWN'], 'ALL'), channel: typeof value.channel === 'string' && value.channel.length <= 40 && value.channel.trim() ? value.channel : 'ALL',
    status: allowed(value.status, ['ALL', 'ACTIVE', 'CANCELLED'], 'ALL'), unitId, businessId: unitId === 'ALL' ? 'ALL' : id(value.businessId), search: typeof value.search === 'string' ? value.search.slice(0, 180) : '',
    page: Math.max(1, Math.min(1000000, Math.trunc(Number(value.page) || 1))), pageSize: [10, 25, 50, 100, 200].includes(Number(value.pageSize)) ? Number(value.pageSize) : 25,
    sort: allowed(value.sort, ['date', 'number', 'customer'], 'date'), direction: allowed(value.direction, ['asc', 'desc'], 'desc'), granularity: allowed(value.granularity, ['auto', 'day', 'week', 'month'], 'auto') };
}
export function boardQuery(filters: BoardFilters, currency: string) {
  const { view: _view, unitId, businessId, channel, ...rest } = filters;
  const query = new URLSearchParams(Object.entries(rest).map(([key, value]) => [key, String(value)]));
  query.set('preferredCurrency', currency);
  if (unitId !== 'ALL') query.set('unitId', unitId);
  if (businessId !== 'ALL') query.set('businessId', businessId);
  if (channel !== 'ALL') query.set('channel', channel);
  return query.toString();
}
export const completeAmount = (money: Money) => money.partial ? null : money.preferredTotal;
export const dateLabel = (value: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
export function moneyLabel(value: number | null, currency: string, locale: string) {
  if (value === null) return '—';
  const code = (currency ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} · ${code || '—'}`;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(value);
}
