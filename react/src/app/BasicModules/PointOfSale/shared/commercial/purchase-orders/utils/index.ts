import type { PurchaseOrder, PurchaseOrderItem } from '../types';

export function calculatePurchaseOrderTotals(items: PurchaseOrderItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxes = subtotal * 0.16;
  return {
    subtotal,
    taxes,
    total: subtotal + taxes,
  };
}

export function isPurchaseOrderDelayed(order: PurchaseOrder, today = new Date()) {
  return order.expectedDate < today && order.status !== 'received' && order.status !== 'cancelled';
}
