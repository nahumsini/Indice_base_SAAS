import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getControlTranslations,
  resolveControlLocale,
  type ControlTranslations,
} from '../translations';

export function useControlTranslations(): ControlTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getControlTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useControlResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveControlLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
