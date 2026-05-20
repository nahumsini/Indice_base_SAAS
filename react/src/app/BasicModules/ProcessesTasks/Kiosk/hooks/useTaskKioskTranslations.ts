import { useCallback, useEffect, useMemo, useState } from 'react';
import { languages, useLanguage } from '../../../../shared/context';
import {
  detectTaskKioskLocale,
  getTaskKioskTranslations,
  isTaskKioskLocale,
  resolveTaskKioskLocale,
  taskKioskLocaleOptions,
  type TaskKioskLocale,
} from '../translations';

const taskKioskLanguageStorageKey = 'indice.process-tasks.public-kiosk.locale';

const readStoredTaskKioskLocale = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedLocale = window.localStorage.getItem(taskKioskLanguageStorageKey);
  return isTaskKioskLocale(storedLocale) ? storedLocale : null;
};

export function useTaskKioskTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getTaskKioskTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useTaskKioskLocaleControls() {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [detectedLocale, setDetectedLocale] = useState<TaskKioskLocale | null>(null);
  const selectedLocale = resolveTaskKioskLocale(currentLanguage.code);

  const setTaskKioskLocale = useCallback((locale: TaskKioskLocale) => {
    const nextLanguage = languages.find((language) => language.code === locale);
    if (!nextLanguage) {
      return;
    }

    setCurrentLanguage(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(taskKioskLanguageStorageKey, locale);
    }
  }, [setCurrentLanguage]);

  useEffect(() => {
    let active = true;
    const storedLocale = readStoredTaskKioskLocale();

    if (storedLocale) {
      setDetectedLocale(storedLocale);
      setTaskKioskLocale(storedLocale);
      return () => {
        active = false;
      };
    }

    void detectTaskKioskLocale().then((locale) => {
      if (!active) {
        return;
      }

      setDetectedLocale(locale);
      setTaskKioskLocale(locale);
    });

    return () => {
      active = false;
    };
  }, [setTaskKioskLocale]);

  return useMemo(() => ({
    detectedLocale,
    localeOptions: taskKioskLocaleOptions,
    selectedLocale,
    setTaskKioskLocale,
  }), [detectedLocale, selectedLocale, setTaskKioskLocale]);
}
