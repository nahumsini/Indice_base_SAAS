import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { MainDashboardLocale, MainDashboardTranslations } from './types';

export type { MainDashboardLocale, MainDashboardTranslations } from './types';

export const mainDashboardTranslations: Record<MainDashboardLocale, MainDashboardTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const mainDashboardLocaleOptions: ReadonlyArray<{ locale: MainDashboardLocale; label: string }> = [
  { locale: 'es-MX', label: 'Español (México)' },
  { locale: 'es-CO', label: 'Español (Colombia)' },
  { locale: 'en-US', label: 'English (United States)' },
  { locale: 'en-CA', label: 'English (Canada)' },
  { locale: 'fr-CA', label: 'Français (Canada)' },
  { locale: 'pt-BR', label: 'Português (Brasil)' },
  { locale: 'ko-CA', label: '한국어 (Canada)' },
  { locale: 'zh-CA', label: '中文 (Canada)' },
];

const fallbackLocale: MainDashboardLocale = 'en-CA';

export function isMainDashboardLocale(locale: string | null | undefined): locale is MainDashboardLocale {
  return Boolean(locale && locale in mainDashboardTranslations);
}

export function resolveMainDashboardLocale(locale: string | null | undefined): MainDashboardLocale {
  if (!locale) {
    return fallbackLocale;
  }

  const normalizedLocale = locale.trim();

  if (isMainDashboardLocale(normalizedLocale)) {
    return normalizedLocale;
  }

  const loweredLocale = normalizedLocale.toLowerCase();

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

export function getMainDashboardTranslations(locale: string | null | undefined): MainDashboardTranslations {
  return mainDashboardTranslations[resolveMainDashboardLocale(locale)];
}
