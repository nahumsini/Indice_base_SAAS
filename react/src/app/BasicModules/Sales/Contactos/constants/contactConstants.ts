import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { salesOwners } from '../../salesCrmContext';
import type { ContactColumnId, ContactFormState, FiscalCountryOption } from '../types/contactTypes';

export const defaultContactVisibleColumns: ContactColumnId[] = [
  'company',
  'phone',
  'email',
  'source',
  'owner',
  'relationship',
  'fiscal',
  'notes',
];

export const contactInputClassName = 'h-11 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
export const contactSelectClassName = 'h-11 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
export const contactModalActionClassNames = getSalesModalActionClassNames('coral');
export const contactSortCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

export const fiscalCountryOptions: FiscalCountryOption[] = [
  {
    value: 'MX',
    label: 'México',
    taxIdLabel: 'RFC',
    registryLabel: 'Cédula / constancia fiscal',
    regimeLabel: 'Régimen fiscal',
  },
  {
    value: 'CA',
    label: 'Canadá',
    taxIdLabel: 'Business Number / GST-HST',
    registryLabel: 'Corporation number',
    regimeLabel: 'Tax program account',
  },
  {
    value: 'CO',
    label: 'Colombia',
    taxIdLabel: 'NIT / DIAN',
    registryLabel: 'DV / matrícula mercantil',
    regimeLabel: 'Responsabilidad fiscal',
  },
  {
    value: 'US',
    label: 'Estados Unidos',
    taxIdLabel: 'EIN / tax ID',
    registryLabel: 'State registration / corp number',
    regimeLabel: 'Tax classification',
  },
  {
    value: 'BR',
    label: 'Brasil',
    taxIdLabel: 'CNPJ / CPF',
    registryLabel: 'Inscrição estadual / municipal',
    regimeLabel: 'Regime tributário',
  },
];

export const fallbackFiscalCountry = fiscalCountryOptions[0];

export const initialContactForm: ContactFormState = {
  company: '',
  contactPerson: '',
  role: '',
  phone: '',
  email: '',
  source: 'Manual',
  ownerValue: '',
  owner: salesOwners[0],
  notes: '',
  fiscalCountry: fallbackFiscalCountry.value,
  fiscalLegalName: '',
  fiscalTaxId: '',
  fiscalRegistryId: '',
  fiscalAddressLine1: '',
  fiscalAddressLine2: '',
  fiscalCity: '',
  fiscalState: '',
  fiscalPostalCode: '',
  fiscalEmail: '',
  fiscalRegime: '',
  fiscalNotes: '',
};
