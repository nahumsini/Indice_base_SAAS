export type SalesAvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'pending_validation';

export type SalesWorkflowQuoteLine = {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
  marginAmount: number;
  businessUnitId: string;
  businessId: string;
  warehouseId?: string;
  suggestedWarehouseId?: string;
  availabilityStatus: SalesAvailabilityStatus;
};

export type SalesWorkflowSaleLine = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
  marginAmount: number;
  businessUnitId: string;
  businessId: string;
  warehouseId: string;
  inventoryMovementDraftId?: string;
  availabilityStatus: SalesAvailabilityStatus;
};

export type SalesWorkflowInventoryMovementDraft = {
  id: string;
  productId: string;
  quantity: number;
  warehouseId: string;
  businessUnitId: string;
  businessId: string;
  movementType: 'SALE_OUT';
  referenceType: 'SALE';
  referenceId: string;
  status: 'PENDING';
};

export type SalesInventoryAvailability = {
  productId: string;
  businessUnitId: string;
  businessId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  status: SalesAvailabilityStatus;
};

export type SalesCommissionPreview = {
  sellerId?: string;
  sellerName: string;
  commissionRate: number;
  commissionAmount: number;
  basisAmount: number;
};

export type SalesWorkflowValidationCode =
  | 'missingCustomer'
  | 'missingBusinessUnit'
  | 'missingBusiness'
  | 'missingLines'
  | 'invalidTotal'
  | 'missingProduct'
  | 'invalidQuantity'
  | 'missingUnitPrice'
  | 'missingWarehouse'
  | 'missingAvailability'
  | 'quoteNotApproved';

export type SalesWorkflowValidationResult = {
  valid: boolean;
  errors: SalesWorkflowValidationCode[];
};
