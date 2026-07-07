import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PointOfSaleLocale, PointOfSaleTranslations } from './types';

export type { PointOfSaleLocale, PointOfSaleTranslations } from './types';

export const fallbackPointOfSaleLocale: PointOfSaleLocale = 'en-CA';

export const pointOfSaleTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<PointOfSaleLocale, PointOfSaleTranslations>;

export function resolvePointOfSaleLocale(locale?: string | null): PointOfSaleLocale {
  if (locale && Object.prototype.hasOwnProperty.call(pointOfSaleTranslations, locale)) {
    return locale as PointOfSaleLocale;
  }

  return fallbackPointOfSaleLocale;
}

export function getPointOfSaleTranslations(locale?: string | null): PointOfSaleTranslations {
  return pointOfSaleTranslations[resolvePointOfSaleLocale(locale)];
}
