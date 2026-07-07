import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import {
  getPointOfSaleTranslations,
  resolvePointOfSaleLocale,
  type PointOfSaleTranslations,
} from '../translations';

export function usePointOfSaleTranslations(): PointOfSaleTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPointOfSaleTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePointOfSaleResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePointOfSaleLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
