export const defaultBusinessCurrency = 'MXN';

export const businessCurrencyOptions = [
  { code: 'MXN', locale: 'es-MX' },
  { code: 'CAD', locale: 'en-CA' },
  { code: 'USD', locale: 'en-US' },
  { code: 'COP', locale: 'es-CO' },
  { code: 'BRL', locale: 'pt-BR' },
] as const;

export const businessCurrencyCodes = businessCurrencyOptions.map((option) => option.code) as Array<BusinessCurrencyCode>;

export type BusinessCurrencyCode = (typeof businessCurrencyOptions)[number]['code'];

const currencyLocaleByCode = new Map<string, string>(
  businessCurrencyOptions.map((option) => [option.code, option.locale]),
);

export function normalizeBusinessCurrencyCode(value?: string | null, fallback = defaultBusinessCurrency) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export function isBusinessCurrencyCode(value: string): value is BusinessCurrencyCode {
  const code = String(value ?? '').trim().toUpperCase();
  return businessCurrencyCodes.includes(code as BusinessCurrencyCode);
}

export function getBusinessCurrencyLocale(currencyCode?: string | null) {
  const code = normalizeBusinessCurrencyCode(currencyCode);
  return currencyLocaleByCode.get(code) ?? 'en-CA';
}

export function formatBusinessCurrencyAmount(
  value: number,
  currencyCode?: string | null,
  options: Intl.NumberFormatOptions = {},
) {
  const amount = Number.isFinite(value) ? value : 0;
  const currency = normalizeBusinessCurrencyCode(currencyCode);

  try {
    return new Intl.NumberFormat(getBusinessCurrencyLocale(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      ...options,
    }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-CA', options).format(amount)}`;
  }
}

export function formatBusinessCurrencyBreakdown<TItem>(
  items: TItem[],
  getAmount: (item: TItem) => number,
  getCurrency: (item: TItem) => string | null | undefined,
) {
  const totalsByCurrency = items.reduce<Map<string, number>>((totals, item) => {
    const currency = normalizeBusinessCurrencyCode(getCurrency(item));
    totals.set(currency, (totals.get(currency) ?? 0) + getAmount(item));
    return totals;
  }, new Map());

  if (totalsByCurrency.size === 0) {
    return formatBusinessCurrencyAmount(0);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => formatBusinessCurrencyAmount(total, currency))
    .join(' / ');
}
