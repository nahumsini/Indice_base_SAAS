import {
  businessCurrencyCodes,
  businessCurrencyOptions,
  defaultBusinessCurrency,
  isBusinessCurrencyCode,
  type BusinessCurrencyCode,
} from '../../shared/businessCurrency';

export const FINANCE_CURRENCY_OPTIONS = businessCurrencyCodes;

export type FinanceCurrencyOption = BusinessCurrencyCode;

export const DEFAULT_FINANCE_CURRENCY: FinanceCurrencyOption = defaultBusinessCurrency;

export const financeCurrencySelectOptions = businessCurrencyOptions.map((currency) => ({
  value: currency.code,
  label: currency.code,
}));

export function isFinanceCurrencyOption(value: string): value is FinanceCurrencyOption {
  return isBusinessCurrencyCode(value);
}
