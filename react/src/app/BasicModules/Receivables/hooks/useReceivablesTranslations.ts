import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import {
  getReceivablesTranslations,
  resolveReceivablesLocale,
  type ReceivablesTranslations,
} from '../translations';

export function useReceivablesTranslations(): ReceivablesTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getReceivablesTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useReceivablesResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveReceivablesLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
