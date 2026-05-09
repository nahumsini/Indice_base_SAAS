import { enCA } from './en-CA';
import type { AssetsTranslations } from './types';

export const enUS = {
  ...enCA,
  subtitle: 'Track assigned equipment, devices, custody, and maintenance.',
} as const satisfies AssetsTranslations;
