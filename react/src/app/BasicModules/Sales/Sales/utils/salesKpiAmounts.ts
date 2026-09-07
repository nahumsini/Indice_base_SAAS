import { formatBusinessCurrencyAmount, formatBusinessCurrencyBreakdown } from '../../../shared/businessCurrency';
import type { KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import type { SaleRecord } from '../types/salesTypes';

export function buildSalesKpiAmounts(records: SaleRecord[], preferredCurrency: string,
  aggregates: Record<string, KpiMonetaryAggregate>, notAvailable: string) {
  const active = records.filter(record => !['cancelled', 'canceled', 'rejected', 'voided'].includes(record.commercialStatus.toLowerCase()));
  const native = <T>(rows: T[], amount: (row: T) => number, currency: (row: T) => string) =>
    formatBusinessCurrencyBreakdown(rows, amount, currency, { currencyDisplay: 'code', maximumFractionDigits: 2 });
  const label = (aggregate: KpiMonetaryAggregate | undefined, fallback: string) => !aggregate ? fallback
    : aggregate.partial ? native(aggregate.nativeTotals, row => row.amount, row => row.currency)
      : formatBusinessCurrencyAmount(aggregate.preferredTotal, aggregate.preferredCurrency);
  const nativeRevenueLabel = native(active, row => row.totalAmount, row => row.currency);
  const completeRevenue = aggregates.revenue && !aggregates.revenue.partial ? aggregates.revenue : undefined;
  const currencies = new Set(active.map(row => row.currency));
  return {
    revenueLabel: label(aggregates.revenue, nativeRevenueLabel),
    // An approved sale is not payment evidence; wait for the owner-derived collections.
    collectedLabel: label(aggregates.collected, records.length ? notAvailable : formatBusinessCurrencyAmount(0, preferredCurrency)),
    receivableBalanceLabel: label(aggregates.receivableBalance, records.length ? notAvailable : formatBusinessCurrencyAmount(0, preferredCurrency)),
    grossMarginLabel: active.every(row => row.marginReady === true)
      ? native(active, row => row.marginTotal, row => row.currency) : notAvailable,
    averageTicketLabel: active.length === 0 ? formatBusinessCurrencyAmount(0, preferredCurrency)
      : completeRevenue ? formatBusinessCurrencyAmount(completeRevenue.preferredTotal / active.length, completeRevenue.preferredCurrency)
        : currencies.size === 1 ? formatBusinessCurrencyAmount(active.reduce((sum, row) => sum + row.totalAmount, 0) / active.length, active[0].currency)
          : notAvailable,
    nativeRevenueLabel,
  };
}
