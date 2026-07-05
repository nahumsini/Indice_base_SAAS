import {
  type AttendanceCalendarDay,
  type AttendanceControlOverviewResponse,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';

export type AttendanceControlCopy = ControlTranslations;

type ControlAssignment = AttendanceControlOverviewResponse['assignments'][number];

export const statusClasses: Record<string, string> = {
  on_time: 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
  late: 'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
  leave: 'border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300',
  rest: 'border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  absence: 'border border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
  pending: 'border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
  not_scheduled: 'border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
  inactive: 'border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const assignmentBusyReasonFallback = '__assignment_busy__';

export function getAssignmentBusyReason(assignment: ControlAssignment, copy?: AttendanceControlCopy) {
  if (assignment.first_check_in_at || assignment.last_check_out_at) {
    return copy?.labels.assignmentBusyAttendanceRecorded ?? assignmentBusyReasonFallback;
  }
  if (assignment.active_work_site) {
    return copy?.labels.assignmentBusyContractSiteAssigned ?? assignmentBusyReasonFallback;
  }
  if (assignment.schedule_template_id) {
    return copy?.labels.assignmentBusyScheduleAssigned ?? assignmentBusyReasonFallback;
  }
  return '';
}

export const isAssignmentFreeForWork = (assignment: ControlAssignment) => !getAssignmentBusyReason(assignment);

export const normalizeAttendancePhotoUrl = (photoUrl: string | null | undefined) => {
  const trimmed = photoUrl?.trim();
  if (!trimmed) {
    return null;
  }

  if (typeof window === 'undefined') {
    return trimmed;
  }

  try {
    const currentOrigin = window.location.origin;
    const parsedUrl = new URL(trimmed, currentOrigin);
    const isLocalStorageHost = ['localhost', '127.0.0.1', 'minio'].includes(parsedUrl.hostname);
    const isMinioPort = parsedUrl.port === '9000';
    const isStoragePath = parsedUrl.pathname.startsWith('/storage/');

    if (parsedUrl.origin === currentOrigin) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (parsedUrl.hostname === window.location.hostname && parsedUrl.protocol !== window.location.protocol) {
      return `${currentOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (isStoragePath && (isLocalStorageHost || parsedUrl.hostname === window.location.hostname)) {
      return `${currentOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if ((isLocalStorageHost || isMinioPort) && !isStoragePath) {
      return `${currentOrigin}/storage${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
};

export const firstUsablePhotoUrl = (...photoUrls: Array<string | null | undefined>) => {
  const photoUrl = photoUrls.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return normalizeAttendancePhotoUrl(photoUrl);
};

export const attendanceRowBorderClass = (assignment: ControlAssignment) => {
  const displayStatus = assignment.corrected_status ?? assignment.today_status;

  if (displayStatus === 'absence') {
    return 'border-l-rose-500';
  }

  if (assignment.first_check_in_at && !assignment.last_check_out_at) {
    return 'border-l-amber-500';
  }

  if (displayStatus === 'late') {
    return 'border-l-amber-500';
  }

  if (displayStatus === 'on_time' || assignment.first_check_in_at) {
    return 'border-l-emerald-500';
  }

  return 'border-l-gray-300 dark:border-l-gray-600';
};

export function formatDate(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export const weekdayLabel = (dayOfWeek: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 0, 4 + dayOfWeek));

export function formatTimeOnly(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function formatWorkDuration(start: string | null | undefined, end: string | null | undefined, fallback: string) {
  if (!start || !end) {
    return fallback;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return fallback;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) {
    return fallback;
  }

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function applyCalendarDayUpdate(
  day: AttendanceCalendarDay,
  result: {
    effective_status: AttendanceCalendarDay['effective_status'];
    system_status: AttendanceCalendarDay['system_status'];
    corrected_status?: AttendanceCalendarDay['corrected_status'];
    notes?: string | null;
    entry_registered?: boolean;
    exit_registered?: boolean;
    first_check_in_at?: string | null;
    last_check_out_at?: string | null;
    minutes_late?: number;
    first_location?: AttendanceCalendarDay['first_location'];
    last_location?: AttendanceCalendarDay['last_location'];
  },
): AttendanceCalendarDay {
  return {
    ...day,
    effective_status: result.effective_status,
    system_status: result.system_status,
    corrected_status: result.corrected_status ?? null,
    notes: result.notes ?? null,
    entry_registered: result.entry_registered ?? day.entry_registered,
    exit_registered: result.exit_registered ?? day.exit_registered,
    first_check_in_at: result.first_check_in_at ?? day.first_check_in_at,
    last_check_out_at: result.last_check_out_at ?? day.last_check_out_at,
    minutes_late: result.minutes_late ?? day.minutes_late,
    first_location: result.first_location ?? day.first_location,
    last_location: result.last_location ?? day.last_location,
  };
}

export function resolvedDayStatus(day: AttendanceCalendarDay) {
  return day.corrected_status ?? day.effective_status;
}

export function dayStatusPillTone(day: AttendanceCalendarDay) {
  return statusClasses[resolvedDayStatus(day)];
}

export function dayTone(day: AttendanceCalendarDay) {
  switch (resolvedDayStatus(day)) {
    case 'on_time':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'late':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'absence':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'pending':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'rest':
      return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    case 'leave':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    default:
      return null;
  }
}

export function dayHeatmapTone(day: AttendanceCalendarDay) {
  switch (resolvedDayStatus(day)) {
    case 'on_time':
      return 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20';
    case 'late':
      return 'border-amber-100 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/25';
    case 'absence':
      return 'border-rose-100 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/25';
    case 'pending':
      return 'border-blue-100 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20';
    case 'rest':
      return 'border-gray-200 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/50';
    case 'leave':
      return 'border-sky-100 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/25';
    default:
      return 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40';
  }
}

export function dayHeatmapStripe(day: AttendanceCalendarDay) {
  switch (resolvedDayStatus(day)) {
    case 'on_time':
      return 'bg-emerald-500';
    case 'late':
      return 'bg-amber-500';
    case 'absence':
      return 'bg-rose-500';
    case 'pending':
      return 'bg-blue-500';
    case 'rest':
      return 'bg-gray-300 dark:bg-gray-600';
    case 'leave':
      return 'bg-sky-500';
    default:
      return 'bg-gray-200 dark:bg-gray-700';
  }
}

export function dayBadge(copy: AttendanceControlCopy, day: AttendanceCalendarDay) {
  switch (resolvedDayStatus(day)) {
    case 'on_time':
      return '✓';
    case 'absence':
      return '✕';
    case 'pending':
      return '...';
    case 'not_scheduled':
      return '';
    case 'late':
      return '!';
    case 'rest':
      return '–';
    case 'leave':
      return copy.statuses.leave.slice(0, 1);
    default:
      return null;
  }
}
