import type { PublicCatalogCartItem, PublicCatalogItem } from '../types/publicCatalogTypes';

export function getPublicCatalogUnitPrice(item: PublicCatalogItem, quantity: number) {
  if (
    item.wholesalePrice !== undefined
    && item.wholesaleMinQuantity !== undefined
    && quantity >= item.wholesaleMinQuantity
  ) {
    return {
      unitPrice: item.wholesalePrice,
      appliedPriceType: 'wholesale' as const,
    };
  }

  return {
    unitPrice: item.publicPrice ?? 0,
    appliedPriceType: 'public' as const,
  };
}

export function calculatePublicCatalogCartItem(item: PublicCatalogItem, cartItem: PublicCatalogCartItem) {
  const pricing = getPublicCatalogUnitPrice(item, cartItem.quantity);

  return {
    ...cartItem,
    ...pricing,
    lineTotal: pricing.unitPrice * cartItem.quantity,
  };
}

export function calculatePublicCatalogCartTotal(items: PublicCatalogItem[], cartItems: PublicCatalogCartItem[]) {
  return cartItems.reduce((total, cartItem) => {
    const item = items.find((candidate) => candidate.id === cartItem.itemId);
    return total + (item ? calculatePublicCatalogCartItem(item, cartItem).lineTotal : 0);
  }, 0);
}
