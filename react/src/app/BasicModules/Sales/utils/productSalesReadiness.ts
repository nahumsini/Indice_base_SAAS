import type {
  SalesCatalogItem,
  SalesReadiness,
  SalesReadinessReason,
} from '../types';

export type ProductSalesReadiness = {
  readyForSales: boolean;
  status: SalesReadiness;
  reasons: SalesReadinessReason[];
};

export function deriveProductSalesReadiness(product: Pick<SalesCatalogItem, 'status' | 'visibility' | 'type' | 'price'>): ProductSalesReadiness {
  const reasons: SalesReadinessReason[] = [];
  if (product.status === 'Draft') reasons.push('DRAFT');
  if (product.status === 'Inactive') reasons.push('INACTIVE');
  if (product.visibility === 'Internal') reasons.push('INTERNAL');
  if (product.type === 'Operational item') reasons.push('OPERATIONAL_ITEM');
  if (!(product.price > 0)) reasons.push('MISSING_PRICE');

  const hasBlockingReason = reasons.some((reason) => reason !== 'MISSING_PRICE');
  const status: SalesReadiness = hasBlockingReason
    ? 'NOT_READY'
    : reasons.includes('MISSING_PRICE')
      ? 'REQUIRES_REVIEW'
      : 'READY';

  return { readyForSales: status === 'READY', status, reasons };
}

export function getProductSalesReadiness(product: SalesCatalogItem): ProductSalesReadiness {
  const fallback = deriveProductSalesReadiness(product);
  const status = product.salesReadiness ?? fallback.status;
  const reasons = product.salesReadinessReasons ?? fallback.reasons;
  return {
    readyForSales: product.readyForSales ?? status === 'READY',
    status,
    reasons,
  };
}
