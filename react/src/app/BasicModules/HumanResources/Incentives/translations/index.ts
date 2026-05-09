import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { IncentivesLocale, IncentivesTranslations } from './types';

export type { IncentivesLocale, IncentivesTranslations } from './types';

export const fallbackIncentivesLocale: IncentivesLocale = 'en-CA';

export const incentivesTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<IncentivesLocale, IncentivesTranslations>;

export function resolveIncentivesLocale(locale?: string): IncentivesLocale {
  if (locale && locale in incentivesTranslations) {
    return locale as IncentivesLocale;
  }

  return fallbackIncentivesLocale;
}

export function getIncentivesTranslations(locale?: string): IncentivesTranslations {
  return incentivesTranslations[resolveIncentivesLocale(locale)];
}
