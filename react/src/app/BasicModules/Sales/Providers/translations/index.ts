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
import type { SalesProvidersLocale, SalesProvidersTranslations } from './types';

export const salesProvidersFallbackLocale: SalesProvidersLocale = 'en-CA';

export const salesProvidersTranslations: Record<SalesProvidersLocale, SalesProvidersTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveSalesProvidersLocale(locale?: string | null): SalesProvidersLocale {
  if (locale && Object.prototype.hasOwnProperty.call(salesProvidersTranslations, locale)) {
    return locale as SalesProvidersLocale;
  }

  return salesProvidersFallbackLocale;
}

export function getSalesProvidersTranslations(locale?: string | null) {
  return salesProvidersTranslations[resolveSalesProvidersLocale(locale)];
}

export function useSalesProvidersTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getSalesProvidersTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { SalesProvidersLocale, SalesProvidersTranslations } from './types';
