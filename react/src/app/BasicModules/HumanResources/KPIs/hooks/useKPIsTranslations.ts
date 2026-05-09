import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getKPIsTranslations,
  resolveKPIsLocale,
  type KPIsTranslations,
} from '../translations';

export function useKPIsTranslations(): KPIsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getKPIsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useKPIsResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveKPIsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
