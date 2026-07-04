import { normalizeSalesCurrencyCode } from './salesCurrency';
import { getTodayIsoDate } from './salesCrmUtils';
import { getBusinessExchangeRatePerUsd, type BusinessExchangeRatesPerUsd } from '../../shared/businessCurrency';

const exchangeRateSource = 'global_preferred_currency_settings';

function roundCurrencyAmount(value: number) {
  return Number(value.toFixed(2));
}

function roundExchangeRate(value: number) {
  return Number(value.toFixed(8));
}

export function getSalesExchangeSnapshot(
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  date = getTodayIsoDate(),
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const source = normalizeSalesCurrencyCode(sourceCurrency);
  const target = normalizeSalesCurrencyCode(targetCurrency);
  const sourceRatePerUsd = getBusinessExchangeRatePerUsd(source, exchangeRatesPerUsd);
  const targetRatePerUsd = getBusinessExchangeRatePerUsd(target, exchangeRatesPerUsd);
  const exchangeRate = source === target
    ? 1
    : targetRatePerUsd / sourceRatePerUsd;

  return {
    sourceCurrency: source,
    targetCurrency: target,
    exchangeRate: roundExchangeRate(exchangeRate),
    exchangeRateDate: date,
    exchangeRateSource: source === target ? 'same_currency' : exchangeRateSource,
  };
}

export function convertSalesCurrencyAmount(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  date = getTodayIsoDate(),
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const snapshot = getSalesExchangeSnapshot(sourceCurrency, targetCurrency, date, exchangeRatesPerUsd);

  return {
    amount: roundCurrencyAmount((Number.isFinite(amount) ? amount : 0) * snapshot.exchangeRate),
    ...snapshot,
  };
}
