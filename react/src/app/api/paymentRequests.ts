import { apiClient } from '../lib/apiClient';

export interface PaymentRequestSummary {
  id: string;
  status: 'OPEN' | 'PAID';
  version: number;
  kind: 'INVOICE' | 'ACTIVATION';
  requested_at: string;
  deadline_at: string;
  reason: string;
  amount_cents: number;
  currency: string;
  billing_interval: 'MONTH' | 'YEAR' | null;
  paid_at: string | null;
  protected_indefinitely?: boolean;
}

export interface PaymentRequestWorkspace {
  company_id: number;
  company_name: string;
  owner: { name: string; email: string } | null;
  request: PaymentRequestSummary | null;
  quote: {
    kind: 'INVOICE' | 'ACTIVATION';
    amount_cents: number;
    currency: string;
    billing_interval: 'MONTH' | 'YEAR' | null;
    paid_through: string | null;
    token: string;
    amount_is_estimate: boolean;
  } | null;
  eligible: boolean;
  blockers: string[];
  deliveries: Array<{
    scheduled_at: string;
    status: string;
    channel: 'EMAIL' | 'IN_APP';
    attempts: number;
    sent_at: string | null;
  }>;
  history: Array<{
    action: string;
    actor_name: string | null;
    reason: string;
    occurred_at: string;
    deadline_at: string | null;
  }>;
}

export interface OwnerPaymentRequestSnapshot {
  request: PaymentRequestSummary | null;
  can_pay: boolean;
  is_owner: boolean;
  collection_blocked: boolean;
  owner_name: string | null;
  owner_email?: string | null;
}

const path = '/api/v1/billing/payment-request';

export const paymentRequestsApi = {
  snapshot: () => apiClient<OwnerPaymentRequestSnapshot>(path),
  pay: (idempotencyKey: string, payload: { expected_request_id: string; expected_version: number }) => apiClient<{ url: string }>(`${path}/pay`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  }),
  refresh: () => apiClient<OwnerPaymentRequestSnapshot>(`${path}/refresh`, { method: 'POST' }),
};
