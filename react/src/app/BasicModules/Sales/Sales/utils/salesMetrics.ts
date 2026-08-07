import type { SaleLifecycleSignals, SaleRecord, SalesMetrics } from '../types/salesTypes';
import {
  defaultSalesCurrency,
  formatSalesCurrencyAmount,
  normalizeSalesCurrencyCode,
} from '../../utils/salesCurrency';

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
  const totalSalesAmount = 0;
  const totalCommissions = 0;
  const salesCount = records.length;
  const getLifecycle = (record: SaleRecord) => lifecycleByRecordId[record.id];
  const recurringRevenue = 0;
  const renewalRevenue = 0;
  const recoveredRevenue = 0;
  const totalSalesNativeLabel = '';
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
    recurringRevenue,
    recurringRevenueLabel: formatSalesCurrencyAmount(recurringRevenue, normalizedPreferredCurrency),
    renewalRevenue,
    renewalRevenueLabel: formatSalesCurrencyAmount(renewalRevenue, normalizedPreferredCurrency),
    recoveredRevenue,
    recoveredRevenueLabel: formatSalesCurrencyAmount(recoveredRevenue, normalizedPreferredCurrency),
    customersAtRisk,
    pendingFinanceValidation,
    pendingInventoryMovement,
    deliveredSales,
    totalRecords: records.length,
  };
}
