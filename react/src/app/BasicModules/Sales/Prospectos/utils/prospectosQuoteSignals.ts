import type { QuoteStatus, SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import { formatSalesCurrencyAmount, formatSalesCurrencyBreakdown } from '../../utils/salesCurrency';

export type OpportunityQuoteSignalState = 'approved' | 'active' | 'draft' | 'expired' | 'rejected' | 'none';

export type OpportunityQuoteSignal = {
  state: OpportunityQuoteSignalState;
  label: string;
  detail: string;
  quoteCount: number;
  forecastQuoteCount: number;
  totalQuotedValue: number;
  totalQuotedValueLabel: string;
};

export const opportunityForecastQuoteStatuses: QuoteStatus[] = [
  'Draft',
  'Sent',
  'Viewed',
  'Negotiation',
  'Approved',
  'Closed Won',
];

const quoteStatusPriority: Record<QuoteStatus, number> = {
  'Closed Won': 6,
  Approved: 5,
  Negotiation: 4,
  Viewed: 3,
  Sent: 2,
  Draft: 1,
  Expired: 0,
  Rejected: -1,
};

function formatQuoteCount(count: number) {
  return `${count} ${count === 1 ? 'cotización' : 'cotizaciones'}`;
}

function getSignalState(status: QuoteStatus): OpportunityQuoteSignalState {
  if (status === 'Approved' || status === 'Closed Won') {
    return 'approved';
  }
  if (status === 'Sent' || status === 'Viewed' || status === 'Negotiation') {
    return 'active';
  }
  if (status === 'Draft') {
    return 'draft';
  }
  if (status === 'Expired') {
    return 'expired';
  }
  return 'rejected';
}

export function getLinkedQuotesForOpportunity(opportunity: SalesOpportunity, quotes: SalesQuote[]) {
  const opportunityIds = new Set([
    opportunity.id,
    opportunity.backendId !== undefined ? String(opportunity.backendId) : '',
  ].filter(Boolean));

  return quotes.filter((quote) => quote.opportunityId && opportunityIds.has(quote.opportunityId));
}

export function isOpportunityForecastQuote(quote: SalesQuote) {
  return opportunityForecastQuoteStatuses.includes(quote.status);
}

export function getForecastQuotesForOpportunity(opportunity: SalesOpportunity, quotes: SalesQuote[]) {
  return getLinkedQuotesForOpportunity(opportunity, quotes).filter(isOpportunityForecastQuote);
}

export function getOpportunityQuoteSignal(opportunity: SalesOpportunity, quotes: SalesQuote[]): OpportunityQuoteSignal {
  const linkedQuotes = getLinkedQuotesForOpportunity(opportunity, quotes);
  const forecastQuotes = linkedQuotes.filter(isOpportunityForecastQuote);

  if (linkedQuotes.length === 0) {
    return {
      state: 'none',
      label: 'Sin cotización',
      detail: 'Sin documento comercial',
      quoteCount: 0,
      forecastQuoteCount: 0,
      totalQuotedValue: 0,
      totalQuotedValueLabel: formatSalesCurrencyAmount(0, opportunity.currency),
    };
  }

  const totalQuotedValue = forecastQuotes.reduce((total, quote) => total + quote.total, 0);
  const totalQuotedValueLabel = forecastQuotes.length > 0
    ? formatSalesCurrencyBreakdown(
      forecastQuotes,
      (quote) => quote.total,
      (quote) => quote.currency,
    )
    : formatSalesCurrencyAmount(0, opportunity.currency);
  const primaryQuote = [...linkedQuotes].sort((left, right) => (
    quoteStatusPriority[right.status] - quoteStatusPriority[left.status]
      || right.lastUpdated.localeCompare(left.lastUpdated)
      || right.createdDate.localeCompare(left.createdDate)
  ))[0];

  const state = getSignalState(primaryQuote.status);
  const labelByState: Record<OpportunityQuoteSignalState, string> = {
    approved: 'Cotización aprobada',
    active: 'Cotización activa',
    draft: 'Cotización en borrador',
    expired: 'Cotización vencida',
    rejected: 'Cotización rechazada',
    none: 'Sin cotización',
  };

  return {
    state,
    label: labelByState[state],
    detail: `${formatQuoteCount(linkedQuotes.length)} · ${totalQuotedValueLabel}`,
    quoteCount: linkedQuotes.length,
    forecastQuoteCount: forecastQuotes.length,
    totalQuotedValue,
    totalQuotedValueLabel,
  };
}
