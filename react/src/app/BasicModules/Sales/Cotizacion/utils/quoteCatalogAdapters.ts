import type { SalesCatalogItem } from '../../types';

export type QuoteCatalogReadiness = 'readyForSales' | 'requiresReview' | 'notReadyForSales';

export function isProductReadyForQuote(product: SalesCatalogItem) {
  const commercialVisibility = product.visibility === 'Commercial'
    || product.visibility === 'POS ready'
    || product.visibility === 'Quote only';

  return product.status === 'Active' && commercialVisibility && product.price > 0;
}

export function getProductCatalogReadiness(product: SalesCatalogItem): QuoteCatalogReadiness {
  if (isProductReadyForQuote(product)) {
    return 'readyForSales';
  }

  if (product.status === 'Active' || product.price > 0) {
    return 'requiresReview';
  }

  return 'notReadyForSales';
}

export function productUsesInventory(product: SalesCatalogItem) {
  return Boolean(product.stockPrepared || product.warehousePrepared);
}

export function getProductMargin(product: SalesCatalogItem) {
  if (product.price <= 0) {
    return 0;
  }

  return Math.round(((product.price - product.cost) / product.price) * 100);
}
