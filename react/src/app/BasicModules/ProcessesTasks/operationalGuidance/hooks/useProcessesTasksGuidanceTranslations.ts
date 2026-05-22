import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import {
  getProcessesTasksGuidanceTranslations,
  resolveProcessesTasksGuidanceLocale,
  type ProcessesTasksGuidanceTranslations,
} from '../translations';

export function useProcessesTasksGuidanceTranslations(): ProcessesTasksGuidanceTranslations {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => getProcessesTasksGuidanceTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
}

export function useProcessesTasksGuidanceResolvedLocale() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => resolveProcessesTasksGuidanceLocale(currentLanguage.code),
    [currentLanguage.code],
  );
}
