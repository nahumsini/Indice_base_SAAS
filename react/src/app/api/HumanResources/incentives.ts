import { apiClient } from '../../lib/apiClient';
import { endpoints } from '../endpoints';

export interface BackendHrIncentive {
  id: number;
  incentive_code: string;
  name: string;
  description?: string | null;
  incentive_type: 'manual' | 'kpi';
  calculation_method: string;
  amount: number;
  currency_code: string;
  payroll_category: string;
  tax_treatment: string;
  taxable: boolean;
  affects_social_security: boolean;
  affects_employer_cost: boolean;
  source_type: string;
  source_reference_type?: string | null;
  source_reference_id?: string | null;
  effective_start_date: string;
  effective_end_date?: string | null;
  application_mode: string;
  status: 'active' | 'scheduled' | 'paused';
  eligible_count: number;
  applied_count: number;
  scope_summary: string;
}

export interface HrIncentivesListResponse {
  items: BackendHrIncentive[];
  count: number;
  summary: {
    total_count: number;
    active_count: number;
    scheduled_count: number;
    paused_count: number;
    manual_count: number;
    automated_count: number;
    eligible_count: number;
  };
}

export interface CreateHrIncentivePayload {
  name: string;
  description?: string;
  incentive_type: 'manual' | 'kpi';
  amount: number;
  currency_code: string;
  effective_start_date: string;
  status: 'active' | 'scheduled' | 'paused';
  scope_type: 'all' | 'employees' | 'units' | 'businesses';
  target_user_company_ids?: number[];
  target_unit_ids?: number[];
  target_business_ids?: number[];
  application_mode: 'next_payroll' | 'specific_date';
  source_reference_type?: string;
  source_reference_id?: string;
}

export const hrIncentivesApi = {
  list(filters?: { search?: string; type?: string; status?: string }) {
    const search = new URLSearchParams();
    if (filters?.search) search.set('search', filters.search);
    if (filters?.type && filters.type !== 'all') search.set('type', filters.type);
    if (filters?.status && filters.status !== 'all') search.set('status', filters.status);
    const query = search.toString();
    return apiClient<HrIncentivesListResponse>(
      `${endpoints.humanResources.incentivesList}${query ? `?${query}` : ''}`,
    );
  },

  create(payload: CreateHrIncentivePayload) {
    return apiClient<BackendHrIncentive>(endpoints.humanResources.incentivesCreate, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  delete(incentiveId: number | string) {
    return apiClient<void>(`${endpoints.humanResources.incentivesDelete}/${incentiveId}`, {
      method: 'DELETE',
    });
  },
};
