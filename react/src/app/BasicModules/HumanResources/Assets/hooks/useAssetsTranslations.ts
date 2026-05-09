import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getAssetsTranslations,
  resolveAssetsLocale,
  type AssetsTranslations,
} from '../translations';

export function useAssetsTranslations(): AssetsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getAssetsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useAssetsResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveAssetsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
