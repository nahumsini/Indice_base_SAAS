import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { HumanResourcesGuidanceLocale, HumanResourcesGuidanceTranslations } from './types';

export type { HumanResourcesGuidanceLocale, HumanResourcesGuidanceTranslations } from './types';

export const humanResourcesGuidanceTranslations: Record<HumanResourcesGuidanceLocale, HumanResourcesGuidanceTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

const fallbackLocale: HumanResourcesGuidanceLocale = 'en-CA';

export function isHumanResourcesGuidanceLocale(
  locale: string | null | undefined,
): locale is HumanResourcesGuidanceLocale {
  return Boolean(locale && locale in humanResourcesGuidanceTranslations);
}

export function resolveHumanResourcesGuidanceLocale(
  locale: string | null | undefined,
): HumanResourcesGuidanceLocale {
  if (!locale) {
    return fallbackLocale;
  }

  const normalizedLocale = locale.trim();

  if (isHumanResourcesGuidanceLocale(normalizedLocale)) {
    return normalizedLocale;
  }

  const loweredLocale = normalizedLocale.toLowerCase();

  if (loweredLocale.startsWith('es-co')) {
    return 'es-CO';
  }

  if (loweredLocale.startsWith('es')) {
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

export function getHumanResourcesGuidanceTranslations(
  locale: string | null | undefined,
): HumanResourcesGuidanceTranslations {
  return humanResourcesGuidanceTranslations[resolveHumanResourcesGuidanceLocale(locale)];
}
