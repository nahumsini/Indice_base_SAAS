import type { Dispatch, SetStateAction } from 'react';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import {
  type AttendanceCalendarDay,
  type AttendanceControlAssignment,
  type AttendanceControlOverviewResponse,
  type AttendanceCorrectionStatus,
  type AttendanceDailyRecordUpdateResponse,
  type AttendanceManualEventKind,
  humanResourcesApi,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import { applyCalendarDayUpdate } from './attendanceWidgetUtils';
import {
  CONTROL_SAVE_MINIMUM_LOADING_MS,
  toErrorMessage,
  toMonthValue,
  todayIsoDate,
  waitForNextPaint,
} from './control.utils';

export interface PendingCalendarScheduleClear {
  employeeId: number;
  employeeName: string;
  targetDate: string;
}

export interface CalendarActionContext {
  attendanceCalendarDays: AttendanceCalendarDay[];
  bulkCalendarStatus: AttendanceCorrectionStatus | '';
  calendarMonth: string;
  clearCalendarDateSelection: () => void;
  clearControlMessages: () => void;
  controlDate: string;
  copy: ControlTranslations;
  isSaving: boolean;
  isUpdatingCalendarDay: boolean;
  loadControl: (date: string, options?: { reloadReferenceData?: boolean }) => Promise<void>;
  pendingCalendarScheduleClear: PendingCalendarScheduleClear | null;
  selectedCalendarDates: string[];
  selectedCalendarDay: AttendanceCalendarDay | null;
  selectedEmployee: AttendanceControlAssignment | null;
  selectedEmployeeId: number | null;
  setAttendanceCalendarDays: Dispatch<SetStateAction<AttendanceCalendarDay[]>>;
  setCalendarMonth: Dispatch<SetStateAction<string>>;
  setControlDate: Dispatch<SetStateAction<string>>;
  setIsClearingCalendarDaySchedule: Dispatch<SetStateAction<boolean>>;
  setIsUpdatingCalendarDay: Dispatch<SetStateAction<boolean>>;
  setOverview: Dispatch<SetStateAction<AttendanceControlOverviewResponse | null>>;
  setPendingCalendarScheduleClear: Dispatch<SetStateAction<PendingCalendarScheduleClear | null>>;
  setSelectedCalendarDay: Dispatch<SetStateAction<AttendanceCalendarDay | null>>;
  showFailureToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
}

const findTargetDay = (
  days: AttendanceCalendarDay[],
  selectedDay: AttendanceCalendarDay | null,
  date: string,
) => (
  selectedDay?.date === date
    ? selectedDay
    : days.find((day) => day.date === date)
);

const isCalendarDateLocked = (
  date: string,
  targetDay: AttendanceCalendarDay | undefined | null,
  copy: ControlTranslations,
) => {
  if (date > todayIsoDate()) {
    return copy.labels.futureAttendanceLocked;
  }

  if (targetDay?.attendance_editable === false) {
    return targetDay.edit_lock_reason || copy.labels.notModifiable;
  }

  return '';
};

const updateCalendarOverview = (
  employeeId: number,
  date: string,
  result: AttendanceDailyRecordUpdateResponse,
) => (current: AttendanceControlOverviewResponse | null) => {
  if (!current) {
    return current;
  }

  return {
    ...current,
    date,
    assignments: current.assignments.map((assignment) =>
      assignment.user_company_id === employeeId
        ? {
            ...assignment,
            today_status: result.effective_status as AttendanceControlAssignment['today_status'],
            system_status: result.system_status as AttendanceControlAssignment['system_status'],
            corrected_status: (result.corrected_status ?? null) as AttendanceControlAssignment['corrected_status'],
          }
        : assignment,
    ),
  };
};

const applyCalendarUpdateResult = (
  context: CalendarActionContext,
  date: string,
  result: AttendanceDailyRecordUpdateResponse,
) => {
  context.setAttendanceCalendarDays((current) =>
    current.map((day) => (day.date === date ? applyCalendarDayUpdate(day, result) : day)),
  );
  context.setSelectedCalendarDay((current) =>
    current && current.date === date ? applyCalendarDayUpdate(current, result) : current,
  );
};

const refreshEmployeeCalendar = async (
  employeeId: number,
  month: string,
  focusDate: string,
  context: CalendarActionContext,
) => {
  const [calendarResponse] = await Promise.all([
    humanResourcesApi.getAttendanceCalendar(employeeId, month),
    context.loadControl(focusDate, { reloadReferenceData: false }),
  ]);

  context.setAttendanceCalendarDays(calendarResponse.items);
  return calendarResponse.items;
};

export const shiftControlCalendarMonth = (context: CalendarActionContext, direction: -1 | 1) => {
  const [year, month] = context.calendarMonth.split('-').map(Number);
  const base = new Date(year, month - 1, 1);
  const next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
  const nextMonth = toMonthValue(next);
  const currentDay = Number(context.controlDate.slice(8, 10));
  const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  const nextDay = `${Math.min(currentDay, lastDayOfNextMonth)}`.padStart(2, '0');

  context.setCalendarMonth(nextMonth);
  context.setControlDate(`${nextMonth}-${nextDay}`);
  context.clearCalendarDateSelection();
};

export const updateCalendarStatus = async (
  context: CalendarActionContext,
  date: string,
  status: AttendanceCorrectionStatus | '',
) => {
  if (!context.selectedEmployeeId) {
    return false;
  }

  const targetDay = findTargetDay(context.attendanceCalendarDays, context.selectedCalendarDay, date);
  const lockedMessage = isCalendarDateLocked(date, targetDay, context.copy);
  if (lockedMessage) {
    context.showFailureToast(lockedMessage);
    return false;
  }

  try {
    context.setIsUpdatingCalendarDay(true);
    await waitForNextPaint();
    const result = await runWithMinimumDuration(
      humanResourcesApi.updateAttendanceDailyRecord(context.selectedEmployeeId, date, { status }),
      CONTROL_SAVE_MINIMUM_LOADING_MS,
    );
    context.setControlDate(date);
    applyCalendarUpdateResult(context, date, result);
    context.setOverview(updateCalendarOverview(context.selectedEmployeeId, date, result));

    const calendarItems = await refreshEmployeeCalendar(context.selectedEmployeeId, context.calendarMonth, date, context);
    context.setSelectedCalendarDay(calendarItems.find((day) => day.date === date) ?? null);
    context.showSuccessToast(status ? context.copy.labels.correctionApplied : context.copy.labels.correctionCleared);
    return true;
  } catch (error) {
    context.showFailureToast(toErrorMessage(error, context.copy) || context.copy.saveError);
    return false;
  } finally {
    context.setIsUpdatingCalendarDay(false);
  }
};

export const bulkUpdateCalendarStatus = async (context: CalendarActionContext) => {
  if (!context.selectedEmployeeId || context.selectedCalendarDates.length === 0) {
    return;
  }

  const dates = [...context.selectedCalendarDates].sort();
  const futureDate = dates.find((date) => date > todayIsoDate());
  if (futureDate) {
    context.showFailureToast(context.copy.labels.futureAttendanceLocked);
    return;
  }

  const lockedDay = dates
    .map((date) => context.attendanceCalendarDays.find((day) => day.date === date))
    .find((day) => day?.attendance_editable === false);
  if (lockedDay?.attendance_editable === false) {
    context.showFailureToast(lockedDay.edit_lock_reason || context.copy.labels.notModifiable);
    return;
  }

  try {
    context.setIsUpdatingCalendarDay(true);
    context.clearControlMessages();
    await waitForNextPaint();

    const response = await runWithMinimumDuration(
      humanResourcesApi.bulkUpdateAttendanceDailyRecords(context.selectedEmployeeId, {
        dates,
        status: context.bulkCalendarStatus,
      }),
      CONTROL_SAVE_MINIMUM_LOADING_MS,
    );

    const resultsByDate = new Map(response.items.map((result) => [result.date, result] as const));
    context.setAttendanceCalendarDays((current) =>
      current.map((day) => {
        const result = resultsByDate.get(day.date);
        return result ? applyCalendarDayUpdate(day, result) : day;
      }),
    );

    const focusDate = dates[dates.length - 1];
    const focusMonth = toMonthValue(focusDate);
    context.setControlDate(focusDate);
    context.setCalendarMonth(focusMonth);

    await refreshEmployeeCalendar(context.selectedEmployeeId, focusMonth, focusDate, context);
    context.setSelectedCalendarDay(null);
    context.clearCalendarDateSelection();
    context.showSuccessToast(context.copy.labels.bulkCalendarUpdated(dates.length));
  } catch (error) {
    context.showFailureToast(toErrorMessage(error, context.copy) || context.copy.saveError);
  } finally {
    context.setIsUpdatingCalendarDay(false);
  }
};

export const recordManualCalendarPunch = async (
  context: CalendarActionContext,
  date: string,
  eventKind: AttendanceManualEventKind,
  eventDate: string,
  eventTime: string,
) => {
  if (!context.selectedEmployeeId) {
    return false;
  }
  if (date > todayIsoDate() || eventDate > todayIsoDate()) {
    context.showFailureToast(context.copy.labels.futureAttendanceLocked);
    return false;
  }

  const targetDay = findTargetDay(context.attendanceCalendarDays, context.selectedCalendarDay, date);
  const lockedMessage = isCalendarDateLocked(date, targetDay, context.copy);
  if (lockedMessage) {
    context.showFailureToast(lockedMessage);
    return false;
  }
  if (!eventDate || !eventTime) {
    context.showFailureToast(context.copy.saveError);
    return false;
  }

  try {
    context.setIsUpdatingCalendarDay(true);
    context.clearControlMessages();
    await waitForNextPaint();
    const result = await runWithMinimumDuration(
      humanResourcesApi.recordManualAttendanceEvent(context.selectedEmployeeId, date, {
        event_kind: eventKind,
        event_date: eventDate,
        event_time: eventTime,
      }),
      CONTROL_SAVE_MINIMUM_LOADING_MS,
    );
    const targetCalendarMonth = toMonthValue(date);
    context.setControlDate(date);
    context.setCalendarMonth(targetCalendarMonth);
    applyCalendarUpdateResult(context, date, result);

    const calendarItems = await refreshEmployeeCalendar(context.selectedEmployeeId, targetCalendarMonth, date, context);
    context.setSelectedCalendarDay(calendarItems.find((day) => day.date === date) ?? null);
    context.showSuccessToast(context.copy.labels.manualPunchSaved);
    return true;
  } catch (error) {
    context.showFailureToast(toErrorMessage(error, context.copy) || context.copy.saveError);
    return false;
  } finally {
    context.setIsUpdatingCalendarDay(false);
  }
};

export const requestCalendarScheduleClear = (
  context: CalendarActionContext,
  date: string,
) => {
  if (!context.selectedEmployeeId) {
    return false;
  }

  context.setPendingCalendarScheduleClear({
    employeeId: context.selectedEmployeeId,
    employeeName: context.selectedEmployee?.user_name ?? context.copy.labels.selectedEmployeeFallback,
    targetDate: date,
  });

  return false;
};

export const confirmCalendarScheduleClear = async (context: CalendarActionContext) => {
  if (!context.pendingCalendarScheduleClear || context.isSaving || context.isUpdatingCalendarDay) {
    return;
  }

  const { employeeId, targetDate } = context.pendingCalendarScheduleClear;
  context.setPendingCalendarScheduleClear(null);
  context.setIsUpdatingCalendarDay(true);
  context.setIsClearingCalendarDaySchedule(true);
  context.clearControlMessages();
  await waitForNextPaint();

  try {
    await runWithMinimumDuration((async () => {
      await humanResourcesApi.clearAttendanceWorkAssignments({
        user_company_id: employeeId,
        date: targetDate,
      });
      const targetCalendarMonth = toMonthValue(targetDate);
      context.setControlDate(targetDate);
      context.setCalendarMonth(targetCalendarMonth);

      await refreshEmployeeCalendar(employeeId, targetCalendarMonth, targetDate, context);
      context.setSelectedCalendarDay(null);
      context.showSuccessToast(context.copy.labels.clearDayScheduleSuccess);
    })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
  } catch (error) {
    context.showFailureToast(toErrorMessage(error, context.copy) || context.copy.saveError);
  } finally {
    context.setIsClearingCalendarDaySchedule(false);
    context.setIsUpdatingCalendarDay(false);
  }
};
