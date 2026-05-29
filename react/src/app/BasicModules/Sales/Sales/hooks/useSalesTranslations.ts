import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { getSalesRecordsTranslations } from '../translations';

export function useSalesTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getSalesRecordsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
