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
import type { DigitalContractsLocale, DigitalContractsTranslations } from './types';

export const digitalContractsFallbackLocale: DigitalContractsLocale = 'en-CA';

export const digitalContractsTranslations: Record<DigitalContractsLocale, DigitalContractsTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveDigitalContractsLocale(locale?: string | null): DigitalContractsLocale {
  if (locale && Object.prototype.hasOwnProperty.call(digitalContractsTranslations, locale)) {
    return locale as DigitalContractsLocale;
  }

  return digitalContractsFallbackLocale;
}

export function getDigitalContractsTranslations(locale?: string | null) {
  return digitalContractsTranslations[resolveDigitalContractsLocale(locale)];
}

export function useDigitalContractsTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getDigitalContractsTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { DigitalContractsLocale, DigitalContractsTranslations } from './types';
