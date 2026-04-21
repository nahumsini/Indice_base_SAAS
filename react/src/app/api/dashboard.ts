import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface BackendDashboardModule {
  slug: string;
  name: string;
  desc?: string;
  category?: string;
  plan?: string;
  icon?: string;
  image?: string | null;
  favorite?: boolean;
  locked?: boolean;
  url?: string;
}

export interface BackendUnit {
  id: number;
  name: string;
  description?: string | null;
  status?: string | null;
}

export interface BackendBusiness {
  id: number;
  unitId?: number | null;
  name: string;
  address?: string | null;
  description?: string | null;
  status?: string | null;
}

interface ListResponse<T> {
  ok: boolean;
  data: T[];
  items: T[];
}

export const dashboardApi = {
  listModules() {
    return apiClient<BackendDashboardModule[]>(endpoints.dashboard.modules);
  },

  async listUnits() {
    const response = await apiClient<ListResponse<BackendUnit>>(endpoints.dashboard.units);
    return response.data;
  },

  async listBusinesses() {
    const response = await apiClient<ListResponse<BackendBusiness>>(endpoints.dashboard.businesses);
    return response.data;
  },
};
