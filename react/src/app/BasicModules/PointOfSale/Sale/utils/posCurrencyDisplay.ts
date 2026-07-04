import {
  type BusinessExchangeRatesPerUsd,
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  getBusinessExchangeRatePerUsd,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';

export function convertPosDisplayCurrencyAmount(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const source = normalizeBusinessCurrencyCode(sourceCurrency);
  const target = normalizeBusinessCurrencyCode(targetCurrency);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (source === target) {
    return safeAmount;
  }

  const sourceRatePerUsd = getBusinessExchangeRatePerUsd(source, exchangeRatesPerUsd);
  const targetRatePerUsd = getBusinessExchangeRatePerUsd(target, exchangeRatesPerUsd);

  return Number((safeAmount * (targetRatePerUsd / sourceRatePerUsd)).toFixed(2));
}

export function formatPosDisplayCurrency(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const target = normalizeBusinessCurrencyCode(targetCurrency);
  return formatBusinessCurrencyAmount(
    convertPosDisplayCurrencyAmount(amount, sourceCurrency, target, exchangeRatesPerUsd),
    target,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );
}
