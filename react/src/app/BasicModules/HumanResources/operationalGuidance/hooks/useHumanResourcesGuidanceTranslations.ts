import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getHumanResourcesGuidanceTranslations,
  resolveHumanResourcesGuidanceLocale,
  type HumanResourcesGuidanceTranslations,
} from '../translations';

export function useHumanResourcesGuidanceTranslations(): HumanResourcesGuidanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getHumanResourcesGuidanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useHumanResourcesGuidanceResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveHumanResourcesGuidanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
