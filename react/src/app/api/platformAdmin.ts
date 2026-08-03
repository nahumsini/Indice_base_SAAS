import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface PlatformAdminContext {
  role: string;
  permissions: string[];
  can_manage_benefits: boolean;
  can_manage_ownership: boolean;
  can_manage_modules: boolean;
}

export interface PlatformCompanySummary {
  id: number;
  name: string;
  owner_email?: string | null;
  country_code?: string | null;
  entitlement_mode?: string | null;
  billing_status?: string | null;
  lifecycle_state?: string | null;
  access_mode?: string | null;
  offer_code?: string | null;
  billing_interval?: 'MONTH' | 'YEAR' | string | null;
  currency?: string | null;
  cancel_at_period_end?: boolean;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  last_payment_status?: string | null;
  included_seats: number;
  purchased_extra_seats: number;
  purchased_storage_blocks?: number;
  recurring_amount_cents?: number;
  product_codes?: string[];
  product_names?: string[];
  last_invoice_status?: string | null;
  last_invoice_due_cents?: number | null;
  last_invoice_paid_cents?: number | null;
  last_invoice_period_ends_at?: string | null;
  active_members: number;
  active_benefits: number;
}

export interface PlatformCompanyProduct {
  code: string;
  name: string;
  type: string;
  source: string;
  sort_order: number;
}

export interface PlatformCompanyMember {
  membership_id: number;
  user_id: number;
  name?: string | null;
  email: string;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface PlatformInvoice {
  invoice_id: string;
  company_id?: number | null;
  company_name?: string | null;
  owner_email?: string | null;
  status?: string | null;
  currency?: string | null;
  amount_due_cents?: number | null;
  amount_paid_cents?: number | null;
  hosted_invoice_url?: string | null;
  invoice_pdf_url?: string | null;
  period_starts_at?: string | null;
  period_ends_at?: string | null;
  updated_at?: string | null;
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
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  extra_seats?: number | null;
  reserved_seats?: number | null;
  trial_starts_at?: string | null;
  current_period_starts_at?: string | null;
  grace_ends_at?: string | null;
  read_only_ends_at?: string | null;
  retention_until?: string | null;
  products: PlatformCompanyProduct[];
  members: PlatformCompanyMember[];
  invoices: PlatformInvoice[];
  benefits: PlatformBenefit[];
  seat_usage: {
    enforced: boolean;
    included?: number;
    purchased_extra?: number;
    courtesy_extra?: number;
    active?: number;
    reserved?: number;
  };
  storage_usage?: {
    enforced: boolean;
    metered: boolean;
    limit_bytes: number;
    used_bytes: number;
    reserved_bytes: number;
    purchased_blocks: number;
    benefit_blocks: number;
  };
}

export interface PlatformOverview {
  totals: {
    companies: number;
    premium_companies: number;
    active_subscriptions: number;
    active_benefits: number;
    trialing_subscriptions: number;
    trials_ending_soon: number;
    attention_required: number;
    monthly_recurring_cents: number;
    paid_last_30_days_cents: number;
    currency: string;
  };
  companies: PlatformCompanySummary[];
}

export interface PlatformBilling {
  totals: {
    invoices: number;
    paid_cents: number;
    open_cents: number;
    failed: number;
    currency: string;
  };
  invoices: PlatformInvoice[];
}

export interface PlatformCatalogVersion {
  id: number;
  version_code: string;
  status: string;
  effective_from: string;
  effective_to?: string | null;
  created_at: string;
}

export interface PlatformCatalogProduct {
  id: number;
  catalog_version_id: number;
  version_code: string;
  product_code: string;
  display_name: string;
  product_type: string;
  sort_order: number;
  active: boolean;
  capabilities: string[];
}

export interface PlatformCatalogPrice {
  id: number;
  catalog_version_id: number;
  version_code: string;
  billable_code: string;
  price_type: string;
  billing_interval: string;
  currency: string;
  unit_amount_cents?: number | null;
  included_quantity: number;
  external_price_id?: string | null;
  status: string;
  effective_from: string;
  effective_to?: string | null;
}

export interface PlatformCatalog {
  versions: PlatformCatalogVersion[];
  products: PlatformCatalogProduct[];
  prices: PlatformCatalogPrice[];
}

export interface PlatformModule {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  category: 'basic' | 'complementary' | 'ai' | string;
  lifecycle_status: string;
  access_model: string;
  assignment_enabled: boolean;
  route_key?: string | null;
  icon?: string | null;
  badge_text?: string | null;
  tier?: string | null;
  sort_order: number;
  is_core: boolean;
  is_active: boolean;
}

export interface PlatformModules {
  modules: PlatformModule[];
}

export interface PlatformModuleAvailabilityResult {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  changed: boolean;
  global_effect: boolean;
  assignments_preserved: boolean;
}

export interface PlatformAuditEvent {
  id: number;
  category: string;
  action: string;
  outcome: string;
  request_id?: string | null;
  stripe_event_id?: string | null;
  stripe_object_id?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  actor_user_id?: number | null;
  actor_email?: string | null;
  detail_json?: string | null;
  occurred_at: string;
}

export interface PlatformAudit {
  events: PlatformAuditEvent[];
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

export interface CourtesyCode {
  reference: string;
  code?: string;
  label: string;
  status: string;
  allowed_email?: string | null;
  all_basic_products: boolean;
  product_codes: string[];
  included_extra_seats: number;
  permanent: boolean;
  access_days?: number | null;
  max_redemptions: number;
  redemption_count: number;
  starts_at: string;
  expires_at?: string | null;
  reason: string;
  campaign_code?: string | null;
  created_at: string;
}

export interface CourtesyCodeCatalog {
  codes: CourtesyCode[];
  products: { code: string; name: string }[];
}

export interface CourtesyCodePayload {
  label: string;
  allowed_email?: string;
  product_codes: string[];
  included_extra_seats: number;
  access_days?: number;
  permanent: boolean;
  max_redemptions: number;
  expires_at?: string;
  reason: string;
  campaign_code?: string;
}

const companyPath = (companyId: number) => `${endpoints.platformAdmin.companies}/${companyId}`;
const courtesyCodesPath = '/api/v1/platform-admin/courtesy-codes';

export const platformAdminApi = {
  getContext: () => apiClient<PlatformAdminContext>(endpoints.platformAdmin.context),
  getOverview: (query = '') => apiClient<PlatformOverview>(
    `${endpoints.platformAdmin.overview}?q=${encodeURIComponent(query)}&limit=100`,
  ),
  getCompany: (companyId: number) => apiClient<PlatformCompanyDetail>(companyPath(companyId)),
  getBilling: () => apiClient<PlatformBilling>(`${endpoints.platformAdmin.billing}?limit=200`),
  getCatalog: () => apiClient<PlatformCatalog>(endpoints.platformAdmin.catalog),
  getModules: () => apiClient<PlatformModules>(endpoints.platformAdmin.modules),
  updateModuleAvailability: (moduleId: number, active: boolean, reason: string) => apiClient<PlatformModuleAvailabilityResult>(
    `${endpoints.platformAdmin.modules}/${moduleId}/availability`,
    { method: 'PATCH', body: JSON.stringify({ active, reason }) },
  ),
  getAudit: () => apiClient<PlatformAudit>(`${endpoints.platformAdmin.audit}?limit=200`),
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
  getCourtesyCodes: () => apiClient<CourtesyCodeCatalog>(courtesyCodesPath),
  createCourtesyCode: (payload: CourtesyCodePayload) => apiClient<CourtesyCode>(courtesyCodesPath, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(payload),
  }),
  revokeCourtesyCode: (reference: string, reason: string) => apiClient<CourtesyCode>(
    `${courtesyCodesPath}/${encodeURIComponent(reference)}`,
    { method: 'DELETE', body: JSON.stringify({ reason }) },
  ),
};
