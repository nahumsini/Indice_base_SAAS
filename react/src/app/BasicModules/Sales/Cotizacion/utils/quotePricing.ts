import type { SalesCatalogItem, SalesQuoteItem } from '../../types';
import type { QuoteLinePricing, QuoteTotals } from '../types/quoteBuilderTypes';

function findProduct(item: SalesQuoteItem, products: SalesCatalogItem[]) {
  return products.find((product) => product.id === item.productId);
}

export function calculateQuoteLinePricing(item: SalesQuoteItem, products: SalesCatalogItem[]): QuoteLinePricing {
  const product = findProduct(item, products);
  const quantity = Math.max(Number(item.quantity) || 0, 0);
  const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
  const discountPercent = Math.min(Math.max(Number(item.discountPercent) || 0, 0), 100);
  const taxPercent = Math.max(Number(item.taxPercent) || 0, 0);
  const lineSubtotal = quantity * unitPrice;
  const discountAmount = lineSubtotal * (discountPercent / 100);
  const taxableBase = Math.max(lineSubtotal - discountAmount, 0);
  const taxAmount = taxableBase * (taxPercent / 100);
  const lineTotal = taxableBase + taxAmount;
  const estimatedUnitCost = product?.cost ?? 0;
  const estimatedCost = quantity * estimatedUnitCost;
  const estimatedProfit = taxableBase - estimatedCost;
  const estimatedMargin = taxableBase > 0 ? (estimatedProfit / taxableBase) * 100 : 0;

  return {
    lineSubtotal,
    discountAmount,
    taxableBase,
    taxAmount,
    lineTotal,
    estimatedCost,
    estimatedProfit,
    estimatedMargin,
    hasCost: Boolean(product && product.cost > 0),
  };
}

export function calculateQuoteTotals(items: SalesQuoteItem[], products: SalesCatalogItem[] = []): QuoteTotals {
  return items.reduce<QuoteTotals>((totals, item) => {
    const line = calculateQuoteLinePricing(item, products);

    return {
      subtotal: totals.subtotal + line.lineSubtotal,
      discountTotal: totals.discountTotal + line.discountAmount,
      taxableSubtotal: totals.taxableSubtotal + line.taxableBase,
      taxTotal: totals.taxTotal + line.taxAmount,
      total: totals.total + line.lineTotal,
      estimatedCost: totals.estimatedCost + line.estimatedCost,
      estimatedProfit: totals.estimatedProfit + line.estimatedProfit,
      estimatedMargin: 0,
      missingCostCount: totals.missingCostCount + (line.hasCost ? 0 : 1),
    };
  }, {
    subtotal: 0,
    discountTotal: 0,
    taxableSubtotal: 0,
    taxTotal: 0,
    total: 0,
    estimatedCost: 0,
    estimatedProfit: 0,
    estimatedMargin: 0,
    missingCostCount: 0,
  });
}

export function withQuoteMargin(totals: QuoteTotals): QuoteTotals {
  return {
    ...totals,
    estimatedMargin: totals.taxableSubtotal > 0
      ? (totals.estimatedProfit / totals.taxableSubtotal) * 100
      : 0,
  };
}

export function calculateQuoteBuilderTotals(items: SalesQuoteItem[], products: SalesCatalogItem[] = []) {
  return withQuoteMargin(calculateQuoteTotals(items, products));
}

export function getRoundedMargin(value: number) {
  return Math.round(value);
}
