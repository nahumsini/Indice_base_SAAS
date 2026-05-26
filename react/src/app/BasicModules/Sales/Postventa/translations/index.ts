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
import type { PostSalesLocale, PostSalesTranslations } from './types';

export const postSalesFallbackLocale: PostSalesLocale = 'en-CA';

export const postSalesTranslations: Record<PostSalesLocale, PostSalesTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolvePostSalesLocale(locale?: string | null): PostSalesLocale {
  if (locale && Object.prototype.hasOwnProperty.call(postSalesTranslations, locale)) {
    return locale as PostSalesLocale;
  }

  return postSalesFallbackLocale;
}

export function getPostSalesTranslations(locale?: string | null) {
  return postSalesTranslations[resolvePostSalesLocale(locale)];
}

export function usePostSalesTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getPostSalesTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { PostSalesLocale, PostSalesTranslations } from './types';
