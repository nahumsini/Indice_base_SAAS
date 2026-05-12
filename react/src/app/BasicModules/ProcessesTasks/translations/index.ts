import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ProcessesTasksLocale, ProcessesTasksTranslations } from './types';

export const processesTasksFallbackLocale: ProcessesTasksLocale = 'en-CA';

export const processesTasksTranslations: Record<ProcessesTasksLocale, ProcessesTasksTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveProcessesTasksLocale(locale?: string | null): ProcessesTasksLocale {
  if (locale && Object.prototype.hasOwnProperty.call(processesTasksTranslations, locale)) {
    return locale as ProcessesTasksLocale;
  }

  return processesTasksFallbackLocale;
}

export function getProcessesTasksTranslations(locale?: string | null) {
  return processesTasksTranslations[resolveProcessesTasksLocale(locale)];
}

export type { ProcessesTasksLocale, ProcessesTasksTranslations };
