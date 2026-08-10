import { enCA } from './en-CA';
import type { PurchaseOrderTranslations } from './types';

export const enUS = {
  ...enCA,
  submissionDetail: {
    ...enCA.submissionDetail,
    unresolvedWarning: (count: number) => `${count} item(s) are not linked to the product catalog. Review them before converting to a purchase order.`,
  },
} as const satisfies PurchaseOrderTranslations;
