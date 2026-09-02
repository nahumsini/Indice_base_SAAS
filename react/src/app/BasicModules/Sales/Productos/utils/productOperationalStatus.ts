import type { SalesCatalogItem } from '../../types';
import { getProductSalesReadiness } from '../../utils/productSalesReadiness';
import { getProductGalleryImages } from './productImages';

export type ProductAvailabilityKey = 'sales' | 'pos' | 'inventory' | 'internal';
export type ProductHealthKey = 'missingCategory' | 'missingImage' | 'missingPrice' | 'notReadyForSales' | 'lowMargin' | 'requiresReview';

export function getProductProfit(product: SalesCatalogItem) {
  return Math.max(product.price - product.cost, 0);
}

export function getProductInventoryValue(product: SalesCatalogItem) {
  return product.stockPrepared || product.warehousePrepared ? product.cost : 0;
}

export function getProductMarginValue(product: SalesCatalogItem) {
  if (product.price <= 0) return 0;
  return Math.round(((product.price - product.cost) / product.price) * 100);
}

export function getProductAvailability(product: SalesCatalogItem): ProductAvailabilityKey[] {
  const availability: ProductAvailabilityKey[] = [];
  const isInternal = product.type === 'Operational item' || product.visibility === 'Internal';
  if (getProductSalesReadiness(product).status === 'READY') availability.push('sales');
  if (product.posPrepared || product.visibility === 'POS ready') availability.push('pos');
  if (product.stockPrepared || product.warehousePrepared) availability.push('inventory');
  if (isInternal || availability.length === 0) availability.push('internal');
  return Array.from(new Set(availability));
}

export function getProductHealthWarnings(product: SalesCatalogItem): ProductHealthKey[] {
  const warnings: ProductHealthKey[] = [];
  const hasImage = getProductGalleryImages(product).length > 0;
  const margin = getProductMarginValue(product);
  const availability = getProductAvailability(product);
  if (!product.category) warnings.push('missingCategory');
  if (!hasImage) warnings.push('missingImage');
  if (product.price <= 0) warnings.push('missingPrice');
  if (!availability.includes('sales') && product.type !== 'Operational item') warnings.push('notReadyForSales');
  if (product.price > 0 && margin < 20) warnings.push('lowMargin');
  if (warnings.length > 0) warnings.push('requiresReview');
  return Array.from(new Set(warnings));
}
