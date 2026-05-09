import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getIncentivesTranslations,
  resolveIncentivesLocale,
  type IncentivesTranslations,
} from '../translations';

export function useIncentivesTranslations(): IncentivesTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getIncentivesTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useIncentivesResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveIncentivesLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
