import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getExpensesTranslations,
  resolveExpensesLocale,
  type ExpensesLocale,
  type ExpensesTranslations,
} from '../translations';

export function useExpensesTranslations(): ExpensesTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getExpensesTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useExpensesResolvedLocale(): ExpensesLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveExpensesLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
