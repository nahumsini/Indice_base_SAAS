import { useMemo } from 'react';
import { useLanguage } from '../shared/context';
import { getProcessesTasksTranslations } from '../BasicModules/ProcessesTasks/translations';

export function useProcessesTasksTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => {
    const copy = getProcessesTasksTranslations(currentLanguage.code);

    return {
      title: copy.shell.title,
      subtitle: copy.shell.subtitle,
      back: copy.shell.back,
      tabs: copy.shell.tabs,
      shell: copy.shell,
      headers: copy.headers,
      agenda: copy.agenda,
      kpis: copy.kpis,
    };
  }, [currentLanguage.code]);
}
