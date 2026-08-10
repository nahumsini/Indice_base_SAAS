import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { getOrgChartTranslations } from '../translations';

export function useOrgChartTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(() => getOrgChartTranslations(currentLanguage.code), [currentLanguage.code]);
}
