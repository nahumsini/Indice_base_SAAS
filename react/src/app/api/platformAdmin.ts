import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface PlatformAdminContext {
  role: string;
  permissions: string[];
  can_manage_benefits: boolean;
  can_manage_ownership: boolean;
}

export interface PlatformCompanySummary {
  id: number;
  name: string;
  entitlement_mode?: string | null;
  billing_status?: string | null;
  lifecycle_state?: string | null;
  access_mode?: string | null;
  included_seats: number;
  purchased_extra_seats: number;
  active_members: number;
  active_benefits: number;
}

export interface PlatformBenefit {
  reference: string;
  benefit_type: 'PRODUCT' | 'SEAT' | 'STORAGE';
  product_code?: string | null;
  quantity: number;
  source_type: string;
  status: string;
  reason: string;
  campaign_code?: string | null;
  starts_at: string;
  ends_at?: string | null;
}

export interface PlatformCompanyDetail extends PlatformCompanySummary {
  owner_user_id?: number | null;
  owner_email?: string | null;
  offer_code?: string | null;
  billing_interval?: string | null;
  extra_seats?: number | null;
  reserved_seats?: number | null;
  grace_ends_at?: string | null;
  read_only_ends_at?: string | null;
  retention_until?: string | null;
  benefits: PlatformBenefit[];
  seat_usage: {
    enforced: boolean;
    included?: number;
    purchased_extra?: number;
    courtesy_extra?: number;
    active?: number;
    reserved?: number;
  };
}

export interface PlatformOverview {
  totals: {
    companies: number;
    premium_companies: number;
    active_subscriptions: number;
    active_benefits: number;
  };
  companies: PlatformCompanySummary[];
}

export interface BenefitPayload {
  benefit_type: 'PRODUCT' | 'SEAT' | 'STORAGE';
  product_code?: string;
  quantity?: number;
  source_type: 'COURTESY' | 'PROMOTION' | 'SUPPORT' | 'TEST';
  reason: string;
  campaign_code?: string;
  ends_at?: string;
}

const companyPath = (companyId: number) => `${endpoints.platformAdmin.companies}/${companyId}`;

export const platformAdminApi = {
  getContext: () => apiClient<PlatformAdminContext>(endpoints.platformAdmin.context),
  getOverview: (query = '') => apiClient<PlatformOverview>(
    `${endpoints.platformAdmin.overview}?q=${encodeURIComponent(query)}&limit=100`,
  ),
  getCompany: (companyId: number) => apiClient<PlatformCompanyDetail>(companyPath(companyId)),
  grantBenefit: (companyId: number, payload: BenefitPayload) => apiClient<PlatformBenefit>(
    `${companyPath(companyId)}/benefits`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(payload),
    },
  ),
  revokeBenefit: (companyId: number, reference: string, reason: string) => apiClient<PlatformBenefit>(
    `${companyPath(companyId)}/benefits/${encodeURIComponent(reference)}`,
    { method: 'DELETE', body: JSON.stringify({ reason }) },
  ),
};
