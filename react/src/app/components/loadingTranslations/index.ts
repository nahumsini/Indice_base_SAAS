import { copy as enCA } from './en-CA';
import { copy as enUS } from './en-US';
import { copy as esMX } from './es-MX';
import { copy as esCO } from './es-CO';
import { copy as frCA } from './fr-CA';
import { copy as ptBR } from './pt-BR';
import { copy as koCA } from './ko-CA';
import { copy as zhCA } from './zh-CA';
import type { LoadingBarCopy, LoadingBarMessage, LoadingBarVariant } from './types';

export type { LoadingBarVariant } from './types';

export const loadingBarCopies: Record<string, LoadingBarCopy> = {
  'en-CA': enCA, 'en-US': enUS, 'es-MX': esMX, 'es-CO': esCO,
  'fr-CA': frCA, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA,
};

export function getLoadingBarCopy(locale: string, variant: LoadingBarVariant): LoadingBarMessage {
  const copy = Object.prototype.hasOwnProperty.call(loadingBarCopies, locale) ? loadingBarCopies[locale] : enCA;
  return copy[variant];
}
