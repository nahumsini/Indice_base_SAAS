import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface BillingStorageSnapshot {
  company_id: number;
  enforced: boolean;
  metered: boolean;
  included_bytes: number;
  block_bytes: number;
  purchased_blocks: number;
  benefit_blocks: number;
  limit_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
  available_bytes: number;
  alert_level: 'NONE' | 'WARNING' | 'CRITICAL' | 'LIMIT';
}

export const billingStorageApi = {
  snapshot: () => apiClient<BillingStorageSnapshot>(endpoints.billingStorage.snapshot),
  updateBlocks: (purchasedBlocks: number) => apiClient<BillingStorageSnapshot>(
    endpoints.billingStorage.snapshot,
    {
      method: 'PUT',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ purchased_blocks: purchasedBlocks }),
    },
  ),
};
