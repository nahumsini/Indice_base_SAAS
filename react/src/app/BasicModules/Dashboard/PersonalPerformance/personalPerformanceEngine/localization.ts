import { resolvePersonalPerformanceLocale } from '../translations';

export type HumanEngineLanguage = 'es' | 'en' | 'fr' | 'pt' | 'ko' | 'zh';

export const getHumanEngineLanguage = (locale: string): HumanEngineLanguage => {
  const normalizedLocale = resolvePersonalPerformanceLocale(locale);

  if (normalizedLocale === 'es-MX' || normalizedLocale === 'es-CO') {
    return 'es';
  }
  if (normalizedLocale === 'fr-CA') {
    return 'fr';
  }
  if (normalizedLocale === 'pt-BR') {
    return 'pt';
  }
  if (normalizedLocale === 'ko-CA') {
    return 'ko';
  }
  if (normalizedLocale === 'zh-CA') {
    return 'zh';
  }

  return 'en';
};
