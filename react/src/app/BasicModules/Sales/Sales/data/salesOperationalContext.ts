import type { SalesOperationalContext } from '../types/salesTypes';

const defaultContext: SalesOperationalContext = {
  legalName: 'Indice Operating Company S.A. de C.V.',
  fiscalAddress: 'Av. Empresa 120, Monterrey, Nuevo Leon',
  taxIdentifier: 'IOC260529A10',
  taxIdentifierLabel: 'RFC',
  companyRegistryNumber: '',
  country: 'MX',
  jurisdictionName: 'Mexico',
  currency: 'MXN',
  defaultWarehouse: 'Corporate Office',
};

const contextByBusinessId: Record<string, SalesOperationalContext> = {
  'sales-business-corporate': {
    legalName: 'Indice Corporate Sales S.A. de C.V.',
    fiscalAddress: 'Av. Empresa 120, Monterrey, Nuevo Leon',
    taxIdentifier: 'ICS260529MX1',
    taxIdentifierLabel: 'RFC',
    companyRegistryNumber: '',
    country: 'MX',
    jurisdictionName: 'Mexico',
    currency: 'MXN',
    defaultWarehouse: 'Corporate Office',
  },
  'sales-business-retail': {
    legalName: 'Indice Retail Execution S.A. de C.V.',
    fiscalAddress: 'Blvd. Norte 44, Cancun, Quintana Roo',
    taxIdentifier: 'IRE260529MX2',
    taxIdentifierLabel: 'RFC',
    companyRegistryNumber: '',
    country: 'MX',
    jurisdictionName: 'Mexico',
    currency: 'MXN',
    defaultWarehouse: 'Cancun Store',
  },
  'sales-business-services': {
    legalName: 'Indice Canada Operations Inc.',
    fiscalAddress: '55 King Street West, Toronto, ON',
    taxIdentifier: 'BN-892745120',
    taxIdentifierLabel: 'BN / GST-HST',
    companyRegistryNumber: '',
    country: 'CA',
    jurisdictionName: 'Canada',
    currency: 'CAD',
    defaultWarehouse: 'Toronto Service Hub',
  },
};

export function getSalesOperationalContext(businessId?: string | null) {
  if (!businessId) return defaultContext;

  return contextByBusinessId[businessId] ?? defaultContext;
}
