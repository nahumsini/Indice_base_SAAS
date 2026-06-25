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
import {
  prospectosLearningTranslations,
  resolveProspectosLearningLocale,
} from './prospectosLearning';
import type {
  ProspectosLearningCopy,
  ProspectosLocale,
  ProspectosTranslations,
} from './types';

export const prospectosFallbackLocale: ProspectosLocale = 'en-CA';

export const prospectosTranslationsByLocale: Record<ProspectosLocale, ProspectosTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveProspectosLocaleKey(locale?: string | null): ProspectosLocale {
  if (locale && Object.prototype.hasOwnProperty.call(prospectosTranslationsByLocale, locale)) {
    return locale as ProspectosLocale;
  }

  return prospectosFallbackLocale;
}

export function getProspectosTranslations(locale?: string | null) {
  return prospectosTranslationsByLocale[resolveProspectosLocaleKey(locale)];
}

export function useProspectosTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getProspectosTranslations(currentLanguage.code), [currentLanguage.code]);
}

export function getProspectosLearningTranslations(locale?: string | null): ProspectosLearningCopy {
  return prospectosLearningTranslations[resolveProspectosLearningLocale(locale)];
}

export function useProspectosLearningTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getProspectosLearningTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type {
  ProspectosCopy,
  ProspectosLearningCopy,
  ProspectosLearningTranslations,
  ProspectosLocale,
  ProspectosTranslations,
} from './types';
