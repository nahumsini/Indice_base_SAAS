import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import {
  getInventoryModuleTranslations,
  resolveInventoryModuleLocale,
  type InventoryModuleTranslations,
} from '../translations';

export function useInventoryModuleTranslations(): InventoryModuleTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getInventoryModuleTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useInventoryModuleResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveInventoryModuleLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
