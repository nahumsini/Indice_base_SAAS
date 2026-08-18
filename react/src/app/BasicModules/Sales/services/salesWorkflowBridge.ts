import type {
  CreateProductInput,
  CreateQuoteInput,
  SalesCatalogItem,
  SalesContact,
  SalesOpportunity,
  SalesQuote,
  SalesQuoteItem,
  UpdateProductInput,
} from '../types';
import type { SaleLine, SaleRecordDraft } from '../Sales/types/salesTypes';
import type {
  SalesCommissionPreview,
  SalesInventoryAvailability,
  SalesWorkflowInventoryMovementDraft,
  SalesWorkflowQuoteLine,
  SalesWorkflowValidationCode,
  SalesWorkflowValidationResult,
} from '../types/salesWorkflow';

type BusinessScope = {
  businessUnitId: string;
  businessUnitName?: string;
  businessId: string;
  businessName?: string;
  warehouseId: string;
};

type QuoteToSaleInput = {
  quote: SalesQuote;
  products: SalesCatalogItem[];
  contact?: SalesContact;
  prospect?: SalesOpportunity;
  businessScope: BusinessScope;
  saleId: string;
  saleNumber?: string;
  saleDate: string;
  currency: string;
  sellerId?: string;
  commissionRate?: number;
};

type QuoteToSaleResult = {
  saleDraft: SaleRecordDraft;
  quotePatch: Pick<SalesQuote, 'status'>;
  prospectPatch?: Partial<SalesOpportunity>;
  inventoryMovementDrafts: SalesWorkflowInventoryMovementDraft[];
  commissionPreview: SalesCommissionPreview;
  validation: SalesWorkflowValidationResult;
};

type DirectSaleInput = {
  saleDraft: SaleRecordDraft;
  saleId: string;
};

function uniqueErrors(errors: SalesWorkflowValidationCode[]) {
  return Array.from(new Set(errors));
}

function findProduct(products: SalesCatalogItem[], item: SalesQuoteItem) {
  return products.find((product) => product.id === item.productId || product.sku === item.sku);
}

function calculateLineFinancials(item: SalesQuoteItem, unitCost: number) {
  const quantity = Math.max(Number(item.quantity) || 0, 0);
  const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
  const discountPercent = Math.min(Math.max(Number(item.discountPercent) || 0, 0), 100);
  const taxPercent = Math.max(Number(item.taxPercent) || 0, 0);
  const grossSubtotal = quantity * unitPrice;
  const discountAmount = grossSubtotal * (discountPercent / 100);
  const subtotal = Math.max(grossSubtotal - discountAmount, 0);
  const taxAmount = subtotal * (taxPercent / 100);
  const marginAmount = subtotal - (quantity * unitCost);

  return {
    quantity,
    unitPrice,
    discountPercent,
    taxPercent,
    grossSubtotal,
    discountAmount,
    subtotal,
    taxAmount,
    marginAmount,
  };
}

function mapQuoteLineToWorkflowLine(
  item: SalesQuoteItem,
  products: SalesCatalogItem[],
  businessScope: BusinessScope,
): SalesWorkflowQuoteLine {
  const product = findProduct(products, item);
  const unitCost = item.unitCost ?? product?.cost ?? 0;
  const line = calculateLineFinancials(item, unitCost);

  return {
    productId: item.productId,
    sku: item.sku,
    productName: item.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    unitCost,
    discountPercent: line.discountPercent,
    taxPercent: line.taxPercent,
    subtotal: item.subtotal ?? line.subtotal,
    marginAmount: item.marginAmount ?? line.marginAmount,
    businessUnitId: item.businessUnitId ?? businessScope.businessUnitId,
    businessId: item.businessId ?? businessScope.businessId,
    warehouseId: item.warehouseId ?? item.suggestedWarehouseId ?? businessScope.warehouseId,
    suggestedWarehouseId: item.suggestedWarehouseId ?? item.warehouseId ?? businessScope.warehouseId,
    availabilityStatus: item.availabilityStatus ?? 'pending_validation',
  };
}

export function prepareInventoryMovementDraft(
  line: Pick<SaleLine, 'productId' | 'quantity' | 'warehouseId' | 'businessUnitId' | 'businessId'>,
  saleId: string,
  index = 0,
): SalesWorkflowInventoryMovementDraft {
  // BACKEND_READY:
  // Replace this mock draft with POST /inventory-movements once backend endpoint exists.
  // Payload already matches the expected sale outbound movement contract.
  return {
    id: `MOV-DRAFT-${saleId}-${String(index + 1).padStart(2, '0')}`,
    productId: line.productId,
    quantity: line.quantity,
    warehouseId: line.warehouseId,
    businessUnitId: line.businessUnitId,
    businessId: line.businessId,
    movementType: 'SALE_OUT',
    referenceType: 'SALE',
    referenceId: saleId,
    status: 'PENDING',
  };
}

export function getInventoryAvailability({
  productId,
  businessUnitId,
  businessId,
  warehouseId,
  requestedQuantity,
}: {
  productId: string;
  businessUnitId: string;
  businessId: string;
  warehouseId: string;
  requestedQuantity: number;
}): SalesInventoryAvailability {
  // BACKEND_READY:
  // Replace this mock adapter with GET /inventory/availability once backend endpoint exists.
  // Product catalog remains separate from stock by business, location, and warehouse.
  const availableQuantity = 0;

  return {
    productId,
    businessUnitId,
    businessId,
    warehouseId,
    quantity: availableQuantity,
    reservedQuantity: 0,
    availableQuantity,
    status: requestedQuantity > 0 ? 'pending_validation' : 'unavailable',
  };
}

export function calculateCommissionPreview({
  sellerId,
  sellerName,
  totalAmount,
  commissionRate = 0,
}: {
  sellerId?: string;
  sellerName: string;
  totalAmount: number;
  commissionRate?: number;
}): SalesCommissionPreview {
  return {
    sellerId,
    sellerName,
    commissionRate,
    basisAmount: totalAmount,
    commissionAmount: Number(((Number(totalAmount) || 0) * ((Number(commissionRate) || 0) / 100)).toFixed(2)),
  };
}

export function validateSaleDraftForBackendReadiness(sale: SaleRecordDraft): SalesWorkflowValidationResult {
  const errors: SalesWorkflowValidationCode[] = [];

  if (!sale.customerName.trim()) errors.push('missingCustomer');
  if (!sale.businessUnitId) errors.push('missingBusinessUnit');
  if (!sale.businessId) errors.push('missingBusiness');
  if (!sale.warehouseId) errors.push('missingWarehouse');

  sale.saleLines.forEach((line) => {
    if (!line.productId) errors.push('missingProduct');
    if (!(Number(line.quantity) > 0)) errors.push('invalidQuantity');
    if (!(Number(line.unitPrice) > 0)) errors.push('missingUnitPrice');
    if (!line.warehouseId || line.warehouseId !== sale.warehouseId) errors.push('missingWarehouse');
    if (!line.businessUnitId || line.businessUnitId !== sale.businessUnitId) errors.push('missingBusinessUnit');
    if (!line.businessId || line.businessId !== sale.businessId) errors.push('missingBusiness');
    if (!line.availabilityStatus) errors.push('missingAvailability');
  });

  const unique = uniqueErrors(errors);

  return {
    valid: unique.length === 0,
    errors: unique,
  };
}

export function createSaleFromQuote({
  quote,
  products,
  contact,
  prospect,
  businessScope,
  saleId,
  saleNumber,
  saleDate,
  currency,
  sellerId,
  commissionRate = 0,
}: QuoteToSaleInput): QuoteToSaleResult {
  // BACKEND_READY:
  // Replace this mock adapter with POST /sales/from-quote once backend endpoint exists.
  // Payload preserves quote lines, customer context, business scope, margins, and movement drafts.
  const workflowLines = quote.items.map((item) => mapQuoteLineToWorkflowLine(item, products, businessScope));
  const saleLines: SaleLine[] = workflowLines.map((line, index) => {
    const movementDraftId = `MOV-DRAFT-${saleId}-${String(index + 1).padStart(2, '0')}`;

    return {
      id: `SLN-${saleId}-${String(index + 1).padStart(2, '0')}`,
      productId: line.productId,
      sku: line.sku,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      unitCost: line.unitCost,
      discountPercent: line.discountPercent,
      taxPercent: line.taxPercent,
      subtotal: line.subtotal,
      marginAmount: line.marginAmount,
      businessUnitId: line.businessUnitId,
      businessId: line.businessId,
      warehouseId: line.warehouseId ?? line.suggestedWarehouseId ?? '',
      inventoryMovementDraftId: movementDraftId,
      availabilityStatus: line.availabilityStatus,
    };
  });
  const inventoryMovementDrafts = saleLines.map((line, index) => prepareInventoryMovementDraft(line, saleId, index));
  const commissionPreview = calculateCommissionPreview({
    sellerId,
    sellerName: quote.assignedSeller,
    totalAmount: quote.total,
    commissionRate,
  });
  const marginTotal = saleLines.reduce((total, line) => total + line.marginAmount, 0);
  const saleDraft: SaleRecordDraft = {
    quoteId: quote.id,
    prospectId: quote.opportunityId,
    contactId: quote.clientId ?? contact?.id,
    customerId: quote.clientId ?? contact?.id,
    sellerId,
    quoteReference: quote.quoteNumber,
    saleDocumentReference: '',
    businessUnitId: businessScope.businessUnitId,
    businessUnitName: businessScope.businessUnitName,
    businessId: businessScope.businessId,
    businessName: businessScope.businessName,
    customerName: quote.clientName,
    sellerName: quote.assignedSeller,
    saleDate,
    saleNumber,
    totalAmount: quote.total,
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    taxTotal: quote.taxTotal,
    marginTotal,
    currency,
    paymentMethod: '',
    paymentReference: '',
    paymentEvidenceStatus: 'missing',
    commercialStatus: 'approved',
    financeStatus: 'pending',
    inventoryStatus: 'reserved',
    deliveryStatus: 'pending',
    commissionStatus: commissionPreview.commissionAmount > 0 ? 'calculated' : 'pending',
    inventoryMovementStatus: inventoryMovementDrafts.length ? 'pending' : 'not_generated',
    inventoryMovementReference: inventoryMovementDrafts[0]?.id ?? '',
    commissionRate,
    commissionAmount: commissionPreview.commissionAmount,
    commissionNotes: '',
    saleLines,
    notes: quote.notes ? `Generated from ${quote.quoteNumber}. ${quote.notes}` : `Generated from ${quote.quoteNumber}.`,
  };

  return {
    saleDraft,
    quotePatch: { status: 'Closed Won' },
    prospectPatch: prospect
      ? {
          stage: 'Won',
          status: 'Closed',
          probability: '100%',
          estimatedValue: String(quote.total),
          currency: quote.currency,
        }
      : undefined,
    inventoryMovementDrafts,
    commissionPreview,
    validation: validateSaleDraftForBackendReadiness(saleDraft),
  };
}

export function createDirectSale({ saleDraft }: DirectSaleInput) {
  // BACKEND_READY:
  // Replace this mock adapter with POST /sales once backend endpoint exists.
  // Payload already matches the expected backend contract for controlled direct sales.
  return {
    saleDraft,
    validation: validateSaleDraftForBackendReadiness(saleDraft),
  };
}

export function createProduct(product: CreateProductInput) {
  // BACKEND_READY:
  // Replace this mock adapter with POST /products once backend endpoint exists.
  return {
    product,
    inventorySyncMetadata: syncProductToInventory({ ...product, id: 'PENDING_PRODUCT_ID' }),
  };
}

export function updateProduct(productId: string, patch: UpdateProductInput) {
  // BACKEND_READY:
  // Replace this mock adapter with PATCH /products/:id once backend endpoint exists.
  return {
    productId,
    patch,
  };
}

export function syncProductToInventory(product: Pick<SalesCatalogItem, 'id' | 'sku' | 'name' | 'stockPrepared' | 'warehousePrepared'>) {
  // BACKEND_READY:
  // Replace this mock adapter with the product-to-inventory sync job once backend endpoint exists.
  return {
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    stockPrepared: product.stockPrepared,
    warehousePrepared: product.warehousePrepared,
    productIsCatalogOnly: true,
  };
}

export function createProspect(prospect: Omit<SalesOpportunity, 'id'>) {
  // BACKEND_READY:
  // Replace this mock adapter with POST /prospects once backend endpoint exists.
  return prospect;
}

export function convertProspectToContact(prospect: SalesOpportunity): Omit<SalesContact, 'id'> {
  // BACKEND_READY:
  // Replace this mock adapter with POST /contacts/from-prospect once backend endpoint exists.
  return {
    company: prospect.company,
    contactPerson: prospect.contactPerson,
    role: '',
    phone: prospect.phone,
    email: prospect.email,
    source: prospect.source,
    ownerUserCompanyId: prospect.ownerUserCompanyId,
    owner: prospect.owner,
    tags: ['Converted prospect'],
    notes: prospect.notes,
  };
}

export function createQuote(quote: CreateQuoteInput) {
  // BACKEND_READY:
  // Replace this mock adapter with POST /quotes once backend endpoint exists.
  return quote;
}

export function approveQuote(quoteId: string) {
  // BACKEND_READY:
  // Replace this mock adapter with PATCH /quotes/:id/status once backend endpoint exists.
  return {
    quoteId,
    status: 'Approved' as const,
  };
}
