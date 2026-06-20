import type { Product } from '../../shared/commercial/products';
import type { Payment, SaleItem } from '../types/sale.types';
import { SALE_TAX_RATE } from '../constants/sale.constants';

export interface SaleTotals {
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  change: number;
  isPaid: boolean;
}

export function calculateLineAmounts({
  price,
  quantity,
  discount,
  discountType,
  taxRate,
}: {
  price: number;
  quantity: number;
  discount: number;
  discountType: SaleItem['discountType'];
  taxRate: number;
}) {
  const baseSubtotal = price * quantity;
  const discountAmount =
    discountType === 'percentage'
      ? baseSubtotal * (discount / 100)
      : discount * quantity;
  const subtotal = baseSubtotal - discountAmount;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
  };
}

export function buildSaleItem(product: Product, quantity: number): SaleItem {
  const amounts = calculateLineAmounts({
    price: product.salePrice,
    quantity,
    discount: 0,
    discountType: 'percentage',
    taxRate: product.taxRate,
  });

  return {
    id: `item-${Date.now()}-${product.id}`,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    price: product.salePrice,
    unitCost: product.costPrice,
    taxRate: product.taxRate,
    currency: product.currency,
    quantity,
    discount: 0,
    discountType: 'percentage',
    ...amounts,
  };
}

export function recalculateSaleItem(
  item: SaleItem,
  updates: Partial<Pick<SaleItem, 'quantity' | 'discount' | 'discountType'>>,
): SaleItem {
  const nextItem = {
    ...item,
    ...updates,
  };

  const amounts = calculateLineAmounts({
    price: nextItem.price,
    quantity: nextItem.quantity,
    discount: nextItem.discount,
    discountType: nextItem.discountType,
    taxRate: nextItem.taxRate ?? (SALE_TAX_RATE * 100),
  });

  return {
    ...nextItem,
    ...amounts,
  };
}

export function calculateSaleTotals(cart: SaleItem[], payments: Payment[]): SaleTotals {
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = cart.reduce((sum, item) => sum + item.tax, 0);
  const total = subtotal + tax;
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = total - paid;
  const change = paid > total ? paid - total : 0;
  const isPaid = paid >= total;

  return {
    subtotal,
    tax,
    total,
    paid,
    remaining,
    change,
    isPaid,
  };
}
