import { type PointerEvent, type ReactNode } from 'react';
import { ImageIcon, MapPin } from 'lucide-react';
import type { AttendanceCalendarDay } from '../../../../../../api/humanResources';
import {
  type AttendanceControlCopy,
  dayBadge,
  dayHeatmapStripe,
  dayHeatmapTone,
  dayTone,
  formatTimeOnly,
  normalizeAttendancePhotoUrl,
  resolvedDayStatus,
} from '../../../utils/attendanceWidgetUtils';

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
  isMultiSelected = false,
  isSelected,
  locale,
  onPointerDown,
  onPointerEnter,
  onPointerMove,
  onSelect,
}: {
  copy: AttendanceControlCopy;
  day: AttendanceCalendarDay | null;
  dayNumber: number;
  isMultiSelected?: boolean;
  isSelected: boolean;
  locale: string;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerEnter?: () => void;
  onPointerMove?: () => void;
  onSelect: () => void;
}) {
  const statusTone = day ? dayTone(day) : null;
  const heatmapTone = day ? dayHeatmapTone(day) : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40';
  const isLocked = day?.attendance_editable === false;
  const hasCorrection = Boolean(day?.corrected_status);
  const statusLabel = day ? copy.statuses[resolvedDayStatus(day)] : copy.labels.noSchedule;
  const dateLabel = day?.date ?? `${dayNumber}`;
  const attendanceTooltip = day
    ? [
        `${copy.labels.effectiveStatus}: ${copy.statuses[resolvedDayStatus(day)]}`,
        `${copy.labels.checkIn}: ${formatTimeOnly(day.first_check_in_at, locale, copy.labels.noRegistration)}`,
        `${copy.labels.checkOut}: ${formatTimeOnly(day.last_check_out_at, locale, copy.labels.noRegistration)}`,
        day.corrected_status ? `${copy.labels.correction}: ${copy.statuses[day.corrected_status]}` : '',
        day.first_location?.name || day.last_location?.name
          ? `${copy.labels.attendanceLocation}: ${day.first_location?.name ?? day.last_location?.name}`
          : copy.labels.noLocationHistory,
      ].filter(Boolean).join('\n')
    : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      aria-label={copy.labels.calendarDayAriaLabel(dateLabel, statusLabel)}
      title={isLocked ? day?.edit_lock_reason ?? copy.labels.notModifiable : attendanceTooltip}
      className={`group relative min-h-[76px] touch-none select-none overflow-hidden rounded-lg border p-2 text-left transition-all sm:min-h-[104px] sm:p-3 ${
        isSelected
          ? 'border-[#59C3A5]/45 bg-white shadow-[0_1px_2px_rgba(89,195,165,0.10),0_0_0_4px_rgba(89,195,165,0.06)] dark:border-[#8FE0CA]/45 dark:bg-gray-900'
          : isMultiSelected
          ? 'border-[#59C3A5]/35 bg-[#f8fbff] shadow-[inset_0_0_0_1px_rgba(89,195,165,0.12)]'
          : `${heatmapTone} hover:-translate-y-0.5 hover:border-[#59C3A5]/35 hover:shadow-sm dark:hover:border-[#8FE0CA]/40`
      }`}
    >
      {day ? <span className={`absolute inset-x-0 top-0 h-1 ${dayHeatmapStripe(day)}`} /> : null}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-white sm:text-base">{dayNumber}</span>
        {hasCorrection ? (
          <span
            className="rounded-full bg-[#59C3A5] px-1.5 py-0.5 text-[10px] font-semibold text-white"
            title={copy.labels.correction}
          >
            {copy.labels.manualCorrectionBadge}
          </span>
        ) : null}
      </div>
      {day ? (
        <div className="mt-3 space-y-1.5 sm:mt-5 sm:space-y-2">
          {statusTone ? (
            <div className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-semibold sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-[11px] ${statusTone}`}>
              {dayBadge(copy, day)}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            {day.entry_registered ? <span className="h-2 w-2 rounded-full bg-emerald-500" title={copy.labels.checkIn} /> : null}
            {day.exit_registered ? <span className="h-2 w-2 rounded-full bg-sky-500" title={copy.labels.checkOut} /> : null}
            {!day.entry_registered && !day.exit_registered ? <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" /> : null}
          </div>
          <p className="hidden truncate text-[11px] font-medium text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-300 sm:block">
            {formatTimeOnly(day.first_check_in_at, locale, copy.labels.noRegistration)}
          </p>
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
    <div className="rounded-lg border border-[#59C3A5]/10 bg-[#f8fbff] px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1.5 text-base font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export function DayEvidenceCard({
  label,
  photoUrl,
  location,
  copy,
  compact = false,
}: {
  label: string;
  photoUrl: string | null;
  location: string | null;
  copy: AttendanceControlCopy;
  compact?: boolean;
}) {
  const normalizedPhotoUrl = normalizeAttendancePhotoUrl(photoUrl);

  if (compact) {
    return (
      <div className="min-w-0 rounded-lg border border-[#59C3A5]/10 bg-[#f8fbff] p-3 dark:border-gray-800 dark:bg-gray-900/40">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
        <div className="mt-2 flex items-center gap-2">
          {normalizedPhotoUrl ? (
            <img
              src={normalizedPhotoUrl}
              alt={label}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/40"
              title={copy.labels.noEvidence}
            >
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#1463ff] dark:text-[#8FE0CA]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location || copy.labels.noLocationHistory}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#59C3A5]/10 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      {normalizedPhotoUrl ? (
        <img
          src={normalizedPhotoUrl}
          alt={label}
          className="mt-3 h-32 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900/40">
          {copy.labels.noEvidence}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm text-[#1463ff] dark:text-[#8FE0CA]">
        <MapPin className="h-4 w-4" />
        <span className="truncate">{location || copy.labels.noLocationHistory}</span>
      </div>
    </div>
  );
}
