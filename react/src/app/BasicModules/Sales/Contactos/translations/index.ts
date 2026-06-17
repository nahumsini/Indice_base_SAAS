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
  contactLearningTranslations,
  resolveContactLearningLocale,
} from './contactLearning';
import type {
  ContactLearningCopy,
  ContactosLocale,
  ContactosTranslations,
} from './types';

export const contactosFallbackLocale: ContactosLocale = 'en-CA';

export const contactosTranslations: Record<ContactosLocale, ContactosTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveContactosLocale(locale?: string | null): ContactosLocale {
  if (locale && Object.prototype.hasOwnProperty.call(contactosTranslations, locale)) {
    return locale as ContactosLocale;
  }

  return contactosFallbackLocale;
}

export function getContactosTranslations(locale?: string | null) {
  return contactosTranslations[resolveContactosLocale(locale)];
}

export function useContactosTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getContactosTranslations(currentLanguage.code), [currentLanguage.code]);
}

export function getContactosLearningTranslations(locale?: string | null): ContactLearningCopy {
  return contactLearningTranslations[resolveContactLearningLocale(locale)];
}

export function useContactosLearningTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getContactosLearningTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type {
  ContactCopy,
  ContactLearningCopy,
  ContactLearningTranslations,
  ContactosLocale,
  ContactosTranslations,
} from './types';
