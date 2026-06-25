import type { SalesCatalogItem, SalesQuoteItem } from '../../types';
import { defaultSalesCurrency, normalizeSalesCurrencyCode } from '../../utils/salesCurrency';
import {
  convertSalesCurrencyAmount,
  getSalesExchangeSnapshot,
} from '../../utils/salesCurrencyConversion';
import { getTodayIsoDate } from '../../utils/salesCrmUtils';

export const getQuoteExchangeSnapshot = getSalesExchangeSnapshot;
export const convertQuoteCurrencyAmount = convertSalesCurrencyAmount;

function toFiniteNumber(value: unknown, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function findQuoteProduct(item: SalesQuoteItem, products: SalesCatalogItem[]) {
  return products.find((product) => product.id === item.productId || product.sku === item.sku);
}

export function repriceQuoteItemForCurrency(
  item: SalesQuoteItem,
  products: SalesCatalogItem[],
  targetCurrency?: string | null,
  exchangeRateDate = getTodayIsoDate(),
): SalesQuoteItem {
  const product = findQuoteProduct(item, products);
  const sourceCurrency = normalizeSalesCurrencyCode(
    item.originalCurrency ?? product?.currency ?? item.quoteCurrency ?? targetCurrency,
  );
  const quoteCurrency = normalizeSalesCurrencyCode(targetCurrency ?? item.quoteCurrency ?? defaultSalesCurrency);
  const originalUnitPrice = toFiniteNumber(item.originalUnitPrice, toFiniteNumber(product?.price, item.unitPrice));
  const originalUnitCost = toFiniteNumber(item.originalUnitCost, toFiniteNumber(product?.cost, item.unitCost));
  const priceConversion = convertQuoteCurrencyAmount(originalUnitPrice, sourceCurrency, quoteCurrency, exchangeRateDate);
  const costConversion = convertQuoteCurrencyAmount(originalUnitCost, sourceCurrency, quoteCurrency, exchangeRateDate);

  return {
    ...item,
    unitPrice: priceConversion.amount,
    unitCost: costConversion.amount,
    originalCurrency: sourceCurrency,
    originalUnitPrice,
    originalUnitCost,
    quoteCurrency,
    exchangeRate: priceConversion.exchangeRate,
    exchangeRateDate: priceConversion.exchangeRateDate,
    exchangeRateSource: priceConversion.exchangeRateSource,
    convertedUnitPrice: priceConversion.amount,
    convertedUnitCost: costConversion.amount,
  };
}

export function ensureQuoteItemCurrencySnapshot(
  item: SalesQuoteItem,
  products: SalesCatalogItem[],
  targetCurrency?: string | null,
  exchangeRateDate = getTodayIsoDate(),
): SalesQuoteItem {
  const quoteCurrency = normalizeSalesCurrencyCode(targetCurrency ?? item.quoteCurrency ?? defaultSalesCurrency);
  const hasSnapshot = Boolean(
    item.originalCurrency
    && item.originalUnitPrice !== undefined
    && item.quoteCurrency
    && item.exchangeRate
    && normalizeSalesCurrencyCode(item.quoteCurrency) === quoteCurrency,
  );

  if (!hasSnapshot) {
    return repriceQuoteItemForCurrency(item, products, quoteCurrency, exchangeRateDate);
  }

  return {
    ...item,
    quoteCurrency,
    convertedUnitPrice: item.convertedUnitPrice ?? item.unitPrice,
    convertedUnitCost: item.convertedUnitCost ?? item.unitCost,
  };
}

export function getQuoteLineExchangeRateLabel(exchangeRate?: number | null) {
  const rate = toFiniteNumber(exchangeRate, 1);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
    minimumFractionDigits: rate < 0.01 ? 4 : 2,
  }).format(rate);
}
