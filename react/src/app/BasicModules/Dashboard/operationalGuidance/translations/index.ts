import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PanelInicialGuidanceLocale, PanelInicialGuidanceTranslations } from './types';

export type { PanelInicialGuidanceLocale, PanelInicialGuidanceTranslations } from './types';

export const panelInicialGuidanceTranslations: Record<PanelInicialGuidanceLocale, PanelInicialGuidanceTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

const fallbackLocale: PanelInicialGuidanceLocale = 'en-CA';

export function isPanelInicialGuidanceLocale(
  locale: string | null | undefined,
): locale is PanelInicialGuidanceLocale {
  return Boolean(locale && locale in panelInicialGuidanceTranslations);
}

export function resolvePanelInicialGuidanceLocale(
  locale: string | null | undefined,
): PanelInicialGuidanceLocale {
  if (!locale) {
    return fallbackLocale;
  }

  const normalizedLocale = locale.trim();

  if (isPanelInicialGuidanceLocale(normalizedLocale)) {
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

export function getPanelInicialGuidanceTranslations(
  locale: string | null | undefined,
): PanelInicialGuidanceTranslations {
  return panelInicialGuidanceTranslations[resolvePanelInicialGuidanceLocale(locale)];
}
