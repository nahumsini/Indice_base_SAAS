export function formatBillingMoney(
  cents: number | null,
  currency: string,
  locale: string,
) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(cents / 100);
}

export function formatBillingDate(
  value: string | null | undefined,
  locale: string,
  fallback = '—',
) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
