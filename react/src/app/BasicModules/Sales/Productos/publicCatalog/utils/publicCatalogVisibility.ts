import type { PublicCatalogItem } from '../types/publicCatalogTypes';

export function applyPublicCatalogPriceVisibility(
  items: PublicCatalogItem[],
  visibility: { showPrices: boolean; showWholesalePrices: boolean },
): PublicCatalogItem[] {
  if (visibility.showPrices && visibility.showWholesalePrices) return items;
  return items.map((item) => ({
    ...item,
    publicPrice: visibility.showPrices ? item.publicPrice : undefined,
    wholesalePrice: undefined,
    wholesaleMinQuantity: undefined,
  }));
}
