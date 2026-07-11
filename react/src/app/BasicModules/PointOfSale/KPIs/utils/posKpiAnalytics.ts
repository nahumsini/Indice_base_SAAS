import type {
  PosCashClosingDetailResponse,
  PosCashClosingSummaryRow,
  PosPaymentMethodSummary,
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

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  WALLET: 'Wallet',
  CREDIT: 'Credito',
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

function rankedRowsFromMap(map: Map<string, number>, detail: string, limit = 3): PosKpiRankedRow[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value, detail }));
}

function resolvePrimaryCurrency(rows: PosCashClosingSummaryRow[], details: PosCashClosingDetailResponse[]) {
  return details.find((detail) => detail.shift?.currencyCode)?.shift?.currencyCode
    ?? rows.find((row) => row.currencyCode)?.currencyCode
    ?? 'MXN';
}

function paymentLabel(payment: PosPaymentMethodSummary) {
  return paymentMethodLabels[String(payment.paymentMethod)] ?? String(payment.paymentMethod);
}

function buildPaymentMix(
  rows: PosCashClosingSummaryRow[],
  details: PosCashClosingDetailResponse[],
  revenue: number,
  convertAmount: (amount: number, currency: string) => number,
) {
  const paymentTotals = details.length > 0
    ? details.reduce((map, detail) => {
        const currency = detail.shift?.currencyCode ?? 'MXN';
        (detail.paymentsSummary ?? []).forEach((payment) => {
          const label = paymentLabel(payment);
          map.set(label, (map.get(label) ?? 0) + convertAmount(toNumber(payment.amount), currency));
        });
        return map;
      }, new Map<string, number>())
    : new Map([
        ['Efectivo', rows.reduce((sum, row) => sum + convertAmount(toNumber(row.cashSalesAmount), row.currencyCode ?? 'MXN'), 0)],
      ]);

  const total = Array.from(paymentTotals.values()).reduce((sum, amount) => sum + amount, 0) || revenue;

  return Array.from(paymentTotals.entries())
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));
}

function buildHourlySales(rows: PosCashClosingSummaryRow[], convertAmount: (amount: number, currency: string) => number) {
  const hourlyMap = groupSum(
    rows,
    (row) => String(new Date(row.closedAt).getHours()).padStart(2, '0'),
    (row) => convertAmount(toNumber(row.totalSalesAmount), row.currencyCode ?? 'MXN'),
  );

  return Array.from(hourlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, sales]) => ({ hour, sales }));
}

export function buildPosKpiAnalytics({
  rows,
  details,
  period,
  totalCount,
  preferredCurrency,
  convertAmount,
}: {
  rows: PosCashClosingSummaryRow[];
  details: PosCashClosingDetailResponse[];
  period: PosKpiPeriod;
  totalCount: number;
  preferredCurrency: string;
  convertAmount: (amount: number, currency: string) => number;
}): PosKpiAnalytics {
  const primaryCurrency = preferredCurrency;
  const nativeCurrencyTotals = groupSum(
    rows,
    (row) => row.currencyCode ?? resolvePrimaryCurrency(rows, details),
    (row) => toNumber(row.totalSalesAmount),
  );
  const convertedRowAmount = (row: PosCashClosingSummaryRow, amount: number) => convertAmount(amount, row.currencyCode ?? 'MXN');
  const revenue = rows.reduce((sum, row) => sum + convertedRowAmount(row, toNumber(row.totalSalesAmount)), 0);
  const totalCashSales = rows.reduce((sum, row) => sum + convertedRowAmount(row, toNumber(row.cashSalesAmount)), 0);
  const tickets = rows.reduce((sum, row) => sum + Number(row.ticketsCount ?? 0), 0);
  const netDifference = rows.reduce((sum, row) => sum + convertedRowAmount(row, toNumber(row.overShortAmount)), 0);
  const expectedCash = rows.reduce((sum, row) => sum + convertedRowAmount(row, toNumber(row.expectedCashAmount)), 0);
  const countedCash = rows.reduce((sum, row) => sum + convertedRowAmount(row, toNumber(row.countedCashAmount)), 0);
  const registerNameById = new Map(details.map((detail) => [
    String(detail.cashRegisterId),
    detail.cashRegister?.name || detail.cashRegister?.code || `Caja ${detail.cashRegisterId}`,
  ]));
  const registerTotals = groupSum(
    rows,
    (row) => registerNameById.get(String(row.cashRegisterId)) ?? `Caja ${row.cashRegisterId}`,
    (row) => convertedRowAmount(row, toNumber(row.totalSalesAmount)),
  );
  const warehouseTotals = groupSum(
    rows,
    (row) => `Almacen ${row.warehouseId}`,
    (row) => convertedRowAmount(row, toNumber(row.totalSalesAmount)),
  );

  return {
    periodLabel: periodLabels[period],
    primaryCurrency,
    revenue,
    totalCashSales,
    tickets,
    averageTicket: tickets > 0 ? revenue / tickets : 0,
    closings: rows.length,
    totalCount,
    netDifference,
    overShortRate: totalCashSales > 0 ? Math.abs(netDifference / totalCashSales) * 100 : 0,
    expectedCash,
    countedCash,
    currencyTotals: Array.from(nativeCurrencyTotals.entries()).map(([currency, amount]) => ({ currency, amount })),
    paymentMix: buildPaymentMix(rows, details, revenue, convertAmount),
    hourlySales: buildHourlySales(rows, convertAmount),
    topCashRegisters: rankedRowsFromMap(registerTotals, 'venta cerrada'),
    topWarehouses: rankedRowsFromMap(warehouseTotals, 'venta cerrada'),
  };
}
