import {
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';

const referenceRatesToMxn: Record<string, number> = {
  MXN: 1,
  CAD: 13.55,
  USD: 18.45,
  COP: 0.0046,
  BRL: 3.35,
};

function getReferenceRateToMxn(currency: string) {
  return referenceRatesToMxn[currency] ?? referenceRatesToMxn[defaultBusinessCurrency];
}

export function convertPosDisplayCurrencyAmount(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
) {
  const source = normalizeBusinessCurrencyCode(sourceCurrency);
  const target = normalizeBusinessCurrencyCode(targetCurrency);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (source === target) {
    return safeAmount;
  }

  return Number((safeAmount * (getReferenceRateToMxn(source) / getReferenceRateToMxn(target))).toFixed(2));
}

export function formatPosDisplayCurrency(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
) {
  const target = normalizeBusinessCurrencyCode(targetCurrency);
  return formatBusinessCurrencyAmount(
    convertPosDisplayCurrencyAmount(amount, sourceCurrency, target),
    target,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );
}
