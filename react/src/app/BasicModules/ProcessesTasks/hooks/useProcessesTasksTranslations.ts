import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import { getProcessesTasksTranslations } from '../translations';

export function useProcessesTasksTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getProcessesTasksTranslations(currentLanguage.code), [currentLanguage.code]);
}
