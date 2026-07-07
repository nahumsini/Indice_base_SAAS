import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getKpisTranslations,
  resolveKpisLocale,
  type KpisLocale,
  type KpisTranslations,
} from '../translations';

export function useKpisTranslations(): KpisTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getKpisTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useKpisResolvedLocale(): KpisLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveKpisLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
