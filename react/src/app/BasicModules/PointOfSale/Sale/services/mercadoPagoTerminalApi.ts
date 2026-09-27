import { apiClient } from '../../../../lib/apiClient';
import type { MercadoPagoConnectionStatus, MercadoPagoMerchantReviewRequest, MercadoPagoPaymentRequest, MercadoPagoPaymentResponse, MercadoPagoPaymentSubmissionError, MercadoPagoTerminal, PaymentTerminalBinding } from './mercadoPagoTerminalTypes';

const get = <T>(path: string) => apiClient<T>(path);
const post = <T>(path: string, body?: unknown) => apiClient<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const remove = (path: string) => apiClient<void>(path, { method: 'DELETE' });
const base = '/api/v1/pos/mercado-pago';
export const mercadoPagoTerminalApi = {
  binding: (registerId: number) => get<PaymentTerminalBinding>(`/api/v1/pos/payment-terminals/registers/${registerId}`),
  status: () => get<MercadoPagoConnectionStatus>(`${base}/status`),
  startOAuth: () => post<{ authorizationUrl: string }>(`${base}/oauth/start`),
  completeOAuth: (code: string, state: string) => post<MercadoPagoConnectionStatus>(`${base}/oauth/complete`, { code, state }),
  terminals: () => get<{ items: MercadoPagoTerminal[] }>(`${base}/terminals`),
  syncTerminals: () => post<{ items: MercadoPagoTerminal[] }>(`${base}/terminals/sync`),
  configure: (terminalId: number) => post<MercadoPagoTerminal>(`${base}/terminals/${terminalId}/configure`),
  assign: (registerId: number, terminalId: number) => post<MercadoPagoTerminal>(`${base}/registers/${registerId}/terminal`, { terminalId }),
  unassign: (registerId: number) => remove(`${base}/registers/${registerId}/terminal`),
  createPayment: (payload: MercadoPagoPaymentRequest) => post<MercadoPagoPaymentResponse>(`${base}/terminal-payments`, payload),
  byRequest: (key: string, registerId: number) => get<MercadoPagoPaymentResponse>(`${base}/terminal-payments/by-request/${encodeURIComponent(key)}?cashRegisterId=${registerId}`),
  closeRequest: (key: string, registerId: number) => post<MercadoPagoPaymentResponse | MercadoPagoPaymentSubmissionError>(`${base}/terminal-payments/by-request/${encodeURIComponent(key)}/close?cashRegisterId=${registerId}`),
  getPayment: (intentId: number) => get<MercadoPagoPaymentResponse>(`${base}/terminal-payments/${intentId}`),
  recoverPayment: (intentId: number) => post<MercadoPagoPaymentResponse>(`${base}/terminal-payments/${intentId}/recover`),
  cancelPayment: (intentId: number) => post<MercadoPagoPaymentResponse>(`${base}/terminal-payments/${intentId}/cancel`),
  merchantReview: (intentId: number, request: MercadoPagoMerchantReviewRequest) => post<MercadoPagoPaymentResponse>(`${base}/terminal-payments/${intentId}/merchant-review`, request),
  recoverable: (cashRegisterId: number, shiftId: number | string) => get<{ items: MercadoPagoPaymentResponse[] }>(`${base}/terminal-payments/recoverable?cashRegisterId=${cashRegisterId}&shiftId=${encodeURIComponent(String(shiftId))}&limit=10`),
};
