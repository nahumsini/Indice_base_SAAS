import { endpoints } from '../../../api/endpoints';
import { apiClient } from '../../../lib/apiClient';
import type { ExecutiveKpiResponse, ExecutiveOrganizationOptions, ExecutivePanelFilters } from './types';

const buildQuery = (filters: ExecutivePanelFilters, preferredCurrency: string) => {
  const params = new URLSearchParams();

  params.set('period', filters.period);
  params.set('preferredCurrency', preferredCurrency);
  if (filters.unitId) params.set('unitId', filters.unitId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }

  return params.toString();
};

export const executivePanelApi = {
  get(filters: ExecutivePanelFilters, preferredCurrency = 'MXN') {
    const query = buildQuery(filters, preferredCurrency);
    return apiClient<ExecutiveKpiResponse>(`${endpoints.kpis.executivePanel}${query ? `?${query}` : ''}`);
  },
  organizationOptions() {
    return apiClient<ExecutiveOrganizationOptions>(endpoints.kpis.executiveOrganizationOptions);
  },
};
