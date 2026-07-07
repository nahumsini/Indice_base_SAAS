import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ReceivablesLocale, ReceivablesTranslations } from './types';

export type { ReceivablesLocale, ReceivablesTranslations } from './types';

export const fallbackReceivablesLocale: ReceivablesLocale = 'en-CA';

export const receivablesTranslations = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-CO': esCO,
  'es-MX': esMX,
  'fr-CA': frCA,
  'ko-CA': koCA,
  'pt-BR': ptBR,
  'zh-CA': zhCA,
} as const satisfies Record<ReceivablesLocale, ReceivablesTranslations>;

export function resolveReceivablesLocale(locale?: string): ReceivablesLocale {
  if (locale && locale in receivablesTranslations) {
    return locale as ReceivablesLocale;
  }

  return fallbackReceivablesLocale;
}

export function getReceivablesTranslations(locale?: string): ReceivablesTranslations {
  return receivablesTranslations[resolveReceivablesLocale(locale)];
}
