export function formatSalesCurrency(value: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSalesDate(value: string) {
  if (!value) return '';

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatSalesNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value);
}

export function formatCommissionRate(value: number) {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)}%`;
}

export function calculateCommissionAmount(totalAmount: number, commissionRate: number) {
  return Math.round((totalAmount * commissionRate) / 100);
}
