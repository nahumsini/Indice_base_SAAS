import type {
  PosCashClosingDetailResponse,
  PosCashClosingPaymentMethod,
  PosCashClosingSummaryRow,
} from '../types/cashClosingHistory.types';
import {
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';
import type { KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';

export type CortesViewMode = 'table' | 'day';
export type CortesPeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export type CortesDifferenceFilter = 'all' | 'balanced' | 'withDifference' | 'short' | 'over';
export type CortesSortKey =
  | 'id'
  | 'closedAt'
  | 'warehouseId'
  | 'cashRegisterId'
  | 'shiftId'
  | 'closedByUserId'
  | 'ticketsCount'
  | 'totalSalesAmount'
  | 'expectedCashAmount'
  | 'countedCashAmount'
  | 'overShortAmount';

export type CortesSortDirection = 'asc' | 'desc';

export interface CortesFilters {
  search: string;
  period: CortesPeriodFilter;
  dateFrom: string;
  dateTo: string;
  warehouseId: string;
  cashRegisterId: string;
  userId: string;
  difference: CortesDifferenceFilter;
}

export interface CortesAnalytics {
  closingCount: number;
  preferredCurrency: string;
  totalSales: number;
  convertedSales: number;
  totalSalesLabel: string;
  convertedSalesLabel: string;
  salesCurrencyTotals: CortesCurrencyTotal[];
  hasMultipleSalesCurrencies: boolean;
  totalTickets: number;
  expectedCash: number;
  convertedExpectedCash: number;
  countedCash: number;
  convertedCountedCash: number;
  netDifference: number;
  convertedNetDifference: number;
  balancedCount: number;
  shortCount: number;
  overCount: number;
}

export interface CortesCurrencyTotal {
  currency: string;
  total: number;
  label: string;
}

export const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

export const toLocalInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getCortesPeriodRange = (period: CortesPeriodFilter, baseDate = new Date()) => {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);

  if (period === 'yesterday') {
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    return {
      dateFrom: toLocalInputDate(yesterday),
      dateTo: toLocalInputDate(yesterday),
    };
  }

  if (period === 'week') {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      dateFrom: toLocalInputDate(start),
      dateTo: toLocalInputDate(end),
    };
  }

  if (period === 'month') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      dateFrom: toLocalInputDate(start),
      dateTo: toLocalInputDate(end),
    };
  }

  return {
    dateFrom: toLocalInputDate(date),
    dateTo: toLocalInputDate(date),
  };
};

export const formatCurrency = (amount: number, currency = defaultBusinessCurrency) => (
  formatBusinessCurrencyAmount(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
);

export const getClosingCurrency = (row: PosCashClosingSummaryRow) => (
  normalizeBusinessCurrencyCode(row.currencyCode, defaultBusinessCurrency)
);

export const formatClosingAmount = (
  amount: number,
  row: PosCashClosingSummaryRow,
) => {
  const nativeCurrency = getClosingCurrency(row);
  const nativeLabel = formatCurrency(amount, nativeCurrency);
  return { nativeCurrency, nativeLabel };
};

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Sin registro';
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export const formatDateLabel = (value?: string | null) => {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

export const getClosingStatus = (row: PosCashClosingSummaryRow) => {
  const difference = toNumber(row.overShortAmount);
  if (difference < 0) {
    return 'short';
  }
  if (difference > 0) {
    return 'over';
  }
  return 'balanced';
};

export const getPaymentTotal = (
  detail: PosCashClosingDetailResponse,
  method: PosCashClosingPaymentMethod,
) => (
  detail.paymentsSummary
    .filter((payment) => payment.paymentMethod === method)
    .reduce((total, payment) => total + toNumber(payment.amount), 0)
);

export const buildCortesAnalytics = (
  rows: PosCashClosingSummaryRow[],
  preferredCurrency = defaultBusinessCurrency,
  monetary?: {
    sales?: KpiMonetaryAggregate;
    expected?: KpiMonetaryAggregate;
    counted?: KpiMonetaryAggregate;
    difference?: KpiMonetaryAggregate;
  },
): CortesAnalytics => {
  const preferred = normalizeBusinessCurrencyCode(preferredCurrency, defaultBusinessCurrency);
  const totalsByCurrency = new Map<string, number>();

  const analytics = rows.reduce<CortesAnalytics>((currentAnalytics, row) => {
    const status = getClosingStatus(row);
    const rowCurrency = getClosingCurrency(row);
    const totalSales = toNumber(row.totalSalesAmount);
    const expectedCash = toNumber(row.expectedCashAmount);
    const countedCash = toNumber(row.countedCashAmount);
    const netDifference = toNumber(row.overShortAmount);

    totalsByCurrency.set(rowCurrency, (totalsByCurrency.get(rowCurrency) ?? 0) + totalSales);

    return {
      ...currentAnalytics,
      balancedCount: currentAnalytics.balancedCount + (status === 'balanced' ? 1 : 0),
      closingCount: currentAnalytics.closingCount + 1,
      countedCash: currentAnalytics.countedCash + countedCash,
      expectedCash: currentAnalytics.expectedCash + expectedCash,
      netDifference: currentAnalytics.netDifference + netDifference,
      overCount: currentAnalytics.overCount + (status === 'over' ? 1 : 0),
      shortCount: currentAnalytics.shortCount + (status === 'short' ? 1 : 0),
      totalSales: currentAnalytics.totalSales + totalSales,
      totalTickets: currentAnalytics.totalTickets + row.ticketsCount,
    };
  }, {
    balancedCount: 0,
    closingCount: 0,
    convertedCountedCash: 0,
    convertedExpectedCash: 0,
    convertedNetDifference: 0,
    convertedSales: 0,
    countedCash: 0,
    expectedCash: 0,
    hasMultipleSalesCurrencies: false,
    netDifference: 0,
    overCount: 0,
    preferredCurrency: preferred,
    salesCurrencyTotals: [],
    shortCount: 0,
    totalSales: 0,
    totalSalesLabel: formatCurrency(0, preferred),
    convertedSalesLabel: formatCurrency(0, preferred),
    totalTickets: 0,
  });

  const salesCurrencyTotals = Array.from(totalsByCurrency.entries())
    .sort(([firstCurrency], [secondCurrency]) => firstCurrency.localeCompare(secondCurrency))
    .map(([currency, total]) => ({
      currency,
      label: formatCurrency(total, currency),
      total,
    }));

  return {
    ...analytics,
    convertedCountedCash: monetary?.counted?.preferredTotal ?? 0,
    convertedExpectedCash: monetary?.expected?.preferredTotal ?? 0,
    convertedNetDifference: monetary?.difference?.preferredTotal ?? 0,
    convertedSales: monetary?.sales?.preferredTotal ?? 0,
    convertedSalesLabel: formatCurrency(monetary?.sales?.preferredTotal ?? 0, preferred),
    hasMultipleSalesCurrencies: salesCurrencyTotals.length > 1,
    salesCurrencyTotals,
    totalSalesLabel: salesCurrencyTotals.length > 0
      ? salesCurrencyTotals.map((item) => item.label).join(' / ')
      : formatCurrency(0, preferred),
  };
};

export const filterCortesRows = (
  rows: PosCashClosingSummaryRow[],
  filters: CortesFilters,
) => {
  const search = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    const status = getClosingStatus(row);
    const searchable = [
      `COR-${row.id}`,
      row.id,
      row.shiftId,
      row.cashRegisterId,
      row.warehouseId,
      row.closedByUserId,
    ].join(' ').toLowerCase();

    const matchesSearch = search === '' || searchable.includes(search);
    const matchesDifference = filters.difference === 'all'
      || (filters.difference === 'balanced' && status === 'balanced')
      || (filters.difference === 'withDifference' && status !== 'balanced')
      || filters.difference === status;

    return matchesSearch && matchesDifference;
  });
};

export const sortCortesRows = (
  rows: PosCashClosingSummaryRow[],
  sortKey: CortesSortKey,
  direction: CortesSortDirection,
) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...rows].sort((first, second) => {
    const firstValue = sortKey === 'closedAt'
      ? new Date(first.closedAt).getTime()
      : toNumber(first[sortKey]);
    const secondValue = sortKey === 'closedAt'
      ? new Date(second.closedAt).getTime()
      : toNumber(second[sortKey]);

    return (firstValue - secondValue) * multiplier;
  });
};

export const groupCortesByDate = (
  rows: PosCashClosingSummaryRow[],
  preferredCurrency = defaultBusinessCurrency,
) => {
  const groups = new Map<string, PosCashClosingSummaryRow[]>();

  rows.forEach((row) => {
    const key = row.closedAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries())
    .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
    .map(([date, dateRows]) => ({
      analytics: buildCortesAnalytics(dateRows, preferredCurrency),
      date,
      rows: dateRows,
    }));
};
