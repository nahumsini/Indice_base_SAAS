import type { OpportunitySource } from './opportunities';

export type SalesContact = {
  id: string;
  company: string;
  contactPerson: string;
  role: string;
  phone: string;
  email: string;
  source: OpportunitySource;
  ownerUserCompanyId?: number | null;
  owner: string;
  tags: string[];
  notes: string;
  fiscalCountry?: string;
  fiscalLegalName?: string;
  fiscalTaxId?: string;
  fiscalRegistryId?: string;
  fiscalAddressLine1?: string;
  fiscalAddressLine2?: string;
  fiscalCity?: string;
  fiscalState?: string;
  fiscalPostalCode?: string;
  fiscalEmail?: string;
  fiscalRegime?: string;
  fiscalNotes?: string;
};
