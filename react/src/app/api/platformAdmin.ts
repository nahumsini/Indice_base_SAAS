import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface PlatformAdminContext {
  role: string;
  permissions: string[];
  can_manage_benefits: boolean;
  can_manage_ownership: boolean;
  can_manage_modules: boolean;
  can_manage_consulting: boolean;
  can_manage_accounts: boolean;
  can_manage_system_tickets: boolean;
}

export type PlatformAccountType = 'ROOT' | 'SUPER_ADMIN' | 'DISTRIBUTOR';
export type EditablePlatformAccountType = Exclude<PlatformAccountType, 'ROOT'>;

export type PlatformConsultingStatus = 'REQUESTED' | 'PAYMENT_REQUIRED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface PlatformConsultingAppointment {
  id: number;
  company_id: number;
  company_name: string;
  booked_by_user_id: number;
  booked_by_email: string;
  consultant_preference: 'DISTRIBUTOR' | 'INDICE_TEAM';
  requested_distributor_company_id: number | null;
  requested_distributor_name: string | null;
  request_source: 'CLIENT_PORTAL' | 'DISTRIBUTOR_PORTAL' | 'PLATFORM_ADMIN';
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  topic: string;
  notes: string | null;
  preferred_start_at: string;
  alternative_start_at: string | null;
  timezone: string;
  duration_minutes: number;
  consultation_mode: 'VIRTUAL' | 'IN_PERSON';
  country_code: string | null;
  service_location_code: string | null;
  service_location_name: string | null;
  session_kind: 'INCLUDED' | 'ADDITIONAL';
  status: PlatformConsultingStatus;
  payment_status: 'INCLUDED' | 'QUOTE_PENDING' | 'PENDING' | 'PAID' | 'WAIVED' | 'REFUNDED';
  amount_cents: number | null;
  currency: string;
  confirmed_start_at: string | null;
  meeting_url: string | null;
  consultant_name: string | null;
  consultant_email: string | null;
  consultant_phone: string | null;
  internal_notes: string | null;
  notification_status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformConsultingLocation {
  id: number;
  location_code: string;
  country_code: string;
  country_name: string;
  region_name: string;
  city_name: string;
  timezone: string;
  active: boolean;
  in_person_fee_cents: number | null;
  currency: string;
  updated_at: string;
}

export interface PlatformConsultingConsultant {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConsultingWorkspace {
  totals: { appointments: number; requested: number; confirmed: number; upcoming: number };
  appointments: PlatformConsultingAppointment[];
  locations: PlatformConsultingLocation[];
  consultants: PlatformConsultingConsultant[];
}

export interface PlatformConsultingAppointmentUpdate {
  status: PlatformConsultingStatus;
  confirmedStartAt?: string | null;
  meetingUrl?: string;
  consultantName?: string;
  consultantEmail?: string;
  consultantPhone?: string;
  internalNotes?: string;
  paymentStatus: PlatformConsultingAppointment['payment_status'];
  amountCents?: number | null;
  currency: string;
  cancellationReason?: string;
}

export interface PlatformConsultingAppointmentCreate {
  companyId: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  topic: string;
  consultationMode: PlatformConsultingAppointment['consultation_mode'];
  startAt: string;
  timezone: string;
  durationMinutes: number;
  consultantName: string;
  consultantEmail: string;
  consultantPhone: string;
  meetingUrl: string;
  serviceLocationCode: string;
  serviceLocationName: string;
  countryCode: string;
}

export interface PlatformCompanySummary {
  id: number;
  name: string;
  public_demo_enabled?: boolean;
  platform_status?: 'ACTIVE' | 'DELETED';
  user_type: PlatformAccountType;
  distributor_company_id?: number | null;
  distributor_company_name?: string | null;
  creation_origin?:
    | 'PLATFORM_ADMIN'
    | 'WEB_SELF_SERVICE'
    | 'DISTRIBUTOR_PORTAL'
    | 'LEGACY_UNKNOWN';
  created_by_user_id?: number | null;
  created_by_user_email?: string | null;
  created_by_user_name?: string | null;
  created_by_distributor_company_id?: number | null;
  created_by_distributor_company_name?: string | null;
  owner_email?: string | null;
  country_code?: string | null;
  entitlement_mode?: string | null;
  billing_status?: string | null;
  billing_managed_by_stripe?: boolean;
  billing_amount_cents?: number | null;
  billing_amount_kind?:
    | 'CURRENT'
    | 'NEXT_INVOICE'
    | 'TRIAL_END'
    | 'ESTIMATE'
    | 'UNAVAILABLE';
  billing_amount_interval?: 'MONTH' | 'YEAR' | string | null;
  billing_currency?: string | null;
  projected_offer_code?: string | null;
  lifecycle_state?: string | null;
  access_mode?: string | null;
  offer_code?: string | null;
  billing_interval?: 'MONTH' | 'YEAR' | string | null;
  currency?: string | null;
  cancel_at_period_end?: boolean;
  trial_ends_at?: string | null;
  trial_source?: 'STRIPE' | 'LOCAL_DEMO' | null;
  trial_days_remaining?: number | null;
  trial_extendable?: boolean;
  trial_permanent?: boolean;
  current_period_ends_at?: string | null;
  last_payment_status?: string | null;
  included_seats: number;
  purchased_extra_seats: number;
  courtesy_extra_seats?: number;
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
  temporary_benefits?: number;
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
  is_owner?: boolean;
  created_at?: string | null;
}

export interface PlatformCompanyInvitation {
  invitation_id: number;
  name?: string | null;
  email: string;
  role?: string | null;
  status: string;
  expires_at?: string | null;
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
  invitations: PlatformCompanyInvitation[];
  invoices: PlatformInvoice[];
  benefits: PlatformBenefit[];
  seat_usage: {
    enforced: boolean;
    included?: number;
    purchased_extra?: number;
    courtesy_extra?: number;
    active?: number;
    reserved?: number;
    limit?: number | null;
    available?: number | null;
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
    projected_monthly_billing_cents: number;
    active_customer_companies: number;
    customer_active_users: number;
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
  commercially_available?: boolean;
  capabilities: string[];
}

export interface PlatformCatalogPrice {
  id: number;
  catalog_version_id: number;
  catalog_product_id?: number | null;
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

export interface PlatformCatalogValidation {
  catalog_version_id: number;
  version_code: string;
  ready: boolean;
  blockers: Array<{ code: string; product_code: string; message: string }>;
  stripe_mode: 'TEST';
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

export interface PlatformModuleWorkOrder {
  id: number;
  moduleName: string;
  technicalName: string;
  slug: string;
  routeSegment: string;
  sourceLocale: 'en-CA' | 'en-US' | 'es-MX' | 'es-CO' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'IMPLEMENTED';
  createdAt: string;
  updatedAt: string;
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
  products: { code: string; name: string; type?: string }[];
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

export interface PlatformAccountCreatePayload {
  company_name: string;
  account_type: EditablePlatformAccountType;
  owner_name?: string;
  owner_email: string;
  temporary_password: string;
  country_code: 'MX' | 'CA' | 'US' | 'CO' | 'BR';
  phone?: string;
  industry?: string;
  company_size?: string;
  employee_count: number;
  product_codes: string[];
  extra_seats: number;
  access_days?: number;
  permanent: boolean;
}

export interface PlatformAccountCreateResult {
  company_id: number;
  company_name: string;
  user_type: PlatformAccountType;
  owner_user_id: number;
  owner_email: string;
  owner_membership_id: number;
  product_codes?: string[];
  products?: Array<{ code: string; name: string }>;
  modules_applied?: boolean;
  employee_count?: number;
  included_seats?: number;
  extra_seats?: number;
  access_days?: number | null;
  permanent?: boolean;
  replayed: boolean;
}

export interface PlatformAccountTypeUpdateResult {
  company_id: number;
  user_type: EditablePlatformAccountType;
  changed: boolean;
}

export interface PlatformPublicDemoUpdateResult {
  company_id: number;
  public_demo_enabled: boolean;
  changed: boolean;
}

export interface PlatformDistributorAssignmentResult {
  company_id: number;
  distributor_company_id: number | null;
  distributor_company_name: string | null;
  commercial_origin: 'DISTRIBUTOR' | 'INDICE_DIRECT';
  changed: boolean;
}

export interface PlatformTrialExtensionResult {
  reference: string;
  company_id: number;
  source: 'STRIPE' | 'LOCAL_DEMO';
  added_days: 7 | 15 | 30;
  prior_ends_at: string;
  trial_ends_at: string;
  charged_now: false;
  replayed: boolean;
}

export interface PlatformCompanyUserMutationResult {
  success?: boolean;
  invitation_id?: number;
  membership_id?: number;
  user_id?: number;
  status?: string;
  email?: string;
  full_name?: string;
  expires_at?: string;
  invite_link?: string;
  email_sent?: boolean;
  email_status?: string;
  email_message?: string;
  seat_usage: PlatformCompanyDetail['seat_usage'];
}

const companyPath = (companyId: number) => `${endpoints.platformAdmin.companies}/${companyId}`;
const courtesyCodesPath = '/api/v1/platform-admin/courtesy-codes';
const consultingPath = '/api/v1/platform-admin/consulting';
const moduleWorkOrdersPath = `${endpoints.platformAdmin.modules}/work-orders`;

export const platformAdminApi = {
  getContext: () => apiClient<PlatformAdminContext>(endpoints.platformAdmin.context),
  getOverview: (query = '') => apiClient<PlatformOverview>(
    `${endpoints.platformAdmin.overview}?q=${encodeURIComponent(query)}&limit=500`,
  ),
  getCompany: (companyId: number) => apiClient<PlatformCompanyDetail>(companyPath(companyId)),
  createCompanyAccount: (payload: PlatformAccountCreatePayload) => apiClient<PlatformAccountCreateResult>(
    endpoints.platformAdmin.companies,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(payload),
    },
  ),
  updateCompanyAccountType: (companyId: number, accountType: EditablePlatformAccountType) => apiClient<PlatformAccountTypeUpdateResult>(
    `${companyPath(companyId)}/account-type`,
    { method: 'PATCH', body: JSON.stringify({ account_type: accountType }) },
  ),
  deleteCompanyAccount: (companyId: number, confirmationName: string, reason: string) => apiClient<{
    company_id: number;
    platform_status: 'DELETED';
    changed: boolean;
  }>(companyPath(companyId), {
    method: 'DELETE',
    body: JSON.stringify({ confirmation_name: confirmationName, reason }),
  }),
  updatePublicDemoAccess: (companyId: number, enabled: boolean) => apiClient<PlatformPublicDemoUpdateResult>(
    `${companyPath(companyId)}/public-demo`,
    { method: 'PATCH', body: JSON.stringify({ enabled }) },
  ),
  updateCompanyDistributor: (companyId: number, distributorCompanyId: number | null) => apiClient<PlatformDistributorAssignmentResult>(
    `${companyPath(companyId)}/distributor`,
    { method: 'PATCH', body: JSON.stringify({ distributor_company_id: distributorCompanyId }) },
  ),
  inviteCompanyUser: (companyId: number, payload: { name: string; email: string; role: 'admin' | 'user' }) => apiClient<PlatformCompanyUserMutationResult>(
    `${companyPath(companyId)}/users/invitations`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(payload),
    },
  ),
  cancelCompanyUserInvitation: (companyId: number, invitationId: number) => apiClient<PlatformCompanyUserMutationResult>(
    `${companyPath(companyId)}/users/invitations/${invitationId}`,
    { method: 'DELETE' },
  ),
  resendCompanyUserInvitation: (companyId: number, invitationId: number) => apiClient<PlatformCompanyUserMutationResult>(
    `${companyPath(companyId)}/users/invitations/${invitationId}/resend`,
    { method: 'POST' },
  ),
  updateCompanyUserStatus: (companyId: number, userId: number, status: 'active' | 'inactive') => apiClient<PlatformCompanyUserMutationResult>(
    `${companyPath(companyId)}/users/${userId}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  ),
  extendCompanyTrial: (companyId: number, days: 7 | 15 | 30) => apiClient<PlatformTrialExtensionResult>(
    `${companyPath(companyId)}/trial-extension`,
    {
      method: 'PATCH',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ days }),
    },
  ),
  getBilling: () => apiClient<PlatformBilling>(`${endpoints.platformAdmin.billing}?limit=200`),
  getCatalog: () => apiClient<PlatformCatalog>(endpoints.platformAdmin.catalog),
  synchronizeComplementaryProducts: () => apiClient<{
    catalog_version_id: number;
    version_code: string;
    products_created: number;
    capabilities_created: number;
    prices_created: number;
  }>(`${endpoints.platformAdmin.catalog}/complementary-products/synchronize`, {
    method: 'POST',
  }),
  createCatalogDraft: () => apiClient<{ id: number; version_code: string; status: 'DRAFT'; stripe_mode: 'TEST' }>(
    `${endpoints.platformAdmin.catalog}/drafts`,
    { method: 'POST' },
  ),
  validateCatalogDraft: (versionId: number) => apiClient<PlatformCatalogValidation>(
    `${endpoints.platformAdmin.catalog}/drafts/${versionId}/validation`,
  ),
  publishCatalogDraft: (versionId: number) => apiClient<{
    catalog_version_id: number;
    version_code: string;
    status: 'ACTIVE';
    published: true;
    stripe_mode: 'TEST';
  }>(`${endpoints.platformAdmin.catalog}/drafts/${versionId}/publish`, { method: 'POST' }),
  updateCatalogProduct: (
    productId: number,
    payload: { display_name: string; sort_order: number; active: boolean; capabilities: string[] },
  ) => apiClient<Partial<PlatformCatalogProduct>>(
    `${endpoints.platformAdmin.catalog}/products/${productId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
  createCatalogProduct: (
    payload: { display_name: string; sort_order: number; active: boolean; capabilities: string[] },
  ) => apiClient<Partial<PlatformCatalogProduct>>(
    `${endpoints.platformAdmin.catalog}/products`,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  updateCatalogPrice: (
    priceId: number,
    payload: { unit_amount_cents: number | null; external_price_id: string | null; status: string },
  ) => apiClient<Partial<PlatformCatalogPrice>>(
    `${endpoints.platformAdmin.catalog}/prices/${priceId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
  getModules: () => apiClient<PlatformModules>(endpoints.platformAdmin.modules),
  getModuleWorkOrders: () => apiClient<{ work_orders: PlatformModuleWorkOrder[] }>(moduleWorkOrdersPath),
  createModuleWorkOrder: (payload: { moduleName: string; sourceLocale: PlatformModuleWorkOrder['sourceLocale'] }) => apiClient<PlatformModuleWorkOrder>(
    moduleWorkOrdersPath,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  removeModuleWorkOrder: (workOrderId: number) => apiClient<{ id: number; status: 'CANCELLED'; removed: boolean }>(
    `${moduleWorkOrdersPath}/${workOrderId}`,
    { method: 'DELETE' },
  ),
  updateModuleAvailability: (moduleId: number, active: boolean, reason: string) => apiClient<PlatformModuleAvailabilityResult>(
    `${endpoints.platformAdmin.modules}/${moduleId}/availability`,
    { method: 'PATCH', body: JSON.stringify({ active, reason }) },
  ),
  getAudit: () => apiClient<PlatformAudit>(`${endpoints.platformAdmin.audit}?limit=200`),
  getConsulting: () => apiClient<PlatformConsultingWorkspace>(consultingPath),
  createConsultingConsultant: (payload: { firstName: string; lastName: string; phone: string; email: string }) => apiClient<PlatformConsultingConsultant>(
    `${consultingPath}/consultants`,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  createConsultingAppointment: (payload: PlatformConsultingAppointmentCreate) => apiClient<PlatformConsultingAppointment>(
    `${consultingPath}/appointments`,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  createConsultingLocation: (payload: {
    cityName: string;
    regionName: string;
    countryName: string;
    countryCode: string;
    timezone: string;
    currency: string;
  }) => apiClient<PlatformConsultingLocation>(
    `${consultingPath}/locations`,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  updateConsultingAppointment: (appointmentId: number, payload: PlatformConsultingAppointmentUpdate) => apiClient<PlatformConsultingAppointment>(
    `${consultingPath}/appointments/${appointmentId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
  updateConsultingLocation: (locationId: number, payload: { active: boolean; inPersonFeeCents: number | null; currency: string }) => apiClient<PlatformConsultingLocation>(
    `${consultingPath}/locations/${locationId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
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
  updateTrialProducts: (companyId: number, productCodes: string[]) => apiClient<{
    company_id: number;
    product_codes: string[];
    offer_code: string;
    billing_interval: string;
    trial_ends_at?: string | null;
    charge_timing: 'TRIAL_END' | 'NEXT_INVOICE' | 'PAYMENT_METHOD_REQUIRED' | string;
    charged_now: boolean;
  }>(`${companyPath(companyId)}/products`, {
    method: 'PATCH',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ product_codes: productCodes }),
  }),
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
