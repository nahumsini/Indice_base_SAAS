import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { BusinessDiagnosisPdfLocale, BusinessDiagnosisPdfTranslations } from './types';

export type {
  BusinessDiagnosisPdfLocale,
  BusinessDiagnosisPdfTranslations,
} from './types';

export const fallbackBusinessDiagnosisPdfLocale: BusinessDiagnosisPdfLocale = 'en-CA';

export const businessDiagnosisPdfTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<BusinessDiagnosisPdfLocale, BusinessDiagnosisPdfTranslations>;

export function resolveBusinessDiagnosisPdfLocale(locale?: string | null): BusinessDiagnosisPdfLocale {
  if (locale && Object.prototype.hasOwnProperty.call(businessDiagnosisPdfTranslations, locale)) {
    return locale as BusinessDiagnosisPdfLocale;
  }

  return fallbackBusinessDiagnosisPdfLocale;
}

export function getBusinessDiagnosisPdfTranslations(
  locale?: string | null,
): BusinessDiagnosisPdfTranslations {
  return businessDiagnosisPdfTranslations[resolveBusinessDiagnosisPdfLocale(locale)];
}
