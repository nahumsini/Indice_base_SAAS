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
import type { AgendaLocale, AgendaTranslations } from './types';

export const agendaFallbackLocale: AgendaLocale = 'en-CA';

export const agendaTranslations: Record<AgendaLocale, AgendaTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const defaultAgendaTranslations = esMX;

export function resolveAgendaLocale(locale?: string | null): AgendaLocale {
  if (locale && Object.prototype.hasOwnProperty.call(agendaTranslations, locale)) {
    return locale as AgendaLocale;
  }

  return agendaFallbackLocale;
}

export function getAgendaTranslations(locale?: string | null) {
  return agendaTranslations[resolveAgendaLocale(locale)];
}

export function useAgendaTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getAgendaTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { AgendaColumnCopy, AgendaLocale, AgendaTranslations } from './types';
