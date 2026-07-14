import type { ProviderRecord } from './useProveedoresLogic';

function getNextProviderFolio(providers: ProviderRecord[]) {
  const nextNumber = providers.reduce((maxNumber, provider) => {
    const match = provider.folio.match(/PROV-(\d+)/);
    const folioNumber = match ? Number(match[1]) : 0;
    return Math.max(maxNumber, folioNumber);
  }, 0) + 1;

  return `PROV-${String(nextNumber).padStart(4, '0')}`;
}

export function createQuickProviderRecord(providers: ProviderRecord[], name: string): ProviderRecord {
  const now = new Date();
  const normalizedName = name.trim();

  return {
    accountingAccount: '',
    address: '',
    attachments: [],
    auditNotes: '',
    authorizer: '',
    business: '',
    businessUnit: '',
    company: normalizedName,
    contactName: '',
    createdAt: now,
    email: '',
    folio: getNextProviderFolio(providers),
    id: `provider-${Date.now()}`,
    name: normalizedName,
    performer: '',
    phone: '',
    status: 'active',
    taxId: '',
    type: 'Otros',
    updatedAt: now,
  };
}
