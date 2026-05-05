import { useEffect, useState } from 'react';
import { Copy, LogIn, LogOut } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  type AttendanceCalendarDay,
  type AttendanceCorrectionStatus,
  type AttendanceManualEventKind,
} from '../../../../api/humanResources';
import {
  type AttendanceControlCopy,
  DayEvidenceCard,
  DayInfoStat,
  dayStatusPillTone,
  formatDate,
  formatTimeOnly,
  formatWorkDuration,
  resolvedDayStatus,
} from './ControlAttendanceWidgets';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const todayInputValue = () => localDateString(new Date());
const addDays = (dateValue: string, days: number) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  date.setDate(date.getDate() + days);
  return localDateString(date);
};
const timeInputValue = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback.slice(0, 5);
  }
  return value.slice(11, 16) || fallback.slice(0, 5);
};
const dateInputValue = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  return value.slice(0, 10) || fallback;
};

export function ControlCalendarDayDialog({
  copy,
  day,
  employeeName,
  locale,
  pendingStatus,
  isSaving,
  onPendingStatusChange,
  onClose,
  onSave,
  onClearDaySchedule,
  onManualPunch,
}: {
  copy: AttendanceControlCopy;
  day: AttendanceCalendarDay | null;
  employeeName: string;
  locale: string;
  pendingStatus: AttendanceCorrectionStatus | '';
  isSaving: boolean;
  onPendingStatusChange: (status: AttendanceCorrectionStatus | '') => void;
  onClose: () => void;
  onSave: (date: string, status: AttendanceCorrectionStatus | '') => Promise<boolean>;
  onClearDaySchedule: (date: string) => Promise<boolean>;
  onManualPunch: (
    date: string,
    eventKind: AttendanceManualEventKind,
    eventDate: string,
    eventTime: string,
  ) => Promise<boolean>;
}) {
  const [manualCheckInDate, setManualCheckInDate] = useState('');
  const [manualCheckInTime, setManualCheckInTime] = useState('');
  const [manualCheckOutDate, setManualCheckOutDate] = useState('');
  const [manualCheckOutTime, setManualCheckOutTime] = useState('');
  const canClearScheduleForDay = Boolean(day?.schedule_rule || day?.active_work_site);
  const isFutureAttendanceDate = Boolean(day && day.date > todayInputValue());
  const manualStatusDisabled = day?.attendance_editable === false || isFutureAttendanceDate;
  const manualStatusDisabledReason = isFutureAttendanceDate
    ? copy.labels.futureAttendanceLocked
    : day?.edit_lock_reason || copy.labels.notModifiable;
  const manualCheckInExists = Boolean(day?.first_check_in_at);
  const manualCheckOutExists = Boolean(day?.last_check_out_at);
  const canSaveManualCheckIn = Boolean(day && manualCheckInDate && manualCheckInTime)
    && !manualStatusDisabled
    && !manualCheckInExists
    && !isSaving;
  const canSaveManualCheckOut = Boolean(day && manualCheckOutDate && manualCheckOutTime)
    && !manualStatusDisabled
    && manualCheckInExists
    && !manualCheckOutExists
    && !isSaving;
  const inputClassName = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white';

  useEffect(() => {
    if (!day) {
      setManualCheckInDate('');
      setManualCheckInTime('');
      setManualCheckOutDate('');
      setManualCheckOutTime('');
      return;
    }

    const defaultCheckInTime = (day.schedule_rule?.start_time || '09:00').slice(0, 5);
    const defaultCheckOutDate = day.schedule_rule?.is_overnight ? addDays(day.date, 1) : day.date;
    const defaultCheckOutTime = (day.schedule_rule?.end_time || '17:00').slice(0, 5);

    setManualCheckInDate(dateInputValue(day.first_check_in_at, day.date));
    setManualCheckInTime(timeInputValue(day.first_check_in_at, defaultCheckInTime));
    setManualCheckOutDate(dateInputValue(day.last_check_out_at, defaultCheckOutDate));
    setManualCheckOutTime(timeInputValue(day.last_check_out_at, defaultCheckOutTime));
  }, [day]);

  return (
    <Dialog
      open={Boolean(day)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      {day ? (
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-white p-0 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-[760px]">
          <DialogHeader className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-950">
            <DialogTitle>
              {copy.labels.modifyStatusOfDay} {new Date(`${day.date}T00:00:00`).getDate()}
            </DialogTitle>
            <DialogDescription>
              {employeeName} · {formatDate(day.date, locale, day.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 bg-white px-6 py-5 dark:bg-gray-950">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.systemRegistration}</p>
                  <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${dayStatusPillTone(day)}`}>
                    {copy.statuses[resolvedDayStatus(day)]}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <DayInfoStat label={copy.labels.checkIn} value={formatTimeOnly(day.first_check_in_at, locale, copy.labels.noRegistration)} />
                  <DayInfoStat label={copy.labels.checkOut} value={formatTimeOnly(day.last_check_out_at, locale, copy.labels.noRegistration)} />
                  <DayInfoStat label={copy.labels.totalTime} value={formatWorkDuration(day.first_check_in_at, day.last_check_out_at, copy.labels.noRegistration)} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
                  <DayEvidenceCard
                    label={copy.labels.checkIn}
                    photoUrl={day.first_photo_url ?? null}
                    location={day.first_location?.name ?? null}
                    copy={copy}
                    compact
                  />
                  <DayEvidenceCard
                    label={copy.labels.checkOut}
                    photoUrl={day.last_photo_url ?? null}
                    location={day.last_location?.name ?? null}
                    copy={copy}
                    compact
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.manualPunch}</p>
                <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                  {copy.labels.manualPunchDescription}
                </p>
              </div>

              {manualStatusDisabled ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                  {manualStatusDisabledReason}
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-white bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {copy.labels.manualCheckInDate}
                      </span>
                      <input
                        type="date"
                        value={manualCheckInDate}
                        max={todayInputValue()}
                        disabled={isSaving || manualStatusDisabled || manualCheckInExists}
                        onChange={(event) => setManualCheckInDate(event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {copy.labels.manualCheckInTime}
                      </span>
                      <input
                        type="time"
                        value={manualCheckInTime}
                        disabled={isSaving || manualStatusDisabled || manualCheckInExists}
                        onChange={(event) => setManualCheckInTime(event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    disabled={!canSaveManualCheckIn}
                    className="mt-3 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => void onManualPunch(day.date, 'check_in', manualCheckInDate, manualCheckInTime)}
                  >
                    <LogIn className="h-4 w-4" />
                    {copy.labels.saveManualCheckIn}
                  </Button>
                  {manualCheckInExists ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{copy.labels.manualPunchCheckInExists}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-white bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {copy.labels.manualCheckOutDate}
                      </span>
                      <input
                        type="date"
                        value={manualCheckOutDate}
                        min={day.date}
                        max={todayInputValue()}
                        disabled={isSaving || manualStatusDisabled || !manualCheckInExists || manualCheckOutExists}
                        onChange={(event) => setManualCheckOutDate(event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {copy.labels.manualCheckOutTime}
                      </span>
                      <input
                        type="time"
                        value={manualCheckOutTime}
                        disabled={isSaving || manualStatusDisabled || !manualCheckInExists || manualCheckOutExists}
                        onChange={(event) => setManualCheckOutTime(event.target.value)}
                        className={inputClassName}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    disabled={!canSaveManualCheckOut}
                    className="mt-3 w-full gap-2 bg-sky-600 text-white hover:bg-sky-700"
                    onClick={() => void onManualPunch(day.date, 'check_out', manualCheckOutDate, manualCheckOutTime)}
                  >
                    <LogOut className="h-4 w-4" />
                    {copy.labels.saveManualCheckOut}
                  </Button>
                  {!manualCheckInExists ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{copy.labels.manualPunchCheckOutNeedsCheckIn}</p>
                  ) : manualCheckOutExists ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{copy.labels.manualPunchCheckOutExists}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.manuallyModifyStatus}</p>
              {manualStatusDisabled ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                  {manualStatusDisabledReason}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  disabled={isSaving || manualStatusDisabled}
                  className={`h-9 justify-center px-3 text-xs bg-emerald-600 text-white hover:bg-emerald-700 ${pendingStatus === 'on_time' ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('on_time')}
                >
                  {copy.labels.markAsAttendance}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving || manualStatusDisabled}
                  className={`h-9 justify-center px-3 text-xs bg-rose-600 text-white hover:bg-rose-700 ${pendingStatus === 'absence' ? 'ring-2 ring-rose-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('absence')}
                >
                  {copy.labels.markAsAbsent}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving || manualStatusDisabled}
                  className={`h-9 justify-center px-3 text-xs bg-amber-500 text-white hover:bg-amber-600 ${pendingStatus === 'late' ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('late')}
                >
                  {copy.labels.markAsDelay}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving || manualStatusDisabled}
                  className={`h-9 justify-center px-3 text-xs bg-slate-500 text-white hover:bg-slate-600 ${pendingStatus === 'rest' ? 'ring-2 ring-slate-300 ring-offset-2' : ''}`}
                  onClick={() => onPendingStatusChange('rest')}
                >
                  {copy.labels.markAsRest}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || manualStatusDisabled}
                  className={`h-9 justify-center px-3 text-xs ${pendingStatus === '' ? 'border-[#1463ff] text-[#1463ff]' : ''}`}
                  onClick={() => onPendingStatusChange('')}
                >
                  {copy.labels.clearManualCorrection}
                </Button>
              </div>
              <div className="border-t border-gray-200 pt-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {copy.labels.currentStatus}: {' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {copy.statuses[resolvedDayStatus(day)]}
                </span>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{copy.labels.clearDaySchedule}</p>
                    <p className="mt-1 text-xs leading-5 text-rose-700 dark:text-rose-300">
                      {copy.labels.clearDayScheduleDescription}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving || !canClearScheduleForDay}
                    className="border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
                    onClick={async () => {
                      const didClear = await onClearDaySchedule(day.date);
                      if (didClear) {
                        onClose();
                      }
                    }}
                  >
                    {copy.labels.clearDaySchedule}
                  </Button>
                </div>
                {!canClearScheduleForDay ? (
                  <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
                    {copy.labels.noScheduleToClear}
                  </p>
                ) : null}
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
                  {copy.labels.cancel}
                </Button>
                <Button
                  type="button"
                  disabled={isSaving || manualStatusDisabled}
                  className="bg-[#143675] text-white hover:bg-[#0f2855]"
                  onClick={async () => {
                    const didSave = await onSave(day.date, pendingStatus);
                    if (didSave) {
                      onClose();
                    }
                  }}
                >
                  {copy.labels.save}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

export function ControlKioskQrDialog({
  copy,
  isOpen,
  kioskLink,
  qrDataUrl,
  onOpenChange,
  onCopy,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  kioskLink: string;
  qrDataUrl: string;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.labels.kioskQrTitle}</DialogTitle>
          <DialogDescription>{kioskLink || copy.labels.kioskTokenUnavailable}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={copy.labels.kioskQrTitle} className="h-72 w-72 rounded-2xl border border-gray-200 bg-white p-3" />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
              {copy.loading}
            </div>
          )}
          <Button type="button" variant="outline" className="w-full gap-2" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            {copy.labels.copyKioskLink}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
