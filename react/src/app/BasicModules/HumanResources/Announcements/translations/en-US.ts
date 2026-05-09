import { enCA } from './en-CA';
import type { AnnouncementsTranslations } from './types';

export const enUS = {
  ...enCA,
  pageSubtitle: 'Internal updates, targeted messages, and scheduled HR communications.',
  modal: {
    ...enCA.modal,
    subtitle: 'Create, target, and schedule internal HR updates.',
  },
} as const satisfies AnnouncementsTranslations;
