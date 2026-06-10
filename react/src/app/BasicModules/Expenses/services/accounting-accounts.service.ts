import { apiClient } from '../../../lib/apiClient';
import {
  getAccountingAccountApiId,
  toAccountingAccount,
  toAccountingAccountApiRequest,
} from '../adapters/accounting-account.adapter';
import type { AccountingAccount } from '../AccountingAccounts/types';
import type {
  AccountingAccountApiDto,
  AccountingAccountListApiResponse,
} from '../types/finance-api.types';

const accountsPath = '/api/v1/finance/accounting-accounts';

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const accountingAccountsService = {
  async getAccountingAccounts(): Promise<AccountingAccount[]> {
    const response = await apiClient<AccountingAccountListApiResponse>(accountsPath);
    return response.accounts.map(toAccountingAccount);
  },

  async createAccountingAccount(account: AccountingAccount): Promise<AccountingAccount> {
    const response = await apiClient<AccountingAccountApiDto>(
      accountsPath,
      jsonMutation('POST', toAccountingAccountApiRequest(account)),
    );
    return toAccountingAccount(response);
  },

  async updateAccountingAccount(account: AccountingAccount): Promise<AccountingAccount> {
    const accountId = getAccountingAccountApiId(account.id);
    const response = await apiClient<AccountingAccountApiDto>(
      `${accountsPath}/${accountId}`,
      jsonMutation('PUT', toAccountingAccountApiRequest(account)),
    );
    return toAccountingAccount(response);
  },

  async deleteAccountingAccount(accountId: string): Promise<void> {
    await apiClient(`${accountsPath}/${getAccountingAccountApiId(accountId)}`, { method: 'DELETE' });
  },
};
