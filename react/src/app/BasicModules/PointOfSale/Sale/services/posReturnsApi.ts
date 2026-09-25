import { apiClient } from '../../../../lib/apiClient';

export interface PosReturnRefundState {
  refundId: number;
  requestKey: string;
  amount: number | string;
  status: string;
  reason: string;
  updatedAt: string;
  version: number;
}

export interface PosReturnSummary {
  ticketId: number;
  ticketNumber: string;
  ticketStatus: string;
  completedAt: string;
  saleAmount: number | string;
  currencyCode: string;
  providerCode: string | null;
  providerStatus: string | null;
  paymentAmount: number | string;
  refundedAmount: number | string;
  refundableAmount: number | string;
  refundAvailable: boolean;
  latestRefund: PosReturnRefundState | null;
}

export interface PosReturnRefundRequest {
  idempotencyKey: string;
  amount: number | null;
  reason: string;
}

export interface PosReturnReviewRequest {
  reason: string;
  expectedVersion: number;
}

const path = (reference: string) => `/api/v1/pos/returns/${encodeURIComponent(reference.trim())}`;

export const posReturnsApi = {
  lookup: (reference: string) => apiClient<PosReturnSummary>(path(reference)),
  submit: (reference: string, request: PosReturnRefundRequest) => apiClient<PosReturnSummary>(`${path(reference)}/refunds`, {
    method: 'POST',
    body: JSON.stringify(request),
  }),
  refresh: (reference: string) => apiClient<PosReturnSummary>(`${path(reference)}/refresh`, { method: 'POST' }),
  recheck: (reference: string, request: PosReturnReviewRequest) => apiClient<PosReturnSummary>(`${path(reference)}/refunds/recheck`, {
    method: 'POST',
    body: JSON.stringify(request),
  }),
};
