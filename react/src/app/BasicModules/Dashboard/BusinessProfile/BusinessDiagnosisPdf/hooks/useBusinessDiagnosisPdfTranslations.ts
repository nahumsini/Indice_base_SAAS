import { useMemo } from 'react';

import { useLanguage } from '../../../../../shared/context';
import {
  getBusinessDiagnosisPdfTranslations,
  resolveBusinessDiagnosisPdfLocale,
  type BusinessDiagnosisPdfTranslations,
} from '../translations';

export function useBusinessDiagnosisPdfTranslations(): BusinessDiagnosisPdfTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getBusinessDiagnosisPdfTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useBusinessDiagnosisPdfResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveBusinessDiagnosisPdfLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
