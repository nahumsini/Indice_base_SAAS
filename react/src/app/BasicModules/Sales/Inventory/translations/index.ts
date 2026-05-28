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
import type { InventoryLocale, InventoryTranslations } from './types';

export const inventoryFallbackLocale: InventoryLocale = 'en-CA';

export const inventoryTranslations: Record<InventoryLocale, InventoryTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolveInventoryLocale(locale?: string | null): InventoryLocale {
  if (locale && Object.prototype.hasOwnProperty.call(inventoryTranslations, locale)) {
    return locale as InventoryLocale;
  }

  return inventoryFallbackLocale;
}

export function getInventoryTranslations(locale?: string | null) {
  return inventoryTranslations[resolveInventoryLocale(locale)];
}

export function useInventoryTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getInventoryTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { InventoryLocale, InventoryTranslations } from './types';
