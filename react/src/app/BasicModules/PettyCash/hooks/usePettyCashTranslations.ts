import { useCallback, useMemo } from 'react';
import { languages, useLanguage } from '../../../shared/context';
import {
  getPettyCashTranslations,
  resolvePettyCashLocale,
  type PettyCashLocale,
  type PettyCashTranslations,
} from '../translations';

export function usePettyCashTranslations(): PettyCashTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPettyCashTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePettyCashResolvedLocale(): PettyCashLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePettyCashLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePettyCashLocaleControls() {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const selectedLocale = resolvePettyCashLocale(currentLanguage.code);

  const localeOptions = useMemo(
    () => languages.map((language) => ({
      code: language.code as PettyCashLocale,
      label: `${language.flag} ${language.code}`,
      name: language.name,
    })),
    [],
  );

  const setPettyCashLocale = useCallback((locale: PettyCashLocale) => {
    const nextLanguage = languages.find((language) => language.code === locale);
    if (nextLanguage) setCurrentLanguage(nextLanguage);
  }, [setCurrentLanguage]);

  return {
    localeOptions,
    selectedLocale,
    setPettyCashLocale,
  };
}
