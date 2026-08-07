import type {
  PosCashClosingDetailResponse,
  PosCashClosingSummaryRow,
} from '../../shared/cashClosingHistory.types';

export type PosKpiPeriod = 'today' | 'this_week' | 'this_month' | 'all';

export interface PosKpiRankedRow {
  name: string;
  value: number;
  detail: string;
}

export interface PosKpiPaymentMixRow {
  method: string;
  amount: number;
  percentage: number;
}

export interface PosKpiHourlySalesRow {
  hour: string;
  sales: number;
}

export interface PosKpiAnalytics {
  periodLabel: string;
  primaryCurrency: string;
  revenue: number;
  totalCashSales: number;
  tickets: number;
  averageTicket: number;
  closings: number;
  totalCount: number;
  netDifference: number;
  overShortRate: number;
  expectedCash: number;
  countedCash: number;
  currencyTotals: Array<{ currency: string; amount: number }>;
  paymentMix: PosKpiPaymentMixRow[];
  hourlySales: PosKpiHourlySalesRow[];
  topCashRegisters: PosKpiRankedRow[];
  topWarehouses: PosKpiRankedRow[];
}

export const periodOptions: Array<{ value: PosKpiPeriod; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: 'this_week', label: 'Semana' },
  { value: 'this_month', label: 'Mes' },
  { value: 'all', label: 'Todo' },
];

const periodLabels: Record<PosKpiPeriod, string> = {
  today: 'Hoy',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  all: 'Todo el historial',
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateInputValue = (date: Date) => {
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
  if (period === 'all') {
    return {};
  }

  const dateTo = toDateInputValue(now);

  if (period === 'today') {
    return { dateFrom: dateTo, dateTo };
  }

  if (period === 'this_week') {
    return { dateFrom: toDateInputValue(startOfWeek(now)), dateTo };
  }

  return {
    dateFrom: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo,
  };
}

function groupSum<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + getValue(item));
    return map;
  }, new Map<string, number>());
}

function resolvePrimaryCurrency(rows: PosCashClosingSummaryRow[], details: PosCashClosingDetailResponse[]) {
  return details.find((detail) => detail.shift?.currencyCode)?.shift?.currencyCode
    ?? rows.find((row) => row.currencyCode)?.currencyCode
    ?? 'MXN';
}

export function buildPosKpiAnalytics({
  rows,
  details,
  period,
  totalCount,
  preferredCurrency,
}: {
  rows: PosCashClosingSummaryRow[];
  details: PosCashClosingDetailResponse[];
  period: PosKpiPeriod;
  totalCount: number;
  preferredCurrency: string;
}): PosKpiAnalytics {
  const primaryCurrency = preferredCurrency;
  const nativeCurrencyTotals = groupSum(
    rows,
    (row) => row.currencyCode ?? resolvePrimaryCurrency(rows, details),
    (row) => toNumber(row.totalSalesAmount),
  );
  const tickets = rows.reduce((sum, row) => sum + Number(row.ticketsCount ?? 0), 0);

  return {
    periodLabel: periodLabels[period],
    primaryCurrency,
    revenue: 0,
    totalCashSales: 0,
    tickets,
    averageTicket: 0,
    closings: rows.length,
    totalCount,
    netDifference: 0,
    overShortRate: 0,
    expectedCash: 0,
    countedCash: 0,
    currencyTotals: Array.from(nativeCurrencyTotals.entries()).map(([currency, amount]) => ({ currency, amount })),
    paymentMix: [],
    hourlySales: [],
    topCashRegisters: [],
    topWarehouses: [],
  };
}
