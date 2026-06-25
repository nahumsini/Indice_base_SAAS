import type { SalesProductCategory, SalesProductType } from '../../../types';

export type PublicCatalogContactMethod = 'whatsapp' | 'email' | 'phone' | 'website';
export type PublicCatalogAppliedPriceType = 'public' | 'wholesale';
export type PublicInventoryStatus = 'inStock' | 'lowStock' | 'madeToOrder' | 'noInventoryTracking' | 'serviceAvailability' | 'askAvailability';
export type PublicCatalogStatus = 'draft' | 'active';

export type PublicCatalogConfig = {
  id?: string;
  title: string;
  description: string;
  coverImageUrl: string;
  contactCtaLabel: string;
  contactMethod: PublicCatalogContactMethod;
  contactValue: string;
  showPrices: boolean;
  showWholesalePrices: boolean;
  showStockStatus: boolean;
  showItemTypeBadges: boolean;
  showCategories: boolean;
  allowCart: boolean;
  allowPurchaseRequest: boolean;
  showOnlinePaymentComingSoon: boolean;
  selectedCategoryIds: string[];
  selectedProductIds: string[];
  status?: PublicCatalogStatus;
  publicUrl?: string;
  publicAccessToken?: string;
  qrImageDataUrl?: string;
  updatedAt?: string;
};

export type PublicCatalogItem = {
  id: string;
  name: string;
  sku?: string;
  type: SalesProductType;
  category?: SalesProductCategory;
  description?: string;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  publicPrice?: number;
  wholesalePrice?: number;
  wholesaleMinQuantity?: number;
  currency?: string;
  usesInventory?: boolean;
  publicInventoryStatus: PublicInventoryStatus;
  readyForSales?: boolean;
};

export type PublicCatalogCartItem = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  appliedPriceType: PublicCatalogAppliedPriceType;
  currency?: string;
};

export type PublicCatalogRequest = {
  customerName: string;
  contact: string;
  preferredContactMethod: PublicCatalogContactMethod;
  message: string;
  cartItems: PublicCatalogCartItem[];
  estimatedTotal: number;
  sourcePublicAccessToken?: string;
};

export type PublicCatalogLink = {
  url: string;
  token: string;
  generatedAt: string;
};
