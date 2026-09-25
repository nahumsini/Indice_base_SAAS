import type { PosCashClosingSummaryRow } from '../../shared/cashClosingHistory.types';

export type PosKpiPeriod = 'today' | 'this_week' | 'this_month' | 'custom';

export interface PosKpiFiltersState {
  search: string;
  period: PosKpiPeriod;
  dateFrom: string;
  dateTo: string;
  warehouseId: string;
  cashRegisterId: string;
  userId: string;
}

export interface PosKpiRankedRow {
  id: number;
  name: string;
  value: number;
  tickets: number;
  closings: number;
  share: number;
}

export interface PosKpiPaymentMixRow {
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT';
  amount: number;
  percentage: number;
}

export interface PosKpiTrendRow {
  key: string;
  label: string;
  current: number;
  previous: number;
}

export interface PosKpiPerformanceRow {
  cashRegisterId: number;
  cashRegisterName: string;
  cashRegisterCode: string;
  warehouseId: number;
  warehouseName: string;
  sales: number;
  tickets: number;
  averageTicket: number;
  closings: number;
  cashAccuracy: number | null;
  refunds: number;
  lastClosingAt: string;
}

export interface PosKpiComparison {
  current: number;
  previous: number;
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | 'unavailable';
}

export interface PosKpiAnalytics {
  periodLabel: string;
  revenue: number;
  tickets: number;
  averageTicket: number;
  averageClosing: number;
  closings: number;
  totalCount: number;
  totalCashSales: number;
  absoluteDifference: number;
  shortage: number;
  overage: number;
  netDifference: number;
  cashAccuracy: number | null;
  refunds: number;
  refundRate: number;
  registerCoverage: number;
  registersWithSales: number;
  activeRegisters: number;
  comparisons: {
    revenue: PosKpiComparison;
    tickets: PosKpiComparison;
    averageTicket: PosKpiComparison;
    averageClosing: PosKpiComparison;
    cashAccuracy: PosKpiComparison;
    absoluteDifference: PosKpiComparison;
    refunds: PosKpiComparison;
    registerCoverage: PosKpiComparison;
  };
  currencyTotals: Array<{ currency: string; amount: number }>;
  paymentMix: PosKpiPaymentMixRow[];
  trend: PosKpiTrendRow[];
  topCashRegisters: PosKpiRankedRow[];
  topWarehouses: PosKpiRankedRow[];
  performance: PosKpiPerformanceRow[];
}

export const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Closed POS cuts expose net sales; returned sales belong in the original sales population. */
export function refundPercentage(netSales: number, refunds: number): number {
  const grossSales = netSales + refunds;
  return grossSales > 0 ? (refunds / grossSales) * 100 : 0;
}

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date: Date) => {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);
};

export function getDateRangeForPeriod(period: PosKpiPeriod, now = new Date()) {
  const dateTo = toDateInputValue(now);
  if (period === 'today' || period === 'custom') return { dateFrom: dateTo, dateTo };
  if (period === 'this_week') return { dateFrom: toDateInputValue(startOfWeek(now)), dateTo };
  return {
    dateFrom: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo,
  };
}

export function getPreviousDateRange(dateFrom: string, dateTo: string) {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  const spanInDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const previousTo = new Date(from);
  previousTo.setDate(previousTo.getDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousFrom.getDate() - spanInDays + 1);
  return { dateFrom: toDateInputValue(previousFrom), dateTo: toDateInputValue(previousTo) };
}

export function comparison(current: number, previous: number): PosKpiComparison {
  if (previous === 0) {
    return {
      current,
      previous,
      delta: current === 0 ? 0 : null,
      direction: current === 0 ? 'flat' : 'unavailable',
    };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  return {
    current,
    previous,
    delta,
    direction: Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down',
  };
}

export function pointComparison(current: number | null, previous: number | null): PosKpiComparison {
  if (current === null || previous === null) {
    return { current: current ?? 0, previous: previous ?? 0, delta: null, direction: 'unavailable' };
  }
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    direction: Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down',
  };
}

export function sumTickets(rows: PosCashClosingSummaryRow[]) {
  return rows.reduce((total, row) => total + toNumber(row.ticketsCount), 0);
}

export function uniqueRegistersWithSales(rows: PosCashClosingSummaryRow[]) {
  return new Set(rows.filter((row) => toNumber(row.totalSalesAmount) > 0 || row.ticketsCount > 0).map((row) => row.cashRegisterId)).size;
}

export function groupRowsByRegister(rows: PosCashClosingSummaryRow[]) {
  return rows.reduce((groups, row) => {
    const current = groups.get(row.cashRegisterId) ?? [];
    current.push(row);
    groups.set(row.cashRegisterId, current);
    return groups;
  }, new Map<number, PosCashClosingSummaryRow[]>());
}

export function groupRowsByWarehouse(rows: PosCashClosingSummaryRow[]) {
  return rows.reduce((groups, row) => {
    const current = groups.get(row.warehouseId) ?? [];
    current.push(row);
    groups.set(row.warehouseId, current);
    return groups;
  }, new Map<number, PosCashClosingSummaryRow[]>());
}

export function groupRowsByDay(rows: PosCashClosingSummaryRow[]) {
  return rows.reduce((groups, row) => {
    const key = row.closedAt.slice(0, 10);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
    return groups;
  }, new Map<string, PosCashClosingSummaryRow[]>());
}
