import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PermissionsLocale, PermissionsTranslations } from './types';

export type { PermissionsLocale, PermissionsTranslations } from './types';

export const fallbackPermissionsLocale: PermissionsLocale = 'en-CA';

export const permissionsTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<PermissionsLocale, PermissionsTranslations>;

export function resolvePermissionsLocale(locale?: string): PermissionsLocale {
  if (locale && locale in permissionsTranslations) {
    return locale as PermissionsLocale;
  }

  return fallbackPermissionsLocale;
}

export function getPermissionsTranslations(locale?: string): PermissionsTranslations {
  return permissionsTranslations[resolvePermissionsLocale(locale)];
}
