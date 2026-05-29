import type { SalesCatalogItem, SalesContact, SalesQuote } from '../../types';
import type { QuoteFormState, QuoteHealthState, QuoteTotals } from '../types/quoteBuilderTypes';
import { calculateQuoteBuilderTotals } from './quotePricing';
import { getDaysUntil, getQuoteHealthState } from './quoteReadiness';

export type QuoteReadinessTableKey =
  | 'readyToSend'
  | 'missingCustomer'
  | 'missingItems'
  | 'marginLow'
  | 'productRequiresReview'
  | 'taxesMissing'
  | 'validityMissing';

export type QuoteMarginTableKey = 'healthy' | 'lowMargin' | 'costMissing';
export type QuoteExpirationTableKey = 'valid' | 'expiringSoon' | 'expired' | 'missing' | 'closed';

export type QuoteReadinessSignal = {
  key: QuoteReadinessTableKey;
  issueCount: number;
  health: QuoteHealthState;
};

export type QuoteMarginSignal = {
  key: QuoteMarginTableKey;
  value: number;
  missingCostCount: number;
};

export type QuoteExpirationSignal = {
  key: QuoteExpirationTableKey;
  daysUntil: number | null;
};

export type QuoteTableSignals = {
  readiness: QuoteReadinessSignal;
  margin: QuoteMarginSignal;
  expiration: QuoteExpirationSignal;
  totals: QuoteTotals;
};

const readinessIssueOrder: QuoteReadinessTableKey[] = [
  'missingCustomer',
  'missingItems',
  'validityMissing',
  'productRequiresReview',
  'taxesMissing',
  'marginLow',
];

const closedStatuses: Array<SalesQuote['status']> = ['Rejected', 'Closed Won'];

function buildHealthForm(quote: SalesQuote, contact?: SalesContact | null): QuoteFormState {
  return {
    clientMode: quote.clientId ? 'contact' : 'temporary',
    clientId: quote.clientId ?? '',
    temporaryClient: quote.clientId ? '' : quote.clientName,
    contactPerson: contact?.contactPerson ?? quote.contactPerson,
    opportunityId: quote.opportunityId ?? 'none',
    status: quote.status,
    createdDate: quote.createdDate,
    expirationDate: quote.expirationDate,
    assignedSellerValue: '',
    assignedSeller: quote.assignedSeller,
    taxJurisdiction: 'mx',
    customJurisdictionName: '',
    customTaxLabel: '',
    customTaxRate: '0',
    notes: quote.notes,
    terms: quote.terms,
  };
}

function getReadinessSignal(health: QuoteHealthState): QuoteReadinessSignal {
  const issues = readinessIssueOrder.filter((key) => health[key]);

  return {
    key: issues[0] ?? 'readyToSend',
    issueCount: issues.length,
    health,
  };
}

function getMarginSignal(totals: QuoteTotals): QuoteMarginSignal {
  if (totals.missingCostCount > 0 || totals.taxableSubtotal <= 0) {
    return {
      key: 'costMissing',
      value: totals.estimatedMargin,
      missingCostCount: totals.missingCostCount,
    };
  }

  return {
    key: totals.estimatedMargin < 20 ? 'lowMargin' : 'healthy',
    value: totals.estimatedMargin,
    missingCostCount: totals.missingCostCount,
  };
}

function getExpirationSignal(quote: SalesQuote): QuoteExpirationSignal {
  if (closedStatuses.includes(quote.status)) {
    return { key: 'closed', daysUntil: null };
  }

  if (!quote.expirationDate) {
    return { key: 'missing', daysUntil: null };
  }

  const daysUntil = getDaysUntil(quote.expirationDate);

  if (quote.status === 'Expired' || (daysUntil !== null && daysUntil < 0)) {
    return { key: 'expired', daysUntil };
  }

  if (daysUntil !== null && daysUntil <= 7) {
    return { key: 'expiringSoon', daysUntil };
  }

  return { key: 'valid', daysUntil };
}

export function getQuoteTableSignals({
  quote,
  products,
  contact,
}: {
  quote: SalesQuote;
  products: SalesCatalogItem[];
  contact?: SalesContact | null;
}): QuoteTableSignals {
  const totals = calculateQuoteBuilderTotals(quote.items, products);
  const health = getQuoteHealthState({
    form: buildHealthForm(quote, contact),
    selectedContact: contact,
    items: quote.items,
    products,
    totals,
  });

  return {
    readiness: getReadinessSignal(health),
    margin: getMarginSignal(totals),
    expiration: getExpirationSignal(quote),
    totals,
  };
}
