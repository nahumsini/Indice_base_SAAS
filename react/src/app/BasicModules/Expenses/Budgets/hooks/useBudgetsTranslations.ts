import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getBudgetsTranslations,
  resolveBudgetsLocale,
  type BudgetsLocale,
  type BudgetsTranslations,
} from '../translations';

export function useBudgetsTranslations(): BudgetsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getBudgetsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useBudgetsResolvedLocale(): BudgetsLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveBudgetsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
