import { apiClient } from '../../../lib/apiClient';
import {
  getPaymentAccountApiId,
  toCreatePaymentAccountApiRequest,
  toPaymentAccount,
  toUpdatePaymentAccountApiRequest,
} from '../adapters/payment-account.adapter';
import type { PaymentAccount } from '../PaymentAccounts/types';
import type {
  PaymentAccountApiDto,
  PaymentAccountListApiResponse,
} from '../types/finance-api.types';

const accountsPath = '/api/v1/finance/payment-accounts';

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const paymentAccountsService = {
  async getPaymentAccounts(): Promise<PaymentAccount[]> {
    const response = await apiClient<PaymentAccountListApiResponse>(accountsPath);
    return response.accounts.map(toPaymentAccount);
  },

  async createPaymentAccount(account: PaymentAccount): Promise<PaymentAccount> {
    const response = await apiClient<PaymentAccountApiDto>(
      accountsPath,
      jsonMutation('POST', toCreatePaymentAccountApiRequest(account)),
    );
    return toPaymentAccount(response);
  },

  async updatePaymentAccount(account: PaymentAccount): Promise<PaymentAccount> {
    const accountId = getPaymentAccountApiId(account.id);
    const response = await apiClient<PaymentAccountApiDto>(
      `${accountsPath}/${accountId}`,
      jsonMutation('PUT', toUpdatePaymentAccountApiRequest(account)),
    );
    return toPaymentAccount(response);
  },

  async deletePaymentAccount(accountId: string): Promise<void> {
    await apiClient(`${accountsPath}/${getPaymentAccountApiId(accountId)}`, { method: 'DELETE' });
  },
};
