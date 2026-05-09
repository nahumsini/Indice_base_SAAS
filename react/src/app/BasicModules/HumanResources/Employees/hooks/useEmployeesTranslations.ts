import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getEmployeesTranslations,
  resolveEmployeesLocale,
  type EmployeesTranslations,
} from '../translations';

export function useEmployeesTranslations(): EmployeesTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getEmployeesTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useEmployeesResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveEmployeesLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
