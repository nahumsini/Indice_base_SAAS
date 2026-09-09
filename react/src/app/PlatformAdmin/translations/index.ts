import { messages as enCA } from './en-CA';
import { messages as enUS } from './en-US';
import { messages as esMX } from './es-MX';
import { messages as esCO } from './es-CO';
import { messages as frCA } from './fr-CA';
import { messages as ptBR } from './pt-BR';
import { messages as koCA } from './ko-CA';
import { messages as zhCA } from './zh-CA';
import type { PlatformAdminLocale, PlatformAdminMessages, PlatformAdminTranslator } from './types';
export type { PlatformAdminLocale, PlatformAdminMessages, PlatformAdminTranslator } from './types';
export const platformAdminMessages: Record<PlatformAdminLocale, PlatformAdminMessages> = {
  'en-CA': enCA, 'en-US': enUS, 'es-MX': esMX, 'es-CO': esCO,
  'fr-CA': frCA, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA,
};
export function resolvePlatformAdminLocale(code: string): PlatformAdminLocale {
  return Object.prototype.hasOwnProperty.call(platformAdminMessages, code) ? code as PlatformAdminLocale : 'en-CA';
}
const translators = new Map<PlatformAdminLocale, PlatformAdminTranslator>();
export function getPlatformAdminTranslator(code: string): PlatformAdminTranslator {
  const locale = resolvePlatformAdminLocale(code);
  let translator = translators.get(locale);
  if (!translator) {
    translator = (key, values = {}) => platformAdminMessages[locale][key].replace(/\{(\w+)\}/g, (token, name) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token);
    translators.set(locale, translator);
  }
  return translator;
}
