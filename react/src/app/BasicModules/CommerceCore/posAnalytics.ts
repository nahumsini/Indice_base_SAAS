import type { CashClosingRecord } from '../PointOfSale/shared/cashClosing.types';
import type { SaleRecord } from '../Sales/Sales/types/salesTypes';

export type PosAnalyticsPeriod = 'today' | 'this_week' | 'this_month' | 'all';

export type PosCurrencyTotal = {
  currency: string;
  amount: number;
};

export type PosRankedRow = {
  name: string;
  value: number;
  detail: string;
};

export type PosPaymentMixRow = {
  method: string;
  amount: number;
  percentage: number;
};

export type PosHourlySalesRow = {
  hour: string;
  sales: number;
};

export type PosAnalytics = {
  periodLabel: string;
  primaryCurrency: string;
  currencyTotals: PosCurrencyTotal[];
  revenue: number;
  subtotal: number;
  tax: number;
  discount: number;
  margin: number;
  tickets: number;
  averageTicket: number;
  closings: number;
  netDifference: number;
  inventoryPending: number;
  financePending: number;
  paymentMix: PosPaymentMixRow[];
  hourlySales: PosHourlySalesRow[];
  topSellers: PosRankedRow[];
  topProducts: PosRankedRow[];
};

const periodLabels: Record<PosAnalyticsPeriod, string> = {
  today: 'Hoy',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  all: 'Todo el historial',
};

const parseSaleDate = (date: string) => new Date(`${date}T12:00:00`);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date) => {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

function isInPeriod(date: Date, period: PosAnalyticsPeriod, now = new Date()) {
  if (period === 'all') {
    return true;
  }

  const target = startOfDay(date).getTime();

  if (period === 'today') {
    return target === startOfDay(now).getTime();
  }

  if (period === 'this_week') {
    return target >= startOfWeek(now).getTime();
  }

  return target >= startOfMonth(now).getTime();
}

function isPointOfSaleRecord(sale: SaleRecord) {
  return sale.quoteReference === 'POS direct' || sale.saleDocumentReference?.startsWith('TICKET-');
}

function groupSum<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + getValue(item));
    return map;
  }, new Map<string, number>());
}

function rankedRowsFromMap(map: Map<string, number>, detail: string, limit = 3): PosRankedRow[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value, detail }));
}

function buildPaymentMix(sales: SaleRecord[], closings: CashClosingRecord[]): PosPaymentMixRow[] {
  const paymentTotals = closings.length > 0
    ? new Map([
        ['Efectivo', closings.reduce((sum, closing) => sum + closing.cashExpected, 0)],
        ['Tarjeta', closings.reduce((sum, closing) => sum + closing.cardExpected, 0)],
        ['Transferencia', closings.reduce((sum, closing) => sum + closing.transferExpected, 0)],
      ])
    : groupSum(
        sales,
        (sale) => sale.paymentMethod || 'Sin metodo',
        (sale) => sale.totalAmount,
      );

  const total = Array.from(paymentTotals.values()).reduce((sum, amount) => sum + amount, 0);

  return Array.from(paymentTotals.entries())
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));
}

function buildHourlySales(closings: CashClosingRecord[]) {
  const hourlyMap = groupSum(
    closings,
    (closing) => String(closing.closedAt.getHours()).padStart(2, '0'),
    (closing) => closing.totalSales,
  );

  return Array.from(hourlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, sales]) => ({ hour, sales }));
}

export function buildPosAnalytics({
  salesRecords,
  cashClosings,
  period,
}: {
  salesRecords: SaleRecord[];
  cashClosings: CashClosingRecord[];
  period: PosAnalyticsPeriod;
}): PosAnalytics {
  const filteredSales = salesRecords
    .filter(isPointOfSaleRecord)
    .filter((sale) => isInPeriod(parseSaleDate(sale.saleDate), period));
  const filteredClosings = cashClosings
    .filter((closing) => isInPeriod(closing.closedAt, period));

  const salesCurrencyTotals = groupSum(filteredSales, (sale) => sale.currency || 'MXN', (sale) => sale.totalAmount);
  const currencyTotals = Array.from(salesCurrencyTotals.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
  const primaryCurrency = currencyTotals[0]?.currency ?? 'MXN';
  const sameCurrencySales = filteredSales.filter((sale) => (sale.currency || 'MXN') === primaryCurrency);
  const closingRevenue = filteredClosings.reduce((sum, closing) => sum + closing.totalSales, 0);
  const hasSalesRecords = filteredSales.length > 0;
  const revenue = hasSalesRecords
    ? sameCurrencySales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    : closingRevenue;
  const tickets = hasSalesRecords
    ? filteredSales.length
    : filteredClosings.reduce((sum, closing) => sum + (closing.salesCount ?? 0), 0);

  const sellerTotals = groupSum(filteredSales, (sale) => sale.sellerName || 'Sin vendedor', (sale) => sale.totalAmount);
  const productTotals = filteredSales.reduce((map, sale) => {
    sale.saleLines.forEach((line) => {
      map.set(line.productName, (map.get(line.productName) ?? 0) + line.quantity);
    });
    return map;
  }, new Map<string, number>());

  return {
    periodLabel: periodLabels[period],
    primaryCurrency,
    currencyTotals: currencyTotals.length > 0 ? currencyTotals : [{ currency: primaryCurrency, amount: revenue }],
    revenue,
    subtotal: hasSalesRecords
      ? sameCurrencySales.reduce((sum, sale) => sum + sale.subtotal, 0)
      : filteredClosings.reduce((sum, closing) => sum + (closing.subtotalSales ?? closing.totalSales), 0),
    tax: hasSalesRecords
      ? sameCurrencySales.reduce((sum, sale) => sum + sale.taxTotal, 0)
      : filteredClosings.reduce((sum, closing) => sum + (closing.taxSales ?? 0), 0),
    discount: sameCurrencySales.reduce((sum, sale) => sum + sale.discountTotal, 0),
    margin: sameCurrencySales.reduce((sum, sale) => sum + sale.marginTotal, 0),
    tickets,
    averageTicket: tickets > 0 ? revenue / tickets : 0,
    closings: filteredClosings.length,
    netDifference: filteredClosings.reduce((sum, closing) => sum + closing.difference, 0),
    inventoryPending: filteredSales.filter((sale) => ['pending', 'unavailable'].includes(sale.inventoryStatus)).length,
    financePending: filteredSales.filter((sale) => ['pending', 'rejected'].includes(sale.financeStatus)).length,
    paymentMix: buildPaymentMix(sameCurrencySales, filteredClosings),
    hourlySales: buildHourlySales(filteredClosings),
    topSellers: rankedRowsFromMap(sellerTotals, 'ventas POS'),
    topProducts: rankedRowsFromMap(productTotals, 'unidades vendidas'),
  };
}
