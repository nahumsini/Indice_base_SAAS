import { apiClient } from '../../../lib/apiClient';
import { toExpenseProvider, toProviderApiRequest, toProviderRecord } from '../adapters/provider.adapter';
import type { Provider } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import type { ProviderApiDto, ProviderListApiResponse } from '../types/finance-api.types';

const providersPath = '/api/v1/finance/providers';

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const providersService = {
  async getProviderRecords(): Promise<ProviderRecord[]> {
    const response = await apiClient<ProviderListApiResponse>(providersPath);
    return response.providers.map(toProviderRecord);
  },

  async getExpenseProviders(): Promise<Provider[]> {
    const records = await this.getProviderRecords();
    return records.map(toExpenseProvider);
  },

  async createProvider(provider: ProviderRecord): Promise<ProviderRecord> {
    const response = await apiClient<ProviderApiDto>(
      providersPath,
      jsonMutation('POST', toProviderApiRequest(provider)),
    );
    return toProviderRecord(response);
  },

  async updateProvider(provider: ProviderRecord): Promise<ProviderRecord> {
    const response = await apiClient<ProviderApiDto>(
      `${providersPath}/${provider.id}`,
      jsonMutation('PUT', toProviderApiRequest(provider)),
    );
    return toProviderRecord(response);
  },

  async deleteProvider(providerId: string): Promise<void> {
    await apiClient(`${providersPath}/${providerId}`, { method: 'DELETE' });
  },
};
