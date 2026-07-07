import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getPaymentAccountsTranslations,
  resolvePaymentAccountsLocale,
  type PaymentAccountsLocale,
  type PaymentAccountsTranslations,
} from '../translations';

export function usePaymentAccountsTranslations(): PaymentAccountsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPaymentAccountsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePaymentAccountsResolvedLocale(): PaymentAccountsLocale {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePaymentAccountsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
