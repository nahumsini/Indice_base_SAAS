import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { AnnouncementsLocale, AnnouncementsTranslations } from './types';

export type {
  AnnouncementColumnsModalCopy,
  AnnouncementDetailCopy,
  AnnouncementFiltersCopy,
  AnnouncementHeaderCopy,
  AnnouncementKpiCopy,
  AnnouncementTableCopy,
  AnnouncementsLocale,
  AnnouncementsTranslations,
  CreateAnnouncementModalCopy,
} from './types';

export const fallbackAnnouncementsLocale: AnnouncementsLocale = 'en-CA';

export const announcementsTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<AnnouncementsLocale, AnnouncementsTranslations>;

export function resolveAnnouncementsLocale(locale?: string): AnnouncementsLocale {
  if (locale && locale in announcementsTranslations) {
    return locale as AnnouncementsLocale;
  }

  return fallbackAnnouncementsLocale;
}

export function getAnnouncementsTranslations(locale?: string): AnnouncementsTranslations {
  return announcementsTranslations[resolveAnnouncementsLocale(locale)];
}
