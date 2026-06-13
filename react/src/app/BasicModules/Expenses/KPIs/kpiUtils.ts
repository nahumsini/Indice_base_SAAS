import type { FinanceCurrency } from '../types/finance-domain.types';
import type { FinanceLocale } from '../translations';

export const formatKpiCurrency = (amount: number, currency: FinanceCurrency = 'MXN', locale: FinanceLocale = 'en-CA') => (
  new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount)
);

export const formatCompactCurrency = (amount: number, currency: FinanceCurrency = 'MXN', locale: FinanceLocale = 'en-CA') => (
  new Intl.NumberFormat(locale, {
    compactDisplay: 'short',
    currency,
    maximumFractionDigits: 1,
    notation: Math.abs(amount) >= 100000 ? 'compact' : 'standard',
    style: 'currency',
  }).format(amount)
);

export const formatKpiPercent = (value: number) => `${value.toFixed(1)}%`;
