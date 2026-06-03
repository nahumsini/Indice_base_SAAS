import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { KPIsLocale, KPIsTranslations } from './types';

export const fallbackKPIsLocale: KPIsLocale = 'en-CA';

export const kpisTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<KPIsLocale, KPIsTranslations>;

export function resolveKPIsLocale(locale?: string): KPIsLocale {
  return locale && locale in kpisTranslations ? (locale as KPIsLocale) : fallbackKPIsLocale;
}

export function getKPIsTranslations(locale?: string): KPIsTranslations {
  return kpisTranslations[resolveKPIsLocale(locale)];
}

export type { KPIsLocale, KPIsTranslations };
