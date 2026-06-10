import type { CatalogProduct } from '../types/product.types';

export function getActiveCatalogProducts(products: CatalogProduct[]) {
  return products.filter((product) => product.status === 'active');
}

export function findCatalogProductByBarcode(products: CatalogProduct[], barcode: string) {
  const normalizedBarcode = barcode.trim();
  return products.find((product) => product.barcode === normalizedBarcode && product.status === 'active') ?? null;
}
