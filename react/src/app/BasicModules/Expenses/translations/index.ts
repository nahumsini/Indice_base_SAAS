import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { FinanceLocale, FinanceTranslations } from './types';

export type { FinanceColumnCopy, FinanceLocale, FinanceTranslations } from './types';

export const fallbackFinanceLocale: FinanceLocale = 'en-CA';

export const financeTranslations = {
  'en-CA': enCA,
  'en-US': enUS,
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': esCO,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<FinanceLocale, FinanceTranslations>;

export function resolveFinanceLocale(locale?: string): FinanceLocale {
  if (locale && locale in financeTranslations) {
    return locale as FinanceLocale;
  }

  return fallbackFinanceLocale;
}

export function getFinanceTranslations(locale?: string): FinanceTranslations {
  return financeTranslations[resolveFinanceLocale(locale)];
}
