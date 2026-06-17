import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { SalesGuidanceLocale, SalesGuidanceTranslations } from './types';

export type { SalesGuidanceLocale, SalesGuidanceTranslations } from './types';

export const salesGuidanceTranslations: Record<SalesGuidanceLocale, SalesGuidanceTranslations> = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-MX': esMX,
  'es-CO': esCO,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

const fallbackLocale: SalesGuidanceLocale = 'en-CA';

export function isSalesGuidanceLocale(locale: string | null | undefined): locale is SalesGuidanceLocale {
  return Boolean(locale && locale in salesGuidanceTranslations);
}

export function resolveSalesGuidanceLocale(locale: string | null | undefined): SalesGuidanceLocale {
  if (!locale) {
    return fallbackLocale;
  }

  const normalizedLocale = locale.trim();

  if (isSalesGuidanceLocale(normalizedLocale)) {
    return normalizedLocale;
  }

  const loweredLocale = normalizedLocale.toLowerCase();

  if (loweredLocale.startsWith('es-co')) {
    return 'es-CO';
  }

  if (loweredLocale.startsWith('es-')) {
    return 'es-MX';
  }

  if (loweredLocale.startsWith('pt')) {
    return 'pt-BR';
  }

  if (loweredLocale.startsWith('fr')) {
    return 'fr-CA';
  }

  if (loweredLocale.startsWith('ko')) {
    return 'ko-CA';
  }

  if (loweredLocale.startsWith('zh')) {
    return 'zh-CA';
  }

  if (loweredLocale.startsWith('en-us')) {
    return 'en-US';
  }

  return fallbackLocale;
}

export function getSalesGuidanceTranslations(locale: string | null | undefined): SalesGuidanceTranslations {
  return salesGuidanceTranslations[resolveSalesGuidanceLocale(locale)];
}
