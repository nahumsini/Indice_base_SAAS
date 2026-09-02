import type { ProductFormState } from '../../types/productosTypes';
import { deriveProductSalesReadiness } from '../../../utils/productSalesReadiness';

export type ProductUsageKey = 'sales' | 'pos' | 'inventory';
export type ProductReadinessKey = 'quoteReady' | 'posReady' | 'inventoryControlled' | 'requiresReview';

export function isReadyForSales(form: ProductFormState) {
  return form.visibility === 'Commercial' || form.visibility === 'POS ready' || form.visibility === 'Quote only';
}

export function isReadyForPos(form: ProductFormState) {
  return form.visibility === 'POS ready';
}

function getFormSalesReadiness(form: ProductFormState) {
  return deriveProductSalesReadiness({
    status: form.status,
    visibility: form.visibility,
    type: form.type,
    price: Number(form.price),
  });
}

export function getUsageReadiness(form: ProductFormState): Record<ProductUsageKey, boolean> {
  const salesReadiness = getFormSalesReadiness(form);
  return {
    sales: salesReadiness.readyForSales,
    pos: salesReadiness.readyForSales && isReadyForPos(form),
    inventory: form.usesInventory,
  };
}

export function getReadinessStates(form: ProductFormState): Record<ProductReadinessKey, boolean> {
  const hasName = Boolean(form.name.trim());
  const salesReadiness = getFormSalesReadiness(form);
  const salesChannelEnabled = isReadyForSales(form);
  const readyForPos = isReadyForPos(form);

  return {
    quoteReady: hasName && salesReadiness.readyForSales,
    posReady: hasName && salesReadiness.readyForSales && readyForPos,
    inventoryControlled: form.usesInventory,
    requiresReview: !hasName || (salesChannelEnabled && !salesReadiness.readyForSales),
  };
}
