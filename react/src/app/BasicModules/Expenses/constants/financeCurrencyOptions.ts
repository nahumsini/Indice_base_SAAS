export const FINANCE_CURRENCY_OPTIONS = ['MXN', 'USD', 'CAD', 'COP', 'BRL'] as const;

export type FinanceCurrencyOption = typeof FINANCE_CURRENCY_OPTIONS[number];

export const DEFAULT_FINANCE_CURRENCY: FinanceCurrencyOption = 'USD';

export const financeCurrencySelectOptions = FINANCE_CURRENCY_OPTIONS.map(currency => ({
  value: currency,
  label: currency,
}));

export function isFinanceCurrencyOption(value: string): value is FinanceCurrencyOption {
  return FINANCE_CURRENCY_OPTIONS.includes(value as FinanceCurrencyOption);
}
