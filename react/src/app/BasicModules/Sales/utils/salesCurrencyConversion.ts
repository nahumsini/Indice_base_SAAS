import { defaultSalesCurrency, normalizeSalesCurrencyCode } from './salesCurrency';
import { getTodayIsoDate } from './salesCrmUtils';

const referenceRatesToMxn: Record<string, number> = {
  MXN: 1,
  CAD: 13.55,
  USD: 18.45,
  COP: 0.0046,
  BRL: 3.35,
};

const exchangeRateSource = 'local_daily_reference';

function roundCurrencyAmount(value: number) {
  return Number(value.toFixed(2));
}

function roundExchangeRate(value: number) {
  return Number(value.toFixed(8));
}

function getReferenceRateToMxn(currency: string) {
  return referenceRatesToMxn[currency] ?? referenceRatesToMxn[defaultSalesCurrency];
}

export function getSalesExchangeSnapshot(
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  date = getTodayIsoDate(),
) {
  const source = normalizeSalesCurrencyCode(sourceCurrency);
  const target = normalizeSalesCurrencyCode(targetCurrency);
  const exchangeRate = source === target
    ? 1
    : getReferenceRateToMxn(source) / getReferenceRateToMxn(target);

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
) {
  const snapshot = getSalesExchangeSnapshot(sourceCurrency, targetCurrency, date);

  return {
    amount: roundCurrencyAmount((Number.isFinite(amount) ? amount : 0) * snapshot.exchangeRate),
    ...snapshot,
  };
}
