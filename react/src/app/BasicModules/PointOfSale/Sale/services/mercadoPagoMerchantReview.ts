import type { MercadoPagoPaymentResponse } from './mercadoPagoTerminalTypes';

export const requiresMercadoPagoMerchantReview = (payment: MercadoPagoPaymentResponse) => (
  payment.saleState === 'review_required'
  && payment.status === 'reconciliation_required'
  && payment.orderId === null
);

export const isValidMercadoPagoMerchantReview = (providerOrderId: string, reason: string) => (
  /^ORD[A-Za-z0-9_-]{1,125}$/.test(providerOrderId.trim())
  && reason.trim().length >= 8
  && reason.trim().length <= 500
);
