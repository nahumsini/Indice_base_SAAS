import { useMemo } from 'react';
import { useLanguage } from '../../shared/context';
import { getMainDashboardTranslations, resolveMainDashboardLocale } from '../translations';

export function useMainDashboardTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => {
    const locale = resolveMainDashboardLocale(currentLanguage.code);

    return getMainDashboardTranslations(locale);
  }, [currentLanguage.code]);
}
