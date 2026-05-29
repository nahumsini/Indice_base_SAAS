import type { SalesAvailabilityStatus } from './salesWorkflow';

export type QuoteStatus = 'Draft' | 'Sent' | 'Viewed' | 'Negotiation' | 'Approved' | 'Rejected' | 'Expired' | 'Closed Won';

export type SalesQuoteItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  section: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discountPercent: number;
  taxPercent: number;
  subtotal?: number;
  marginAmount?: number;
  businessUnitId?: string;
  businessId?: string;
  warehouseId?: string;
  suggestedWarehouseId?: string;
  availabilityStatus?: SalesAvailabilityStatus;
  taxCode?: string;
  taxLabel?: string;
  taxJurisdiction?: string;
  taxIsCustom?: boolean;
  notes: string;
};

export type SalesQuote = {
  id: string;
  quoteNumber: string;
  clientId?: string;
  clientName: string;
  contactPerson: string;
  opportunityId?: string;
  status: QuoteStatus;
  createdDate: string;
  expirationDate: string;
  assignedSellerUserCompanyId?: number | null;
  assignedSeller: string;
  items: SalesQuoteItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes: string;
  terms: string;
  files: string[];
  lastUpdated: string;
};

export const quoteStatuses: QuoteStatus[] = ['Draft', 'Sent', 'Viewed', 'Negotiation', 'Approved', 'Rejected', 'Expired', 'Closed Won'];
export const opportunityLinkedQuoteStatuses: QuoteStatus[] = ['Approved', 'Closed Won'];
