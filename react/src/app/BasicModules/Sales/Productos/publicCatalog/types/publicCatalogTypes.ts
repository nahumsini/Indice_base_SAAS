import type { SalesProductCategory, SalesProductType } from '../../../types';

export type PublicCatalogContactMethod = 'whatsapp' | 'email' | 'phone' | 'website';
export type PublicCatalogAppliedPriceType = 'public' | 'wholesale';
export type PublicInventoryStatus = 'inStock' | 'lowStock' | 'madeToOrder' | 'noInventoryTracking' | 'serviceAvailability' | 'askAvailability';
export type PublicCatalogStatus = 'draft' | 'active' | 'disabled' | 'revoked' | 'expired';

export type PublicCatalogImage = {
  url: string;
  alt?: string;
};

export type PublicCatalogConfig = {
  id?: string;
  backendId?: number;
  version?: number;
  companyName?: string;
  unitId?: number;
  businessId?: number;
  unitName?: string;
  businessName?: string;
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
  allowImageDownloads: boolean;
  showOnlinePaymentComingSoon: boolean;
  selectedCategoryIds: string[];
  selectedProductIds: string[];
  status?: PublicCatalogStatus;
  publicUrl?: string;
  publicAccessToken?: string;
  qrImageDataUrl?: string;
  updatedAt?: string;
  publicTokenHint?: string;
  expiresAt?: string;
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
  images?: PublicCatalogImage[];
  publicPrice?: number;
  wholesalePrice?: number;
  wholesaleMinQuantity?: number;
  currency?: string;
  usesInventory?: boolean;
  publicInventoryStatus: PublicInventoryStatus;
  readyForSales?: boolean;
  reservable?: boolean;
};

export type PublicCatalogAvailabilityDay = {
  date: string;
  status: 'available' | 'occupied';
};

export type PublicCatalogAvailability = {
  productId: number;
  month: string;
  sourceStatus: 'ready' | 'temporarilyUnavailable';
  stale: boolean;
  days: PublicCatalogAvailabilityDay[];
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
