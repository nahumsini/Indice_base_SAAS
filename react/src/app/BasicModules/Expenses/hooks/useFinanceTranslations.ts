import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import {
  getFinanceTranslations,
  resolveFinanceLocale,
  type FinanceLocale,
  type FinanceTranslations,
} from '../translations';

export function useFinanceTranslations(): FinanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getFinanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useFinanceResolvedLocale(): FinanceLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveFinanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
