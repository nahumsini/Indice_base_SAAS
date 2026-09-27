import type { MercadoPagoPaymentRequest, MercadoPagoPaymentResponse, MercadoPagoPaymentSubmissionError, PaymentTerminalBinding } from './mercadoPagoTerminalTypes';

/** Only a persisted server rejection for this exact key establishes non-submission. */
export function isMercadoPagoRequestNotSubmitted(error: unknown, requestKey: string): boolean {
  if (!error || typeof error !== 'object' || !('payload' in error)) return false;
  return isMercadoPagoNotSubmittedReceipt(error.payload, requestKey);
}
export function isMercadoPagoNotSubmittedReceipt(payload: unknown, requestKey: string): payload is MercadoPagoPaymentSubmissionError {
  if (!payload || typeof payload !== 'object') return false;
  return 'code' in payload && payload.code === 'PAYMENT_NOT_SUBMITTED'
    && 'submissionState' in payload && payload.submissionState === 'not_submitted'
    && 'requestKey' in payload && payload.requestKey === requestKey;
}

export function isMercadoPagoPaymentUnresolved(payment: MercadoPagoPaymentResponse): boolean {
  if (payment.status === 'approved') return !payment.checkout;
  if (payment.status === 'refunded') return !payment.canRetry;
  if (['declined', 'cancelled', 'expired'].includes(payment.status)) return !payment.canRetry;
  return true;
}

export function cartIdentity(items: readonly { id: string; quantity: number; price: number; discount: number; total: number }[]): string {
  return JSON.stringify(items.map(({ id, quantity, price, discount, total }) => ({ id, quantity, price, discount, total })));
}

/** The register owner determines the provider; the tender remains CARD. */
export async function dispatchCardTerminalPayment<T>(
  lookup: () => Promise<PaymentTerminalBinding>,
  square: () => Promise<T>,
  mercadoPago: () => Promise<T>,
): Promise<T> {
  const binding = await lookup();
  if (binding.providerCode === 'SQUARE') return square();
  if (binding.providerCode === 'MERCADO_PAGO') return mercadoPago();
  throw new Error('PAYMENT_TERMINAL_UNASSIGNED');
}

interface MercadoPagoWorkflowGateway {
  createPayment: (request: MercadoPagoPaymentRequest) => Promise<MercadoPagoPaymentResponse>;
  recoverPayment: (intentId: number) => Promise<MercadoPagoPaymentResponse>;
}

/** A caller retains this exact request on uncertain delivery; a retry never creates a new key. */
export async function createMercadoPagoPaymentAndWait(
  request: MercadoPagoPaymentRequest,
  gateway: MercadoPagoWorkflowGateway,
  onUpdate: (payment: MercadoPagoPaymentResponse) => void,
  delay: () => Promise<void>,
  maxPolls = 150,
): Promise<MercadoPagoPaymentResponse> {
  let payment = await gateway.createPayment(request);
  onUpdate(payment);
  for (let poll = 0; poll < maxPolls; poll += 1) {
    if (!isMercadoPagoPaymentUnresolved(payment)) return payment;
    if (payment.status !== 'waiting' && payment.status !== 'approved') return payment;
    await delay();
    payment = await gateway.recoverPayment(payment.intentId);
    onUpdate(payment);
  }
  return payment;
}
