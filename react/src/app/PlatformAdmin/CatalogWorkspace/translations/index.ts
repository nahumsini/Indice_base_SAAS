import { enCA, type CatalogCopy } from './en-CA';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { ptBR } from './pt-BR';
import { koCA } from './ko-CA';
import { zhCA } from './zh-CA';

export type CatalogLocale = 'en-CA' | 'en-US' | 'es-MX' | 'es-CO' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';
export type { CatalogCopy };
export const catalogTranslations: Record<CatalogLocale, CatalogCopy> = {
  'en-CA': enCA, 'en-US': enCA, 'es-MX': esMX, 'es-CO': esMX,
  'fr-CA': frCA, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA,
};

/** Boolean input remains supported for older callers; new callers pass the exact locale. */
export function catalogLocale(languageCode: string | boolean = 'en-CA'): CatalogLocale {
  if (typeof languageCode === 'boolean') return languageCode ? 'en-CA' : 'es-MX';
  return Object.prototype.hasOwnProperty.call(catalogTranslations, languageCode) ? languageCode as CatalogLocale : 'en-CA';
}

export function getCatalogCopy(languageCode: string | boolean = 'en-CA'): CatalogCopy {
  return catalogTranslations[catalogLocale(languageCode)];
}

export function formatCatalogCopy(template: string, ...values: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (placeholder, index) => values[Number(index)] == null ? placeholder : String(values[Number(index)]));
}

export function catalogLanguageLabel(sourceLocale: string, languageCode: string): string {
  const keys: Record<CatalogLocale, keyof CatalogCopy> = {
    'en-CA': 'localeEnCA', 'en-US': 'localeEnUS', 'es-MX': 'localeEsMX', 'es-CO': 'localeEsCO',
    'fr-CA': 'localeFrCA', 'pt-BR': 'localePtBR', 'ko-CA': 'localeKoCA', 'zh-CA': 'localeZhCA',
  };
  const key = keys[sourceLocale as CatalogLocale];
  return typeof key === "string" ? getCatalogCopy(languageCode)[key] : sourceLocale;
}
