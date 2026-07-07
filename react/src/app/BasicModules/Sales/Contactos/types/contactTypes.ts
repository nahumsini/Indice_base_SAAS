import type { OpportunitySource } from '../../salesCrmContext';

export type ContactSortColumn = 'contact' | 'company' | 'phone' | 'email' | 'source' | 'owner' | 'notes';
export type ContactSortDirection = 'asc' | 'desc';
export type ContactColumnId = ContactSortColumn | 'relationship' | 'fiscal';

export type ContactSortState = {
  columnId: ContactSortColumn;
  direction: ContactSortDirection;
};

export type ContactFormState = {
  company: string;
  contactPerson: string;
  role: string;
  phone: string;
  email: string;
  source: OpportunitySource;
  ownerValue: string;
  owner: string;
  notes: string;
  fiscalCountry: string;
  fiscalLegalName: string;
  fiscalTaxId: string;
  fiscalRegistryId: string;
  fiscalAddressLine1: string;
  fiscalAddressLine2: string;
  fiscalCity: string;
  fiscalState: string;
  fiscalPostalCode: string;
  fiscalEmail: string;
  fiscalRegime: string;
  fiscalNotes: string;
};

export type ContactOwnerSelectOption = {
  value: string;
  label: string;
};

export interface ContactosProps {
  learningModeActive?: boolean;
}

export type FiscalCountryOption = {
  value: string;
  label: string;
  taxIdLabel: string;
  registryLabel: string;
  regimeLabel: string;
};
