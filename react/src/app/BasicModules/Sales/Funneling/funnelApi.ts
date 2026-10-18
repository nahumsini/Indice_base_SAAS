import { apiClient } from '../../../lib/apiClient';
import type { FunnelInput, FunnelPage, FunnelPlan } from './funnelModel';

const base = '/api/v1/sales/funnels';
export const funnelApi = {
  list: (query: URLSearchParams, signal?: AbortSignal) => apiClient<FunnelPage>(`${base}?${query}`, { signal }),
  get: (id: string, signal?: AbortSignal) => apiClient<FunnelPlan>(`${base}/${encodeURIComponent(id)}`, { signal }),
  save: (id: string, body: FunnelInput) => apiClient<FunnelPlan>(`${base}/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(body),
  }),
};
