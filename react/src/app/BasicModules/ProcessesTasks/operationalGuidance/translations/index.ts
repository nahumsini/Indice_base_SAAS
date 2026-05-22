import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ProcessesTasksGuidanceLocale, ProcessesTasksGuidanceTranslations } from './types';

export type { ProcessesTasksGuidanceLocale, ProcessesTasksGuidanceTranslations } from './types';

export const processesTasksGuidanceTranslations: Record<ProcessesTasksGuidanceLocale, ProcessesTasksGuidanceTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

const fallbackLocale: ProcessesTasksGuidanceLocale = 'en-CA';

export function isProcessesTasksGuidanceLocale(
  locale: string | null | undefined,
): locale is ProcessesTasksGuidanceLocale {
  return Boolean(locale && locale in processesTasksGuidanceTranslations);
}

export function resolveProcessesTasksGuidanceLocale(
  locale: string | null | undefined,
): ProcessesTasksGuidanceLocale {
  if (!locale) {
    return fallbackLocale;
  }

  const normalizedLocale = locale.trim();

  if (isProcessesTasksGuidanceLocale(normalizedLocale)) {
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

export function getProcessesTasksGuidanceTranslations(
  locale: string | null | undefined,
): ProcessesTasksGuidanceTranslations {
  return processesTasksGuidanceTranslations[resolveProcessesTasksGuidanceLocale(locale)];
}
