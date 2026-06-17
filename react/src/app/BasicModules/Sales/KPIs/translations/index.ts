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
import type { SalesKpisLocale, SalesKpisTranslations } from './types';

export const salesKpisFallbackLocale: SalesKpisLocale = 'en-CA';

export const salesKpisTranslations: Record<SalesKpisLocale, SalesKpisTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveSalesKpisLocale(locale?: string | null): SalesKpisLocale {
  if (locale && Object.prototype.hasOwnProperty.call(salesKpisTranslations, locale)) {
    return locale as SalesKpisLocale;
  }

  return salesKpisFallbackLocale;
}

export function getSalesKpisTranslations(locale?: string | null) {
  return salesKpisTranslations[resolveSalesKpisLocale(locale)];
}

export function useSalesKpisTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getSalesKpisTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { SalesKpisLocale, SalesKpisTranslations } from './types';
