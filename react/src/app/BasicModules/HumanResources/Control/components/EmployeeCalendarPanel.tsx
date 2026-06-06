import { useMemo, type MouseEvent } from 'react';
import { CheckCircle2, Clock3, Moon, UserX } from 'lucide-react';
import type {
  AttendanceCalendarDay,
  AttendanceCorrectionStatus,
} from '../../../../api/humanResources';
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
  selectedCalendarDates,
  selectedCalendarDateSet,
  bulkCalendarStatus,
  isUpdatingCalendarDay,
  isLoadingCalendar,
  weekdayLabels,
  calendarCells,
  attendanceCalendarMap,
  controlDate,
  calendarMonth,
  onShiftMonth,
  onBulkStatusChange,
  onBulkApply,
  onClearSelection,
  onDayMouseDown,
  onDayMouseEnter,
  onDaySelect,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  calendarMonthLabel: string;
  selectedCalendarDates: string[];
  selectedCalendarDateSet: Set<string>;
  bulkCalendarStatus: AttendanceCorrectionStatus | '';
  isUpdatingCalendarDay: boolean;
  isLoadingCalendar: boolean;
  weekdayLabels: string[];
  calendarCells: Array<number | null>;
  attendanceCalendarMap: Map<number, AttendanceCalendarDay>;
  controlDate: string;
  calendarMonth: string;
  onShiftMonth: (direction: -1 | 1) => void;
  onBulkStatusChange: (status: AttendanceCorrectionStatus | '') => void;
  onBulkApply: () => void;
  onClearSelection: () => void;
  onDayMouseDown: (date: string, event: MouseEvent<HTMLButtonElement>, day: AttendanceCalendarDay | null) => void;
  onDayMouseEnter: (date: string, day: AttendanceCalendarDay | null) => void;
  onDaySelect: (date: string, day: AttendanceCalendarDay | null) => void;
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
    <div className="rounded-[22px] border border-[#59C3A5]/10 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_6px_18px_rgba(89,195,165,0.04)] dark:border-gray-800 dark:bg-gray-900 sm:p-4">
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" size="icon" onClick={() => onShiftMonth(-1)}>
            <span aria-hidden="true">‹</span>
          </Button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              {copy.labels.attendanceCalendar}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{calendarMonthLabel}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => onShiftMonth(1)}>
            <span aria-hidden="true">›</span>
          </Button>
        </div>

      <div className="rounded-2xl border border-[#59C3A5]/10 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-gray-800 dark:bg-gray-950/40">
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

      {selectedCalendarDates.length > 1 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-4 dark:border-[#8FE0CA]/30 dark:bg-[#59C3A5]/20 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedCalendarDates.length} days selected
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Apply the same attendance status to the selected days.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={bulkCalendarStatus}
              disabled={isUpdatingCalendarDay}
              onChange={(event) => onBulkStatusChange(event.target.value as AttendanceCorrectionStatus | '')}
              className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="on_time">{copy.labels.markAsAttendance}</option>
              <option value="absence">{copy.labels.markAsAbsent}</option>
              <option value="late">{copy.labels.markAsDelay}</option>
              <option value="rest">{copy.labels.markAsRest}</option>
              <option value="">{copy.labels.clearManualCorrection}</option>
            </select>
            <Button
              type="button"
              className="h-10 bg-[#59C3A5] text-white hover:bg-[#3AAE90]"
              disabled={isUpdatingCalendarDay}
              onClick={onBulkApply}
            >
              Apply change
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={isUpdatingCalendarDay}
              onClick={onClearSelection}
            >
              Clear
            </Button>
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
            <Skeleton key={index} className="h-[76px] rounded-xl sm:h-[104px] sm:rounded-2xl" />
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
                onMouseDown={(event) => onDayMouseDown(dateKey, event, day)}
                onMouseEnter={() => onDayMouseEnter(dateKey, day)}
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
