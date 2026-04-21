import { useLanguage } from '../shared/context';
import { processesTasksTranslations } from '../locales/processesTasks';

export function useProcessesTasksTranslations() {
  const { currentLanguage } = useLanguage();
  return (
    processesTasksTranslations[currentLanguage.code as keyof typeof processesTasksTranslations] ||
    processesTasksTranslations['es-MX']
  );
}
