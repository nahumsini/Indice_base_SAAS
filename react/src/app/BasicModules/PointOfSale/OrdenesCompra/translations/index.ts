import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import type { PurchaseOrderLocale, PurchaseOrderTranslations } from './types';
import { zhCA } from './zh-CA';

export type { PurchaseOrderLocale, PurchaseOrderTranslations } from './types';

const translations: Record<PurchaseOrderLocale, PurchaseOrderTranslations> = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-MX': esMX,
  'es-CO': esCO,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const purchaseOrderFallbackLocale: PurchaseOrderLocale = 'en-CA';

export function resolvePurchaseOrderLocale(locale: string | null | undefined): PurchaseOrderLocale {
  return locale && locale in translations ? locale as PurchaseOrderLocale : purchaseOrderFallbackLocale;
}

export function getPurchaseOrderTranslations(locale: string | null | undefined): PurchaseOrderTranslations {
  return translations[resolvePurchaseOrderLocale(locale)];
}
