import { type ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import {
  type AttendanceCalendarDay,
  type AttendanceControlOverviewResponse,
} from '../../../../api/humanResources';
import type { HRLanguagePack } from '../../HRLanguage';

export type AttendanceControlCopy = HRLanguagePack['attendanceControl'];

export const statusClasses: Record<string, string> = {
  on_time: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  leave: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  rest: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  absence: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  not_scheduled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

type ControlAssignment = AttendanceControlOverviewResponse['assignments'][number];

export function getAssignmentBusyReason(assignment: ControlAssignment) {
  if (assignment.first_check_in_at || assignment.last_check_out_at) {
    return 'Attendance already recorded for this date';
  }
  if (assignment.active_work_site) {
    return 'Contract site already assigned';
  }
  if (assignment.schedule_template_id) {
    return 'Schedule already assigned';
  }
  return '';
}

export const isAssignmentFreeForWork = (assignment: ControlAssignment) => !getAssignmentBusyReason(assignment);

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
export function ControlAttendanceRow({
  assignment,
  copy,
  locale,
  selected,
  onSelect,
}: {
  assignment: AttendanceControlOverviewResponse['assignments'][number];
  copy: AttendanceControlCopy;
  locale: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const displayStatus = assignment.corrected_status ?? assignment.today_status;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-gray-200 px-4 py-4 text-left transition-colors dark:border-gray-700 ${
        selected
          ? 'border-l-4 border-l-[#1463ff] bg-[#1463ff]/5'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-gray-900 dark:text-white">{assignment.employee_name}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {assignment.position_title || assignment.department || copy.labels.noDepartment}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#143675] dark:text-[#8bb3ff]">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">Contract site: {assignment.active_work_site?.location_name ?? 'None'}</span>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[displayStatus]}`}>
          {copy.statuses[displayStatus]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AttendanceMomentPanel
          label={copy.labels.checkIn}
          time={formatTimeOnly(assignment.first_check_in_at, locale, copy.labels.noRegistration)}
          location={assignment.latest_event?.location_name ?? null}
          copy={copy}
        />
        <AttendanceMomentPanel
          label={copy.labels.checkOut}
          time={formatTimeOnly(assignment.last_check_out_at, locale, copy.labels.noRegistration)}
          location={assignment.latest_event?.location_name ?? null}
          copy={copy}
        />
      </div>
    </button>
  );
}

export function AttendanceMomentPanel({
  label,
  time,
  location,
  copy,
}: {
  label: string;
  time: string;
  location: string | null;
  copy: AttendanceControlCopy;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/40">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#1f9d55] dark:text-emerald-300">{time}</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#1463ff] dark:text-[#8bb3ff]">
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate">{location || copy.labels.openLocation}</span>
      </div>
    </div>
  );
}

export function CompactInfoChip({
  children,
  tone = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

export function ControlCalendarDayCell({
  copy,
  day,
  dayNumber,
  isSelected,
  onSelect,
}: {
  copy: AttendanceControlCopy;
  day: AttendanceCalendarDay | null;
  dayNumber: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusTone = day ? dayTone(day) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[92px] rounded-2xl border p-3 text-left transition-colors ${
        isSelected
          ? 'border-[#1463ff] bg-[#1463ff]/5 shadow-[inset_0_0_0_1px_rgba(20,99,255,0.15)]'
          : 'border-gray-200 bg-white hover:border-[#1463ff]/35 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[#8bb3ff]/40'
      }`}
    >
      <div className="text-base font-semibold text-gray-900 dark:text-white">{dayNumber}</div>
      {day ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5">
            {day.entry_registered ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> : null}
            {day.exit_registered ? <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> : null}
          </div>
          {statusTone ? (
            <div className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold ${statusTone}`}>
              {dayBadge(copy, day)}
            </div>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

export function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

export function LegendOutline({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-12 rounded-full border border-[#1463ff]" />
      <span>{label}</span>
    </div>
  );
}

export function DayInfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export function DayEvidenceCard({
  label,
  photoUrl,
  location,
  copy,
}: {
  label: string;
  photoUrl: string | null;
  location: string | null;
  copy: AttendanceControlCopy;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={label}
          className="mt-3 h-32 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900/40">
          {copy.labels.noEvidence}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm text-[#1463ff] dark:text-[#8bb3ff]">
        <MapPin className="h-4 w-4" />
        <span className="truncate">{location || copy.labels.noLocationHistory}</span>
      </div>
    </div>
  );
}

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
  },
): AttendanceCalendarDay {
  return {
    ...day,
    effective_status: result.effective_status,
    system_status: result.system_status,
    corrected_status: result.corrected_status ?? null,
    notes: result.notes ?? null,
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
