export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type SupplierInvoiceStatus =
  | 'SUBMITTED'
  | 'MATCHED'
  | 'APPROVED_FOR_PAYMENT'
  | 'REJECTED';

export type PurchaseOrderItem = {
  id: number;
  productId: number;
  sku?: string | null;
  productName: string;
  quantity: number | string;
  receivedQuantity: number | string;
  pendingQuantity: number | string;
  unitCost: number | string;
  taxRate: number | string;
  lineSubtotal: number | string;
  lineTax: number | string;
  lineTotal: number | string;
};

export type PurchaseOrder = {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  warehouseId: number;
  warehouseName: string;
  providerId: number;
  providerName: string;
  providerEmail?: string | null;
  folio: string;
  status: PurchaseOrderStatus;
  currencyCode: string;
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  expectedDate?: string | null;
  orderedAt?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  items: PurchaseOrderItem[];
};

export type PurchaseOrderListResponse = {
  items: PurchaseOrder[];
  count: number;
};

export type ProductSupplier = {
  id: number;
  productId: number;
  productName: string;
  productSku?: string | null;
  providerId: number;
  providerName: string;
  providerSku?: string | null;
  costAmount: number | string;
  currencyCode: string;
  leadTimeDays?: number | null;
  minimumOrderQuantity: number | string;
  preferred: boolean;
  active: boolean;
  notes?: string | null;
  updatedAt?: string | null;
};

export type ProductSupplierListResponse = {
  items: ProductSupplier[];
  count: number;
};

export type ProviderOption = {
  id: number;
  name: string;
  email?: string | null;
  taxId?: string | null;
  paymentTermsDays?: number | null;
  status?: string | null;
};

export type ProviderListResponse = {
  providers: ProviderOption[];
  count: number;
};

export type PurchaseOrderCreatePayload = {
  providerId: number;
  warehouseId: number;
  currencyCode: string;
  expectedDate?: string | null;
  notes?: string | null;
  items: Array<{
    productId: number;
    sku?: string | null;
    productName?: string | null;
    quantity: number;
    unitCost: number;
    taxRate?: number;
  }>;
};

export type PurchaseOrderReceivePayload = {
  notes?: string | null;
  items: Array<{
    orderItemId: number;
    receivedQuantity: number;
  }>;
};

export type SupplierInvoice = {
  id: number;
  providerId: number;
  providerName: string;
  purchaseOrderId?: number | null;
  purchaseOrderFolio?: string | null;
  invoiceNumber: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  currencyCode: string;
  status: SupplierInvoiceStatus;
  documentUrl?: string | null;
  notes?: string | null;
  submittedByName?: string | null;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt?: string | null;
};

export type SupplierInvoiceListResponse = {
  items: SupplierInvoice[];
  count: number;
};

export type SupplierInvoicePayload = {
  providerId: number;
  purchaseOrderId?: number | null;
  invoiceNumber: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  notes?: string | null;
  documentUrl?: string | null;
  submittedByName?: string | null;
};
