import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import {
  getFinanceTranslations as getExpensesModuleTranslations,
  resolveFinanceLocale as resolveExpensesModuleLocale,
  type FinanceLocale as ExpensesModuleLocale,
  type FinanceTranslations as ExpensesModuleTranslations,
} from '../translations';

export function useExpensesModuleTranslations(): ExpensesModuleTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getExpensesModuleTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useExpensesModuleResolvedLocale(): ExpensesModuleLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveExpensesModuleLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
