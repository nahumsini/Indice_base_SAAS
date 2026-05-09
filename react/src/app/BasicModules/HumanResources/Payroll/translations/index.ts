import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PayrollLocale, PayrollTranslations } from './types';

export type { PayrollLocale, PayrollTranslations } from './types';

export const fallbackPayrollLocale: PayrollLocale = 'en-CA';

export const payrollTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<PayrollLocale, PayrollTranslations>;

export function resolvePayrollLocale(locale?: string): PayrollLocale {
  if (locale && locale in payrollTranslations) {
    return locale as PayrollLocale;
  }

  return fallbackPayrollLocale;
}

export function getPayrollTranslations(locale?: string): PayrollTranslations {
  return payrollTranslations[resolvePayrollLocale(locale)];
}
