import { endpoints } from '../../../api/endpoints';
import { apiClient } from '../../../lib/apiClient';
import type { ExecutiveKpiResponse, ExecutivePanelFilters } from './types';

const buildQuery = (filters: ExecutivePanelFilters) => {
  const params = new URLSearchParams();

  params.set('period', filters.period);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.unitId) params.set('unitId', filters.unitId);
  if (filters.businessId) params.set('businessId', filters.businessId);
  if (filters.risk && filters.risk !== 'all') params.set('risk', filters.risk);
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }

  return params.toString();
};

export const executivePanelApi = {
  get(filters: ExecutivePanelFilters) {
    const query = buildQuery(filters);
    return apiClient<ExecutiveKpiResponse>(`${endpoints.kpis.executivePanel}${query ? `?${query}` : ''}`);
  },
};
