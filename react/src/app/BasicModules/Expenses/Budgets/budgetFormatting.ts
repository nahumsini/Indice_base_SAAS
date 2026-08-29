export function formatBudgetCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  }
}

export function formatBudgetDate(date: Date, locale: string) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
