export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'IN_REVIEW'
  | 'NEEDS_CLARIFICATION'
  | 'APPROVED'
  | 'ISSUED'
  | 'SENT'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'INVOICED'
  | 'VALIDATED_FOR_PAYMENT'
  | 'SCHEDULED_FOR_PAYMENT'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED';

export type PurchaseOrderOrigin =
  | 'INDICE'
  | 'SUPPLIER_KIOSK'
  | 'POS_REPLENISHMENT'
  | 'SALES'
  | 'IMPORT';

export type SupplierInvoiceStatus =
  | 'SUBMITTED'
  | 'MATCHED'
  | 'APPROVED_FOR_PAYMENT'
  | 'REJECTED';

export type SupplierSubmissionStatus =
  | 'SUPPLIER_DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_CLARIFICATION'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_PURCHASE_ORDER';

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
  origin?: PurchaseOrderOrigin | null;
  sourceSubmissionId?: number | null;
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

export type SupplierSubmissionItem = {
  id: number;
  productId?: number | null;
  providerSku?: string | null;
  productName: string;
  productDescription?: string | null;
  imageUrl?: string | null;
  quantity: number | string;
  unitCost: number | string;
  taxRate: number | string;
  lineSubtotal: number | string;
  lineTax: number | string;
  lineTotal: number | string;
  leadTimeDays?: number | null;
  minimumOrderQuantity?: number | string | null;
  status: SupplierSubmissionStatus;
  reviewNote?: string | null;
};

export type SupplierSubmission = {
  id: number;
  companyId: number;
  providerId: number;
  providerName: string;
  providerEmail?: string | null;
  portalAccessId?: number | null;
  submissionNumber: string;
  status: SupplierSubmissionStatus;
  currencyCode: string;
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  submittedAt?: string | null;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  convertedPurchaseOrderId?: number | null;
  notes?: string | null;
  createdAt?: string | null;
  items: SupplierSubmissionItem[];
};

export type SupplierSubmissionListResponse = {
  items: SupplierSubmission[];
  count: number;
};

export type SupplierPortalAccessStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'REVOKED';

export type SupplierPortalAccess = {
  id: number;
  providerId: number;
  providerName: string;
  providerEmail?: string | null;
  portalCode: string;
  portalUrl: string;
  status: SupplierPortalAccessStatus;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  personalPinCreated?: boolean;
};

export type SupplierPortalAccessListResponse = {
  items: SupplierPortalAccess[];
  count: number;
};

export type SupplierPortalAccessPayload = {
  providerId: number;
  portalCode?: string | null;
  pin: string;
  status?: SupplierPortalAccessStatus;
  expiresAt?: string | null;
};

export type SupplierPortalAccessStatusPayload = {
  status: SupplierPortalAccessStatus;
};

export type SupplierPortalAccessPinPayload = {
  pin: string;
};

export type SupplierPortalKioskDefinition = {
  id: number;
  companyId: number;
  ownerModule: string;
  kioskType: string;
  legacyReferenceId: number;
  code: string;
  name: string;
  description?: string | null;
  status: SupplierPortalAccessStatus;
  accessLevel: string;
  accessMethods: string[];
  unitId?: number | null;
  unitName?: string | null;
  businessId?: number | null;
  businessName?: string | null;
  locationId?: number | null;
  expiresAt?: string | null;
  publicTokenHint?: string | null;
  configurationVersion: number;
  adapterVersion: number;
  lastActivityAt?: string | null;
  riskSignals: string[];
};

export type SupplierPortalKioskConfigurationPayload = {
  name: string;
  expiresAt: string | null;
};

export type SupplierPortalKioskGrant = {
  id: number;
  identityType: string;
  identityId: number;
  capabilityKey: string;
  status: 'ACTIVE' | 'REVOKED';
  source: string;
  createdAt: string;
};

export type SupplierPortalKioskAuditEvent = {
  eventId: string;
  requestId?: string;
  actionId?: string;
  sessionId?: string;
  eventType: string;
  outcome: string;
  actorType?: string;
  actorId?: number;
  capability?: string;
  moduleReference?: string;
  moduleRecordType?: string;
  moduleRecordId?: number;
  source?: string;
  createdAt: string;
};

export type SupplierPortalCatalogProduct = {
  productId: number;
  productName: string;
  productSku?: string | null;
  providerSku?: string | null;
  costAmount: number | string;
  currencyCode: string;
  leadTimeDays?: number | null;
  minimumOrderQuantity?: number | string | null;
};

export type SupplierPortalContextResponse = {
  portalAccessId?: number;
  portalCode?: string;
  providerId?: number;
  providerName: string;
  providerEmail?: string | null;
  kioskName?: string | null;
  companyName?: string | null;
  unitName?: string | null;
  businessName?: string | null;
  status: SupplierPortalAccessStatus;
  catalogProducts: SupplierPortalCatalogProduct[];
};

export type SupplierPortalBootstrapResponse = {
  csrfToken: string;
  expiresAt?: string | null;
  inactivityTimeoutSeconds?: number;
  portalCode?: string;
  status: SupplierPortalAccessStatus;
};

export type SupplierPortalSessionResponse = {
  context: SupplierPortalContextResponse;
  csrfToken: string;
  expiresAt?: string | null;
  sessionId: string;
  sessionToken: string;
};

export type SupplierPortalSessionCredentials = Pick<
  SupplierPortalSessionResponse,
  'csrfToken' | 'sessionId' | 'sessionToken'
>;

/** Minimal receipt exposed by the public supplier portal after a proposal is accepted. */
export type SupplierPortalSubmissionReceipt = {
  submissionNumber: string;
  status: SupplierSubmissionStatus;
  submittedAt?: string | null;
};

/** Minimal receipt exposed by the public supplier portal after an invoice is accepted. */
export type SupplierPortalInvoiceReceipt = {
  invoiceNumber: string;
  status: SupplierInvoiceStatus;
  createdAt?: string | null;
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
  origin?: PurchaseOrderOrigin | null;
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

export type SupplierSubmissionPayload = {
  providerId: number;
  portalAccessId?: number | null;
  currencyCode: string;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  notes?: string | null;
  items: Array<{
    productId?: number | null;
    providerSku?: string | null;
    productName: string;
    productDescription?: string | null;
    imageUrl?: string | null;
    quantity: number;
    unitCost: number;
    taxRate?: number;
    leadTimeDays?: number | null;
    minimumOrderQuantity?: number | null;
  }>;
};

export type SupplierPortalSubmissionPayload = Omit<SupplierSubmissionPayload, 'providerId' | 'portalAccessId'>;

export type SupplierPortalInvoicePayload = {
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

export type SupplierPortalDocumentUploadPayload = {
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
};

export type SupplierPortalDocumentRegistrationPayload = {
  contentType: string;
  fileName: string;
  objectKey: string;
  sizeBytes: number;
};

export type SupplierPortalDocumentRegistrationResponse = {
  content_type: string;
  file_name: string;
  objectKey: string;
  object_key: string;
  registered: boolean;
  size_bytes: number;
};

export type SupplierInvoiceDocumentUploadPayload = {
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
};

export type SupplierPortalDocumentUploadResponse = {
  objectKey: string;
  object_key?: string;
  uploadUrl: string;
  upload_url?: string;
  expiresAt?: string;
  expires_at?: string;
  uploadHeaders?: Record<string, string>;
  upload_headers?: Record<string, string>;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type SupplierSubmissionReviewPayload = {
  status: SupplierSubmissionStatus;
  reviewNote?: string | null;
};

export type SupplierSubmissionConvertPayload = {
  warehouseId: number;
  expectedDate?: string | null;
  notes?: string | null;
};
