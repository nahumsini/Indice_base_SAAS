import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PettyCashLocale, PettyCashTranslations } from './types';

export const pettyCashFallbackLocale: PettyCashLocale = 'en-CA';

export const pettyCashTranslations: Record<PettyCashLocale, PettyCashTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolvePettyCashLocale(locale?: string | null): PettyCashLocale {
  if (locale && Object.prototype.hasOwnProperty.call(pettyCashTranslations, locale)) {
    return locale as PettyCashLocale;
  }

  return pettyCashFallbackLocale;
}

export function getPettyCashTranslations(locale?: string | null) {
  return pettyCashTranslations[resolvePettyCashLocale(locale)];
}

export type { PettyCashLocale, PettyCashTranslations };
