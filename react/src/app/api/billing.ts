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

export interface BillingInvoiceRecord {
  invoice_id: string;
  status: string;
  currency: string;
  amount_due_cents: number | null;
  amount_paid_cents: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  period_starts_at: string | null;
  period_ends_at: string | null;
  updated_at: string | null;
}

export interface BillingInvoiceHistoryResponse {
  invoices: BillingInvoiceRecord[];
}

export interface BillingActivationResponse {
  status: string;
  checkout_url: string;
  checkout_expires_at: string;
  remaining_trial_days: number;
  replayed: boolean;
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
  change_timing?: 'TRIAL_END' | 'NEXT_INVOICE' | 'PAYMENT_METHOD_REQUIRED' | string;
  charged_now?: boolean;
}

export interface BillingCatalogProduct {
  id: number;
  product_code: string;
  display_name: string;
  product_type: 'BASIC' | 'ADDON' | string;
  commercial_kind?: 'MODULE' | 'PACKAGE' | string;
  unit_amount_cents: number | null;
  stripe_ready: boolean;
  capabilities: string[];
  included_product_codes?: string[];
}

export interface BillingSelectionPayload {
  product_codes: string[];
  extra_seats: number;
  billing_interval: 'MONTH' | 'YEAR';
  promotion_code?: string | null;
}

export interface BillingSelectionResponse {
  source: 'STRIPE' | 'COURTESY' | string;
  status: string;
  catalog_version: string;
  offer_code: string;
  billing_interval: 'MONTH' | 'YEAR';
  currency: string;
  included_seats: number;
  extra_seats: number;
  used_seats: number;
  available_seats: number;
  base_amount_cents: number | null;
  complementary_amount_cents: number;
  extra_seat_unit_amount_cents: number;
  estimated_amount_cents: number | null;
  trial_ends_at: string;
  change_timing: 'TRIAL_END' | 'NEXT_INVOICE' | 'PAYMENT_METHOD_REQUIRED' | string;
  charged_now: boolean;
  payment_method_required: boolean;
  can_update: boolean;
  selected_product_codes: string[];
  available_products: BillingCatalogProduct[];
  selection_state: 'CURRENT' | 'DRAFT' | 'PENDING_STRIPE' | 'SCHEDULED' | string;
  effective_at: string;
  current_product_codes: string[];
  current_included_seats: number;
  current_extra_seats: number;
  stripe_enabled: boolean;
  stripe_mode: 'TEST' | 'LIVE' | string;
  stripe_catalog_ready: boolean;
  activation_available: boolean;
  payment_management_available: boolean;
  access_change_timing: 'IMMEDIATE' | 'AFTER_CHECKOUT' | 'AT_CUTOFF' | string;
  change_reference: string;
  access_allowed: boolean;
  activation_block_reason: 'READY' | 'OWNER_REQUIRED' | 'STRIPE_UNAVAILABLE' | 'CATALOG_NOT_READY' | 'ALREADY_ACTIVE' | string;
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

  async subscriptionOptional() {
    try {
      return await apiClient<BillingSubscriptionResponse>(endpoints.billing.subscription);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  },

  selection() {
    return apiClient<BillingSelectionResponse>(endpoints.billing.selection);
  },

  invoices() {
    return apiClient<BillingInvoiceHistoryResponse>(endpoints.billing.invoices);
  },

  previewSelection(payload: BillingSelectionPayload) {
    return apiClient<BillingSelectionResponse>(endpoints.billing.selectionPreview, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateSelection(payload: BillingSelectionPayload, idempotencyKey: string) {
    return apiClient<BillingSelectionResponse>(endpoints.billing.selection, {
      method: 'PUT',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
  },

  activate(payload: BillingSelectionPayload, idempotencyKey: string) {
    return apiClient<BillingActivationResponse>(endpoints.billing.activate, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
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
