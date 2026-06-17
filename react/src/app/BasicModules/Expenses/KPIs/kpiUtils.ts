import type { FinanceCurrency } from '../types/finance-domain.types';
import type { FinanceLocale } from '../translations';
import {
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  getBusinessCurrencyLocale,
} from '../../shared/businessCurrency';

export const formatKpiCurrency = (amount: number, currency: FinanceCurrency = defaultBusinessCurrency, locale: FinanceLocale = 'en-CA') => (
  formatBusinessCurrencyAmount(amount, currency, {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  })
);

export const formatCompactCurrency = (amount: number, currency: FinanceCurrency = defaultBusinessCurrency, locale: FinanceLocale = 'en-CA') => (
  new Intl.NumberFormat(locale || getBusinessCurrencyLocale(currency), {
    compactDisplay: 'short',
    currency,
    maximumFractionDigits: 1,
    notation: Math.abs(amount) >= 100000 ? 'compact' : 'standard',
    style: 'currency',
  }).format(amount)
);

export const formatKpiPercent = (value: number) => `${value.toFixed(1)}%`;
