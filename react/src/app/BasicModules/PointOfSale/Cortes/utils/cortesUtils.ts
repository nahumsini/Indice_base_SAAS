import type {
  PosCashClosingDetailResponse,
  PosCashClosingPaymentMethod,
  PosCashClosingSummaryRow,
} from '../types/cashClosingHistory.types';

export type CortesViewMode = 'table' | 'day';
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
  dateFrom: string;
  dateTo: string;
  warehouseId: string;
  cashRegisterId: string;
  userId: string;
  difference: CortesDifferenceFilter;
}

export interface CortesAnalytics {
  closingCount: number;
  totalSales: number;
  totalTickets: number;
  expectedCash: number;
  countedCash: number;
  netDifference: number;
  balancedCount: number;
  shortCount: number;
  overCount: number;
}

export const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

export const toLocalInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const formatCurrency = (amount: number, currency = 'MXN') => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
);

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

export const buildCortesAnalytics = (rows: PosCashClosingSummaryRow[]): CortesAnalytics => (
  rows.reduce<CortesAnalytics>((analytics, row) => {
    const status = getClosingStatus(row);

    return {
      closingCount: analytics.closingCount + 1,
      totalSales: analytics.totalSales + toNumber(row.totalSalesAmount),
      totalTickets: analytics.totalTickets + row.ticketsCount,
      expectedCash: analytics.expectedCash + toNumber(row.expectedCashAmount),
      countedCash: analytics.countedCash + toNumber(row.countedCashAmount),
      netDifference: analytics.netDifference + toNumber(row.overShortAmount),
      balancedCount: analytics.balancedCount + (status === 'balanced' ? 1 : 0),
      shortCount: analytics.shortCount + (status === 'short' ? 1 : 0),
      overCount: analytics.overCount + (status === 'over' ? 1 : 0),
    };
  }, {
    balancedCount: 0,
    closingCount: 0,
    countedCash: 0,
    expectedCash: 0,
    netDifference: 0,
    overCount: 0,
    shortCount: 0,
    totalSales: 0,
    totalTickets: 0,
  })
);

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

export const groupCortesByDate = (rows: PosCashClosingSummaryRow[]) => {
  const groups = new Map<string, PosCashClosingSummaryRow[]>();

  rows.forEach((row) => {
    const key = row.closedAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries())
    .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
    .map(([date, dateRows]) => ({
      analytics: buildCortesAnalytics(dateRows),
      date,
      rows: dateRows,
    }));
};
