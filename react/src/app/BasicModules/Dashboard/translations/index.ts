import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { PanelInicialLocale, PanelInicialShellTranslations } from './types';

export type { PanelInicialLocale, PanelInicialShellTranslations } from './types';

const translations: Record<PanelInicialLocale, PanelInicialShellTranslations> = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-MX': esMX,
  'es-CO': esCO,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function resolvePanelInicialLocale(locale: string | null | undefined): PanelInicialLocale {
  const normalized = locale?.trim().toLowerCase() ?? '';
  if (normalized.startsWith('es-co')) return 'es-CO';
  if (normalized.startsWith('es')) return 'es-MX';
  if (normalized.startsWith('fr')) return 'fr-CA';
  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('ko')) return 'ko-CA';
  if (normalized.startsWith('zh')) return 'zh-CA';
  if (normalized.startsWith('en-us')) return 'en-US';
  return 'en-CA';
}

export function getPanelInicialTranslations(locale: string | null | undefined) {
  return translations[resolvePanelInicialLocale(locale)];
}
