import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { InventoryModuleLocale, InventoryModuleTranslations } from './types';

export type { InventoryModuleLocale, InventoryModuleTranslations } from './types';

export const fallbackInventoryModuleLocale: InventoryModuleLocale = 'en-CA';

export const inventoryModuleTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} satisfies Record<InventoryModuleLocale, InventoryModuleTranslations>;

export function resolveInventoryModuleLocale(locale?: string | null): InventoryModuleLocale {
  if (locale && Object.prototype.hasOwnProperty.call(inventoryModuleTranslations, locale)) {
    return locale as InventoryModuleLocale;
  }

  return fallbackInventoryModuleLocale;
}

export function getInventoryModuleTranslations(locale?: string | null): InventoryModuleTranslations {
  return inventoryModuleTranslations[resolveInventoryModuleLocale(locale)];
}
