import type { PaymentAccount, PaymentAccountType } from '../PaymentAccounts/types';
import {
  asNumber,
  asObject,
  asString,
  compactObject,
  numericId,
  optionalString,
} from './adapter.utils';
import type {
  BackendPaymentAccountType,
  PaymentAccountApiDto,
  PaymentAccountApiRequest,
} from '../types/finance-api.types';

const backendToLegacyType: Record<BackendPaymentAccountType, PaymentAccountType> = {
  BANK: 'bank',
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  PETTY_CASH: 'cash',
};

const legacyToBackendType = (type: PaymentAccountType): BackendPaymentAccountType => {
  if (type === 'cash') return 'CASH';
  if (type === 'credit_card') return 'CREDIT_CARD';
  return 'BANK';
};

export const toPaymentAccount = (account: PaymentAccountApiDto): PaymentAccount => {
  const customFields = asObject(account.customFields);

	  return {
	    id: String(account.id),
	    unitId: account.unitId ? String(account.unitId) : undefined,
	    businessId: account.businessId ? String(account.businessId) : undefined,
	    name: account.name,
    type: asString(customFields.legacyType, backendToLegacyType[account.type]) as PaymentAccountType,
    accountNumber: asString(customFields.accountNumber, undefined),
    bank: asString(customFields.bank, undefined),
    currency: account.currencyCode,
    balance: asNumber(account.currentBalance, asNumber(account.openingBalance)),
    isActive: account.status !== 'INACTIVE' && account.status !== 'ARCHIVED',
    lastTransaction: (account.updatedAt ?? account.createdAt)?.slice(0, 10),
    source: 'expenses',
  };
};

export const toCreatePaymentAccountApiRequest = (
  account: PaymentAccount,
	): PaymentAccountApiRequest => ({
	  unitId: numericId(account.unitId) ?? null,
	  businessId: numericId(account.businessId) ?? null,
	  name: account.name.trim(),
  type: legacyToBackendType(account.type),
  currencyCode: (account.currency || 'MXN').slice(0, 3).toUpperCase(),
  openingBalance: account.balance,
  currentBalance: null,
  status: account.isActive ? 'ACTIVE' : 'INACTIVE',
  description: optionalString(account.bank),
  customFields: compactObject({
    accountNumber: account.accountNumber,
    bank: account.bank,
    legacyType: account.type,
  }),
  metadata: { source: 'expenses-frontend' },
});

export const toUpdatePaymentAccountApiRequest = (
  account: PaymentAccount,
): PaymentAccountApiRequest => ({
  ...toCreatePaymentAccountApiRequest(account),
  openingBalance: undefined,
  currentBalance: null,
});

export const getPaymentAccountApiId = (accountId: string) => numericId(accountId);
