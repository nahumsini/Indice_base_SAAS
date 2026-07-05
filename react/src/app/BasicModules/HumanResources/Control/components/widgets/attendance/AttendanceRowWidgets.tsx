import { type KeyboardEvent, useState } from 'react';
import { ExternalLink, ImageIcon, MapPin, X } from 'lucide-react';
import type { AttendanceControlOverviewResponse } from '../../../../../../api/humanResources';
import {
  type AttendanceControlCopy,
  attendanceRowBorderClass,
  firstUsablePhotoUrl,
  formatTimeOnly,
  statusClasses,
} from '../../../utils/attendanceWidgetUtils';

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
  const latestEventType = assignment.latest_event?.event_type || assignment.latest_event?.event_kind || '';
  const latestEventPhotoUrl = firstUsablePhotoUrl(assignment.latest_event?.photo_url);
  const latestCheckInPhotoUrl = latestEventType === 'check_in' ? latestEventPhotoUrl : null;
  const latestCheckOutPhotoUrl = latestEventType === 'check_out' ? latestEventPhotoUrl : null;
  const checkInPhotoUrl = firstUsablePhotoUrl(assignment.first_photo_url, latestCheckInPhotoUrl);
  const checkOutPhotoUrl = firstUsablePhotoUrl(assignment.last_photo_url, latestCheckOutPhotoUrl);

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
        className={`w-full cursor-pointer rounded-lg border border-l-4 px-4 py-3 text-left shadow-sm transition-all ${rowBorderClassName} ${
          selected
            ? 'border-[#59C3A5]/30 bg-white shadow-[0_1px_2px_rgba(89,195,165,0.10),0_0_0_3px_rgba(89,195,165,0.06)] dark:border-[#8FE0CA]/35 dark:bg-gray-900'
            : 'border-gray-100 bg-white/85 hover:border-[#59C3A5]/20 hover:bg-white hover:shadow-[0_2px_6px_rgba(15,23,42,0.06)] dark:border-gray-800 dark:bg-gray-900/70 dark:hover:border-[#8FE0CA]/30 dark:hover:bg-gray-900'
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
            photoUrl={checkInPhotoUrl}
            photoExpired={assignment.first_photo_expired}
            retainedUntil={assignment.first_photo_retained_until}
            latitude={assignment.first_latitude ?? null}
            longitude={assignment.first_longitude ?? null}
            copy={copy}
            onPreviewPhoto={(photoUrl, label) => setPreviewPhoto({ photoUrl, label })}
          />
          <AttendanceMomentPanel
            label={copy.labels.checkOut}
            time={checkOutTime}
            location={assignment.last_location?.name ?? assignment.latest_event?.location_name ?? null}
            photoUrl={checkOutPhotoUrl}
            photoExpired={assignment.last_photo_expired}
            retainedUntil={assignment.last_photo_retained_until}
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
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#59C3A5] dark:text-blue-200">
              {copy.labels.viewEvidence}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{photo.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-[#59C3A5]/30 hover:text-[#59C3A5] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            aria-label={copy.labels.closeEvidence}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-gray-950 p-3">
          <img
            src={photo.photoUrl}
            alt={copy.labels.attendanceEvidenceAlt(photo.label)}
            className="mx-auto max-h-[76vh] w-auto max-w-full rounded-lg object-contain"
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
  photoExpired,
  retainedUntil,
  latitude,
  longitude,
  copy,
  onPreviewPhoto,
}: {
  label: string;
  time: string;
  location: string | null;
  photoUrl?: string | null;
  photoExpired?: boolean;
  retainedUntil?: string | null;
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
    <div className="grid min-w-0 grid-cols-[1fr_auto] gap-3 rounded-lg border border-[#59C3A5]/10 bg-[#f8fbff] px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`mt-1 truncate text-sm font-semibold ${isEmpty ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{time}</p>
        <AttendanceLocationLink
          copy={copy}
          label={locationLabel}
          mapsUrl={mapsUrl}
          title={coordinateLabel || locationLabel}
        />
        <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
          {photoExpired
            ? copy.labels.photoExpiredAfterRetention
            : photoUrl
              ? copy.labels.photoRetainedForRetention
              : copy.labels.noPhotoEvidenceShort}
          {retainedUntil && photoUrl ? ` · ${copy.labels.photoRetainedUntil(formatShortDate(retainedUntil))}` : ''}
        </p>
      </div>
      <AttendanceEvidenceThumbnail
        copy={copy}
        label={label}
        photoUrl={photoUrl}
        photoExpired={photoExpired}
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
      className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#59C3A5] underline-offset-2 hover:underline dark:text-blue-200"
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

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function AttendanceEvidenceThumbnail({
  copy,
  label,
  photoUrl,
  photoExpired,
  onPreviewPhoto,
}: {
  copy: AttendanceControlCopy;
  label: string;
  photoUrl?: string | null;
  photoExpired?: boolean;
  onPreviewPhoto?: (photoUrl: string, label: string) => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (!photoUrl) {
    return (
      <div
        className={`mt-0.5 flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-lg border ${
          photoExpired
            ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
            : 'border-gray-200 bg-white text-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
        }`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        title={photoExpired ? copy.labels.photoExpiredTooltip : copy.labels.noPhotoTooltip}
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        className="mt-0.5 flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        title={copy.labels.photoExpiredTooltip}
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group relative mt-0.5 flex h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-[#59C3A5]/15 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:scale-[1.03] hover:border-[#59C3A5]/40 focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/30 dark:border-gray-700 dark:bg-gray-900"
      onClick={(event) => {
        event.stopPropagation();
        onPreviewPhoto?.(photoUrl, label);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={`${copy.labels.viewEvidence}: ${label}`}
    >
      <img
        src={photoUrl}
        alt={copy.labels.attendanceEvidenceAlt(label)}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setLoadFailed(true)}
      />
      <span className="absolute inset-x-0 bottom-0 bg-white/92 px-1.5 py-0.5 text-[9px] font-semibold text-[#0f7f68] shadow-sm transition group-hover:bg-white dark:bg-gray-950/90 dark:text-blue-200">
        {copy.labels.viewEvidence}
      </span>
    </button>
  );
}
