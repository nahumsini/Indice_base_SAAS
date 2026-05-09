import { enCA } from './en-CA';
import type { ControlTranslations } from './types';

export const enUS = {
  ...enCA,
  subtitle: 'Monitor attendance in real time and manage operational settings.',
  kpi: {
    ...enCA.kpi,
    checkIns: 'clock-ins',
    checkOuts: 'clock-outs',
    operationRate: 'clocked in',
    summaryInsight: ({ activeShiftCount, checkInsCount, reviewCount, totalCount }: Parameters<ControlTranslations['kpi']['summaryInsight']>[0]) => {
      if (totalCount === 0) {
        return "Today's operation: no HR users for this date.";
      }

      const reviewText = reviewCount > 0
        ? `${reviewCount} need follow-up.`
        : 'no pending incidents.';

      return `Today's operation: ${checkInsCount} of ${totalCount} HR users have clocked in, ${activeShiftCount} are still on shift, and ${reviewText}`;
    },
  },
} satisfies ControlTranslations;
