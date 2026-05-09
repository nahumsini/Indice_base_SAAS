import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getPermissionsTranslations,
  resolvePermissionsLocale,
  type PermissionsTranslations,
} from '../translations';

export function usePermissionsTranslations(): PermissionsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getPermissionsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function usePermissionsResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolvePermissionsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
