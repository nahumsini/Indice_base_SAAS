import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { HumanResourcesLocale, HumanResourcesTranslations } from './types';

export type { HumanResourcesLocale, HumanResourcesTranslations } from './types';

export const fallbackHumanResourcesLocale: HumanResourcesLocale = 'en-CA';

export const humanResourcesTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<HumanResourcesLocale, HumanResourcesTranslations>;

export function resolveHumanResourcesLocale(locale?: string): HumanResourcesLocale {
  if (locale && locale in humanResourcesTranslations) {
    return locale as HumanResourcesLocale;
  }

  return fallbackHumanResourcesLocale;
}

export function getHumanResourcesTranslations(locale?: string): HumanResourcesTranslations {
  return humanResourcesTranslations[resolveHumanResourcesLocale(locale)];
}
