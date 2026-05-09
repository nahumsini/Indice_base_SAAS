import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const enUS = {
  ...enCA,
} as const satisfies PermissionsTranslations;
