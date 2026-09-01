import { resolvePanelInicialLocale } from '../../translations';
import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { IntegrationsTranslations } from './types';

const translations: Record<string, IntegrationsTranslations> = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-MX': esMX,
  'es-CO': esCO,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function getIntegrationsTranslations(locale: string | null | undefined) {
  return translations[resolvePanelInicialLocale(locale)] ?? enCA;
}

export type { IntegrationsTranslations } from './types';
