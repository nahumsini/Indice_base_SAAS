import type { PosCheckoutItemPayload, PosCheckoutResponse } from './posBackendApi';

export type PaymentTerminalProvider = 'SQUARE' | 'MERCADO_PAGO';
export interface PaymentTerminalBinding {
  providerCode: PaymentTerminalProvider | null;
  terminalId: number | null;
  name: string | null;
  status: string;
}
export interface MercadoPagoConnectionStatus {
  enabled: boolean;
  environment: string;
  connected: boolean;
  merchantId: string | null;
  connectionState: string;
  countryCode: string;
  activationState: 'DISABLED' | 'PILOT' | 'ACTIVE' | 'SUSPENDED';
  liveChargeAllowed: boolean;
}
export interface MercadoPagoTerminal {
  terminalId: number;
  name: string;
  providerTerminalId: string;
  storeId: string | null;
  posId: string | null;
  status: string;
  operatingMode: string;
  assignedRegisterId: number | null;
  verificationStatus: string;
  providerLastSeenAt: string | null;
  providerVerifiedAt: string | null;
  verificationFailureCode: string | null;
  version: number;
}
export type MercadoPagoPaymentStatus = 'waiting' | 'uncertain' | 'approved' | 'declined' | 'cancelled' | 'expired' | 'partially_refunded' | 'refunded' | 'reconciliation_required';
export interface MercadoPagoPaymentRequest {
  idempotencyKey: string;
  cashRegisterId: number;
  customerId?: number | null;
  preticketId?: number | null;
  restaurantOrderId?: number | null;
  currencyCode: string;
  items: PosCheckoutItemPayload[];
  notes?: string;
}
export interface MercadoPagoPaymentResponse {
  intentId: number;
  status: MercadoPagoPaymentStatus;
  amount: number | string;
  currencyCode: string;
  orderId: string | null;
  paymentId: string | null;
  message: string | null;
  posTicketId: number | null;
  checkout: PosCheckoutResponse | null;
  saleState: string;
  canCancel: boolean;
  canRetry: boolean;
  version: number;
}
export interface MercadoPagoMerchantReviewRequest {
  providerOrderId: string;
  reason: string;
  expectedVersion: number;
}
export interface MercadoPagoPaymentSubmissionError {
  code: 'PAYMENT_NOT_SUBMITTED';
  submissionState: 'not_submitted';
  requestKey: string;
  message: string;
}
