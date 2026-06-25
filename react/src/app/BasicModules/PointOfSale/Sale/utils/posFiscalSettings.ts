import {
  findQuoteTaxPreset,
  getAutomaticCurrencyForTaxJurisdiction,
  getDefaultTaxJurisdictionForCurrency,
  getDefaultTaxPresetForJurisdiction,
  type QuoteTaxJurisdiction,
} from '../../../CommerceCore/taxCatalog';
import { defaultBusinessCurrency, normalizeBusinessCurrencyCode } from '../../../shared/businessCurrency';

export interface PosFiscalSettings {
  taxJurisdiction: QuoteTaxJurisdiction;
  taxPresetId: string;
  taxLabel: string;
  taxRate: number;
  currencyCode: string;
  isCustomRate: boolean;
}

export const posTaxJurisdictionLabels: Record<QuoteTaxJurisdiction, string> = {
  mx: 'Mexico',
  ca: 'Canada',
  us: 'Estados Unidos',
  co: 'Colombia',
  br: 'Brasil',
  eu: 'Union Europea',
  custom: 'Personalizado',
};

function normalizeTaxRate(value: unknown) {
  const rate = Number(value);
  return Number.isFinite(rate) ? Math.max(rate, 0) : 0;
}

export function createDefaultPosFiscalSettings(currencyCode?: string | null): PosFiscalSettings {
  const jurisdiction = getDefaultTaxJurisdictionForCurrency(currencyCode);
  const preset = getDefaultTaxPresetForJurisdiction(jurisdiction);
  const automaticCurrency = getAutomaticCurrencyForTaxJurisdiction(jurisdiction);

  return {
    taxJurisdiction: jurisdiction,
    taxPresetId: preset.id,
    taxLabel: preset.label,
    taxRate: preset.defaultRate,
    currencyCode: normalizeBusinessCurrencyCode(automaticCurrency ?? currencyCode, defaultBusinessCurrency),
    isCustomRate: preset.rateEditable,
  };
}

export function normalizePosFiscalSettings(
  value: Partial<PosFiscalSettings> | null | undefined,
  fallbackCurrency?: string | null,
): PosFiscalSettings {
  const fallback = createDefaultPosFiscalSettings(fallbackCurrency);
  const jurisdiction = value?.taxJurisdiction ?? fallback.taxJurisdiction;
  const requestedPreset = findQuoteTaxPreset(value?.taxPresetId);
  const preset = requestedPreset?.jurisdiction === jurisdiction
    ? requestedPreset
    : getDefaultTaxPresetForJurisdiction(jurisdiction);
  const automaticCurrency = getAutomaticCurrencyForTaxJurisdiction(jurisdiction);
  const currencyCode = normalizeBusinessCurrencyCode(value?.currencyCode ?? automaticCurrency ?? fallback.currencyCode);
  const rate = value?.isCustomRate || preset.rateEditable
    ? normalizeTaxRate(value?.taxRate ?? preset.defaultRate)
    : preset.defaultRate;

  return {
    taxJurisdiction: jurisdiction,
    taxPresetId: preset.id,
    taxLabel: String(value?.taxLabel ?? preset.label).trim() || preset.label,
    taxRate: rate,
    currencyCode,
    isCustomRate: Boolean(value?.isCustomRate ?? preset.rateEditable),
  };
}

export function getFiscalSummary(settings: PosFiscalSettings) {
  return `${settings.currencyCode} · ${settings.taxLabel}`;
}
