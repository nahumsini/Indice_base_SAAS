import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getPayrollTranslations,
  resolvePayrollLocale,
  type PayrollTranslations,
} from '../translations';

export function usePayrollTranslations(): PayrollTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPayrollTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePayrollResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePayrollLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
