import type { AuthSessionResponse } from '../../api/auth.types';
import {
  businessCurrencyCodes, createBusinessDailyExchangeRateSettings, defaultBusinessCurrency,
  isBusinessCurrencyCode, normalizeBusinessExchangeRateSettings,
  type BusinessCurrencyCode, type BusinessExchangeRateSettings,
} from './businessCurrency';

export type BusinessCurrencyPreferences = {
  version: 1;
  preferredCurrency: BusinessCurrencyCode;
  exchangeRateSettings: BusinessExchangeRateSettings;
};

export const currencyPreferenceModule = 'system';
export const currencyPreferenceTab = 'business-currency';
export const currencyPreferenceActor = (session: AuthSessionResponse | null | undefined) => session
  ? `${session.company.id}:${session.user.id}` : null;

export const defaultBusinessCurrencyPreferences = (): BusinessCurrencyPreferences => ({
  version: 1, preferredCurrency: defaultBusinessCurrency,
  exchangeRateSettings: createBusinessDailyExchangeRateSettings(),
});

const record = (value: unknown): value is Record<string, unknown> => Boolean(value)
  && typeof value === 'object' && !Array.isArray(value);

// Unsupported or damaged account data must never be silently replaced with defaults.
export function parseBusinessCurrencyPreferences(value: unknown): BusinessCurrencyPreferences | null {
  if (!record(value) || value.version !== 1 || typeof value.preferredCurrency !== 'string'
    || !businessCurrencyCodes.includes(value.preferredCurrency as BusinessCurrencyCode)
    || !isBusinessCurrencyCode(value.preferredCurrency) || !record(value.exchangeRateSettings)) return null;
  const settings = value.exchangeRateSettings;
  if (!record(settings.ratesPerUsd) || !record(settings.metadata)) return null;
  const rates = settings.ratesPerUsd;
  if (rates.USD !== 1 || businessCurrencyCodes.some(code => typeof rates[code] !== 'number'
    || !Number.isFinite(rates[code]) || (rates[code] as number) <= 0)) return null;
  if (!['daily_reference', 'manual'].includes(String(settings.metadata.mode))
    || !['official_daily_reference', 'internal_daily_reference', 'manual_override'].includes(String(settings.metadata.source))) return null;
  return {
    version: 1, preferredCurrency: value.preferredCurrency as BusinessCurrencyCode,
    exchangeRateSettings: normalizeBusinessExchangeRateSettings(settings),
  };
}
