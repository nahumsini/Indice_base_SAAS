import type { ProductFormState } from '../../types/productosTypes';

export type ProductUsageKey = 'sales' | 'pos' | 'inventory';
export type ProductReadinessKey = 'quoteReady' | 'posReady' | 'inventoryControlled' | 'requiresReview';

export function isReadyForSales(form: ProductFormState) {
  return form.visibility === 'Commercial' || form.visibility === 'POS ready' || form.visibility === 'Quote only';
}

export function isReadyForPos(form: ProductFormState) {
  return form.visibility === 'POS ready';
}

export function getUsageReadiness(form: ProductFormState): Record<ProductUsageKey, boolean> {
  return {
    sales: isReadyForSales(form),
    pos: isReadyForPos(form),
    inventory: form.usesInventory,
  };
}

export function getReadinessStates(form: ProductFormState): Record<ProductReadinessKey, boolean> {
  const hasName = Boolean(form.name.trim());
  const hasFinalPrice = Number(form.price) > 0;
  const isActive = form.status === 'Active';
  const readyForSales = isReadyForSales(form);
  const readyForPos = isReadyForPos(form);

  return {
    quoteReady: hasName && hasFinalPrice && isActive && readyForSales,
    posReady: hasName && hasFinalPrice && isActive && readyForPos,
    inventoryControlled: form.usesInventory,
    requiresReview: !hasName || (readyForSales && !hasFinalPrice) || (readyForPos && !hasFinalPrice),
  };
}
