import type { Provider } from '../types/expenses.types';
import type { ProviderRecord, ProviderStatus, ProviderType } from '../Providers/useProveedoresLogic';
import {
  asNumber,
  asObject,
  asString,
  asStringArray,
  compactObject,
  numericId,
  optionalString,
  toDate,
} from './adapter.utils';
import type { ProviderApiDto, ProviderApiRequest } from '../types/finance-api.types';

const providerTypes: ProviderType[] = [
  'Arrendamiento',
  'Construcción',
  'Consultoría',
  'Contabilidad',
  'Financiero',
  'Gobierno',
  'Insumos',
  'Legal',
  'Logística',
  'Mantenimiento',
  'Marketing',
  'Nómina',
  'Productos',
  'Seguros',
  'Servicios',
  'Servicios básicos',
  'Tecnología',
  'Viajes',
  'Otros',
];

const toProviderType = (value: unknown): ProviderType => (
  typeof value === 'string' && providerTypes.includes(value as ProviderType)
    ? value as ProviderType
    : 'Servicios'
);

const toProviderStatus = (status?: string | null): ProviderStatus => (
  status === 'INACTIVE' || status === 'BLOCKED' || status === 'ARCHIVED' ? 'inactive' : 'active'
);

const toBackendStatus = (status?: ProviderStatus) => (
  status === 'inactive' ? 'INACTIVE' as const : 'ACTIVE' as const
);

export const toProviderRecord = (provider: ProviderApiDto): ProviderRecord => {
  const customFields = asObject(provider.customFields);

  return {
    id: String(provider.id),
    folio: asString(customFields.folio, `PROV-${String(provider.id).padStart(4, '0')}`),
    name: provider.name,
    company: provider.legalName ?? provider.name,
    type: toProviderType(customFields.providerType),
    contactName: provider.contactName ?? '',
    email: provider.email ?? '',
    phone: provider.phone ?? '',
    taxId: provider.taxId ?? '',
    address: asString(customFields.address, ''),
	    accountingAccount: asString(customFields.accountingAccount, 'Gastos operativos'),
	    status: toProviderStatus(provider.status),
	    businessUnit: provider.unitId ? String(provider.unitId) : '',
	    business: provider.businessId ? String(provider.businessId) : '',
	    attachments: asStringArray(customFields.attachments),
    authorizer: asString(customFields.authorizer, ''),
    performer: asString(customFields.performer, ''),
    auditNotes: provider.notes ?? asString(customFields.auditNotes, ''),
    createdAt: toDate(provider.createdAt),
    updatedAt: toDate(provider.updatedAt ?? provider.createdAt),
  };
};

export const toExpenseProvider = (provider: ProviderRecord): Provider => ({
  id: provider.id,
  name: provider.name,
  taxId: provider.taxId,
  contactName: provider.contactName,
  email: provider.email,
  phone: provider.phone,
  address: provider.address,
  category: provider.type,
  rating: 0,
  status: provider.status,
  notes: provider.auditNotes,
  documents: provider.attachments,
  createdAt: provider.createdAt,
  updatedAt: provider.updatedAt,
});

export const toProviderApiRequest = (provider: ProviderRecord): ProviderApiRequest => ({
  unitId: numericId(provider.businessUnit) ?? null,
  businessId: numericId(provider.business) ?? null,
  name: provider.name.trim() || 'Nuevo proveedor',
  legalName: optionalString(provider.company) ?? provider.name.trim(),
  taxId: optionalString(provider.taxId),
  email: optionalString(provider.email),
  phone: optionalString(provider.phone),
  contactName: optionalString(provider.contactName),
  paymentTermsDays: asNumber(asObject(provider).paymentTermsDays, undefined),
  status: toBackendStatus(provider.status),
  notes: optionalString(provider.auditNotes),
	  customFields: compactObject({
	    accountingAccount: provider.accountingAccount,
	    address: provider.address,
	    attachments: provider.attachments,
	    authorizer: provider.authorizer,
	    folio: provider.folio,
	    performer: provider.performer,
    providerType: provider.type,
  }),
  metadata: { source: 'expenses-frontend' },
});

export const providerRecordsToExpenseProviders = (providers: ProviderRecord[]) => (
  providers.map(toExpenseProvider)
);
