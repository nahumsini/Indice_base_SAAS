import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
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
