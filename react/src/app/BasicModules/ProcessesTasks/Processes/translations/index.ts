import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ProcessesLocale, ProcessesTranslations } from './types';

export const processesFallbackLocale: ProcessesLocale = 'en-CA';

export const processesTranslations: Record<ProcessesLocale, ProcessesTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const defaultProcessesTranslations = esMX;

export function resolveProcessesLocale(locale?: string | null): ProcessesLocale {
  if (locale && Object.prototype.hasOwnProperty.call(processesTranslations, locale)) {
    return locale as ProcessesLocale;
  }

  return processesFallbackLocale;
}

export function getProcessesTranslations(locale?: string | null) {
  return processesTranslations[resolveProcessesLocale(locale)];
}

export function useProcessesTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getProcessesTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { ProcessesLocale, ProcessesTranslations } from './types';
