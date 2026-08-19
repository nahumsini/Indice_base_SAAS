import type { DigitalContract } from '../Contrato/types/digitalContractTypes';
import type {
  SalesCatalogItem,
  SalesContact,
  SalesOpportunity,
  SalesPostSaleCase,
  SalesQuote,
  SalesQuoteItem,
} from '../types';
import type { SaleRecord } from '../Sales/types/salesTypes';
import { defaultSalesCurrency, normalizeSalesCurrencyCode } from '../utils/salesCurrency';

type ApiRow = Record<string, unknown>;
type EntityWithBackendId = { id: string; backendId?: number };

const valueMap: Record<string, string> = {
  active: 'Active',
  approved: 'Approved',
  at_risk: 'At risk',
  cancelled: 'Cancelled',
  closed: 'Closed',
  closed_won: 'Closed Won',
  completed: 'Completed',
  contacted: 'Contacted',
  consulting: 'Consulting',
  cold: 'Cold',
  custom_contract: 'Custom contract',
  declined: 'Declined',
  draft: 'Draft',
  existing_customer: 'Existing customer',
  expired: 'Expired',
  exempt: 'Exempt',
  hot: 'Hot',
  in_service: 'In service',
  internal: 'Internal',
  internal_review: 'Internal review',
  low: 'Low',
  manual: 'Manual',
  medium: 'Medium',
  meeting: 'Meeting',
  negotiation: 'Negotiation',
  new: 'New',
  no_response: 'No response',
  not_generated: 'not_generated',
  not_qualified: 'Not qualified',
  not_requested: 'Not requested',
  on_hold: 'On hold',
  one_time_customer: 'One-time customer',
  operational_agreement: 'Operational agreement',
  operational_item: 'Operational item',
  other: 'Other',
  overdue: 'Overdue',
  paused: 'Paused',
  pending: 'pending',
  pending_follow_up: 'Pending follow-up',
  pending_signature: 'Pending signature',
  product: 'Product',
  proposal: 'Proposal',
  post_sale_opportunity: 'Post Sale Opportunity',
  qualified: 'Qualified',
  quote_only: 'Quote only',
  recurrent_customer: 'Recurrent customer',
  recurrent_post_sale: 'Recurrent post-sale',
  reduced_vat: 'Reduced VAT',
  referral: 'Referral',
  rejected: 'Rejected',
  renewal_agreement: 'Renewal agreement',
  renewal_customer: 'Renewal customer',
  renewal_soon: 'Renewal soon',
  sales_agreement: 'Sales agreement',
  sent: 'Sent',
  send_proposal: 'Send proposal',
  service: 'Service',
  service_agreement: 'Service agreement',
  service_tax: 'Service tax',
  signed: 'Signed',
  social_media: 'Social media',
  standard_post_sale: 'Standard post-sale',
  standard_vat: 'Standard VAT',
  subscription: 'Subscription',
  subscription_agreement: 'Subscription agreement',
  template_generated: 'Template generated',
  uploaded: 'Uploaded document',
  viewed: 'Viewed',
  waiting: 'Waiting',
  warm: 'Warm',
  website: 'Website',
  won: 'Won',
  lost: 'Lost',
  call: 'Call',
  email: 'Email',
  follow_up: 'Follow up',
  review_documents: 'Review documents',
  close_deal: 'Close deal',
  campaign: 'Campaign',
  whatsapp: 'WhatsApp',
  zero_rated: 'Zero rated',
};

const apiValueMap = Object.entries(valueMap).reduce<Record<string, string>>((acc, [apiValue, label]) => {
  acc[label] = apiValue;
  return acc;
}, {});

const toNumber = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const number = toNumber(value, Number.NaN);
  return Number.isFinite(number) ? number : undefined;
};

const toStringValue = (value: unknown, fallback = '') => (
  value === null || value === undefined ? fallback : String(value)
);

const toStringArray = (value: unknown) => (
  Array.isArray(value) ? value.map((item) => String(item)) : []
);

const toObject = (value: unknown): ApiRow => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as ApiRow : {}
);

const apiLabel = (value: unknown, fallback = '') => {
  const raw = toStringValue(value, fallback);
  if (!raw) return fallback;
  return valueMap[raw] ?? raw;
};

const categoryLabel = (value: unknown, fallback = 'Other') => {
  const raw = toStringValue(value, fallback);
  if (!raw) return fallback;

  return valueMap[raw] ?? raw.replace(/_/g, ' ');
};

const toApiToken = (value: unknown) => {
  const raw = toStringValue(value);
  return apiValueMap[raw] ?? raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
};

const backendIdFrom = (item?: EntityWithBackendId | null) => {
  if (!item) return undefined;
  return item.backendId ?? toOptionalNumber(item.id);
};

const numericRelation = (id?: string | number | null, collection?: EntityWithBackendId[]) => {
  if (id === null || id === undefined || id === '') return undefined;
  const direct = toOptionalNumber(id);
  if (direct !== undefined) return direct;
  return backendIdFrom(collection?.find((item) => item.id === id));
};

const relationId = (value: unknown) => {
  const id = toOptionalNumber(value);
  return id === undefined ? undefined : String(id);
};

const stripUndefined = (payload: ApiRow) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== undefined),
);

const dateOnly = (value: unknown) => toStringValue(value).slice(0, 10);

const normalizeSaleInventoryStatus = (value: unknown): SaleRecord['inventoryStatus'] => {
  const status = toStringValue(value, 'pending').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (status === 'reserved' || status === 'approved' || status === 'unavailable') {
    return status;
  }

  if (status === 'deducted' || status === 'not_deducted' || status === 'not_required') {
    return 'approved';
  }

  return 'pending';
};

const normalizeSaleInventoryMovementStatus = (value: unknown): SaleRecord['inventoryMovementStatus'] => {
  const status = toStringValue(value, 'not_generated').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (status === 'not_generated' || status === 'pending' || status === 'approved' || status === 'completed') {
    return status;
  }

  if (status === 'generated' || status === 'deducted' || status === 'posted') {
    return 'completed';
  }

  return 'not_generated';
};

export function toFrontendContact(row: ApiRow): SalesContact {
  const customFields = toObject(row.customFields);
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    contactCode: toStringValue(row.contactCode),
    unitId: toOptionalNumber(row.unitId) ?? null,
    businessId: toOptionalNumber(row.businessId) ?? null,
    company: toStringValue(row.companyName),
    contactPerson: toStringValue(row.contactPerson),
    role: toStringValue(customFields.role),
    phone: toStringValue(row.phone),
    email: toStringValue(row.email),
    source: apiLabel(row.source, 'Manual') as SalesContact['source'],
    ownerUserCompanyId: toOptionalNumber(row.ownerUserCompanyId) ?? null,
    owner: toStringValue(row.ownerName),
    tags: toStringArray(row.tags),
    notes: toStringValue(row.notes),
    fiscalCountry: toStringValue(row.fiscalCountry),
    fiscalLegalName: toStringValue(row.fiscalLegalName),
    fiscalTaxId: toStringValue(row.fiscalTaxId),
    fiscalRegistryId: toStringValue(row.fiscalRegistryId),
    fiscalAddressLine1: toStringValue(row.fiscalAddressLine1),
    fiscalAddressLine2: toStringValue(row.fiscalAddressLine2),
    fiscalCity: toStringValue(row.fiscalCity),
    fiscalState: toStringValue(row.fiscalState),
    fiscalPostalCode: toStringValue(row.fiscalPostalCode),
    fiscalEmail: toStringValue(row.fiscalEmail),
    fiscalRegime: toStringValue(row.fiscalRegime),
    fiscalNotes: toStringValue(row.fiscalNotes),
    status: apiLabel(row.status, 'Active'),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendContact(contact: Partial<SalesContact>) {
  return stripUndefined({
    contactCode: contact.contactCode,
    unitId: contact.unitId ?? undefined,
    businessId: contact.businessId ?? undefined,
    companyName: contact.company,
    contactPerson: contact.contactPerson,
    phone: contact.phone,
    email: contact.email,
    source: toApiToken(contact.source),
    status: contact.status ? toApiToken(contact.status) : 'active',
    ownerUserCompanyId: contact.ownerUserCompanyId ?? undefined,
    ownerName: contact.owner,
    notes: contact.notes,
    tags: contact.tags,
    fiscalCountry: contact.fiscalCountry,
    fiscalLegalName: contact.fiscalLegalName,
    fiscalTaxId: contact.fiscalTaxId,
    fiscalRegistryId: contact.fiscalRegistryId,
    fiscalAddressLine1: contact.fiscalAddressLine1,
    fiscalAddressLine2: contact.fiscalAddressLine2,
    fiscalCity: contact.fiscalCity,
    fiscalState: contact.fiscalState,
    fiscalPostalCode: contact.fiscalPostalCode,
    fiscalEmail: contact.fiscalEmail,
    fiscalRegime: contact.fiscalRegime,
    fiscalNotes: contact.fiscalNotes,
    customFields: { role: contact.role ?? '' },
  });
}

export function toFrontendOpportunity(row: ApiRow): SalesOpportunity {
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    opportunityCode: toStringValue(row.opportunityCode),
    unitId: toOptionalNumber(row.unitId) ?? null,
    businessId: toOptionalNumber(row.businessId) ?? null,
    opportunityName: toStringValue(row.opportunityName),
    contactId: relationId(row.contactId) ?? '',
    company: toStringValue(row.companyName),
    contactPerson: toStringValue(row.contactPerson),
    phone: toStringValue(row.phone),
    email: toStringValue(row.email),
    source: apiLabel(row.source, 'Manual') as SalesOpportunity['source'],
    stage: apiLabel(row.stage, 'New') as SalesOpportunity['stage'],
    temperature: apiLabel(row.temperature, 'Warm') as SalesOpportunity['temperature'],
    ownerUserCompanyId: toOptionalNumber(row.ownerUserCompanyId) ?? null,
    owner: toStringValue(row.ownerName),
    estimatedValue: toStringValue(row.estimatedValue, '0'),
    currency: normalizeSalesCurrencyCode(toStringValue(row.currency), defaultSalesCurrency),
    probability: `${toNumber(row.probabilityPercent, 10)}%` as SalesOpportunity['probability'],
    expectedCloseDate: dateOnly(row.expectedCloseDate),
    nextAction: apiLabel(row.nextAction, 'Follow up') as SalesOpportunity['nextAction'],
    nextActionDate: dateOnly(row.nextActionAt),
    lastContact: dateOnly(row.lastContactAt),
    files: [],
    status: apiLabel(row.status, 'Active') as SalesOpportunity['status'],
    notes: toStringValue(row.notes),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendOpportunity(opportunity: Partial<SalesOpportunity>, contacts: SalesContact[]) {
  return stripUndefined({
    opportunityCode: opportunity.opportunityCode,
    contactId: numericRelation(opportunity.contactId, contacts),
    unitId: opportunity.unitId ?? undefined,
    businessId: opportunity.businessId ?? undefined,
    opportunityName: opportunity.opportunityName,
    companyName: opportunity.company,
    contactPerson: opportunity.contactPerson,
    phone: opportunity.phone,
    email: opportunity.email,
    source: toApiToken(opportunity.source),
    stage: toApiToken(opportunity.stage),
    temperature: toApiToken(opportunity.temperature),
    status: toApiToken(opportunity.status),
    ownerUserCompanyId: opportunity.ownerUserCompanyId ?? undefined,
    ownerName: opportunity.owner,
    estimatedValue: toNumber(opportunity.estimatedValue),
    currency: normalizeSalesCurrencyCode(opportunity.currency),
    probabilityPercent: Number.parseInt(toStringValue(opportunity.probability).replace('%', ''), 10) || undefined,
    expectedCloseDate: opportunity.expectedCloseDate || undefined,
    nextAction: toApiToken(opportunity.nextAction),
    nextActionAt: opportunity.nextActionDate || undefined,
    lastContactAt: opportunity.lastContact || undefined,
    notes: opportunity.notes,
  });
}

export function toFrontendProduct(row: ApiRow): SalesCatalogItem {
  const customFields = toObject(row.customFields);
  const metadata = toObject(row.metadata);
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    productCode: toStringValue(row.productCode),
    name: toStringValue(row.name),
    sku: toStringValue(row.sku),
    category: categoryLabel(row.category, 'Other') as SalesCatalogItem['category'],
    type: apiLabel(row.type, 'Product') as SalesCatalogItem['type'],
    description: toStringValue(row.description),
    price: toNumber(row.price),
    cost: toNumber(row.cost),
    currency: normalizeSalesCurrencyCode(toStringValue(row.currency), defaultSalesCurrency),
    taxCategory: apiLabel(row.taxCategory, 'Standard VAT') as SalesCatalogItem['taxCategory'],
    status: apiLabel(row.status, 'Active') as SalesCatalogItem['status'],
    visibility: apiLabel(row.visibility, 'Commercial') as SalesCatalogItem['visibility'],
    barcode: toStringValue(customFields.barcode),
    generatedLabels: toStringArray(customFields.generatedLabels),
    imageUrl: toStringValue(metadata.imageUrl),
    imageAlt: toStringValue(metadata.imageAlt),
    gallery: Array.isArray(metadata.gallery) ? metadata.gallery as SalesCatalogItem['gallery'] : [],
    packaging: toObject(metadata.packaging) as SalesCatalogItem['packaging'],
    thumbnailTone: (toStringValue(customFields.thumbnailTone, 'blue') as SalesCatalogItem['thumbnailTone']),
    stockPrepared: Boolean(row.inventoryReady ?? customFields.stockPrepared),
    warehousePrepared: Boolean(customFields.warehousePrepared),
    posPrepared: Boolean(row.posReady),
    variantsPrepared: Boolean(customFields.variantsPrepared),
    lastUpdated: dateOnly(row.updatedAt) || new Date().toISOString().slice(0, 10),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendProduct(product: Partial<SalesCatalogItem>) {
  return stripUndefined({
    productCode: product.productCode,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: toStringValue(product.category, 'Other'),
    type: toApiToken(product.type),
    price: product.price,
    cost: product.cost,
    currency: normalizeSalesCurrencyCode(product.currency),
    taxCategory: toApiToken(product.taxCategory),
    status: toApiToken(product.status),
    visibility: toApiToken(product.visibility),
    inventoryReady: product.stockPrepared,
    posReady: product.posPrepared,
    customFields: {
      barcode: product.barcode,
      generatedLabels: product.generatedLabels,
      thumbnailTone: product.thumbnailTone,
      stockPrepared: product.stockPrepared,
      warehousePrepared: product.warehousePrepared,
      variantsPrepared: product.variantsPrepared,
    },
    metadata: {
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      gallery: product.gallery,
      packaging: product.packaging,
    },
  });
}

export function toFrontendQuoteItem(row: ApiRow): SalesQuoteItem {
  const metadata = toObject(row.metadata);
  const quantity = toNumber(row.quantity, 1);
  const unitPrice = toNumber(row.unitPrice);
  const discountPercent = toNumber(row.discountPercent);
  const taxPercent = toNumber(row.taxPercent);
  const subtotal = quantity * unitPrice;
  const originalCurrency = toStringValue(metadata.originalCurrency);
  const quoteCurrency = toStringValue(metadata.quoteCurrency);
  const unitCost = toNumber(metadata.unitCost);
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    productId: relationId(row.productId) ?? toStringValue(metadata.productId),
    productName: toStringValue(row.productName),
    sku: toStringValue(row.sku),
    section: toStringValue(row.section, 'General'),
    quantity,
    unitPrice,
    unitCost,
    originalCurrency: originalCurrency ? normalizeSalesCurrencyCode(originalCurrency) : undefined,
    originalUnitPrice: toOptionalNumber(metadata.originalUnitPrice),
    originalUnitCost: toOptionalNumber(metadata.originalUnitCost),
    quoteCurrency: quoteCurrency ? normalizeSalesCurrencyCode(quoteCurrency) : undefined,
    exchangeRate: toOptionalNumber(metadata.exchangeRate),
    exchangeRateDate: toStringValue(metadata.exchangeRateDate),
    exchangeRateSource: toStringValue(metadata.exchangeRateSource),
    convertedUnitPrice: toOptionalNumber(metadata.convertedUnitPrice),
    convertedUnitCost: toOptionalNumber(metadata.convertedUnitCost),
    discountPercent,
    discountRuleId: toOptionalNumber(metadata.discountRuleId),
    discountRuleName: toStringValue(metadata.discountRuleName) || undefined,
    discountAmount: toOptionalNumber(metadata.discountAmount),
    taxPercent,
    subtotal,
    marginAmount: toNumber(metadata.marginAmount, subtotal),
    businessUnitId: toStringValue(metadata.businessUnitId),
    businessId: toStringValue(metadata.businessId),
    warehouseId: toStringValue(metadata.warehouseId),
    suggestedWarehouseId: toStringValue(metadata.suggestedWarehouseId),
    availabilityStatus: toStringValue(metadata.availabilityStatus, 'pending_validation') as SalesQuoteItem['availabilityStatus'],
    taxCode: toStringValue(metadata.taxCode),
    taxLabel: toStringValue(metadata.taxLabel),
    taxJurisdiction: toStringValue(metadata.taxJurisdiction),
    taxIsCustom: Boolean(metadata.taxIsCustom),
    notes: toStringValue(metadata.notes),
  };
}

export function toBackendQuoteItem(item: Partial<SalesQuoteItem>, products: SalesCatalogItem[]) {
  return stripUndefined({
    productId: numericRelation(item.productId, products),
    section: item.section,
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercent: item.discountPercent,
    taxPercent: item.taxPercent,
    sortOrder: item.backendId,
    metadata: {
      unitCost: item.unitCost,
      originalCurrency: item.originalCurrency,
      originalUnitPrice: item.originalUnitPrice,
      originalUnitCost: item.originalUnitCost,
      quoteCurrency: item.quoteCurrency,
      exchangeRate: item.exchangeRate,
      exchangeRateDate: item.exchangeRateDate,
      exchangeRateSource: item.exchangeRateSource,
      convertedUnitPrice: item.convertedUnitPrice,
      convertedUnitCost: item.convertedUnitCost,
      subtotal: item.subtotal,
      marginAmount: item.marginAmount,
      discountRuleId: item.discountRuleId,
      discountRuleName: item.discountRuleName,
      discountAmount: item.discountAmount,
      businessUnitId: item.businessUnitId,
      businessId: item.businessId,
      warehouseId: item.warehouseId,
      suggestedWarehouseId: item.suggestedWarehouseId,
      availabilityStatus: item.availabilityStatus,
      taxCode: item.taxCode,
      taxLabel: item.taxLabel,
      taxJurisdiction: item.taxJurisdiction,
      taxIsCustom: item.taxIsCustom,
      notes: item.notes,
      productId: item.productId,
    },
  });
}

export function toFrontendQuote(row: ApiRow): SalesQuote {
  const customFields = toObject(row.customFields);
  const items = Array.isArray(row.items) ? row.items.map((item) => toFrontendQuoteItem(toObject(item))) : [];
  const subtotal = toNumber(customFields.subtotal, items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0));
  const discountTotal = toNumber(customFields.discountTotal);
  const taxTotal = toNumber(customFields.taxTotal);
  const total = toNumber(row.amount, subtotal - discountTotal + taxTotal);
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    quoteNumber: toStringValue(row.quoteNumber),
    clientId: relationId(row.contactId),
    clientName: toStringValue(row.clientName),
    contactPerson: toStringValue(row.contactPerson),
    opportunityId: relationId(row.opportunityId),
    status: apiLabel(row.status, 'Draft') as SalesQuote['status'],
    createdDate: dateOnly(row.createdDate),
    expirationDate: dateOnly(row.expirationDate),
    assignedSellerUserCompanyId: toOptionalNumber(row.assignedSellerUserCompanyId) ?? null,
    assignedSeller: toStringValue(row.assignedSellerName),
    items,
    subtotal,
    discountTotal,
    taxTotal,
    total,
    currency: normalizeSalesCurrencyCode(toStringValue(row.currency), defaultSalesCurrency),
    notes: toStringValue(row.notes),
    terms: toStringValue(row.terms),
    files: toStringArray(customFields.files),
    lastUpdated: dateOnly(row.updatedAt) || new Date().toISOString().slice(0, 10),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendQuote(
  quote: Partial<SalesQuote>,
  contacts: SalesContact[],
  opportunities: SalesOpportunity[],
  products: SalesCatalogItem[],
) {
  return stripUndefined({
    quoteNumber: quote.quoteNumber,
    contactId: numericRelation(quote.clientId, contacts),
    opportunityId: numericRelation(quote.opportunityId, opportunities),
    clientName: quote.clientName,
    contactPerson: quote.contactPerson,
    status: toApiToken(quote.status),
    amount: quote.total,
    currency: normalizeSalesCurrencyCode(quote.currency),
    createdDate: quote.createdDate || undefined,
    expirationDate: quote.expirationDate || undefined,
    assignedSellerUserCompanyId: quote.assignedSellerUserCompanyId ?? undefined,
    assignedSellerName: quote.assignedSeller,
    notes: quote.notes,
    terms: quote.terms,
    items: quote.items?.map((item) => toBackendQuoteItem(item, products)),
    customFields: {
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      files: quote.files,
    },
  });
}

export function toFrontendSaleRecord(row: ApiRow): SaleRecord {
  const customFields = toObject(row.customFields);
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    saleNumber: toStringValue(row.saleNumber),
    quoteId: relationId(row.quoteId),
    prospectId: relationId(row.opportunityId) ?? toStringValue(customFields.prospectId),
    contactId: relationId(row.contactId),
    customerId: relationId(row.contactId) ?? toStringValue(customFields.customerId),
    sellerId: toStringValue(customFields.sellerId),
    sellerUserCompanyId: toOptionalNumber(row.sellerUserCompanyId) ?? null,
    quoteReference: toStringValue(row.quoteReference),
    saleDocumentReference: toStringValue(row.saleDocumentReference),
    businessUnitId: relationId(row.unitId) ?? toStringValue(customFields.businessUnitId),
    businessUnitName: toStringValue(customFields.businessUnitName),
    businessId: relationId(row.businessId) ?? toStringValue(customFields.businessId),
    businessName: toStringValue(customFields.businessName),
    warehouseId: toStringValue(customFields.warehouseId),
    warehouseName: toStringValue(customFields.warehouseName),
    customerName: toStringValue(row.customerName),
    sellerName: toStringValue(row.sellerName),
    saleDate: dateOnly(row.saleDate),
    totalAmount: toNumber(row.totalAmount),
    subtotal: toNumber(row.subtotal),
    discountTotal: toNumber(row.discountTotal),
    taxTotal: toNumber(row.taxTotal),
    marginTotal: toNumber(row.marginTotal),
    currency: normalizeSalesCurrencyCode(toStringValue(row.currency), defaultSalesCurrency),
    paymentMethod: toStringValue(row.paymentMethod),
    paymentReference: toStringValue(row.paymentReference),
    paymentAccountId: toStringValue(customFields.paymentAccountId),
    paymentAccountName: toStringValue(customFields.paymentAccountName),
    paymentEvidenceStatus: toStringValue(row.paymentEvidenceStatus, 'missing') as SaleRecord['paymentEvidenceStatus'],
    commercialStatus: toStringValue(row.commercialStatus, 'pending_validation') as SaleRecord['commercialStatus'],
    financeStatus: toStringValue(row.financeStatus, 'pending') as SaleRecord['financeStatus'],
    inventoryStatus: normalizeSaleInventoryStatus(row.inventoryStatus),
    deliveryStatus: toStringValue(row.deliveryStatus, 'pending') as SaleRecord['deliveryStatus'],
    commissionStatus: toStringValue(row.commissionStatus, 'pending') as SaleRecord['commissionStatus'],
    inventoryMovementStatus: normalizeSaleInventoryMovementStatus(row.inventoryMovementStatus),
    inventoryMovementReference: toStringValue(row.inventoryMovementReference),
    commissionRate: toNumber(row.commissionRate),
    commissionAmount: toNumber(row.commissionAmount),
    commissionNotes: toStringValue(row.commissionNotes),
    commissionRuleId: toOptionalNumber(row.commissionRuleId),
    commissionRuleCode: toStringValue(row.commissionRuleCode),
    commissionRuleName: toStringValue(row.commissionRuleName),
    commissionType: toStringValue(row.commissionType),
    commissionValue: toNumber(row.commissionValue),
    commissionBreakdown: Array.isArray(row.commissionBreakdown) ? row.commissionBreakdown as SaleRecord['commissionBreakdown'] : [],
    saleLines: Array.isArray(row.saleLines) ? row.saleLines as SaleRecord['saleLines'] : [],
    notes: toStringValue(row.notes),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendSaleRecord(
  sale: Partial<SaleRecord>,
  contacts: SalesContact[],
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[],
) {
  return stripUndefined({
    saleNumber: sale.saleNumber,
    contactId: numericRelation(sale.contactId ?? sale.customerId, contacts),
    opportunityId: numericRelation(sale.prospectId, opportunities),
    quoteId: numericRelation(sale.quoteId, quotes),
    unitId: numericRelation(sale.businessUnitId),
    businessId: numericRelation(sale.businessId),
    sellerUserCompanyId: sale.sellerUserCompanyId ?? undefined,
    quoteReference: sale.quoteReference,
    saleDocumentReference: sale.saleDocumentReference,
    customerName: sale.customerName,
    sellerName: sale.sellerName,
    saleDate: sale.saleDate,
    totalAmount: sale.totalAmount,
    subtotal: sale.subtotal,
    discountTotal: sale.discountTotal,
    taxTotal: sale.taxTotal,
    marginTotal: sale.marginTotal,
    currency: normalizeSalesCurrencyCode(sale.currency),
    paymentMethod: sale.paymentMethod,
    paymentReference: sale.paymentReference,
    paymentEvidenceStatus: sale.paymentEvidenceStatus,
    commercialStatus: sale.commercialStatus,
    financeStatus: sale.financeStatus,
    inventoryStatus: sale.inventoryStatus,
    deliveryStatus: sale.deliveryStatus,
    commissionStatus: sale.commissionStatus,
    inventoryMovementStatus: sale.inventoryMovementStatus,
    inventoryMovementReference: sale.inventoryMovementReference,
    commissionNotes: sale.commissionNotes,
    saleLines: sale.saleLines,
    notes: sale.notes,
    customFields: {
      prospectId: sale.prospectId,
      customerId: sale.customerId,
      sellerId: sale.sellerId,
      businessUnitId: sale.businessUnitId,
      businessUnitName: sale.businessUnitName,
      businessId: sale.businessId,
      businessName: sale.businessName,
      warehouseId: sale.warehouseId,
      warehouseName: sale.warehouseName,
      paymentAccountId: sale.paymentAccountId,
      paymentAccountName: sale.paymentAccountName,
    },
  });
}

export function toFrontendPostSaleCase(row: ApiRow): SalesPostSaleCase {
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    clientId: relationId(row.contactId),
    clientName: toStringValue(row.clientName),
    contactPerson: '',
    relatedOpportunityId: relationId(row.opportunityId),
    lastQuoteId: relationId(row.quoteId),
    relationType: apiLabel(row.relationType, 'One-time customer') as SalesPostSaleCase['relationType'],
    postSaleType: apiLabel(row.postSaleType, 'Standard post-sale') as SalesPostSaleCase['postSaleType'],
    status: apiLabel(row.status, 'Active') as SalesPostSaleCase['status'],
    owner: toStringValue(row.ownerName),
    lastPurchaseDate: dateOnly(row.lastPurchaseDate),
    nextFollowUpDate: dateOnly(row.nextFollowUpDate),
    renewalDate: dateOnly(row.renewalDate),
    lifetimeValue: toNumber(row.lifetimeValue),
    currency: normalizeSalesCurrencyCode(toStringValue(row.currency), defaultSalesCurrency),
    notes: toStringValue(row.notes),
    files: [],
    lostReason: apiLabel(row.lostReason) as SalesPostSaleCase['lostReason'],
    nextAction: toStringValue(row.nextAction),
    riskLevel: apiLabel(row.riskLevel, 'Low') as SalesPostSaleCase['riskLevel'],
    commercialHistory: toStringArray(row.history),
    lastUpdated: dateOnly(row.updatedAt) || new Date().toISOString().slice(0, 10),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendPostSaleCase(postSaleCase: Partial<SalesPostSaleCase>, contacts: SalesContact[], opportunities: SalesOpportunity[], quotes: SalesQuote[]) {
  return stripUndefined({
    contactId: numericRelation(postSaleCase.clientId, contacts),
    opportunityId: numericRelation(postSaleCase.relatedOpportunityId, opportunities),
    quoteId: numericRelation(postSaleCase.lastQuoteId, quotes),
    clientName: postSaleCase.clientName,
    relationType: toApiToken(postSaleCase.relationType),
    postSaleType: toApiToken(postSaleCase.postSaleType),
    status: toApiToken(postSaleCase.status),
    ownerName: postSaleCase.owner,
    lastPurchaseDate: postSaleCase.lastPurchaseDate,
    nextFollowUpDate: postSaleCase.nextFollowUpDate,
    renewalDate: postSaleCase.renewalDate,
    lifetimeValue: postSaleCase.lifetimeValue,
    currency: normalizeSalesCurrencyCode(postSaleCase.currency),
    riskLevel: toApiToken(postSaleCase.riskLevel),
    lostReason: postSaleCase.lostReason ? toApiToken(postSaleCase.lostReason) : undefined,
    nextAction: postSaleCase.nextAction,
    notes: postSaleCase.notes,
    history: postSaleCase.commercialHistory,
  });
}

export function toFrontendContract(row: ApiRow): DigitalContract {
  const dynamicFields = toObject(row.dynamicFields);
  const signatureRequest = toObject(row.signatureRequest);
  const customFields = toObject(row.customFields);
  return {
    id: toStringValue(row.id),
    backendId: toOptionalNumber(row.id),
    contractNumber: toStringValue(row.contractNumber),
    title: toStringValue(row.title),
    clientId: relationId(row.contactId),
    clientName: toStringValue(row.clientName),
    contactPerson: toStringValue(row.contactPerson),
    relatedOpportunityId: relationId(row.opportunityId),
    relatedQuoteId: relationId(row.quoteId),
    relatedPostSaleCaseId: relationId(row.postSaleCaseId),
    contractType: apiLabel(row.contractType, 'Custom contract') as DigitalContract['contractType'],
    status: apiLabel(row.status, 'Draft') as DigitalContract['status'],
    owner: toStringValue(row.ownerName),
    signatureStatus: apiLabel(row.signatureStatus, 'Not requested') as DigitalContract['signatureStatus'],
    source: apiLabel(row.source, 'Uploaded document') as DigitalContract['source'],
    country: apiLabel(row.country, 'Mexico') as DigitalContract['country'],
    templateId: toStringValue(customFields.templateId),
    dynamicFieldValues: dynamicFields as DigitalContract['dynamicFieldValues'],
    lastUpdated: dateOnly(row.updatedAt) || new Date().toISOString().slice(0, 10),
    expirationDate: dateOnly(row.expirationDate),
    files: Array.isArray(customFields.files) ? customFields.files as DigitalContract['files'] : [],
    signatureRequest: Object.keys(signatureRequest).length ? signatureRequest as DigitalContract['signatureRequest'] : undefined,
    lifecycle: Array.isArray(customFields.lifecycle) ? customFields.lifecycle as DigitalContract['lifecycle'] : [],
    notes: toStringValue(row.notes),
    filesCount: toNumber(row.filesCount),
  };
}

export function toBackendContract(contract: Partial<DigitalContract>, contacts: SalesContact[], opportunities: SalesOpportunity[], quotes: SalesQuote[], postSaleCases: SalesPostSaleCase[]) {
  return stripUndefined({
    contractNumber: contract.contractNumber,
    contactId: numericRelation(contract.clientId, contacts),
    opportunityId: numericRelation(contract.relatedOpportunityId, opportunities),
    quoteId: numericRelation(contract.relatedQuoteId, quotes),
    postSaleCaseId: numericRelation(contract.relatedPostSaleCaseId, postSaleCases),
    title: contract.title,
    clientName: contract.clientName,
    contactPerson: contract.contactPerson,
    contractType: toApiToken(contract.contractType),
    status: toApiToken(contract.status),
    signatureStatus: toApiToken(contract.signatureStatus),
    source: toApiToken(contract.source),
    country: contract.country,
    ownerName: contract.owner,
    expirationDate: contract.expirationDate,
    notes: contract.notes,
    dynamicFields: contract.dynamicFieldValues,
    signatureRequest: contract.signatureRequest,
    customFields: {
      templateId: contract.templateId,
      files: contract.files,
      lifecycle: contract.lifecycle,
    },
  });
}

export { backendIdFrom };
