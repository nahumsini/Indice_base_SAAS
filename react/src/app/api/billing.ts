import { ApiClientError, apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface BillingSubscriptionResponse {
  status: string;
  plan_id: string;
  module_count: number;
  included_collaborators: number;
  extra_collaborators: number;
  allowed_collaborators: number;
  used_collaborators: number;
  remaining_collaborators: number;
  monthly_amount_cents: number;
  recurring_amount_cents: number;
  extra_seat_unit_amount_cents: number;
  billing_interval: 'MONTH' | 'YEAR' | string;
  currency: string;
  trial_start_at: string;
  trial_end_at: string;
  current_period_start_at: string;
  current_period_end_at: string;
  cancel_at_period_end: boolean;
  canceled_at: string;
  cancellation_effective_at: string;
  payment_failed_at: string;
  payment_grace_until: string;
  payment_failure_reason: string;
  latest_invoice_id: string;
  source: string;
  access_allowed: boolean;
  lock_reason: string;
  prices_exclude_taxes: boolean;
  selected_module_slugs: string[];
  used_seats: number;
  active_seats: number;
  pending_invitations: number;
  remaining_seats: number;
  seat_limit_enforced: boolean;
}

export interface BillingPortalResponse {
  url: string;
}

export interface BillingSeatSnapshot {
  company_id: number;
  enforced: boolean;
  included: number;
  purchased_extra: number;
  benefit_extra: number;
  limit: number;
  active: number;
  reserved: number;
  available: number;
  mutation_reference?: string;
  idempotent_replay?: boolean;
}

const billingAction = async <T>(path: string) => {
  try {
    return await apiClient<T>(path, { method: 'POST' });
  } catch (error) {
    if (error instanceof ApiClientError && [400, 403, 404, 503].includes(error.status)) {
      throw new Error(error.message || 'Billing action could not be completed.');
    }
    throw error;
  }
};

export const billingApi = {
  subscription() {
    return apiClient<BillingSubscriptionResponse>(endpoints.billing.subscription);
  },

  cancelSubscription() {
    return billingAction<BillingSubscriptionResponse>(endpoints.billing.cancelSubscription);
  },

  resumeSubscription() {
    return billingAction<BillingSubscriptionResponse>(endpoints.billing.resumeSubscription);
  },

  openPortal() {
    return billingAction<BillingPortalResponse>(endpoints.billing.portal);
  },

  updateExtraSeats(extraSeats: number, idempotencyKey: string) {
    return apiClient<BillingSeatSnapshot>(endpoints.billing.seats, {
      method: 'PUT',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ extra_seats: extraSeats }),
    });
  },
};
