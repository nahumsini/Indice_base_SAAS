import type { Product } from '../../shared/commercial/products';
import { QUICK_PRODUCTS_LIMIT } from '../constants/sale.constants';

export interface StockSignals {
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  topProduct?: Product;
}

/**
 * A POS catalog item is sellable when it is active and either does not track
 * inventory (for example, a service) or has available stock in the selected
 * warehouse. Keep this policy before the quick-product limit so zero-stock
 * rows cannot hide later sellable products.
 */
export function isProductAvailableForSale(product: Product) {
  return product.status === 'active'
    && (!product.useInventory || product.currentStock > 0);
}

export function getQuickProducts(products: Product[]) {
  return products
    .filter(isProductAvailableForSale)
    .slice(0, QUICK_PRODUCTS_LIMIT);
}

export function getProductCategories(products: Product[]) {
  const categories = new Set(
    products
      .filter(isProductAvailableForSale)
      .map((product) => product.department),
  );

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
