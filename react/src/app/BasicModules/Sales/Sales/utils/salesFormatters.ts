import { defaultSalesCurrency, formatSalesCurrencyAmount, getSalesCurrencyLocale } from '../../utils/salesCurrency';

export function formatSalesCurrency(value: number, currency = defaultSalesCurrency) {
  if (!Number.isFinite(Number(value))) return '—';
  return formatSalesCurrencyAmount(Number(value), currency);
}

export function formatSalesDate(value: string, locale = 'es-MX') {
  if (!value) return '';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatSalesNumber(value: number) {
  return new Intl.NumberFormat(getSalesCurrencyLocale()).format(value);
}

export function formatCommissionRate(value: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${new Intl.NumberFormat(getSalesCurrencyLocale(), { maximumFractionDigits: 2 }).format(value)}%`;
}

export function formatCommissionMoney(value: number, currency: string) {
  if (!Number.isFinite(Number(value)) || !/^[A-Z]{3}$/.test(currency)) return '—';
  return new Intl.NumberFormat(getSalesCurrencyLocale(currency), {
    style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(value));
}
