import { enCA } from './en-CA';
import type { KioskTranslations } from './types';

export const enUS = {
  ...enCA,
  language: {
    ...enCA.language,
    autoDetected: 'Suggested from device/IP signals',
  },
  terminalSubtitle: 'Enter your PIN to begin. This station validates photo, GPS location, and attendance.',
  kioskDevice: 'Attendance station',
  deviceGpsRequired: 'GPS location required',
  identifiedHint: 'Complete photo verification and GPS location before recording attendance.',
  messages: {
    ...enCA.messages,
    default: [
      {
        title: 'Today is a good day to move forward.',
        body: 'Thanks for keeping the operation moving.',
        note: 'Every shift matters.',
      },
      {
        title: 'Welcome back.',
        body: 'Register your attendance and keep the team in sync.',
        note: 'Your work counts.',
      },
    ],
  },
} satisfies KioskTranslations;
