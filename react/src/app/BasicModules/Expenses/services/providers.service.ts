import { apiClient } from '../../../lib/apiClient';
import { toExpenseProvider, toProviderApiRequest, toProviderRecord } from '../adapters/provider.adapter';
import type { Provider } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import type { ProviderApiDto, ProviderListApiResponse } from '../types/finance-api.types';
import type { ProviderCenterInbox } from '../../PointOfSale/OrdenesCompra/types/purchaseOrder.types';

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

  providerCenterInbox() {
    return apiClient<ProviderCenterInbox>(`${providersPath}/provider-center/inbox`);
  },

  approveProviderCenterRegistration(requestId: number, unitId: number, businessId: number, reviewNote = '') {
    return apiClient(`${providersPath}/provider-center/registrations/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, business_id: businessId, review_note: reviewNote }),
    });
  },

  rejectProviderCenterRegistration(requestId: number, reviewNote = '') {
    return apiClient(`${providersPath}/provider-center/registrations/${requestId}/reject`, {
      method: 'POST', body: JSON.stringify({ review_note: reviewNote }),
    });
  },

  reviewProviderCenterChange(requestId: number, action: 'approve' | 'reject', reviewNote = '') {
    return apiClient(`${providersPath}/provider-center/changes/${requestId}/${action}`, {
      method: 'POST', body: JSON.stringify({ review_note: reviewNote }),
    });
  },
};
