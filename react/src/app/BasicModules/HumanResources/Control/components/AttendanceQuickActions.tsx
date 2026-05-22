import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
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

export function AttendanceQuickActions({
  copy,
  day,
  employeeName,
  locale,
  pendingStatus,
  isSaving,
  onPendingStatusChange,
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
  const inputClassName = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white';

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

  if (!day) {
    return (
      <div className="rounded-2xl border border-dashed border-[#59C3A5]/20 bg-[#F4FCF9] px-5 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
        {copy.labels.selectEmployeeCalendar}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#59C3A5]/10 bg-[#fbfdff] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-gray-900/30" title={employeeName}>
      <div className="flex flex-col gap-2 border-b border-[#59C3A5]/10 pb-3 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {copy.labels.modifyStatusOfDay}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {formatDate(day.date, locale, day.date)}
          </h4>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${dayStatusPillTone(day)}`}>
          {copy.statuses[resolvedDayStatus(day)]}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <DayInfoStat label={copy.labels.checkIn} value={formatTimeOnly(day.first_check_in_at, locale, copy.labels.noRegistration)} />
        <DayInfoStat label={copy.labels.checkOut} value={formatTimeOnly(day.last_check_out_at, locale, copy.labels.noRegistration)} />
        <DayInfoStat label={copy.labels.totalTime} value={formatWorkDuration(day.first_check_in_at, day.last_check_out_at, copy.labels.noRegistration)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
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

      {manualStatusDisabled ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {manualStatusDisabledReason}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#59C3A5]/10 bg-[#F4FCF9] p-3 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.manualPunch}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{copy.labels.manualPunchDescription}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#59C3A5]/10 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-gray-800 dark:bg-gray-950">
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
              variant="outline"
              disabled={!canSaveManualCheckIn}
              className="mt-3 w-full gap-2 border-[#59C3A5] bg-[#59C3A5] text-white shadow-[0_1px_2px_rgba(89,195,165,0.22)] hover:border-[#3AAE90] hover:bg-[#3AAE90] hover:text-white disabled:border-[#59C3A5]/20 disabled:bg-[#59C3A5]/10 disabled:text-[#59C3A5] dark:border-[#8FE0CA]/60 dark:bg-[#8FE0CA] dark:text-[#081a38] dark:hover:bg-[#b4ccff] dark:disabled:border-[#8FE0CA]/20 dark:disabled:bg-[#59C3A5]/25 dark:disabled:text-[#8FE0CA]"
              onClick={() => void onManualPunch(day.date, 'check_in', manualCheckInDate, manualCheckInTime)}
            >
              <LogIn className="h-4 w-4" />
              {copy.labels.saveManualCheckIn}
            </Button>
            {manualCheckInExists ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{copy.labels.manualPunchCheckInExists}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[#59C3A5]/10 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-gray-800 dark:bg-gray-950">
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
              variant="outline"
              disabled={!canSaveManualCheckOut}
              className="mt-3 w-full gap-2 border-[#1f4c93] bg-[#1f4c93] text-white shadow-[0_1px_2px_rgba(31,76,147,0.20)] hover:border-[#59C3A5] hover:bg-[#59C3A5] hover:text-white disabled:border-[#59C3A5]/20 disabled:bg-[#59C3A5]/10 disabled:text-[#59C3A5] dark:border-[#8FE0CA]/50 dark:bg-[#6f9ee8] dark:text-[#081a38] dark:hover:bg-[#8FE0CA] dark:disabled:border-[#8FE0CA]/20 dark:disabled:bg-[#59C3A5]/25 dark:disabled:text-[#8FE0CA]"
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

      <div className="rounded-2xl border border-[#59C3A5]/10 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-gray-800 dark:bg-gray-900/40">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.manuallyModifyStatus}</span>
            <select
              value={pendingStatus}
              disabled={isSaving || manualStatusDisabled}
              onChange={(event) => onPendingStatusChange(event.target.value as AttendanceCorrectionStatus | '')}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="">{copy.labels.clearManualCorrection}</option>
              <option value="on_time">{copy.labels.markAsAttendance}</option>
              <option value="absence">{copy.labels.markAsAbsent}</option>
              <option value="late">{copy.labels.markAsDelay}</option>
              <option value="rest">{copy.labels.markAsRest}</option>
            </select>
          </label>
          <Button
            type="button"
            disabled={isSaving || manualStatusDisabled}
            className="h-10 bg-[#59C3A5] px-5 text-white shadow-[0_1px_2px_rgba(89,195,165,0.22)] hover:bg-[#3AAE90] disabled:bg-[#59C3A5]/40"
            onClick={() => void onSave(day.date, pendingStatus)}
          >
            {copy.labels.save}
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-[#59C3A5]/10 pt-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {copy.labels.currentStatus}: {' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {copy.statuses[resolvedDayStatus(day)]}
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving || !canClearScheduleForDay}
            className="h-9 justify-start px-0 text-xs font-semibold text-rose-700 hover:bg-transparent hover:text-rose-800 disabled:text-gray-400 dark:text-rose-300"
            onClick={() => void onClearDaySchedule(day.date)}
          >
            {copy.labels.clearDaySchedule}
          </Button>
        </div>
        {!canClearScheduleForDay ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {copy.labels.noScheduleToClear}
          </p>
        ) : null}
      </div>
    </div>
  );
}
