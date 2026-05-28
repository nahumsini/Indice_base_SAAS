import type { SalesCatalogItem } from '../../types';
import type { ProductSortColumn, ProductSortState } from '../types/productosTypes';
import { getProductProfit } from './productOperationalStatus';

export function formatProductCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
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

    const result = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'es', {
      numeric: true,
      sensitivity: 'base',
    });

    return sortState.direction === 'asc' ? result : -result;
  });
}
