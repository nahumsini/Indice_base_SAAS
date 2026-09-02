import type { SalesCatalogItem } from '../../types';
import { getProductSalesReadiness } from '../../utils/productSalesReadiness';

export type QuoteCatalogReadiness = 'readyForSales' | 'requiresReview' | 'notReadyForSales';

export function isProductReadyForQuote(product: SalesCatalogItem) {
  return getProductSalesReadiness(product).status === 'READY';
}

export function getProductCatalogReadiness(product: SalesCatalogItem): QuoteCatalogReadiness {
  const readiness = getProductSalesReadiness(product).status;
  if (readiness === 'READY') return 'readyForSales';
  if (readiness === 'REQUIRES_REVIEW') return 'requiresReview';
  return 'notReadyForSales';
}

export function productUsesInventory(product: SalesCatalogItem) {
  return Boolean(product.stockPrepared || product.warehousePrepared);
}

export function getProductMargin(product: SalesCatalogItem) {
  if (product.price <= 0) return 0;
  return Math.round(((product.price - product.cost) / product.price) * 100);
}
