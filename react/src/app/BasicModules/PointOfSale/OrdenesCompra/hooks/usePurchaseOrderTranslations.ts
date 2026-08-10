import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { getPurchaseOrderTranslations, resolvePurchaseOrderLocale } from '../translations';

export function usePurchaseOrderTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => {
    const locale = resolvePurchaseOrderLocale(currentLanguage.code);
    return { copy: getPurchaseOrderTranslations(locale), locale };
  }, [currentLanguage.code]);
}
