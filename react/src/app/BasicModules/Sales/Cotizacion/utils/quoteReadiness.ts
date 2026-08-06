import type { SalesCatalogItem, SalesContact, SalesQuoteItem } from '../../types';
import type { QuoteFormState, QuoteHealthState, QuoteTotals } from '../types/quoteBuilderTypes';
import { isProductReadyForQuote } from './quoteCatalogAdapters';

function hasCustomer(_form: QuoteFormState, selectedContact?: SalesContact | null) {
  return Boolean(selectedContact);
}

export function getQuoteHealthState({
  form,
  selectedContact,
  items,
  products,
  totals,
}: {
  form: QuoteFormState;
  selectedContact?: SalesContact | null;
  items: SalesQuoteItem[];
  products: SalesCatalogItem[];
  totals: QuoteTotals;
}): QuoteHealthState {
  const relatedProducts = items
    .map((item) => products.find((product) => product.id === item.productId))
    .filter(Boolean) as SalesCatalogItem[];
  const hasTaxConfigured = items.some((item) => Boolean(item.taxCode) || Number(item.taxPercent) > 0);
  const hasTaxMissing = items.length > 0 && items.some((item) => !item.taxCode && Number(item.taxPercent) <= 0);
  const hasLowMargin = totals.taxableSubtotal > 0 && totals.estimatedMargin < 20;
  const productRequiresReview = relatedProducts.some((product) => !isProductReadyForQuote(product));

  return {
    readyToSend: hasCustomer(form, selectedContact)
      && items.length > 0
      && Boolean(form.expirationDate)
      && !hasLowMargin
      && !productRequiresReview,
    missingCustomer: !hasCustomer(form, selectedContact),
    missingItems: items.length === 0,
    marginLow: hasLowMargin,
    productRequiresReview,
    validityMissing: !form.expirationDate,
    taxesConfigured: hasTaxConfigured,
    taxesMissing: hasTaxMissing,
  };
}

export function getQuoteMarginTone(totals: QuoteTotals): 'neutral' | 'danger' | 'warning' | 'success' {
  if (totals.taxableSubtotal <= 0 || totals.missingCostCount > 0) {
    return 'neutral';
  }

  if (totals.estimatedMargin <= 0) {
    return 'danger';
  }

  if (totals.estimatedMargin < 20) {
    return 'warning';
  }

  return 'success';
}

export function getDaysUntil(dateValue: string) {
  if (!dateValue) {
    return null;
  }

  const expirationTime = new Date(dateValue).getTime();
  const now = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.ceil((expirationTime - now) / 86400000);
}
