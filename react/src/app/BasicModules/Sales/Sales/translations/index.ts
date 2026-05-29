import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { SalesRecordsLocale, SalesRecordsTranslations } from './types';

export const salesRecordsFallbackLocale: SalesRecordsLocale = 'en-CA';

export const salesRecordsTranslations = {
  'en-CA': enCA,
  'en-US': enUS,
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': esCO,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<SalesRecordsLocale, SalesRecordsTranslations>;

export function resolveSalesRecordsLocale(locale?: string | null): SalesRecordsLocale {
  if (locale && Object.prototype.hasOwnProperty.call(salesRecordsTranslations, locale)) {
    return locale as SalesRecordsLocale;
  }

  return salesRecordsFallbackLocale;
}

export function getSalesRecordsTranslations(locale?: string | null) {
  return salesRecordsTranslations[resolveSalesRecordsLocale(locale)];
}

export type { SalesRecordsLocale, SalesRecordsTranslations } from './types';
