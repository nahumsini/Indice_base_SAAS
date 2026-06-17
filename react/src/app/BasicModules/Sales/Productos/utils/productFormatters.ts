import type { SalesCatalogItem } from '../../types';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { ProductSortColumn, ProductSortState } from '../types/productosTypes';
import { getProductProfit } from './productOperationalStatus';

export function formatProductCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

export function getProductMargin(product: SalesCatalogItem) {
  if (product.price <= 0) {
    return 0;
  }

  return Math.round(((product.price - product.cost) / product.price) * 100);
}

function getComparableValue(product: SalesCatalogItem, columnId: ProductSortColumn) {
  if (columnId === 'profit') {
    return getProductProfit(product);
  }

  return product[columnId];
}

export function sortProducts(products: SalesCatalogItem[], sortState: ProductSortState) {
  return [...products].sort((left, right) => {
    const leftValue = getComparableValue(left, sortState.columnId);
    const rightValue = getComparableValue(right, sortState.columnId);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return sortState.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
    }

    const result = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'es-MX', {
      numeric: true,
      sensitivity: 'base',
    });

    return sortState.direction === 'asc' ? result : -result;
  });
}
