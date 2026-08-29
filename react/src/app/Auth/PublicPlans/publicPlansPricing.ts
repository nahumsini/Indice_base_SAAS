import type { BillingSignupConfig } from '../../api/billingSignup';

export type PublicPlanPricing = {
  offerCode: string | null;
  selectedBasicCount: number;
  baseAmountCents: number | null;
  extraSeatUnitAmountCents: number | null;
  extraSeatsAmountCents: number | null;
  estimatedAmountCents: number | null;
  validSelection: boolean;
};

export function calculatePublicPlanPricing(
  config: BillingSignupConfig,
  selectedProductCodes: readonly string[],
  extraSeats: number,
  billingInterval: 'MONTH' | 'YEAR',
): PublicPlanPricing {
  const basicProducts = config.products.filter((product) => product.productType === 'BASIC');
  const selectedBasicCount = basicProducts.filter((product) => selectedProductCodes.includes(product.code)).length;
  const offerCode = offerCodeForCount(selectedBasicCount, basicProducts.length);
  const baseAmountCents = offerCode
    ? findPublishedPrice(config, offerCode, 'BASE', billingInterval)
    : null;
  const extraSeatUnitAmountCents = findPublishedPrice(config, 'extra_seat', 'ADDON', billingInterval);
  const normalizedExtraSeats = Math.max(0, Math.trunc(extraSeats));
  const extraSeatsAmountCents = extraSeatUnitAmountCents == null
    ? null
    : extraSeatUnitAmountCents * normalizedExtraSeats;
  const estimatedAmountCents = baseAmountCents == null || extraSeatsAmountCents == null
    ? null
    : baseAmountCents + extraSeatsAmountCents;

  return {
    offerCode,
    selectedBasicCount,
    baseAmountCents,
    extraSeatUnitAmountCents,
    extraSeatsAmountCents,
    estimatedAmountCents,
    validSelection: selectedBasicCount >= 1 && selectedBasicCount <= basicProducts.length,
  };
}

export function publishedTierAmount(
  config: BillingSignupConfig,
  basicCount: number,
  billingInterval: 'MONTH' | 'YEAR',
) {
  const availableBasicCount = config.products.filter((product) => product.productType === 'BASIC').length;
  const offerCode = offerCodeForCount(basicCount, availableBasicCount);
  return offerCode ? findPublishedPrice(config, offerCode, 'BASE', billingInterval) : null;
}

function offerCodeForCount(selectedCount: number, availableCount: number) {
  if (selectedCount < 1 || selectedCount > availableCount) return null;
  if (selectedCount >= 4) return 'basic_all';
  return `basic_${selectedCount}`;
}

function findPublishedPrice(
  config: BillingSignupConfig,
  billableCode: string,
  priceType: 'BASE' | 'ADDON',
  billingInterval: 'MONTH' | 'YEAR',
) {
  return config.prices.find((price) => (
    price.billableCode === billableCode
    && price.priceType === priceType
    && price.billingInterval === billingInterval
    && price.status === 'ACTIVE'
  ))?.unitAmountCents ?? null;
}

export function formatPublicPlanMoney(cents: number | null, currency: string, locale: string) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
