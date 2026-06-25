export type BudgetTaxMode = 'none' | 'auto' | 'manual';
export type BudgetTaxCountry = 'MX' | 'US' | 'CA' | 'CO' | 'BR' | 'INTL';

export type BudgetTaxProfile = {
  id: string;
  country: BudgetTaxCountry;
  label: string;
  rate: number;
  shortName: string;
  region?: string;
  manualRate?: boolean;
};

export const budgetTaxCountryOptions: Array<{ value: BudgetTaxCountry; label: string }> = [
  { value: 'MX', label: 'Mexico' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'CA', label: 'Canada' },
  { value: 'CO', label: 'Colombia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'INTL', label: 'Internacional / sin impuesto local' },
];

export const budgetTaxProfiles: BudgetTaxProfile[] = [
  { id: 'mx_iva_16', country: 'MX', label: 'IVA general 16%', rate: 0.16, shortName: 'IVA 16%' },
  { id: 'mx_iva_border_8', country: 'MX', label: 'IVA frontera 8%', rate: 0.08, shortName: 'IVA 8%' },
  { id: 'mx_zero_exempt', country: 'MX', label: 'Tasa 0% / exento', rate: 0, shortName: 'IVA 0%' },

  { id: 'co_iva_19', country: 'CO', label: 'IVA general 19%', rate: 0.19, shortName: 'IVA 19%' },
  { id: 'co_iva_5', country: 'CO', label: 'IVA reducido 5%', rate: 0.05, shortName: 'IVA 5%' },
  { id: 'co_zero_exempt', country: 'CO', label: 'Tasa 0% / excluido', rate: 0, shortName: 'IVA 0%' },

  { id: 'ca_gst_5', country: 'CA', label: 'GST federal 5%', rate: 0.05, shortName: 'GST 5%', region: 'AB/NT/NU/YT base' },
  { id: 'ca_bc_12', country: 'CA', label: 'BC GST + PST 12%', rate: 0.12, shortName: 'GST/PST 12%', region: 'BC' },
  { id: 'ca_mb_12', country: 'CA', label: 'MB GST + RST 12%', rate: 0.12, shortName: 'GST/RST 12%', region: 'MB' },
  { id: 'ca_on_13', country: 'CA', label: 'ON HST 13%', rate: 0.13, shortName: 'HST 13%', region: 'ON' },
  { id: 'ca_hst_15', country: 'CA', label: 'HST 15%', rate: 0.15, shortName: 'HST 15%', region: 'NB/NL/NS/PE' },
  { id: 'ca_qc_14975', country: 'CA', label: 'QC GST + QST 14.975%', rate: 0.14975, shortName: 'GST/QST 14.975%', region: 'QC' },
  { id: 'ca_sk_11', country: 'CA', label: 'SK GST + PST 11%', rate: 0.11, shortName: 'GST/PST 11%', region: 'SK' },
  { id: 'ca_manual_special', country: 'CA', label: 'Canada especial / manual', rate: 0, shortName: 'Manual', manualRate: true },

  { id: 'us_manual_sales_tax', country: 'US', label: 'Sales tax estatal / local', rate: 0, shortName: 'Sales tax', manualRate: true },
  { id: 'us_no_tax', country: 'US', label: 'Sin sales tax', rate: 0, shortName: '0%' },

  { id: 'br_manual_consumption_tax', country: 'BR', label: 'Consumo Brasil manual', rate: 0, shortName: 'Manual', manualRate: true },
  { id: 'br_no_tax', country: 'BR', label: 'Sin impuesto recuperable', rate: 0, shortName: '0%' },

  { id: 'intl_no_tax', country: 'INTL', label: 'Sin impuesto local', rate: 0, shortName: '0%' },
  { id: 'intl_manual', country: 'INTL', label: 'Impuesto manual', rate: 0, shortName: 'Manual', manualRate: true },
];

const defaultProfileByCountry: Record<BudgetTaxCountry, string> = {
  MX: 'mx_iva_16',
  US: 'us_manual_sales_tax',
  CA: 'ca_gst_5',
  CO: 'co_iva_19',
  BR: 'br_manual_consumption_tax',
  INTL: 'intl_no_tax',
};

export function inferTaxCountryFromCurrency(currency: string): BudgetTaxCountry {
  switch (currency.toUpperCase()) {
    case 'MXN':
      return 'MX';
    case 'USD':
      return 'US';
    case 'CAD':
      return 'CA';
    case 'COP':
      return 'CO';
    case 'BRL':
      return 'BR';
    default:
      return 'INTL';
  }
}

export function getBudgetTaxProfiles(country: string): BudgetTaxProfile[] {
  return budgetTaxProfiles.filter(profile => profile.country === country);
}

export function getBudgetTaxProfile(profileId: string, country: string): BudgetTaxProfile | undefined {
  const profiles = getBudgetTaxProfiles(country);
  return profiles.find(profile => profile.id === profileId) ?? profiles[0];
}

export function getDefaultBudgetTaxProfile(country: BudgetTaxCountry): BudgetTaxProfile | undefined {
  return budgetTaxProfiles.find(profile => profile.id === defaultProfileByCountry[country]);
}

export function formatTaxRate(rate: number) {
  return `${roundTaxNumber(rate * 100)}%`;
}

export function taxRateToPercentInput(rate: number) {
  return String(roundTaxNumber(rate * 100));
}

export function calculateBudgetTaxAmount(baseAmount: number, rate: number, isTaxIncluded: boolean) {
  if (!Number.isFinite(baseAmount) || baseAmount <= 0 || !Number.isFinite(rate) || rate <= 0) return 0;
  const amount = isTaxIncluded
    ? baseAmount - (baseAmount / (1 + rate))
    : baseAmount * rate;
  return roundMoney(amount);
}

export function parsePercentInput(value: string) {
  const parsedValue = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsedValue) ? parsedValue / 100 : 0;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundTaxNumber(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
