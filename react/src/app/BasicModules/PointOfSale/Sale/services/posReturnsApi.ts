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

export type ReturnCandidate = {
  id: number;
  ticketNumber: string;
  totalAmount: number | string;
  currency: string;
  status: string;
};

export type PosReturn = {
  id: number;
  ticketId: number;
  ticketNumber: string;
  shiftId: number;
  status: 'PREPARED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  reason: string;
  totalAmount: number | string;
  currency: string;
  payments: Array<{
    id: number;
    paymentId: number;
    paymentMethod: string;
    amount: number | string;
    currency: string;
    status: string;
    providerRefundId: string | null;
    evidenceReference: string | null;
  }>;
};

const base = '/api/v1/pos/returns';
const path = (reference: string) => `/api/v1/pos/returns/${encodeURIComponent(reference.trim())}`;

export const posReturnsApi = {
  tickets: (shiftId: number, search: string) => apiClient<ReturnCandidate[]>(
    `${base}/tickets?${new URLSearchParams({ shiftId: String(shiftId), search })}`,
  ),
  active: (ticketId: number) => apiClient<PosReturn | null>(`${base}/ticket/${ticketId}`),
  prepare: (ticketId: number, reason: string, goodsReceived: boolean, requestKey: string) =>
    apiClient<PosReturn>(base, {
      method: 'POST',
      body: JSON.stringify({ ticketId, reason, goodsReceived, requestKey }),
    }),
  confirm: (id: number, cashReturned: boolean, transferReferences: Record<number, string>) =>
    apiClient<PosReturn>(`${base}/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ cashReturned, transferReferences }),
    }),
  cancel: (id: number) => apiClient<PosReturn>(`${base}/${id}/cancel`, { method: 'POST' }),
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
