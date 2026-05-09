import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getAnnouncementsTranslations,
  resolveAnnouncementsLocale,
  type AnnouncementsTranslations,
} from '../translations';

export function useAnnouncementsTranslations(): AnnouncementsTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getAnnouncementsTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useAnnouncementsResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveAnnouncementsLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
