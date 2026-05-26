import { endpoints } from '../../api/endpoints';
import { apiClient } from '../../lib/apiClient';

export type SalesContextUser = {
  userCompanyId: number;
  userId: number | null;
  name: string;
  email: string;
  role?: string | null;
  status?: string | null;
};

export type SalesContextResponse = {
  users: SalesContextUser[];
  units: Array<Record<string, unknown>>;
  businesses: Array<Record<string, unknown>>;
  currentUserCompanyId?: number | null;
  dictionaries?: Record<string, unknown>;
};

export const salesApi = {
  context() {
    return apiClient<SalesContextResponse>(endpoints.sales.context);
  },
};
