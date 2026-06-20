import type { Product } from '../../shared/commercial/products';
import type {
  PosCheckoutItemPayload,
  PosCheckoutPaymentMethod,
  PosCheckoutPaymentPayload,
} from '../services/posBackendApi';
import type { Payment, PaymentMethod, SaleItem } from '../types/sale.types';

const paymentMethodMap: Record<PaymentMethod, PosCheckoutPaymentMethod> = {
  cash: 'CASH',
  card: 'CARD',
  transfer: 'TRANSFER',
  credit: 'CREDIT',
};

const toBackendId = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const money = (value: number) => Number(value.toFixed(2));

const lineDiscountAmount = (item: SaleItem) => Math.max((item.price * item.quantity) - item.subtotal, 0);

export function toPosCheckoutItems(items: SaleItem[], products: Product[]): PosCheckoutItemPayload[] {
  const productById = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productById.get(item.productId);

    return {
      productId: product?.salesProductBackendId ?? toBackendId(item.productId),
      productName: item.name,
      sku: item.sku ?? product?.sku ?? product?.barcode ?? null,
      productType: product?.saleType ?? null,
      quantity: item.quantity,
      unitPrice: money(item.price),
      discountAmount: money(lineDiscountAmount(item)),
      taxAmount: money(item.tax),
    };
  });
}

export function toPosCheckoutPayments(payments: Payment[]): PosCheckoutPaymentPayload[] {
  return payments.map((payment) => ({
    paymentMethod: paymentMethodMap[payment.method],
    paymentAccountId: null,
    amount: money(payment.amount),
    reference: payment.reference ?? null,
  }));
}

export function isBackendUnsupportedPayment(method: PaymentMethod) {
  return method === 'credit';
}
