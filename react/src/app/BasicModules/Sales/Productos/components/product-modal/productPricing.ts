import type { ProductFormState } from '../../types/productosTypes';

export type ProductGuidanceTone = 'neutral' | 'warning' | 'danger' | 'success';

export function getPriceBuilderSnapshot(form: ProductFormState) {
  const baseCost = Math.max(Number(form.cost) || 0, 0);
  const logisticsCost = Math.max(Number(form.logisticsCost) || 0, 0);
  const additionalCost = Math.max(Number(form.additionalCost) || 0, 0);
  const totalCost = baseCost + logisticsCost + additionalCost;
  const desiredMarginPercentage = Math.max(Number(form.desiredMarginPercentage) || 0, 0);
  const desiredMarginDecimal = desiredMarginPercentage > 0 && desiredMarginPercentage < 100
    ? desiredMarginPercentage / 100
    : 0;
  const suggestedPrice = totalCost > 0 && desiredMarginDecimal > 0
    ? totalCost / (1 - desiredMarginDecimal)
    : 0;
  const finalSalePrice = Math.max(Number(form.price) || 0, 0);
  const actualMargin = finalSalePrice > 0
    ? ((finalSalePrice - totalCost) / finalSalePrice) * 100
    : 0;

  return {
    baseCost,
    logisticsCost,
    additionalCost,
    totalCost,
    desiredMarginPercentage,
    suggestedPrice,
    finalSalePrice,
    actualMargin,
  };
}

export function getRoundedCurrencyValue(value: number) {
  return Math.round(value * 100) / 100;
}

export function getRoundedPercentValue(value: number) {
  return Math.round(value);
}

export function getMarginGuidance(form: ProductFormState): {
  tone: ProductGuidanceTone;
  labelKey: 'missingPrice' | 'missingCost' | 'danger' | 'warning' | 'healthy';
} {
  const snapshot = getPriceBuilderSnapshot(form);

  if (snapshot.finalSalePrice <= 0) {
    return { tone: 'neutral', labelKey: 'missingPrice' };
  }

  if (snapshot.totalCost <= 0) {
    return { tone: 'neutral', labelKey: 'missingCost' };
  }

  if (snapshot.actualMargin <= 0) {
    return { tone: 'danger', labelKey: 'danger' };
  }

  if (snapshot.actualMargin < 20) {
    return { tone: 'warning', labelKey: 'warning' };
  }

  return { tone: 'success', labelKey: 'healthy' };
}
