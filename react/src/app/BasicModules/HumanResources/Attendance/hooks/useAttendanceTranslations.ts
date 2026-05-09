import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getAttendanceTranslations,
  resolveAttendanceLocale,
  type AttendanceTranslations,
} from '../translations';

export function useAttendanceTranslations(): AttendanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getAttendanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useAttendanceResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveAttendanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
