import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { RecordsLocale, RecordsTranslations } from './types';

export type {
  CreateRecordModalCopy,
  RecordColumnsModalCopy,
  RecordDetailCopy,
  RecordFiltersCopy,
  RecordHeaderCopy,
  RecordKpiCopy,
  RecordsListCopy,
  RecordsLocale,
  RecordsTranslations,
} from './types';

export const fallbackRecordsLocale: RecordsLocale = 'en-CA';

export const recordsTranslations = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
} as const satisfies Record<RecordsLocale, RecordsTranslations>;

export function resolveRecordsLocale(locale?: string): RecordsLocale {
  if (locale && locale in recordsTranslations) {
    return locale as RecordsLocale;
  }

  return fallbackRecordsLocale;
}

export function getRecordsTranslations(locale?: string): RecordsTranslations {
  return recordsTranslations[resolveRecordsLocale(locale)];
}
