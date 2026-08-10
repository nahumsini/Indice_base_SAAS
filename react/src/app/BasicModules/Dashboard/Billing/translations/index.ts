import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { BillingLocale, BillingTranslations } from './types';

export type { BillingLocale, BillingTranslations } from './types';

const translations: Record<BillingLocale, BillingTranslations> = {
  'en-CA': enCA,
  'en-US': enUS,
  'fr-CA': frCA,
  'es-MX': esMX,
  'es-CO': esCO,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function getBillingTranslations(locale: string | null | undefined) {
  return translations[locale as BillingLocale] ?? translations['en-CA'];
}
