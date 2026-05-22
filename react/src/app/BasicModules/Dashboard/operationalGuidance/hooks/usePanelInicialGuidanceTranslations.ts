import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getPanelInicialGuidanceTranslations,
  resolvePanelInicialGuidanceLocale,
  type PanelInicialGuidanceTranslations,
} from '../translations';

export function usePanelInicialGuidanceTranslations(): PanelInicialGuidanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPanelInicialGuidanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePanelInicialGuidanceResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePanelInicialGuidanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
