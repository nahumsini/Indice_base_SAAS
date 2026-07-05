import { useMemo, type PointerEvent } from 'react';
import { Check, CheckCircle2, Clock3, MousePointer2, Moon, X, UserX } from 'lucide-react';
import type { AttendanceCalendarDay, AttendanceCorrectionStatus } from '../../../../api/humanResources';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { ControlKpiMetric } from './ControlKpiStrip/ControlKpiMetric';
import {
  ControlCalendarDayCell,
  LegendOutline,
  LegendPill,
  resolvedDayStatus,
  type AttendanceControlCopy,
} from './ControlAttendanceWidgets';

const getCalendarSegmentWidth = (count: number, total: number) => {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
};

function CalendarKpiDistribution({
  absenceCount,
  attendanceCount,
  lateCount,
  restCount,
}: {
  absenceCount: number;
  attendanceCount: number;
  lateCount: number;
  restCount: number;
}) {
  const totalCount = attendanceCount + absenceCount + lateCount + restCount;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div className="flex h-full">
        <div
          className="bg-[#59C3A5] transition-all duration-300 dark:bg-[#8FE0CA]"
          style={{ width: getCalendarSegmentWidth(attendanceCount, totalCount) }}
        />
        <div
          className="bg-[#4f78bd] transition-all duration-300 dark:bg-[#6f9ee8]"
          style={{ width: getCalendarSegmentWidth(lateCount, totalCount) }}
        />
        <div
          className="bg-rose-500 transition-all duration-300"
          style={{ width: getCalendarSegmentWidth(absenceCount, totalCount) }}
        />
        <div
          className="bg-slate-300 transition-all duration-300 dark:bg-slate-500"
          style={{ width: getCalendarSegmentWidth(restCount, totalCount) }}
        />
      </div>
    </div>
  );
}

export function EmployeeCalendarPanel({
  copy,
  locale,
  calendarMonthLabel,
  selectedCalendarDateSet,
  isLoadingCalendar,
  weekdayLabels,
  calendarCells,
  attendanceCalendarMap,
  controlDate,
  calendarMonth,
  onShiftMonth,
  onDayPointerDown,
  onDayPointerEnter,
  onDayPointerMove,
  onDaySelect,
  bulkActions,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  calendarMonthLabel: string;
  selectedCalendarDateSet: Set<string>;
  isLoadingCalendar: boolean;
  weekdayLabels: string[];
  calendarCells: Array<number | null>;
  attendanceCalendarMap: Map<number, AttendanceCalendarDay>;
  controlDate: string;
  calendarMonth: string;
  onShiftMonth: (direction: -1 | 1) => void;
  onDayPointerDown: (date: string, event: PointerEvent<HTMLButtonElement>, day: AttendanceCalendarDay | null) => void;
  onDayPointerEnter: (date: string, day: AttendanceCalendarDay | null) => void;
  onDayPointerMove: (date: string, day: AttendanceCalendarDay | null) => void;
  onDaySelect: (date: string, day: AttendanceCalendarDay | null) => void;
  bulkActions?: {
    bulkCalendarStatus: AttendanceCorrectionStatus | '';
    isSelectionMode: boolean;
    isUpdatingCalendarDay: boolean;
    selectedCount: number;
    onBulkApply: () => void;
    onBulkStatusChange: (status: AttendanceCorrectionStatus | '') => void;
    onClearSelection: () => void;
    onExitSelectionMode: () => void;
  };
}) {
  const monthDays = useMemo(
    () => Array.from(attendanceCalendarMap.values()),
    [attendanceCalendarMap],
  );
  const calendarInsights = useMemo(() => {
    const attendanceDays = monthDays.filter((day) => resolvedDayStatus(day) === 'on_time');
    const lateDays = monthDays.filter((day) => resolvedDayStatus(day) === 'late');
    const absenceDays = monthDays.filter((day) => resolvedDayStatus(day) === 'absence');
    const restDays = monthDays.filter((day) => resolvedDayStatus(day) === 'rest');

    return {
      attendanceCount: attendanceDays.length,
      absenceCount: absenceDays.length,
      lateCount: lateDays.length,
      restCount: restDays.length,
    };
  }, [monthDays]);

  return (
    <div className="rounded-lg border border-[#59C3A5]/10 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label={copy.labels.previousMonth}
            onClick={() => onShiftMonth(-1)}
          >
            <span aria-hidden="true">‹</span>
          </Button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              {copy.labels.attendanceCalendar}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{calendarMonthLabel}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label={copy.labels.nextMonth}
            onClick={() => onShiftMonth(1)}
          >
            <span aria-hidden="true">›</span>
          </Button>
        </div>

      <div className="rounded-lg border border-[#59C3A5]/10 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ControlKpiMetric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={copy.labels.calendarKpiAttendances}
            value={calendarInsights.attendanceCount}
            valueClassName="text-[#59C3A5] dark:text-[#8FE0CA]"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<UserX className="h-4 w-4" />}
            label={copy.labels.calendarKpiAbsences}
            value={calendarInsights.absenceCount}
            valueClassName="text-rose-600 dark:text-rose-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<Clock3 className="h-4 w-4" />}
            label={copy.labels.calendarKpiLate}
            value={calendarInsights.lateCount}
            valueClassName="text-[#4f78bd] dark:text-[#8FE0CA]"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ControlKpiMetric
            icon={<Moon className="h-4 w-4" />}
            label={copy.labels.calendarKpiRest}
            value={calendarInsights.restCount}
            valueClassName="text-slate-500 dark:text-slate-300"
          />
        </div>
        <div className="mt-3">
          <CalendarKpiDistribution
            absenceCount={calendarInsights.absenceCount}
            attendanceCount={calendarInsights.attendanceCount}
            lateCount={calendarInsights.lateCount}
            restCount={calendarInsights.restCount}
          />
        </div>
      </div>

      {bulkActions?.isSelectionMode ? (
        <div className="rounded-lg border border-[#F2C94C]/35 bg-[#fff8df] p-3 shadow-sm dark:border-[#F2C94C]/25 dark:bg-[#2b240c]/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2C94C] text-slate-950">
                  <MousePointer2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {copy.labels.bulkCalendarTitle}
                  </p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {bulkActions.selectedCount > 0
                      ? copy.labels.bulkCalendarSelectedLabel(bulkActions.selectedCount)
                      : copy.labels.bulkCalendarModeDescription}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto_auto] sm:items-end">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span>{copy.labels.bulkCalendarStatusLabel}</span>
                <select
                  value={bulkActions.bulkCalendarStatus}
                  disabled={bulkActions.isUpdatingCalendarDay}
                  onChange={(event) => bulkActions.onBulkStatusChange(event.target.value as AttendanceCorrectionStatus | '')}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="on_time">{copy.labels.markAsAttendance}</option>
                  <option value="absence">{copy.labels.markAsAbsent}</option>
                  <option value="late">{copy.labels.markAsDelay}</option>
                  <option value="rest">{copy.labels.markAsRest}</option>
                  <option value="">{copy.labels.clearManualCorrection}</option>
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-lg border-white/60 bg-white/80 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={bulkActions.isUpdatingCalendarDay || bulkActions.selectedCount === 0}
                onClick={bulkActions.onClearSelection}
              >
                <X className="h-4 w-4" />
                {copy.labels.bulkCalendarClear}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-10 rounded-lg bg-[#59C3A5] text-xs font-semibold text-white hover:bg-[#3AAE90]"
                disabled={bulkActions.isUpdatingCalendarDay || bulkActions.selectedCount === 0}
                onClick={bulkActions.onBulkApply}
              >
                <Check className="h-4 w-4" />
                {copy.labels.bulkCalendarApply}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-900"
                disabled={bulkActions.isUpdatingCalendarDay}
                onClick={bulkActions.onExitSelectionMode}
              >
                {copy.labels.bulkCalendarExit}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-0.5 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:px-2 sm:text-xs sm:tracking-[0.12em]">
            {label}
          </div>
        ))}
      </div>

      {isLoadingCalendar ? (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="h-[76px] rounded-lg sm:h-[104px]" />
          ))}
        </div>
      ) : (
        <div className="grid select-none grid-cols-7 gap-1.5 sm:gap-3">
          {calendarCells.map((dayNumber, index) => {
            if (dayNumber === null) {
              return <div key={`empty-${index}`} className="h-[76px] sm:h-[104px]" />;
            }

            const day = attendanceCalendarMap.get(dayNumber) ?? null;
            const dateKey = `${calendarMonth}-${`${dayNumber}`.padStart(2, '0')}`;

            return (
              <ControlCalendarDayCell
                key={dateKey}
                copy={copy}
                day={day}
                dayNumber={dayNumber}
                isMultiSelected={selectedCalendarDateSet.has(dateKey)}
                isSelected={controlDate === dateKey}
                locale={locale}
                onPointerDown={(event) => onDayPointerDown(dateKey, event, day)}
                onPointerEnter={() => onDayPointerEnter(dateKey, day)}
                onPointerMove={() => onDayPointerMove(dateKey, day)}
                onSelect={() => onDaySelect(dateKey, day)}
              />
            );
          })}
        </div>
      )}

      <div className="border-t border-[#59C3A5]/10 pt-4 dark:border-gray-700">
        <div className="flex flex-wrap gap-5 text-xs text-gray-600 dark:text-gray-300">
          <LegendPill color="bg-emerald-500" label={copy.labels.checkIn} />
          <LegendPill color="bg-sky-500" label={copy.labels.checkOut} />
          <LegendOutline label={copy.labels.currentDay} />
        </div>
      </div>
      </div>
    </div>
  );
}
