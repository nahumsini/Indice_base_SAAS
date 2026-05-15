import { enCA } from './en-CA';
import type { PersonalPerformanceTranslations } from './types';

export const enUS = {
  ...enCA,
  pdf: {
    ...enCA.pdf,
    fileName: 'Personal Performance Index (PPI).pdf',
  },
} satisfies PersonalPerformanceTranslations;
