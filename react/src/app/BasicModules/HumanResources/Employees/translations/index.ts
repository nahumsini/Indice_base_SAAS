import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { EmployeesLocale, EmployeesTranslations } from './types';

export type { EmployeesLocale, EmployeesTranslations } from './types';

export const fallbackEmployeesLocale: EmployeesLocale = 'en-CA';

export const employeesTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<EmployeesLocale, EmployeesTranslations>;

export function resolveEmployeesLocale(locale?: string): EmployeesLocale {
  if (locale && locale in employeesTranslations) {
    return locale as EmployeesLocale;
  }

  return fallbackEmployeesLocale;
}

export function getEmployeesTranslations(locale?: string): EmployeesTranslations {
  return employeesTranslations[resolveEmployeesLocale(locale)];
}
