import type { Product } from '../../shared/commercial/products';
import { QUICK_PRODUCTS_LIMIT } from '../constants/sale.constants';

export interface StockSignals {
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  topProduct?: Product;
}

export function getQuickProducts(products: Product[]) {
  return products
    .filter((product) => product.status === 'active')
    .slice(0, QUICK_PRODUCTS_LIMIT);
}

export function getProductCategories(products: Product[]) {
  const categories = new Set(products.map((product) => product.department));

  return ['all', ...Array.from(categories)];
}

export function filterQuickProducts(quickProducts: Product[], selectedCategory: string) {
  if (selectedCategory === 'all') {
    return quickProducts;
  }

  return quickProducts.filter((product) => product.department === selectedCategory);
}

export function getStockSignals(products: Product[]): StockSignals {
  const lowStockProducts = products.filter(
    (product) => product.status === 'active'
      && product.useInventory
      && product.currentStock <= product.minStock,
  );
  const outOfStockProducts = lowStockProducts.filter((product) => product.currentStock <= 0);
  const topProduct = products.find((product) => product.status === 'active');

  return {
    lowStockProducts,
    outOfStockProducts,
    topProduct,
  };
}

export function getProductStockState(product?: Product) {
  const hasLowStock = Boolean(product?.useInventory && product.currentStock <= product.minStock);
  const isOutOfStock = Boolean(product?.useInventory && product.currentStock <= 0);

  return {
    hasLowStock,
    isOutOfStock,
  };
}
