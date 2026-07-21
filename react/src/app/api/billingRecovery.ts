import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface CommercialLifecycleSnapshot {
  company_id: number;
  state: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'SUSPENDED' | 'RETENTION' | 'PURGE_PENDING';
  access_mode: 'FULL' | 'READ_ONLY' | 'BILLING_ONLY';
  subscription_status?: string | null;
  payment_status?: string | null;
  trial_ends_at?: string | null;
  grace_ends_at?: string | null;
  read_only_ends_at?: string | null;
  retention_until?: string | null;
  reason_code?: string | null;
  allows_operational_read: boolean;
  allows_operational_write: boolean;
}

export interface BillingRecoverySnapshot {
  enrolled: boolean;
  lifecycle?: CommercialLifecycleSnapshot | null;
  can_manage_billing: boolean;
  portal_available: boolean;
}

export const billingRecoveryApi = {
  snapshot: () => apiClient<BillingRecoverySnapshot>(endpoints.billingRecovery.snapshot),
  portal: () => apiClient<{ url: string }>(endpoints.billingRecovery.portal, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  }),
};
