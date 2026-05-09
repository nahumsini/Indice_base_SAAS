import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { AssetsLocale, AssetsTranslations } from './types';

export type {
  AddNewAssetCopy,
  AssetColumnPickerCopy,
  AssetDetailsCopy,
  AssetFiltersCopy,
  AssetHeaderCopy,
  AssetKpiCopy,
  AssetsLocale,
  AssetsTranslations,
} from './types';

export const fallbackAssetsLocale: AssetsLocale = 'en-CA';

export const assetsTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<AssetsLocale, AssetsTranslations>;

export function resolveAssetsLocale(locale?: string): AssetsLocale {
  if (locale && locale in assetsTranslations) {
    return locale as AssetsLocale;
  }

  return fallbackAssetsLocale;
}

export function getAssetsTranslations(locale?: string): AssetsTranslations {
  return assetsTranslations[resolveAssetsLocale(locale)];
}
