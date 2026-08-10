import { resolvePanelInicialLocale } from '../../translations';
import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ConsultingTranslations } from './types';

const translations: Record<string, ConsultingTranslations> = {
  'en-CA': enCA, 'en-US': enUS, 'es-MX': esMX, 'es-CO': esCO,
  'fr-CA': frCA, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA,
};

export function getConsultingTranslations(locale: string | null | undefined): ConsultingTranslations {
  const resolved = resolvePanelInicialLocale(locale);
  return translations[resolved] ?? enCA;
}

export type { ConsultingTranslations } from './types';
