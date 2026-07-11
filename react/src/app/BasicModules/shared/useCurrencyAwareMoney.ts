import { useCallback, useMemo } from 'react';
import {
  convertBusinessCurrencyAmount,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
  type BusinessCurrencyCode,
} from './businessCurrency';
import { usePreferredBusinessCurrency } from './BusinessCurrencyContext';

export interface NativeCurrencyAmount {
  amount: number;
  currency: string;
}

const moneyFormatOptions: Intl.NumberFormatOptions = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
};

export function useCurrencyAwareMoney() {
  const {
    exchangeRateMetadata,
    exchangeRatesPerUsd,
    preferredCurrency,
  } = usePreferredBusinessCurrency();

  const convertToPreferred = useCallback((amount: number, nativeCurrency?: string | null) => (
    convertBusinessCurrencyAmount(
      amount,
      normalizeBusinessCurrencyCode(nativeCurrency, preferredCurrency),
      preferredCurrency,
      exchangeRatesPerUsd,
    )
  ), [exchangeRatesPerUsd, preferredCurrency]);

  const formatPreferred = useCallback((amount: number, nativeCurrency?: string | null) => (
    formatBusinessCurrencyAmount(
      convertToPreferred(amount, nativeCurrency),
      preferredCurrency,
      moneyFormatOptions,
    )
  ), [convertToPreferred, preferredCurrency]);

  const formatNative = useCallback((amount: number, nativeCurrency?: string | null) => {
    const currency = normalizeBusinessCurrencyCode(nativeCurrency, preferredCurrency);
    return formatBusinessCurrencyAmount(amount, currency, moneyFormatOptions);
  }, [preferredCurrency]);

  const summarize = useCallback((amounts: NativeCurrencyAmount[]) => {
    const nativeTotals = amounts.reduce((totals, item) => {
      const currency = normalizeBusinessCurrencyCode(item.currency, preferredCurrency) as BusinessCurrencyCode;
      totals.set(currency, (totals.get(currency) ?? 0) + item.amount);
      return totals;
    }, new Map<BusinessCurrencyCode, number>());
    const preferredTotal = Array.from(nativeTotals.entries()).reduce(
      (total, [currency, amount]) => total + convertToPreferred(amount, currency),
      0,
    );

    return {
      nativeBreakdown: Array.from(nativeTotals.entries())
        .map(([currency, amount]) => formatNative(amount, currency))
        .join(' / '),
      preferredCurrency,
      preferredTotal,
      preferredTotalLabel: formatBusinessCurrencyAmount(preferredTotal, preferredCurrency, moneyFormatOptions),
    };
  }, [convertToPreferred, formatNative, preferredCurrency]);

  const rateContext = useMemo(() => ({
    effectiveDate: exchangeRateMetadata.sourceDate,
    hasWarnings: Boolean(exchangeRateMetadata.warnings?.length),
    label: exchangeRateMetadata.mode === 'manual' ? 'Tasa manual' : 'Tasa diaria',
    source: exchangeRateMetadata.sourceName ?? 'Referencia de divisas',
  }), [exchangeRateMetadata]);

  return {
    convertToPreferred,
    formatNative,
    formatPreferred,
    preferredCurrency,
    rateContext,
    summarize,
  };
}

