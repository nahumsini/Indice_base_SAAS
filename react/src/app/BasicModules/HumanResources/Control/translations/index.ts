import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ControlLocale, ControlTranslations } from './types';

export type { ControlLocale, ControlTranslations } from './types';

export const fallbackControlLocale: ControlLocale = 'en-CA';

export const controlTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<ControlLocale, ControlTranslations>;

export function resolveControlLocale(locale?: string): ControlLocale {
  if (locale && locale in controlTranslations) {
    return locale as ControlLocale;
  }

  return fallbackControlLocale;
}

export function getControlTranslations(locale?: string): ControlTranslations {
  return controlTranslations[resolveControlLocale(locale)];
}
