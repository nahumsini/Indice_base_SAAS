import type {
  CustomerHealthStatus,
  CustomerRelationshipStatus,
  CustomerLifecycleSignals,
} from '../../utils/customerLifecycle';
import type {
  SalesAvailabilityStatus,
  SalesWorkflowInventoryMovementDraft,
  SalesWorkflowSaleLine,
} from '../../types/salesWorkflow';

export type CommercialStatus = 'pending_validation' | 'approved' | 'rejected' | 'cancelled';
export type FinanceStatus = 'pending' | 'approved' | 'rejected';
export type InventoryStatus = 'pending' | 'reserved' | 'approved' | 'unavailable';
export type DeliveryStatus = 'pending' | 'in_progress' | 'delivered';
export type CommissionStatus = 'pending' | 'calculated' | 'paid';
export type InventoryMovementStatus = 'not_generated' | 'pending' | 'approved' | 'completed';
export type PaymentEvidenceStatus = 'missing' | 'uploaded' | 'under_review' | 'approved' | 'rejected';
export type SalesPeriodFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';
export type SaleLineAvailabilityStatus = SalesAvailabilityStatus;
export type SaleLine = SalesWorkflowSaleLine;
export type SaleInventoryMovementDraft = SalesWorkflowInventoryMovementDraft;

export type SaleRecord = {
  id: string;
  saleNumber: string;
  quoteId?: string;
  prospectId?: string;
  contactId?: string;
  customerId?: string;
  sellerId?: string;
  quoteReference: string;
  saleDocumentReference?: string;
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  customerName: string;
  sellerName: string;
  saleDate: string;
  totalAmount: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  marginTotal: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  paymentEvidenceStatus: PaymentEvidenceStatus;
  commercialStatus: CommercialStatus;
  financeStatus: FinanceStatus;
  inventoryStatus: InventoryStatus;
  deliveryStatus: DeliveryStatus;
  commissionStatus: CommissionStatus;
  inventoryMovementStatus: InventoryMovementStatus;
  inventoryMovementReference: string;
  commissionRate: number;
  commissionAmount: number;
  commissionNotes: string;
  saleLines: SaleLine[];
  notes: string;
};

export type SaleRecordDraft = Omit<SaleRecord, 'id' | 'saleNumber' | 'commissionAmount'> & {
  saleNumber?: string;
  commissionAmount?: number;
};

export type SalesBusinessUnitOption = {
  id: string;
  name: string;
  code: string;
};

export type SalesBusinessOption = {
  id: string;
  name: string;
  code: string;
  businessUnitId: string;
  businessUnitName: string;
};

export type SalesOperationalContext = {
  legalName: string;
  fiscalAddress: string;
  taxIdentifier: string;
  currency: string;
  defaultWarehouse: string;
};

export type SalesFiltersState = {
  search: string;
  businessUnit: string;
  business: string;
  period: SalesPeriodFilter;
  seller: string;
  customer: string;
  commercialStatus: string;
  financeStatus: string;
  inventoryStatus: string;
  inventoryMovementStatus: string;
  commissionStatus: string;
  relationship: string;
  customerHealth: string;
  postSaleStatus: string;
};

export type SalesColumnId =
  | 'saleNumber'
  | 'customer'
  | 'seller'
  | 'total'
  | 'saleDate'
  | 'relationship'
  | 'customerHealth'
  | 'postSaleStatus'
  | 'commercialStatus'
  | 'financeStatus'
  | 'inventoryStatus'
  | 'inventoryMovement'
  | 'commission'
  | 'commissionStatus'
  | 'actions'
  | 'quoteReference'
  | 'paymentMethod'
  | 'paymentEvidence'
  | 'deliveryStatus'
  | 'commissionAmount'
  | 'movementReference';

export type SalesColumnConfig = {
  id: SalesColumnId;
  defaultVisible: boolean;
  locked?: boolean;
};

export type SalesMetrics = {
  totalSalesAmount: number;
  totalCommissions: number;
  averageTicket: number;
  salesCount: number;
  recurringRevenue: number;
  renewalRevenue: number;
  recoveredRevenue: number;
  customersAtRisk: number;
  pendingFinanceValidation: number;
  pendingInventoryMovement: number;
  deliveredSales: number;
  totalRecords: number;
};

export type SaleLifecycleSignals = CustomerLifecycleSignals;
export type SaleCustomerHealthStatus = CustomerHealthStatus;
export type SaleCustomerRelationshipStatus = CustomerRelationshipStatus;
