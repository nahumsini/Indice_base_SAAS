import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getSalesGuidanceTranslations,
  resolveSalesGuidanceLocale,
  type SalesGuidanceTranslations,
} from '../translations';

export function useSalesGuidanceTranslations(): SalesGuidanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getSalesGuidanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useSalesGuidanceResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveSalesGuidanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
