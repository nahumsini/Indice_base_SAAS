import { endpoints } from '../api/endpoints';
import { apiClient } from '../lib/apiClient';
import type {
  InternalDevelopmentDetail,
  InternalDevelopmentEntryPayload,
  InternalDevelopmentFilters,
  InternalDevelopmentWorkspaceData,
} from './internalDevelopment.types';

const base = endpoints.platformAdmin.internalDevelopment;

const queryString = (filters: InternalDevelopmentFilters) => {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.entryType !== 'ALL') params.set('type', filters.entryType);
  if (filters.area !== 'ALL') params.set('area', filters.area);
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.ownerUserId) params.set('owner', filters.ownerUserId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const internalDevelopmentApi = {
  workspace(filters: InternalDevelopmentFilters) {
    return apiClient<InternalDevelopmentWorkspaceData>(`${base}${queryString(filters)}`);
  },
  detail(entryId: number) {
    return apiClient<InternalDevelopmentDetail>(`${base}/${entryId}`);
  },
  create(payload: InternalDevelopmentEntryPayload) {
    return apiClient<InternalDevelopmentDetail>(base, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(entryId: number, payload: InternalDevelopmentEntryPayload) {
    return apiClient<InternalDevelopmentDetail>(`${base}/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
