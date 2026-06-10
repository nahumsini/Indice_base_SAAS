export interface CatalogProductComponent {
  productId: string;
  quantity: number;
}

export interface CatalogProduct {
  id: string;
  barcode: string;
  name: string;
  description: string;
  saleType: 'unit' | 'bulk' | 'package';
  costPrice: number;
  profitMargin: number;
  salePrice: number;
  wholesalePrice: number;
  department: string;
  supplierId?: string;
  taxRate: number;
  cfdi?: string;
  status: 'active' | 'inactive';
  useInventory: boolean;
  currentStock: number;
  minStock: number;
  maxStock: number;
  isComposite: boolean;
  components?: CatalogProductComponent[];
  createdAt: Date;
  updatedAt: Date;
}

export type Product = CatalogProduct;
export type ProductComponent = CatalogProductComponent;
export type ProductStatus = CatalogProduct['status'];
export type SaleType = CatalogProduct['saleType'];
