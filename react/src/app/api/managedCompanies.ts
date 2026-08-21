import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export type ManagedCompanyAccessMode = 'PLATFORM_ROOT' | 'DISTRIBUTOR_PORTFOLIO' | 'NONE';

export interface ManagedCompany {
  id: number;
  name: string;
  access_mode: ManagedCompanyAccessMode;
  active: boolean;
  read_only: boolean;
}

export interface ManagedCompanyContext {
  authority_mode: ManagedCompanyAccessMode;
  authority_company_id: number | null;
  authority_company_name: string;
  active: boolean;
  active_company: ManagedCompany | null;
  read_only: boolean;
  companies: ManagedCompany[];
}

export const managedCompanyApi = {
  context() {
    return apiClient<ManagedCompanyContext>(endpoints.auth.managedCompanies);
  },

  activate(companyId: number) {
    return apiClient<ManagedCompanyContext>(endpoints.auth.managedCompany, {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId }),
    });
  },

  clear() {
    return apiClient<ManagedCompanyContext>(endpoints.auth.managedCompany, {
      method: 'DELETE',
    });
  },
};
