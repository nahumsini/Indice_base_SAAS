import type { Product as PointOfSaleProduct } from '../PointOfSale/shared/commercial/products';
import type { Payment, SaleItem } from '../PointOfSale/Sale/types/sale.types';
import type { Shift } from '../PointOfSale/Sale/types/shift.types';
import type { SaleTotals } from '../PointOfSale/Sale/utils/saleCalculations';
import type { SaleRecord } from '../Sales/Sales/types/salesTypes';

export type PointOfSaleCompletion = {
  saleNumber: string;
  items: SaleItem[];
  payments: Payment[];
  totals: SaleTotals;
  shift: Shift;
  currency: string;
  products: PointOfSaleProduct[];
};

function paymentMethodLabel(payments: Payment[]) {
  const methods = Array.from(new Set(payments.map((payment) => payment.method)));
  if (methods.length > 1) return 'mixed';
  return methods[0] ?? 'cash';
}

function paymentReferenceLabel(payments: Payment[]) {
  return payments
    .map((payment) => payment.reference || payment.creditDetails?.customerName || payment.method)
    .filter(Boolean)
    .join(' · ');
}

function discountAmount(item: SaleItem) {
  return Math.max((item.price * item.quantity) - item.subtotal, 0);
}

export function buildSaleRecordFromPointOfSale({
  saleNumber,
  items,
  payments,
  totals,
  shift,
  currency,
  products,
}: PointOfSaleCompletion): SaleRecord {
  const productById = new Map(products.map((product) => [product.id, product]));
  const creditPayment = payments.find((payment) => payment.method === 'credit' && payment.creditDetails);
  const saleLines = items.map((item) => {
    const product = productById.get(item.productId);
    const unitCost = item.unitCost ?? product?.costPrice ?? 0;
    const lineMargin = Math.max(item.subtotal - (unitCost * item.quantity), 0);
    const discountPercent = item.discountType === 'percentage'
      ? item.discount
      : item.price > 0
        ? Math.min((item.discount / item.price) * 100, 100)
        : 0;

    return {
      id: item.id,
      productId: product?.salesProductId ?? item.productId,
      sku: item.sku ?? product?.sku ?? product?.barcode ?? '',
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      unitCost,
      discountPercent,
      taxPercent: item.taxRate,
      subtotal: item.subtotal,
      marginAmount: lineMargin,
      businessUnitId: shift.businessUnitId,
      businessId: shift.businessId,
      warehouseId: shift.warehouseId,
      availabilityStatus: product?.useInventory ? 'available' : 'pending_validation',
    } satisfies SaleRecord['saleLines'][number];
  });

  const marginTotal = saleLines.reduce((sum, line) => sum + (line.marginAmount ?? 0), 0);
  const hasInventoryLines = items.some((item) => productById.get(item.productId)?.useInventory);

  return {
    id: `POS-${saleNumber}-${Date.now()}`,
    saleNumber,
    quoteReference: 'POS direct',
    saleDocumentReference: `TICKET-${saleNumber}`,
    businessUnitId: shift.businessUnitId,
    businessUnitName: shift.businessUnitName,
    businessId: shift.businessId,
    businessName: shift.businessName,
    customerId: creditPayment?.creditDetails?.customerId,
    customerName: creditPayment?.creditDetails?.customerName ?? 'Cliente mostrador',
    sellerId: shift.cashierId,
    sellerName: shift.cashierName,
    saleDate: new Date().toISOString().slice(0, 10),
    totalAmount: totals.total,
    subtotal: totals.subtotal,
    discountTotal: items.reduce((sum, item) => sum + discountAmount(item), 0),
    taxTotal: totals.tax,
    marginTotal,
    currency,
    paymentMethod: paymentMethodLabel(payments),
    paymentReference: paymentReferenceLabel(payments),
    paymentEvidenceStatus: creditPayment ? 'under_review' : 'approved',
    commercialStatus: 'approved',
    financeStatus: creditPayment ? 'pending' : 'approved',
    inventoryStatus: hasInventoryLines ? 'pending' : 'approved',
    deliveryStatus: 'delivered',
    commissionStatus: 'pending',
    inventoryMovementStatus: hasInventoryLines ? 'pending' : 'not_generated',
    inventoryMovementReference: hasInventoryLines ? `${shift.cashRegisterCode}-${saleNumber}` : '',
    commissionRate: 0,
    commissionAmount: 0,
    commissionNotes: '',
    saleLines,
    notes: creditPayment?.creditDetails
      ? `Origen: POS · Corte: ${shift.id} · Caja: ${shift.cashRegisterCode} · Credito: ${creditPayment.creditDetails.ruleName} · Vence: ${creditPayment.creditDetails.dueDate}`
      : `Origen: POS · Corte: ${shift.id} · Caja: ${shift.cashRegisterCode}`,
    filesCount: 0,
  };
}
