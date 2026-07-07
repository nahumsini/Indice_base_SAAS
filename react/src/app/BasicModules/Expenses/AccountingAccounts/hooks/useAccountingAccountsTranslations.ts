import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getAccountingAccountsTranslations,
  resolveAccountingAccountsLocale,
  type AccountingAccountsLocale,
  type AccountingAccountsTranslations,
} from '../translations';

export function useAccountingAccountsTranslations(): AccountingAccountsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getAccountingAccountsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useAccountingAccountsResolvedLocale(): AccountingAccountsLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveAccountingAccountsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
