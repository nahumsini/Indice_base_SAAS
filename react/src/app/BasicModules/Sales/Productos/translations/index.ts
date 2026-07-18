import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ProductsLocale, ProductsTranslations } from './types';

export const productsFallbackLocale: ProductsLocale = 'en-CA';

export const productsTranslations: Record<ProductsLocale, ProductsTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveProductsLocale(locale?: string | null): ProductsLocale {
  if (locale && Object.prototype.hasOwnProperty.call(productsTranslations, locale)) {
    return locale as ProductsLocale;
  }

  return productsFallbackLocale;
}

export function getProductsTranslations(locale?: string | null) {
  return productsTranslations[resolveProductsLocale(locale)];
}

export function useProductsTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getProductsTranslations(currentLanguage.code), [currentLanguage.code]);
}

export function useProductsResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => resolveProductsLocale(currentLanguage.code), [currentLanguage.code]);
}

export type { ProductsLocale, ProductsTranslations } from './types';
