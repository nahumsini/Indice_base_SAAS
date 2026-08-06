import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import {
  defaultSalesCurrency,
  formatSalesCurrencyAmount,
  formatSalesCurrencyBreakdown,
  normalizeSalesCurrencyCode,
} from '../../utils/salesCurrency';
import { getTodayIsoDate } from '../../utils/salesCrmUtils';
import { getLinkedQuotesForOpportunity } from './prospectosQuoteSignals';

export type OpportunityPipelineCurrencyTotal = {
  currency: string;
  total: number;
  label: string;
};

export type OpportunityPipelineTotals = {
  quoteCount: number;
  totalsByCurrency: OpportunityPipelineCurrencyTotal[];
  totalLabel: string;
  convertedTotal: number;
  convertedLabel: string;
  preferredCurrency: string;
  exchangeRateDate: string;
};

export type OpportunityNativePipelineTotals = Pick<
  OpportunityPipelineTotals,
  'quoteCount' | 'totalsByCurrency' | 'totalLabel'
>;

function roundCurrencyTotal(value: number) {
  return Number(value.toFixed(2));
}

function getQuoteCurrency(quote: SalesQuote) {
  return normalizeSalesCurrencyCode(quote.currency);
}

function getTotalsByCurrency(quotes: SalesQuote[]) {
  const totals = quotes.reduce<Map<string, number>>((currencyTotals, quote) => {
    const currency = getQuoteCurrency(quote);
    currencyTotals.set(currency, (currencyTotals.get(currency) ?? 0) + quote.total);
    return currencyTotals;
  }, new Map());

  return Array.from(totals.entries()).map(([currency, total]) => ({
    currency,
    total: roundCurrencyTotal(total),
    label: formatSalesCurrencyAmount(total, currency),
  }));
}

export function getOpportunityNativePipelineTotals(
  opportunity: SalesOpportunity,
  quotes: SalesQuote[],
): OpportunityNativePipelineTotals {
  const linkedQuotes = getLinkedQuotesForOpportunity(opportunity, quotes);

  return {
    quoteCount: linkedQuotes.length,
    totalsByCurrency: getTotalsByCurrency(linkedQuotes),
    totalLabel: linkedQuotes.length > 0
      ? formatSalesCurrencyBreakdown(linkedQuotes, (quote) => quote.total, (quote) => quote.currency)
      : formatSalesCurrencyAmount(0, normalizeSalesCurrencyCode(opportunity.currency)),
  };
}

export function getOpportunityPipelineTotals(
  opportunity: SalesOpportunity,
  quotes: SalesQuote[],
  preferredCurrency = defaultSalesCurrency,
): OpportunityPipelineTotals {
  const currency = normalizeSalesCurrencyCode(preferredCurrency);
  const linkedQuotes = getLinkedQuotesForOpportunity(opportunity, quotes);
  const exchangeRateDate = getTodayIsoDate();

  if (linkedQuotes.length === 0) {
    return {
      quoteCount: 0,
      totalsByCurrency: [],
      totalLabel: formatSalesCurrencyAmount(0, currency),
      convertedTotal: 0,
      convertedLabel: formatSalesCurrencyAmount(0, currency),
      preferredCurrency: currency,
      exchangeRateDate,
    };
  }

  return {
    quoteCount: linkedQuotes.length,
    totalsByCurrency: getTotalsByCurrency(linkedQuotes),
    totalLabel: formatSalesCurrencyBreakdown(linkedQuotes, (quote) => quote.total, (quote) => quote.currency),
    convertedTotal: 0,
    convertedLabel: formatSalesCurrencyAmount(0, currency),
    preferredCurrency: currency,
    exchangeRateDate,
  };
}

export function getProspectosPipelineSummary(
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[],
  preferredCurrency = defaultSalesCurrency,
) {
  const visibleOpportunityIds = new Set(opportunities.map((opportunity) => opportunity.id));
  const visibleQuotes = quotes.filter((quote) => quote.opportunityId && visibleOpportunityIds.has(quote.opportunityId));
  const currency = normalizeSalesCurrencyCode(preferredCurrency);
  const exchangeRateDate = getTodayIsoDate();
  const totalsByCurrency = getTotalsByCurrency(visibleQuotes);

  return {
    quoteCount: visibleQuotes.length,
    totalsByCurrency,
    totalLabel: visibleQuotes.length > 0
      ? formatSalesCurrencyBreakdown(visibleQuotes, (quote) => quote.total, (quote) => quote.currency)
      : formatSalesCurrencyAmount(0, currency),
    convertedTotal: 0,
    convertedLabel: formatSalesCurrencyAmount(0, currency),
    preferredCurrency: currency,
    exchangeRateDate,
    hasMultipleCurrencies: totalsByCurrency.length > 1,
  };
}
