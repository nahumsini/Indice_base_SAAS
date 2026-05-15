import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PersonalPerformanceLocale, PersonalPerformanceTranslations } from './types';

export type {
  PersonalPerformanceLocale,
  PersonalPerformancePdfCopy,
  PersonalPerformancePdfEditorialCopy,
  PersonalPerformanceTranslations,
} from './types';

export const fallbackPersonalPerformanceLocale: PersonalPerformanceLocale = 'en-CA';

export const personalPerformanceTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<PersonalPerformanceLocale, PersonalPerformanceTranslations>;

export function resolvePersonalPerformanceLocale(locale?: string): PersonalPerformanceLocale {
  if (locale && locale in personalPerformanceTranslations) {
    return locale as PersonalPerformanceLocale;
  }

  return fallbackPersonalPerformanceLocale;
}

export function getPersonalPerformanceTranslations(locale?: string): PersonalPerformanceTranslations {
  return personalPerformanceTranslations[resolvePersonalPerformanceLocale(locale)];
}
