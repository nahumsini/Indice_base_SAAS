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
import type { KpisLocale, KpisTranslations } from './types';

export const kpisFallbackLocale: KpisLocale = 'en-CA';

export const kpisTranslations: Record<KpisLocale, KpisTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const defaultKpisTranslations = esMX;

export function resolveKpisLocale(locale?: string | null): KpisLocale {
  if (locale && Object.prototype.hasOwnProperty.call(kpisTranslations, locale)) {
    return locale as KpisLocale;
  }

  return kpisFallbackLocale;
}

export function getKpisTranslations(locale?: string | null) {
  return kpisTranslations[resolveKpisLocale(locale)];
}

export function useKpisTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getKpisTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { KpisLocale, KpisTranslations } from './types';
