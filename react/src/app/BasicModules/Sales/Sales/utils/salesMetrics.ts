import type { SaleRecord, SalesMetrics } from '../types/salesTypes';

export function calculateSalesMetrics(records: SaleRecord[]): SalesMetrics {
  const totalSalesAmount = records.reduce((total, record) => total + record.totalAmount, 0);
  const totalCommissions = records.reduce((total, record) => total + record.commissionAmount, 0);
  const salesCount = records.length;

  return {
    totalSalesAmount,
    totalCommissions,
    averageTicket: salesCount > 0 ? Math.round(totalSalesAmount / salesCount) : 0,
    salesCount,
    pendingFinanceValidation: records.filter((record) => record.financeStatus === 'pending').length,
    pendingInventoryMovement: records.filter((record) => (
      record.inventoryMovementStatus === 'pending' || record.inventoryMovementStatus === 'not_generated'
    )).length,
    deliveredSales: records.filter((record) => record.deliveryStatus === 'delivered').length,
    totalRecords: records.length,
  };
}
