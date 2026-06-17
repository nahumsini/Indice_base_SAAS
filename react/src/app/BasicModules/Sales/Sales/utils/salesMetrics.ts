import type { SaleLifecycleSignals, SaleRecord, SalesMetrics } from '../types/salesTypes';
import {
  defaultSalesCurrency,
  formatSalesCurrencyAmount,
  formatSalesCurrencyBreakdown,
  normalizeSalesCurrencyCode,
} from '../../utils/salesCurrency';
import { convertSalesCurrencyAmount } from '../../utils/salesCurrencyConversion';

function roundCurrencyAmount(value: number) {
  return Number(value.toFixed(2));
}

function getConvertedSalesTotal(records: SaleRecord[], preferredCurrency: string) {
  return roundCurrencyAmount(records.reduce((total, record) => (
    total + convertSalesCurrencyAmount(
      record.totalAmount,
      record.currency,
      preferredCurrency,
      record.saleDate,
    ).amount
  ), 0));
}

function getLatestSaleDate(records: SaleRecord[]) {
  const sortedDates = records
    .map((record) => record.saleDate)
    .filter(Boolean)
    .sort();

  return sortedDates[sortedDates.length - 1] ?? '';
}

export function calculateSalesMetrics(
  records: SaleRecord[],
  lifecycleByRecordId: Record<string, SaleLifecycleSignals> = {},
  preferredCurrency = defaultSalesCurrency,
): SalesMetrics {
  const normalizedPreferredCurrency = normalizeSalesCurrencyCode(preferredCurrency);
  const totalSalesAmount = getConvertedSalesTotal(records, normalizedPreferredCurrency);
  const totalCommissions = records.reduce((total, record) => total + record.commissionAmount, 0);
  const salesCount = records.length;
  const getLifecycle = (record: SaleRecord) => lifecycleByRecordId[record.id];
  const recurringRecords = records.filter((record) => getLifecycle(record)?.relationship === 'recurring');
  const renewalRecords = records.filter((record) => getLifecycle(record)?.relationship === 'renewal');
  const recoveredRecords = records.filter((record) => getLifecycle(record)?.relationship === 'recovered');
  const totalSalesNativeLabel = formatSalesCurrencyBreakdown(records, (record) => record.totalAmount, (record) => record.currency);
  const preferredRevenueLabel = formatSalesCurrencyAmount(totalSalesAmount, normalizedPreferredCurrency);
  const operationalBuckets = records.reduce(
    (buckets, record) => {
      const isCancelled = record.commercialStatus === 'cancelled' || record.commercialStatus === 'rejected';
      const requiresInventoryMovement = (
        record.inventoryMovementStatus === 'pending' || record.inventoryMovementStatus === 'not_generated'
      );

      if (isCancelled) {
        buckets.cancelledSales += 1;
      } else if (record.deliveryStatus === 'delivered') {
        buckets.completedSales += 1;
      } else if (record.financeStatus === 'pending') {
        buckets.pendingFinanceSales += 1;
      } else if (requiresInventoryMovement) {
        buckets.pendingInventorySales += 1;
      } else {
        buckets.activeSales += 1;
      }

      return buckets;
    },
    {
      activeSales: 0,
      pendingFinanceSales: 0,
      pendingInventorySales: 0,
      completedSales: 0,
      cancelledSales: 0,
    },
  );
  const openSales = records.filter((record) => (
    record.deliveryStatus !== 'delivered'
    && record.commercialStatus !== 'cancelled'
    && record.commercialStatus !== 'rejected'
  )).length;
  const customersAtRisk = records.filter((record) => ['at_risk', 'lost'].includes(getLifecycle(record)?.health ?? '')).length;
  const pendingFinanceValidation = records.filter((record) => record.financeStatus === 'pending').length;
  const pendingInventoryMovement = records.filter((record) => (
    record.inventoryMovementStatus === 'pending' || record.inventoryMovementStatus === 'not_generated'
  )).length;
  const deliveredSales = records.filter((record) => record.deliveryStatus === 'delivered').length;

  return {
    totalSalesAmount,
    totalSalesAmountLabel: preferredRevenueLabel,
    totalSalesNativeLabel,
    preferredCurrency: normalizedPreferredCurrency,
    preferredRevenueLabel,
    exchangeRateDateLabel: getLatestSaleDate(records),
    totalCommissions,
    averageTicket: salesCount > 0 ? Math.round(totalSalesAmount / salesCount) : 0,
    salesCount,
    openSales,
    activeSales: operationalBuckets.activeSales,
    pendingFinanceSales: operationalBuckets.pendingFinanceSales,
    pendingInventorySales: operationalBuckets.pendingInventorySales,
    completedSales: operationalBuckets.completedSales,
    cancelledSales: operationalBuckets.cancelledSales,
    attentionSales: records.filter((record) => (
      record.financeStatus === 'pending'
      || record.inventoryMovementStatus === 'pending'
      || record.inventoryMovementStatus === 'not_generated'
      || ['at_risk', 'lost'].includes(getLifecycle(record)?.health ?? '')
    )).length,
    deliveryProgress: salesCount > 0 ? Math.round((deliveredSales / salesCount) * 100) : 0,
    recurringRevenue: getConvertedSalesTotal(recurringRecords, normalizedPreferredCurrency),
    recurringRevenueLabel: formatSalesCurrencyAmount(getConvertedSalesTotal(recurringRecords, normalizedPreferredCurrency), normalizedPreferredCurrency),
    renewalRevenue: getConvertedSalesTotal(renewalRecords, normalizedPreferredCurrency),
    renewalRevenueLabel: formatSalesCurrencyAmount(getConvertedSalesTotal(renewalRecords, normalizedPreferredCurrency), normalizedPreferredCurrency),
    recoveredRevenue: getConvertedSalesTotal(recoveredRecords, normalizedPreferredCurrency),
    recoveredRevenueLabel: formatSalesCurrencyAmount(getConvertedSalesTotal(recoveredRecords, normalizedPreferredCurrency), normalizedPreferredCurrency),
    customersAtRisk,
    pendingFinanceValidation,
    pendingInventoryMovement,
    deliveredSales,
    totalRecords: records.length,
  };
}
