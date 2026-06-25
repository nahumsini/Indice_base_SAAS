export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partiallyReceived' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  folio: string;
  supplierName: string;
  businessUnitId: string;
  businessId: string;
  businessUnitName: string;
  businessName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxes: number;
  total: number;
  expectedDate: Date;
  status: PurchaseOrderStatus;
  createdAt: Date;
  createdBy: string;
}
