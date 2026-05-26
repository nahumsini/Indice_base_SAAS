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
import type { QuotesLocale, QuotesTranslations } from './types';

export const quotesFallbackLocale: QuotesLocale = 'en-CA';

export const quotesTranslations: Record<QuotesLocale, QuotesTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveQuotesLocale(locale?: string | null): QuotesLocale {
  if (locale && Object.prototype.hasOwnProperty.call(quotesTranslations, locale)) {
    return locale as QuotesLocale;
  }

  return quotesFallbackLocale;
}

export function getQuotesTranslations(locale?: string | null) {
  return quotesTranslations[resolveQuotesLocale(locale)];
}

export function useQuotesTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getQuotesTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { QuotesLocale, QuotesTranslations } from './types';
