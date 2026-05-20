import { useCallback, useEffect, useMemo, useState } from 'react';
import { languages, useLanguage } from '../../../../../../shared/context';
import {
  detectKioskLocale,
  getKioskTranslations,
  isKioskLocale,
  kioskLocaleOptions,
  resolveKioskLocale,
  type KioskLocale,
} from '../translations';

const kioskLanguageStorageKey = 'indice.hr.public-kiosk.locale';

const readStoredKioskLocale = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedLocale = window.localStorage.getItem(kioskLanguageStorageKey);
  return isKioskLocale(storedLocale) ? storedLocale : null;
};

export function useKioskTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getKioskTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useKioskLocaleControls() {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [detectedLocale, setDetectedLocale] = useState<KioskLocale | null>(null);
  const selectedLocale = resolveKioskLocale(currentLanguage.code);

  const setKioskLocale = useCallback((locale: KioskLocale) => {
    const nextLanguage = languages.find((language) => language.code === locale);
    if (!nextLanguage) {
      return;
    }

    setCurrentLanguage(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(kioskLanguageStorageKey, locale);
    }
  }, [setCurrentLanguage]);

  useEffect(() => {
    let active = true;
    const storedLocale = readStoredKioskLocale();

    if (storedLocale) {
      setDetectedLocale(storedLocale);
      setKioskLocale(storedLocale);
      return () => {
        active = false;
      };
    }

    void detectKioskLocale().then((locale) => {
      if (!active) {
        return;
      }

      setDetectedLocale(locale);
      setKioskLocale(locale);
    });

    return () => {
      active = false;
    };
  }, [setKioskLocale]);

  return useMemo(() => ({
    detectedLocale,
    localeOptions: kioskLocaleOptions,
    selectedLocale,
    setKioskLocale,
  }), [detectedLocale, selectedLocale, setKioskLocale]);
}
