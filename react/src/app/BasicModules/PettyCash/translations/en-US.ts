import { enCA } from './en-CA';
import type { PettyCashTranslations } from './types';

export const enUS = {
  ...enCA,
  locale: 'en-US',
  shell: {
    ...enCA.shell,
    subtitle: 'Manage cash funds, receipts, reconciliations, and financial visibility without double counting expenses.',
  },
} satisfies PettyCashTranslations;
