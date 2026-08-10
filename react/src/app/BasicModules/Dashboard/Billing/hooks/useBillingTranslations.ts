import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { getBillingTranslations } from '../translations';

export function useBillingTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(
    () => getBillingTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
