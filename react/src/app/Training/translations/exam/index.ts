import { copy as c0 } from './en-CA';
import { copy as c1 } from './es-MX';
import { copy as c2 } from './fr-CA';
import { copy as c3 } from './pt-BR';
import { copy as c4 } from './ko-CA';
import { copy as c5 } from './zh-CA';
import type { TrainingExamCopy } from './types';
export const trainingExamCopies: Record<string, TrainingExamCopy> = {'en-CA':c0,'en-US':c0,'es-MX':c1,'es-CO':c1,'fr-CA':c2,'pt-BR':c3,'ko-CA':c4,'zh-CA':c5};
export const getTrainingExamCopy = (locale: string): TrainingExamCopy => Object.prototype.hasOwnProperty.call(trainingExamCopies, locale) ? trainingExamCopies[locale] : c0;
export function formatExamMessage(copy: TrainingExamCopy, key: keyof TrainingExamCopy, values: Record<string, string | number>) {
  return copy[key].replace(/\{(\w+)\}/g, (token, name) => Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token);
}
