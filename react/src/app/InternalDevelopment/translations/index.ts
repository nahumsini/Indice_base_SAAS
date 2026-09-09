import { enCA, type InternalDevelopmentMessages } from './en-CA';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { ptBR } from './pt-BR';
import { koCA } from './ko-CA';
import { zhCA } from './zh-CA';

export type InternalDevelopmentLocale = 'en-CA' | 'en-US' | 'es-MX' | 'es-CO' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';
export const internalDevelopmentTranslations: Record<InternalDevelopmentLocale, InternalDevelopmentMessages> = {
  'en-CA': enCA, 'en-US': enCA, 'es-MX': esMX, 'es-CO': esMX,
  'fr-CA': frCA, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA,
};
export function internalDevelopmentLocale(locale: string | boolean = 'en-CA'): InternalDevelopmentLocale {
  if (typeof locale === 'boolean') return locale ? 'en-CA' : 'es-MX';
  return Object.prototype.hasOwnProperty.call(internalDevelopmentTranslations, locale) ? locale as InternalDevelopmentLocale : 'en-CA';
}
export function getInternalDevelopmentMessages(locale: string | boolean = 'en-CA'): InternalDevelopmentMessages {
  return internalDevelopmentTranslations[internalDevelopmentLocale(locale)];
}
export function formatInternalDevelopmentMessage(template: string, ...values: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (placeholder, index) => values[Number(index)] == null ? placeholder : String(values[Number(index)]));
}
