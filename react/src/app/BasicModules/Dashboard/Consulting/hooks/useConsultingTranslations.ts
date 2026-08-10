import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { getConsultingTranslations } from '../translations';

export function useConsultingTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(
    () => getConsultingTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
