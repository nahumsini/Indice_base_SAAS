import type { messages } from './en-CA';
export type PlatformAdminLocale = 'en-CA' | 'en-US' | 'es-MX' | 'es-CO' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';
export type PlatformAdminMessageKey = keyof typeof messages;
export type PlatformAdminMessages = Record<PlatformAdminMessageKey, string>;
export type PlatformAdminTranslator = (key: PlatformAdminMessageKey, values?: Record<string, string | number>) => string;
