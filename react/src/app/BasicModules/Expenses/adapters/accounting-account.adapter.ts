import type { AccountingAccount, AccountingAccountType } from '../AccountingAccounts/types';
import { asNumber, asObject, asString, compactObject, numericId, optionalString } from './adapter.utils';
import type {
  AccountingAccountApiDto,
  AccountingAccountApiRequest,
  BackendAccountingAccountGroup,
} from '../types/finance-api.types';

const groupTypeMap: Partial<Record<BackendAccountingAccountGroup, AccountingAccountType>> = {
  OTHER: 'expense',
  PAYROLL: 'expense',
  RENT: 'expense',
  UTILITIES: 'expense',
  MAINTENANCE: 'expense',
  MARKETING: 'expense',
  SOFTWARE: 'expense',
  INSURANCE: 'expense',
  TAXES: 'expense',
  TRAVEL: 'expense',
  SUPPLIES: 'expense',
  PROFESSIONAL_SERVICES: 'expense',
};

const accountGroupRules: Array<[RegExp, BackendAccountingAccountGroup]> = [
  [/nomina|payroll/i, 'PAYROLL'],
  [/renta|rent|arrend/i, 'RENT'],
  [/servicio|utilit|electric|agua|gas/i, 'UTILITIES'],
  [/manten/i, 'MAINTENANCE'],
  [/market|publicidad/i, 'MARKETING'],
  [/software|saas|sistema/i, 'SOFTWARE'],
  [/seguro|insurance/i, 'INSURANCE'],
  [/tax|impue/i, 'TAXES'],
  [/viaje|travel/i, 'TRAVEL'],
  [/suministro|suppl|oficina/i, 'SUPPLIES'],
  [/honorario|legal|profesional|consult/i, 'PROFESSIONAL_SERVICES'],
];

const toBackendGroup = (account: AccountingAccount): BackendAccountingAccountGroup => {
  const customGroup = asString(asObject(account as unknown as Record<string, unknown>).groupKey, '');
  if (customGroup) return customGroup as BackendAccountingAccountGroup;
  const haystack = `${account.code} ${account.name} ${account.description ?? ''}`;
  return accountGroupRules.find(([rule]) => rule.test(haystack))?.[1] ?? 'OTHER';
};

export const toAccountingAccount = (account: AccountingAccountApiDto): AccountingAccount => {
  const customFields = asObject(account.customFields);

	  return {
	    id: String(account.id),
	    unitId: account.unitId ? String(account.unitId) : undefined,
	    businessId: account.businessId ? String(account.businessId) : undefined,
	    code: account.code,
    name: account.name,
    type: asString(customFields.accountingType, groupTypeMap[account.groupKey] ?? 'expense') as AccountingAccountType,
    parentAccount: asString(customFields.parentAccount, undefined),
    description: account.description ?? '',
    isActive: account.status !== 'INACTIVE' && account.status !== 'ARCHIVED',
    balance: asNumber(customFields.balance, 0),
    canonicalKey: asString(customFields.canonicalKey, undefined),
    countryCode: asString(customFields.countryCode, undefined) as AccountingAccount['countryCode'],
    importedFromCatalog: Boolean(customFields.importedFromCatalog),
    localReferenceCode: asString(customFields.localReferenceCode, undefined),
    localStandard: asString(customFields.localStandard, undefined),
    statementSection: asString(customFields.statementSection, undefined) as AccountingAccount['statementSection'],
  };
};

export const toAccountingAccountApiRequest = (
  account: AccountingAccount,
	): AccountingAccountApiRequest => ({
	  unitId: numericId(account.unitId) ?? null,
	  businessId: numericId(account.businessId) ?? null,
	  code: account.code.trim(),
  name: account.name.trim(),
  groupKey: toBackendGroup(account),
  description: optionalString(account.description),
  status: account.isActive ? 'ACTIVE' : 'INACTIVE',
  customFields: compactObject({
    accountingType: account.type,
    balance: account.balance,
    canonicalKey: account.canonicalKey,
    countryCode: account.countryCode,
    importedFromCatalog: account.importedFromCatalog,
    localReferenceCode: account.localReferenceCode,
    localStandard: account.localStandard,
    parentAccount: account.parentAccount,
    statementSection: account.statementSection,
  }),
  metadata: compactObject({
    source: 'expenses-frontend',
    catalogCountry: account.countryCode,
    catalogStandard: account.localStandard,
    canonicalKey: account.canonicalKey,
  }),
});

export const getAccountingAccountApiId = (accountId: string) => numericId(accountId);
