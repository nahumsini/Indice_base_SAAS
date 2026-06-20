export function formatSaleCurrency(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);
}
