export type SalesProductType = 'Product' | 'Service' | 'Package' | 'Subscription' | 'Operational item';
export type SalesProductCategory =
  | 'Cleaning'
  | 'Technology'
  | 'Consulting'
  | 'Installation'
  | 'Hospitality'
  | 'Marketing'
  | 'Software'
  | 'Operations'
  | 'Finance'
  | 'Human Resources'
  | 'Sales'
  | 'Training'
  | 'Maintenance'
  | 'Logistics'
  | 'Food and beverage'
  | 'Retail'
  | 'Health'
  | 'Education'
  | 'Construction'
  | 'Real estate'
  | 'Legal'
  | 'Design'
  | 'Security'
  | 'Equipment'
  | 'Supplies'
  | 'Licenses'
  | 'Memberships'
  | 'Other';
export type SalesProductTaxCategory = 'Standard VAT' | 'Reduced VAT' | 'Zero rated' | 'Exempt' | 'Service tax';
export type SalesProductStatus = 'Active' | 'Inactive' | 'Draft';
export type SalesProductVisibility = 'Internal' | 'Commercial' | 'POS ready' | 'Quote only';
export type SalesProductBaseUnit = 'Piece' | 'Kilogram' | 'Liter' | 'Meter' | 'Hour' | 'Service' | 'Set';
export type SalesProductSaleUnit = 'Unit' | 'Box' | 'Package' | 'Lot' | 'Kit' | 'Pallet';
export type SalesProductPricingMode = 'Per base unit' | 'Per sale unit' | 'Per lot';

export type SalesProductImage = {
  id: string;
  url: string;
  alt?: string;
  objectKey?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

export type SalesProductBundleItem = {
  id: string;
  name: string;
  quantity: number;
  unit: SalesProductBaseUnit;
  notes?: string;
};

export type SalesProductPackaging = {
  baseUnit: SalesProductBaseUnit;
  saleUnit: SalesProductSaleUnit;
  unitsPerSaleUnit: number;
  pricingMode: SalesProductPricingMode;
  saleUnitPrice?: number;
  minimumSaleQuantity?: number;
  saleIncrement?: number;
  wholesalePrice?: number;
  wholesaleMinimumQuantity?: number;
  barcode?: string;
  notes?: string;
  bundleItems?: SalesProductBundleItem[];
};

export type SalesCatalogItem = {
  id: string;
  backendId?: number;
  productCode?: string;
  name: string;
  sku: string;
  category: SalesProductCategory;
  type: SalesProductType;
  description: string;
  price: number;
  cost: number;
  currency?: string;
  taxCategory: SalesProductTaxCategory;
  status: SalesProductStatus;
  visibility: SalesProductVisibility;
  barcode?: string;
  generatedLabels?: string[];
  imageUrl?: string;
  imageAlt?: string;
  gallery?: SalesProductImage[];
  packaging?: SalesProductPackaging;
  thumbnailTone: 'blue' | 'aqua' | 'yellow' | 'coral' | 'graphite';
  stockPrepared: boolean;
  warehousePrepared: boolean;
  posPrepared: boolean;
  variantsPrepared: boolean;
  lastUpdated: string;
  filesCount?: number;
};

export const productTypes: SalesProductType[] = ['Product', 'Service', 'Package', 'Subscription', 'Operational item'];
export const productCategories: SalesProductCategory[] = [
  'Cleaning',
  'Technology',
  'Consulting',
  'Installation',
  'Hospitality',
  'Marketing',
  'Software',
  'Operations',
  'Finance',
  'Human Resources',
  'Sales',
  'Training',
  'Maintenance',
  'Logistics',
  'Food and beverage',
  'Retail',
  'Health',
  'Education',
  'Construction',
  'Real estate',
  'Legal',
  'Design',
  'Security',
  'Equipment',
  'Supplies',
  'Licenses',
  'Memberships',
  'Other',
];
export const productTaxCategories: SalesProductTaxCategory[] = ['Standard VAT', 'Reduced VAT', 'Zero rated', 'Exempt', 'Service tax'];
export const productStatuses: SalesProductStatus[] = ['Active', 'Inactive', 'Draft'];
export const productVisibilities: SalesProductVisibility[] = ['Internal', 'Commercial', 'POS ready', 'Quote only'];
export const productBaseUnits: SalesProductBaseUnit[] = ['Piece', 'Kilogram', 'Liter', 'Meter', 'Hour', 'Service', 'Set'];
export const productSaleUnits: SalesProductSaleUnit[] = ['Unit', 'Box', 'Package', 'Lot', 'Kit', 'Pallet'];
export const productPricingModes: SalesProductPricingMode[] = ['Per base unit', 'Per sale unit', 'Per lot'];
