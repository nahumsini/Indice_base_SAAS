import { enCA } from './en-CA';
import type { PayrollTranslations } from './types';

export const enUS = {
  ...enCA,
  labels: {
    ...enCA.labels,
    noJurisdiction: 'From employee profile',
  },
  rateConfiguration: {
    ...enCA.rateConfiguration,
    subtitles: {
      ...enCA.rateConfiguration.subtitles,
      usa: 'Define how payroll is calculated based on United States federal, state, and employer contribution rules.',
    },
  },
} as const satisfies PayrollTranslations;
