import { enCA } from './en-CA';
import type { KPIsTranslations } from './types';

export const enUS = {
  ...enCA,
  subtitle: 'Key performance indicators for workforce, attendance, payroll, and operations.',
  notes: {
    ...enCA.notes,
    averageLabourCost: 'Average labor cost',
  },
} as const satisfies KPIsTranslations;
