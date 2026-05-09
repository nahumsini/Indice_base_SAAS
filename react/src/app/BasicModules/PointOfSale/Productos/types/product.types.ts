export interface ProductComponent {
  productId: string;
  quantity: number;
}

export interface Product {
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
  // Inventory
  useInventory: boolean;
  currentStock: number;
  minStock: number;
  maxStock: number;
  // Composite Product
  isComposite: boolean;
  components?: ProductComponent[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProductStatus = 'active' | 'inactive';
export type SaleType = 'unit' | 'bulk' | 'package';
