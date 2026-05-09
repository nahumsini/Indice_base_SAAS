import { esMX } from './es-MX';
import type { IncentivesTranslations } from './types';

export const esCO = {
  ...esMX,
  kpis: {
    ...esMX.kpis,
    eligibleEmployees: 'personas elegibles',
  },
  newIncentive: {
    ...esMX.newIncentive,
    selectedCollaborators: (count: number) => `${count} personas`,
  },
} as const satisfies IncentivesTranslations;
