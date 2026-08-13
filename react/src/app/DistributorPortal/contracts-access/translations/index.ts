import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import type { DistributorPortalCopy, DistributorPortalLocale } from './types';
import { zhCA } from './zh-CA';

const copies: Record<DistributorPortalLocale, DistributorPortalCopy> = {
  'en-CA': enCA,
  'en-US': enUS,
  'es-CO': esCO,
  'es-MX': esMX,
  'fr-CA': frCA,
  'ko-CA': koCA,
  'pt-BR': ptBR,
  'zh-CA': zhCA,
};

export function getDistributorPortalCopy(locale?: string | null) {
  return copies[locale as DistributorPortalLocale] ?? enCA;
}

export type { DistributorPortalCopy, DistributorPortalLocale } from './types';
