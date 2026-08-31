export type PublicPlanHandoff = {
  selectedProductCodes: string[];
  billingInterval: 'MONTH' | 'YEAR';
  extraSeats: number;
  countryCode: string;
};

type BuildOptions = PublicPlanHandoff & {
  locale?: string;
};

export function buildPublicPlanSearch(options: BuildOptions) {
  const params = new URLSearchParams();
  params.set('source', 'plans');
  params.set('products', options.selectedProductCodes.join(','));
  params.set('interval', options.billingInterval);
  params.set('extraSeats', String(clampExtraSeats(options.extraSeats)));
  params.set('country', options.countryCode);
  if (options.locale) params.set('locale', options.locale);
  return params.toString();
}

export function parsePublicPlanSearch(
  search: string,
  availableProductCodes: readonly string[],
  launchCountries: readonly string[],
): PublicPlanHandoff | null {
  const params = new URLSearchParams(search);
  if (params.get('source') !== 'plans') return null;

  const available = new Set(availableProductCodes);
  const selectedProductCodes = (params.get('products') ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter((code, index, values) => available.has(code) && values.indexOf(code) === index);
  const requestedCountry = (params.get('country') ?? '').toUpperCase();

  return {
    selectedProductCodes,
    billingInterval: params.get('interval') === 'YEAR' ? 'YEAR' : 'MONTH',
    extraSeats: clampExtraSeats(Number(params.get('extraSeats')) || 0),
    countryCode: launchCountries.includes(requestedCountry)
      ? requestedCountry
      : launchCountries[0] ?? 'MX',
  };
}

function clampExtraSeats(value: number) {
  return Math.min(500, Math.max(0, Math.trunc(value)));
}
