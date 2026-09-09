import { enCA, type SalesProcessCopy } from './en-CA';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { ptBR } from './pt-BR';
import { koCA } from './ko-CA';
import { zhCA } from './zh-CA';
export type { SalesProcessCopy };
export type SalesProcessLocale = 'en-CA' | 'en-US' | 'es-MX' | 'es-CO' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';
export const salesProcessTranslations: Record<SalesProcessLocale, SalesProcessCopy> = {
  'en-CA': enCA, 'en-US': enCA, 'es-MX': esMX, 'es-CO': esMX,
  'fr-CA': frCA, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA,
};
export function getSalesProcessCopy(locale: string): SalesProcessCopy {
  return salesProcessTranslations[Object.prototype.hasOwnProperty.call(salesProcessTranslations, locale) ? locale as SalesProcessLocale : 'en-CA'];
}
