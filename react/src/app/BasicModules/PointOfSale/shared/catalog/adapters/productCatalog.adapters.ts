import type { CatalogProduct } from '../types/product.types';

export function toCatalogProduct(product: CatalogProduct): CatalogProduct {
  return { ...product };
}

export function toCatalogProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.map(toCatalogProduct);
}
