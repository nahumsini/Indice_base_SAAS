import type { QuoteStatus, SalesQuoteItem } from '../../types';
import type { QuoteTaxJurisdiction } from '../utils/quoteTaxCatalog';

export type ClientMode = 'contact' | 'temporary';

export type QuoteFormState = {
  clientMode: ClientMode;
  clientId: string;
  temporaryClient: string;
  contactPerson: string;
  opportunityId: string;
  status: QuoteStatus;
  createdDate: string;
  expirationDate: string;
  assignedSellerValue: string;
  assignedSeller: string;
  currency: string;
  taxJurisdiction: QuoteTaxJurisdiction;
  customJurisdictionName: string;
  customTaxLabel: string;
  customTaxRate: string;
  notes: string;
  terms: string;
};

export type QuoteDraft = {
  id?: string;
  contactId?: string;
  temporaryCustomer?: string;
  opportunityId?: string;
  sellerId?: string;
  taxJurisdiction?: QuoteTaxJurisdiction;
  status: QuoteStatus;
  createdAt: string;
  validUntil: string;
  notes: string;
  conditions: string;
  lineItems: QuoteLineItemDraft[];
  totals: QuoteTotals;
};

export type QuoteLineItemDraft = SalesQuoteItem & {
  catalogItemId?: string;
  type?: string;
  thumbnailUrl?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxRate?: number;
  taxLabel?: string;
  isTaxExempt?: boolean;
  estimatedUnitCost?: number;
  estimatedMargin?: number;
  usesInventory?: boolean;
  readyForSales?: boolean;
};

export type QuoteLinePricing = {
  lineSubtotal: number;
  discountAmount: number;
  taxableBase: number;
  taxAmount: number;
  lineTotal: number;
  estimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
  hasCost: boolean;
};

export type QuoteTotals = {
  subtotal: number;
  discountTotal: number;
  taxableSubtotal: number;
  taxTotal: number;
  total: number;
  estimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
  missingCostCount: number;
};

export type QuoteHealthKey =
  | 'readyToSend'
  | 'missingCustomer'
  | 'missingItems'
  | 'marginLow'
  | 'productRequiresReview'
  | 'validityMissing'
  | 'taxesConfigured'
  | 'taxesMissing';

export type QuoteHealthState = Record<QuoteHealthKey, boolean>;
