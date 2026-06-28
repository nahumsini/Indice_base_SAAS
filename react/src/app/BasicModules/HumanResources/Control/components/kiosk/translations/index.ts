import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { KioskLocale, KioskTranslations } from './types';

export type { KioskLocale, KioskTranslations } from './types';

export const kioskLocaleOptions: ReadonlyArray<{ code: KioskLocale; label: string }> = [
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-CO', label: 'Español (Colombia)' },
  { code: 'en-US', label: 'English (USA)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'fr-CA', label: 'Français (Canada)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'ko-CA', label: '한국어 (Canada)' },
  { code: 'zh-CA', label: '中文 (Canada)' },
];

export const kioskTranslations: Record<KioskLocale, KioskTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

const fallbackLocale: KioskLocale = 'en-CA';
const supportedLocales = new Set<KioskLocale>(kioskLocaleOptions.map((option) => option.code));

export function isKioskLocale(value?: string | null): value is KioskLocale {
  return supportedLocales.has(value as KioskLocale);
}

export function resolveKioskLocale(value?: string | null): KioskLocale {
  if (isKioskLocale(value)) {
    return value;
  }

  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized.startsWith('es-co')) return 'es-CO';
  if (normalized.startsWith('es')) return 'es-MX';
  if (normalized.startsWith('en-us')) return 'en-US';
  if (normalized.startsWith('en-ca')) return 'en-CA';
  if (normalized.startsWith('en')) return 'en-CA';
  if (normalized.startsWith('fr')) return 'fr-CA';
  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('ko')) return 'ko-CA';
  if (normalized.startsWith('zh')) return 'zh-CA';

  return fallbackLocale;
}

export function getKioskTranslations(locale?: string | null): KioskTranslations {
  return kioskTranslations[resolveKioskLocale(locale)] ?? kioskTranslations[fallbackLocale];
}

const countryLocaleMap: Partial<Record<string, KioskLocale>> = {
  MX: 'es-MX',
  CO: 'es-CO',
  US: 'en-US',
  BR: 'pt-BR',
  KR: 'ko-CA',
  CN: 'zh-CA',
  HK: 'zh-CA',
  TW: 'zh-CA',
  SG: 'zh-CA',
};

function localeFromTimeZone(timeZone?: string) {
  if (!timeZone) {
    return null;
  }

  if (/Mexico/i.test(timeZone)) return 'es-MX';
  if (/Bogota/i.test(timeZone)) return 'es-CO';
  if (/Sao_Paulo|Brazil/i.test(timeZone)) return 'pt-BR';
  if (/Seoul/i.test(timeZone)) return 'ko-CA';
  if (/Shanghai|Hong_Kong|Taipei/i.test(timeZone)) return 'zh-CA';
  if (/Toronto|Vancouver|Montreal|Winnipeg|Edmonton|Halifax|Regina|St_Johns/i.test(timeZone)) return 'en-CA';
  if (/New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Honolulu/i.test(timeZone)) return 'en-US';

  return null;
}

export function resolveKioskLocaleFromSignals({
  countryCode,
  languageCodes,
  timeZone,
}: {
  countryCode?: string | null;
  languageCodes?: readonly string[];
  timeZone?: string;
} = {}): KioskLocale {
  const languages = languageCodes ?? [];
  const languageCandidate = languages.map(resolveKioskLocale).find((locale) => locale !== fallbackLocale);
  const normalizedCountry = countryCode?.trim().toUpperCase() ?? '';

  if (normalizedCountry === 'CA') {
    if (languageCandidate && languageCandidate !== 'en-US') {
      return languageCandidate;
    }
    if (languages.some((language) => language.toLowerCase().startsWith('fr'))) {
      return 'fr-CA';
    }
    return 'en-CA';
  }

  if (normalizedCountry && countryLocaleMap[normalizedCountry]) {
    return countryLocaleMap[normalizedCountry];
  }

  if (languageCandidate) {
    return languageCandidate;
  }

  return localeFromTimeZone(timeZone) ?? fallbackLocale;
}

async function fetchIpCountryCode() {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1600);

  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    return typeof payload?.country_code === 'string' ? payload.country_code : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function detectKioskLocale(): Promise<KioskLocale> {
  const languageCodes = typeof navigator === 'undefined'
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);
  const timeZone = typeof Intl === 'undefined'
    ? undefined
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countryCode = await fetchIpCountryCode();

  return resolveKioskLocaleFromSignals({
    countryCode,
    languageCodes,
    timeZone,
  });
}

export function getKioskGreeting(copy: KioskTranslations, date: Date) {
  const hour = date.getHours();
  if (hour < 12) {
    return copy.greetings.morning;
  }
  if (hour < 19) {
    return copy.greetings.afternoon;
  }
  return copy.greetings.evening;
}

function isSecondSundayOfMay(date: Date) {
  return date.getMonth() === 4
    && date.getDay() === 0
    && date.getDate() >= 8
    && date.getDate() <= 14;
}

export function getKioskMessage(copy: KioskTranslations, date: Date, locale?: KioskLocale) {
  const key = `${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  const mothersDayMessage = copy.messages.holidays['05-10' as keyof typeof copy.messages.holidays];
  const isMexicoMothersDay = locale === 'es-MX' && key === '05-10';
  const isFloatingMothersDay = locale !== 'es-MX' && isSecondSundayOfMay(date);
  const holidayMessage = isMexicoMothersDay || isFloatingMothersDay
    ? mothersDayMessage
    : key === '05-10'
      ? undefined
      : copy.messages.holidays[key as keyof typeof copy.messages.holidays];

  if (holidayMessage) {
    return holidayMessage;
  }

  const messages = copy.messages.default;
  return messages[date.getDate() % messages.length] ?? messages[0];
}
