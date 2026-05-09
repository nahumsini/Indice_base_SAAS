import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getRecordsTranslations,
  resolveRecordsLocale,
  type RecordsTranslations,
} from '../translations';

export function useRecordsTranslations(): RecordsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getRecordsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useRecordsResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveRecordsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
