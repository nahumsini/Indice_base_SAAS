import type { SaleLifecycleSignals, SaleRecord, SalesMetrics } from '../types/salesTypes';

export function calculateSalesMetrics(
  records: SaleRecord[],
  lifecycleByRecordId: Record<string, SaleLifecycleSignals> = {},
): SalesMetrics {
  const totalSalesAmount = records.reduce((total, record) => total + record.totalAmount, 0);
  const totalCommissions = records.reduce((total, record) => total + record.commissionAmount, 0);
  const salesCount = records.length;
  const getLifecycle = (record: SaleRecord) => lifecycleByRecordId[record.id];

  return {
    totalSalesAmount,
    totalCommissions,
    averageTicket: salesCount > 0 ? Math.round(totalSalesAmount / salesCount) : 0,
    salesCount,
    recurringRevenue: records
      .filter((record) => getLifecycle(record)?.relationship === 'recurring')
      .reduce((total, record) => total + record.totalAmount, 0),
    renewalRevenue: records
      .filter((record) => getLifecycle(record)?.relationship === 'renewal')
      .reduce((total, record) => total + record.totalAmount, 0),
    recoveredRevenue: records
      .filter((record) => getLifecycle(record)?.relationship === 'recovered')
      .reduce((total, record) => total + record.totalAmount, 0),
    customersAtRisk: records.filter((record) => ['at_risk', 'lost'].includes(getLifecycle(record)?.health ?? '')).length,
    pendingFinanceValidation: records.filter((record) => record.financeStatus === 'pending').length,
    pendingInventoryMovement: records.filter((record) => (
      record.inventoryMovementStatus === 'pending' || record.inventoryMovementStatus === 'not_generated'
    )).length,
    deliveredSales: records.filter((record) => record.deliveryStatus === 'delivered').length,
    totalRecords: records.length,
  };
}
