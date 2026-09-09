import { useLanguage } from '../../../shared/context';
import { formatExamMessage, getTrainingExamCopy } from './index';
import type { TrainingExamCopy } from './types';
export function useTrainingExamCopy() {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getTrainingExamCopy(locale);
  return { locale, copy, format: (key: keyof TrainingExamCopy, values: Record<string, string | number>) => formatExamMessage(copy, key, values) };
}
