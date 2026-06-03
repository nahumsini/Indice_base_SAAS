import { enCA } from './en-CA';
import type { KPIsTranslations } from './types';

export const enUS = {
  ...enCA,
  subtitle: 'Operational indicators built from employees, attendance control, assets, permissions, and records.',
  notes: {
    ...enCA.notes,
    averageLabourCost: 'Average labor cost',
  },
} as const satisfies KPIsTranslations;
