import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { AttendanceLocale, AttendanceTranslations } from './types';

export type { AttendanceLocale, AttendanceTranslations } from './types';

export const fallbackAttendanceLocale: AttendanceLocale = 'en-CA';

export const attendanceTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<AttendanceLocale, AttendanceTranslations>;

export function resolveAttendanceLocale(locale?: string): AttendanceLocale {
  if (locale && locale in attendanceTranslations) {
    return locale as AttendanceLocale;
  }

  return fallbackAttendanceLocale;
}

export function getAttendanceTranslations(locale?: string): AttendanceTranslations {
  return attendanceTranslations[resolveAttendanceLocale(locale)];
}
