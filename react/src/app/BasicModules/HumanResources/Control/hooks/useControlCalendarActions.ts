import type { Dispatch, SetStateAction } from 'react';
import {
  type AttendanceCalendarDay,
  type AttendanceControlAssignment,
  type AttendanceControlOverviewResponse,
  type AttendanceCorrectionStatus,
  type AttendanceManualEventKind,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import {
  bulkUpdateCalendarStatus,
  confirmCalendarScheduleClear,
  type CalendarActionContext,
  type PendingCalendarScheduleClear,
  recordManualCalendarPunch,
  requestCalendarScheduleClear,
  shiftControlCalendarMonth,
  updateCalendarStatus,
} from '../utils/controlCalendarActions';

interface UseControlCalendarActionsInput {
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

export function useControlCalendarActions({
  attendanceCalendarDays,
  bulkCalendarStatus,
  calendarMonth,
  clearCalendarDateSelection,
  clearControlMessages,
  controlDate,
  copy,
  isSaving,
  isUpdatingCalendarDay,
  loadControl,
  pendingCalendarScheduleClear,
  selectedCalendarDates,
  selectedCalendarDay,
  selectedEmployee,
  selectedEmployeeId,
  setAttendanceCalendarDays,
  setCalendarMonth,
  setControlDate,
  setIsClearingCalendarDaySchedule,
  setIsUpdatingCalendarDay,
  setOverview,
  setPendingCalendarScheduleClear,
  setSelectedCalendarDay,
  showFailureToast,
  showSuccessToast,
}: UseControlCalendarActionsInput) {
  const actionContext: CalendarActionContext = {
    attendanceCalendarDays,
    bulkCalendarStatus,
    calendarMonth,
    clearCalendarDateSelection,
    clearControlMessages,
    controlDate,
    copy,
    isSaving,
    isUpdatingCalendarDay,
    loadControl,
    pendingCalendarScheduleClear,
    selectedCalendarDates,
    selectedCalendarDay,
    selectedEmployee,
    selectedEmployeeId,
    setAttendanceCalendarDays,
    setCalendarMonth,
    setControlDate,
    setIsClearingCalendarDaySchedule,
    setIsUpdatingCalendarDay,
    setOverview,
    setPendingCalendarScheduleClear,
    setSelectedCalendarDay,
    showFailureToast,
    showSuccessToast,
  };

  const handleCalendarStatusUpdate = async (
    date: string,
    status: AttendanceCorrectionStatus | '',
  ) => updateCalendarStatus(actionContext, date, status);

  const handleBulkCalendarStatusUpdate = async () => bulkUpdateCalendarStatus(actionContext);

  const handleManualCalendarPunch = async (
    date: string,
    eventKind: AttendanceManualEventKind,
    eventDate: string,
    eventTime: string,
  ) => recordManualCalendarPunch(actionContext, date, eventKind, eventDate, eventTime);

  const handleClearCalendarDaySchedule = async (date: string) => requestCalendarScheduleClear(actionContext, date);

  const handleConfirmClearCalendarDaySchedule = async () => confirmCalendarScheduleClear(actionContext);

  return {
    handleBulkCalendarStatusUpdate,
    handleCalendarStatusUpdate,
    handleClearCalendarDaySchedule,
    handleConfirmClearCalendarDaySchedule,
    handleManualCalendarPunch,
    shiftCalendarMonth: (direction: -1 | 1) => shiftControlCalendarMonth(actionContext, direction),
  };
}
