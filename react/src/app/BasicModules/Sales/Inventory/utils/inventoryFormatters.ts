import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';

export function formatInventoryCurrency(value: number) {
  return formatSalesCurrencyAmount(Number.isFinite(value) ? value : 0);
}

export function formatInventoryNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
