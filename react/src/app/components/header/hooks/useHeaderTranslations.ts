import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import { getHeaderTranslations, resolveHeaderLocale } from '../translations';

export function useHeaderTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(() => {
    const locale = resolveHeaderLocale(currentLanguage.code);
    return { copy: getHeaderTranslations(locale), locale };
  }, [currentLanguage.code]);
}
