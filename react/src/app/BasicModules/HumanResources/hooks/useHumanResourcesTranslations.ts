import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import {
  getHumanResourcesTranslations,
  resolveHumanResourcesLocale,
  type HumanResourcesTranslations,
} from '../translations';

export function useHumanResourcesTranslations(): HumanResourcesTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getHumanResourcesTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useHumanResourcesResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveHumanResourcesLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
