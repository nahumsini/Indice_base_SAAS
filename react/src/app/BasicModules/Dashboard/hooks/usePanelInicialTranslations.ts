import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import { getPanelInicialTranslations } from '../translations';

export function usePanelInicialTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPanelInicialTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
