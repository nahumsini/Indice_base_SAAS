import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { getUsersTranslations } from '../translations';

export function useUsersTranslations() {
  const { currentLanguage } = useLanguage();
  return useMemo(
    () => getUsersTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}
