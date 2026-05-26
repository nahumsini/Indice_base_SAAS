export type SalesProductType = 'Product' | 'Service' | 'Package' | 'Subscription' | 'Operational item';
export type SalesProductCategory =
  | 'Cleaning'
  | 'Technology'
  | 'Consulting'
  | 'Installation'
  | 'Hospitality'
  | 'Marketing'
  | 'Software'
  | 'Other';
export type SalesProductTaxCategory = 'Standard VAT' | 'Reduced VAT' | 'Zero rated' | 'Exempt' | 'Service tax';
export type SalesProductStatus = 'Active' | 'Draft' | 'Review' | 'Archived';
export type SalesProductVisibility = 'Internal' | 'Commercial' | 'POS ready' | 'Quote only';

export type SalesCatalogItem = {
  id: string;
  name: string;
  sku: string;
  category: SalesProductCategory;
  type: SalesProductType;
  description: string;
  price: number;
  cost: number;
  taxCategory: SalesProductTaxCategory;
  status: SalesProductStatus;
  visibility: SalesProductVisibility;
  thumbnailTone: 'blue' | 'aqua' | 'yellow' | 'coral' | 'graphite';
  stockPrepared: boolean;
  warehousePrepared: boolean;
  posPrepared: boolean;
  variantsPrepared: boolean;
  lastUpdated: string;
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
  'Other',
];
export const productTaxCategories: SalesProductTaxCategory[] = ['Standard VAT', 'Reduced VAT', 'Zero rated', 'Exempt', 'Service tax'];
export const productStatuses: SalesProductStatus[] = ['Active', 'Draft', 'Review', 'Archived'];
export const productVisibilities: SalesProductVisibility[] = ['Internal', 'Commercial', 'POS ready', 'Quote only'];
