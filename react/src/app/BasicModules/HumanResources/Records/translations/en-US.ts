import { enCA } from './en-CA';
import type { RecordsTranslations } from './types';

export const enUS = {
  ...enCA,
} as const satisfies RecordsTranslations;
