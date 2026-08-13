import { endpoints } from '../../../api/endpoints';
import { apiClient } from '../../../lib/apiClient';
import type {
  BenefitPayload,
  PlatformAccountCreatePayload,
  PlatformAccountCreateResult,
  PlatformBenefit,
  PlatformCatalog,
  PlatformCompanyDetail,
  PlatformCompanyUserMutationResult,
  PlatformConsultingAppointment,
  PlatformConsultingAppointmentCreate,
  PlatformConsultingAppointmentUpdate,
  PlatformConsultingWorkspace,
  PlatformTrialExtensionResult,
} from '../../../api/platformAdmin';
import type {
  DistributorPortalContext,
  DistributorPortfolio,
  DistributorStageFilter,
} from '../types/contractsAccess';

const companyPath = (companyId: number) => `${endpoints.distributorPortal.companies}/${companyId}`;

export const distributorPortalApi = {
  getContext: () => apiClient<DistributorPortalContext>(endpoints.distributorPortal.context),
  getCatalog: () => apiClient<PlatformCatalog>(endpoints.distributorPortal.catalog),
  getPortfolio: (query = '', stage: DistributorStageFilter = 'ALL') => {
    const params = new URLSearchParams({ q: query, stage });
    return apiClient<DistributorPortfolio>(`${endpoints.distributorPortal.contractsAccess}?${params}`);
  },
  getCompany: (companyId: number) => apiClient<PlatformCompanyDetail>(companyPath(companyId)),
  createCompanyAccount: (payload: PlatformAccountCreatePayload) => apiClient<PlatformAccountCreateResult>(
    endpoints.distributorPortal.companies,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ ...payload, account_type: 'SUPER_ADMIN' }),
    },
  ),
  inviteCompanyUser: (
    companyId: number,
    payload: { name: string; email: string; role: 'admin' | 'user' },
  ) => apiClient<PlatformCompanyUserMutationResult>(`${companyPath(companyId)}/users/invitations`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(payload),
  }),
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
  getConsulting: () => apiClient<PlatformConsultingWorkspace>(endpoints.distributorPortal.consulting),
  createConsultingAppointment: (payload: PlatformConsultingAppointmentCreate) =>
    apiClient<PlatformConsultingAppointment>(`${endpoints.distributorPortal.consulting}/appointments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateConsultingAppointment: (
    appointmentId: number,
    payload: PlatformConsultingAppointmentUpdate,
  ) => apiClient<PlatformConsultingAppointment>(
    `${endpoints.distributorPortal.consulting}/appointments/${appointmentId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
};
