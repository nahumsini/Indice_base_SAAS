import { apiClient } from '../lib/apiClient';
import type { AuthSessionResponse } from './auth.types';
import { endpoints } from './endpoints';

export interface CommercialCatalogProduct {
  code: string;
  name: string;
  type: 'core' | 'basic' | 'complementary';
  capabilities: string[];
}

export interface PlatformContextResponse {
  tenant: {
    user_id: number;
    company_id: number;
    user_company_id: number;
    role: string;
    scope: AuthSessionResponse['company']['scope'];
  };
  catalog: {
    version: string;
    enforcement_mode: 'shadow';
    products: CommercialCatalogProduct[];
    aliases: Record<string, string>;
    core_capabilities: string[];
    effective_capabilities: string[];
  };
}

export const platformApi = {
  getContext() {
    return apiClient<PlatformContextResponse>(endpoints.platform.context);
  },
};
