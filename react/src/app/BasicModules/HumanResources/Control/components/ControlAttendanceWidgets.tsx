import { type KeyboardEvent, type MouseEvent, type ReactNode, useState } from 'react';
import { ExternalLink, ImageIcon, MapPin, X } from 'lucide-react';
import {
  type AttendanceCalendarDay,
  type AttendanceControlOverviewResponse,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';

export type AttendanceControlCopy = ControlTranslations;

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

type ControlAssignment = AttendanceControlOverviewResponse['assignments'][number];

export function getAssignmentBusyReason(assignment: ControlAssignment, copy?: AttendanceControlCopy) {
  if (assignment.first_check_in_at || assignment.last_check_out_at) {
    return copy?.labels.assignmentBusyAttendanceRecorded ?? 'Attendance already recorded for this date';
  }
  if (assignment.active_work_site) {
    return copy?.labels.assignmentBusyContractSiteAssigned ?? 'Contract site already assigned';
  }
  if (assignment.schedule_template_id) {
    return copy?.labels.assignmentBusyScheduleAssigned ?? 'Schedule already assigned';
  }
  return '';
}

export const isAssignmentFreeForWork = (assignment: ControlAssignment) => !getAssignmentBusyReason(assignment);

const attendanceRowBorderClass = (assignment: ControlAssignment) => {
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
  const [previewPhoto, setPreviewPhoto] = useState<{ label: string; photoUrl: string } | null>(null);
  const displayStatus = assignment.corrected_status ?? assignment.today_status;
  const rowBorderClassName = attendanceRowBorderClass(assignment);
  const checkInTime = formatTimeOnly(assignment.first_check_in_at, locale, copy.labels.noRegistration);
  const checkOutTime = formatTimeOnly(assignment.last_check_out_at, locale, copy.labels.noRegistration);
  const role = assignment.position_title || assignment.department || copy.labels.noDepartment;
  const workLocation = assignment.active_work_site?.location_name ?? assignment.business_name ?? assignment.unit_name ?? '';
  const latestCheckInPhotoUrl = assignment.latest_event?.event_type === 'check_in' ? assignment.latest_event.photo_url ?? null : null;
  const latestCheckOutPhotoUrl = assignment.latest_event?.event_type === 'check_out' ? assignment.latest_event.photo_url ?? null : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={`w-full cursor-pointer rounded-xl border border-l-4 px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all ${rowBorderClassName} ${
          selected
            ? 'border-[#143675]/30 bg-white shadow-[0_1px_2px_rgba(20,54,117,0.10),0_0_0_3px_rgba(20,54,117,0.06)] dark:border-[#8bb3ff]/35 dark:bg-gray-900'
            : 'border-gray-100 bg-white/85 hover:border-[#143675]/20 hover:bg-white hover:shadow-[0_2px_6px_rgba(15,23,42,0.06)] dark:border-gray-800 dark:bg-gray-900/70 dark:hover:border-[#8bb3ff]/30 dark:hover:bg-gray-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{assignment.user_name}</p>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{role}</p>
            {workLocation ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{workLocation}</span>
              </div>
            ) : null}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[displayStatus]}`}>
            {copy.statuses[displayStatus]}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <AttendanceMomentPanel
            label={copy.labels.checkIn}
            time={checkInTime}
            location={assignment.first_location?.name ?? assignment.latest_event?.location_name ?? null}
            photoUrl={assignment.first_photo_url ?? latestCheckInPhotoUrl}
            latitude={assignment.first_latitude ?? null}
            longitude={assignment.first_longitude ?? null}
            copy={copy}
            onPreviewPhoto={(photoUrl, label) => setPreviewPhoto({ photoUrl, label })}
          />
          <AttendanceMomentPanel
            label={copy.labels.checkOut}
            time={checkOutTime}
            location={assignment.last_location?.name ?? assignment.latest_event?.location_name ?? null}
            photoUrl={assignment.last_photo_url ?? latestCheckOutPhotoUrl}
            latitude={assignment.last_latitude ?? null}
            longitude={assignment.last_longitude ?? null}
            copy={copy}
            onPreviewPhoto={(photoUrl, label) => setPreviewPhoto({ photoUrl, label })}
          />
        </div>
      </div>

      <AttendanceEvidencePreviewDialog
        copy={copy}
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />
    </>
  );
}

function AttendanceEvidencePreviewDialog({
  copy,
  photo,
  onClose,
}: {
  copy: AttendanceControlCopy;
  photo: { label: string; photoUrl: string } | null;
  onClose: () => void;
}) {
  if (!photo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#143675] dark:text-blue-200">
              {copy.labels.viewEvidence}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{photo.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-[#143675]/30 hover:text-[#143675] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            aria-label={copy.labels.closeEvidence}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-gray-950 p-3">
          <img
            src={photo.photoUrl}
            alt={`${photo.label} attendance evidence`}
            className="mx-auto max-h-[76vh] w-auto max-w-full rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export function AttendanceMomentPanel({
  label,
  time,
  location,
  photoUrl,
  latitude,
  longitude,
  copy,
  onPreviewPhoto,
}: {
  label: string;
  time: string;
  location: string | null;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  copy: AttendanceControlCopy;
  onPreviewPhoto?: (photoUrl: string, label: string) => void;
}) {
  const isEmpty = time === copy.labels.noRegistration;
  const coordinateLabel = formatCoordinatePair(latitude, longitude);
  const locationLabel = location || (coordinateLabel ? copy.labels.gpsCaptured : isEmpty ? copy.labels.openLocation : copy.labels.noLocationHistory);
  const mapsUrl = buildGoogleMapsUrl({ latitude, longitude, location });

  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-[#143675]/10 bg-[#f8fbff] px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`mt-1 truncate text-sm font-semibold ${isEmpty ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{time}</p>
        <AttendanceLocationLink
          copy={copy}
          label={locationLabel}
          mapsUrl={mapsUrl}
          title={coordinateLabel || locationLabel}
        />
      </div>
      <AttendanceEvidenceThumbnail
        copy={copy}
        label={label}
        photoUrl={photoUrl}
        onPreviewPhoto={onPreviewPhoto}
      />
    </div>
  );
}

function AttendanceLocationLink({
  copy,
  label,
  mapsUrl,
  title,
}: {
  copy: AttendanceControlCopy;
  label: string;
  mapsUrl: string;
  title: string;
}) {
  const content = (
    <>
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {mapsUrl ? <ExternalLink className="h-3 w-3 shrink-0 opacity-70" /> : null}
    </>
  );

  if (!mapsUrl) {
    return (
      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400" title={title}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#143675] underline-offset-2 hover:underline dark:text-blue-200"
      title={`${title} · ${copy.labels.openInMaps}`}
      aria-label={`${copy.labels.openInMaps}: ${title}`}
    >
      {content}
    </a>
  );
}

function formatCoordinatePair(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) {
    return '';
  }

  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  if (!Number.isFinite(latitudeNumber) || !Number.isFinite(longitudeNumber)) {
    return '';
  }

  return `${latitudeNumber.toFixed(5)}, ${longitudeNumber.toFixed(5)}`;
}

function buildGoogleMapsUrl({
  latitude,
  longitude,
  location,
}: {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
}) {
  const coordinateLabel = formatCoordinatePair(latitude, longitude);
  const query = coordinateLabel || location?.trim() || '';

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : '';
}

function AttendanceEvidenceThumbnail({
  copy,
  label,
  photoUrl,
  onPreviewPhoto,
}: {
  copy: AttendanceControlCopy;
  label: string;
  photoUrl?: string | null;
  onPreviewPhoto?: (photoUrl: string, label: string) => void;
}) {
  if (!photoUrl) {
    return null;
  }

  return (
    <button
      type="button"
      className="relative mt-0.5 flex h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#143675]/15 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:scale-[1.03] hover:border-[#143675]/40 focus:outline-none focus:ring-2 focus:ring-[#143675]/30 dark:border-gray-700 dark:bg-gray-900"
      onClick={(event) => {
        event.stopPropagation();
        onPreviewPhoto?.(photoUrl, label);
      }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={`${copy.labels.viewEvidence}: ${label}`}
    >
      <img
        src={photoUrl}
        alt={`${label} attendance evidence`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <span className="absolute bottom-0.5 right-0.5 rounded bg-white/90 p-0.5 text-[#143675] shadow-sm dark:bg-gray-950/90 dark:text-blue-200">
        <ImageIcon className="h-2.5 w-2.5" />
      </span>
    </button>
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
  isMultiSelected = false,
  isSelected,
  locale,
  onMouseDown,
  onMouseEnter,
  onSelect,
}: {
  copy: AttendanceControlCopy;
  day: AttendanceCalendarDay | null;
  dayNumber: number;
  isMultiSelected?: boolean;
  isSelected: boolean;
  locale: string;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
  onSelect: () => void;
}) {
  const statusTone = day ? dayTone(day) : null;
  const heatmapTone = day ? dayHeatmapTone(day) : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40';
  const isLocked = day?.attendance_editable === false;
  const hasCorrection = Boolean(day?.corrected_status);
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
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      title={isLocked ? day?.edit_lock_reason ?? copy.labels.notModifiable : attendanceTooltip}
      className={`group relative min-h-[104px] select-none overflow-hidden rounded-2xl border p-3 text-left transition-all ${
        isSelected
          ? 'border-[#143675]/45 bg-white shadow-[0_1px_2px_rgba(20,54,117,0.10),0_0_0_4px_rgba(20,54,117,0.06)] dark:border-[#8bb3ff]/45 dark:bg-gray-900'
          : isMultiSelected
          ? 'border-[#143675]/35 bg-[#f8fbff] shadow-[inset_0_0_0_1px_rgba(20,54,117,0.12)]'
          : `${heatmapTone} hover:-translate-y-0.5 hover:border-[#143675]/35 hover:shadow-sm dark:hover:border-[#8bb3ff]/40`
      }`}
    >
      {day ? <span className={`absolute inset-x-0 top-0 h-1 ${dayHeatmapStripe(day)}`} /> : null}
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold text-gray-900 dark:text-white">{dayNumber}</span>
        {hasCorrection ? (
          <span className="rounded-full bg-[#143675] px-1.5 py-0.5 text-[10px] font-semibold text-white">M</span>
        ) : null}
      </div>
      {day ? (
        <div className="mt-5 space-y-2">
          {statusTone ? (
            <div className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold ${statusTone}`}>
              {dayBadge(copy, day)}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            {day.entry_registered ? <span className="h-2 w-2 rounded-full bg-emerald-500" title={copy.labels.checkIn} /> : null}
            {day.exit_registered ? <span className="h-2 w-2 rounded-full bg-sky-500" title={copy.labels.checkOut} /> : null}
            {!day.entry_registered && !day.exit_registered ? <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" /> : null}
          </div>
          <p className="truncate text-[11px] font-medium text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-300">
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
    <div className="rounded-xl border border-[#143675]/10 bg-[#f8fbff] px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
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
  if (compact) {
    return (
      <div className="min-w-0 rounded-xl border border-[#143675]/10 bg-[#f8fbff] p-3 dark:border-gray-800 dark:bg-gray-900/40">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
        <div className="mt-2 flex items-center gap-2">
          {photoUrl ? (
            <img
              src={photoUrl}
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
            <div className="flex items-center gap-1.5 text-xs text-[#1463ff] dark:text-[#8bb3ff]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location || copy.labels.noLocationHistory}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#143675]/10 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-gray-700 dark:bg-gray-800">
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

function dayHeatmapTone(day: AttendanceCalendarDay) {
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

function dayHeatmapStripe(day: AttendanceCalendarDay) {
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
