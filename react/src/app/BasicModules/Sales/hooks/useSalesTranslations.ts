import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import { getSalesTranslations } from '../translations';

export function useSalesTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getSalesTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
