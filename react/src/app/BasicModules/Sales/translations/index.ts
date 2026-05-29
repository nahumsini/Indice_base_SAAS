import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { SalesLocale, SalesTranslations } from './types';

export const salesTranslations = {
  'en-CA': enCA,
  'en-US': enUS,
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': esCO,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<SalesLocale, SalesTranslations>;

export function resolveSalesLocale(locale?: string): SalesLocale {
  if (locale && locale in salesTranslations) {
    return locale as SalesLocale;
  }

  return 'en-CA';
}

export function getSalesTranslations(locale?: string): SalesTranslations {
  return salesTranslations[resolveSalesLocale(locale)];
}

export type { SalesLocale, SalesTranslations } from './types';
