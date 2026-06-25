import {
  createCustomTaxPreset,
  findQuoteTaxPreset,
  getDefaultTaxPresetForJurisdiction,
  getTaxPresetsForJurisdiction,
  quoteTaxJurisdictions,
  quoteTaxPresets,
  type QuoteTaxJurisdiction,
  type QuoteTaxPreset,
} from '../Sales/Cotizacion/utils/quoteTaxCatalog';

export {
  createCustomTaxPreset,
  findQuoteTaxPreset,
  getDefaultTaxPresetForJurisdiction,
  getTaxPresetsForJurisdiction,
  quoteTaxJurisdictions,
  quoteTaxPresets,
};
export type { QuoteTaxJurisdiction, QuoteTaxPreset };

const automaticCurrencyByJurisdiction: Record<Exclude<QuoteTaxJurisdiction, 'custom'>, string> = {
  mx: 'MXN',
  ca: 'CAD',
  us: 'USD',
  co: 'COP',
  br: 'BRL',
  eu: 'EUR',
};

const jurisdictionByCurrency: Partial<Record<string, QuoteTaxJurisdiction>> = {
  MXN: 'mx',
  CAD: 'ca',
  USD: 'us',
  COP: 'co',
  BRL: 'br',
  EUR: 'eu',
};

export function getAutomaticCurrencyForTaxJurisdiction(jurisdiction: QuoteTaxJurisdiction) {
  return jurisdiction === 'custom' ? null : automaticCurrencyByJurisdiction[jurisdiction];
}

export function getDefaultTaxJurisdictionForCurrency(currencyCode?: string | null): QuoteTaxJurisdiction {
  const normalizedCurrency = String(currencyCode ?? '').trim().toUpperCase();
  return jurisdictionByCurrency[normalizedCurrency] ?? 'mx';
}
