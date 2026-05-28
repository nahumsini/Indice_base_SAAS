import type { SalesCatalogItem } from '../../types';
import type {
  SalesProductBaseUnit,
  SalesProductCategory,
  SalesProductPricingMode,
  SalesProductSaleUnit,
  SalesProductStatus,
  SalesProductTaxCategory,
  SalesProductType,
  SalesProductVisibility,
} from '../../types';

export type ProductView = 'table' | 'cards';

export type ProductSortColumn =
  | 'name'
  | 'sku'
  | 'category'
  | 'type'
  | 'price'
  | 'cost'
  | 'profit'
  | 'status'
  | 'lastUpdated';

export type ProductSortState = {
  columnId: ProductSortColumn;
  direction: 'asc' | 'desc';
};

export type ProductTypeCount = {
  type: SalesCatalogItem['type'];
  count: number;
};

export type ProductMediaDraft = {
  id: string;
  url: string;
  alt?: string;
  source: 'upload' | 'url';
};

export type ProductBundleDraft = {
  id: string;
  name: string;
  quantity: string;
  unit: SalesProductBaseUnit;
  notes: string;
};

export type ProductServiceUnit = 'Hour' | 'Session' | 'Project' | 'Visit' | 'Delivery' | 'Monthly service';
export type ProductSubscriptionFrequency = 'Monthly' | 'Quarterly' | 'Semiannual' | 'Annual';

export type ProductFormState = {
  name: string;
  sku: string;
  category: SalesProductCategory | (string & {});
  type: SalesProductType;
  price: string;
  cost: string;
  logisticsCost: string;
  additionalCost: string;
  desiredMarginPercentage: string;
  taxCategory: SalesProductTaxCategory;
  status: SalesProductStatus;
  visibility: SalesProductVisibility;
  barcode: string;
  generatedLabels: string[];
  imageUrl: string;
  imageAlt: string;
  galleryUrls: string;
  uploadedImages: ProductMediaDraft[];
  baseUnit: SalesProductBaseUnit;
  saleUnit: SalesProductSaleUnit;
  unitsPerSaleUnit: string;
  pricingMode: SalesProductPricingMode;
  saleUnitPrice: string;
  minimumSaleQuantity: string;
  saleIncrement: string;
  wholesalePrice: string;
  wholesaleMinimumQuantity: string;
  packagingBarcode: string;
  packagingNotes: string;
  bundleItems: ProductBundleDraft[];
  usesInventory: boolean;
  serviceUnit: string;
  serviceEstimatedDuration: string;
  serviceScopeNotes: string;
  serviceDeliveryNotes: string;
  subscriptionFrequency: string;
  subscriptionCycleLabel: string;
  subscriptionRenewalBehavior: string;
  subscriptionMinimumTerm: string;
  subscriptionCancellationNotes: string;
  operationalUseNotes: string;
  internalReference: string;
  description: string;
};
