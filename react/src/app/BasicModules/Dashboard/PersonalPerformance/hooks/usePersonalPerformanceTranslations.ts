import { useMemo } from 'react';

import { useLanguage } from '../../../../shared/context';
import {
  getPersonalPerformanceTranslations,
  resolvePersonalPerformanceLocale,
  type PersonalPerformanceLocale,
  type PersonalPerformanceTranslations,
} from '../translations';

export function usePersonalPerformanceTranslations(): PersonalPerformanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPersonalPerformanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePersonalPerformanceResolvedLocale(): PersonalPerformanceLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePersonalPerformanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
