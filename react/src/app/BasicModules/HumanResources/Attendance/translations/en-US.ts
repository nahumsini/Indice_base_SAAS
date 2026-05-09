import type { AttendanceTranslations } from './types';
import { enCA } from './en-CA';

export const enUS = {
  ...enCA,
  subtitle: 'Record your clock-in and clock-out with photo and location.',
  recorder: {
    ...enCA.recorder,
    checkIn: 'Clock in',
    checkOut: 'Clock out',
    checkInAlreadyRecorded: 'Clock-in has already been recorded for today.',
    checkOutRequiresCheckIn: 'Clock-out requires an active clock-in.',
    statusActiveTitle: 'You are clocked in.',
    statusActiveDescription: 'Clocked in at',
    statusCheckedOutTitle: 'You are clocked out for today.',
    statusCheckedOutDescription: 'Last clock-out recorded at',
    statusIdleTitle: 'You have not clocked in yet.',
    statusIdleDescription: 'Take a photo and capture your location when you are ready to clock in.',
    checkoutReadyHint: 'You are clocked in. Clock-out is ready when you are.',
  },
} as const satisfies AttendanceTranslations;
