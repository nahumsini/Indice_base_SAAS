import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getProvidersTranslations,
  resolveProvidersLocale,
  type ProvidersLocale,
  type ProvidersTranslations,
} from '../translations';

export function useProvidersTranslations(): ProvidersTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getProvidersTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useProvidersResolvedLocale(): ProvidersLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveProvidersLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
