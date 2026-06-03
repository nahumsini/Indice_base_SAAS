import { useMemo } from 'react';
import type {
  AttendanceAccessProfile,
  AttendanceCalendarDay,
  AttendanceControlLocation,
  AttendanceControlOverviewResponse,
  AttendanceControlTemplate,
  AttendanceKioskDevice,
} from '../../../../api/humanResources';
import { getAssignmentBusyReason } from '../components/ControlAttendanceWidgets';
import type { ControlTranslations } from '../translations';
import {
  findRuleForSelectedDay,
  isDateWithinContractSiteWindow,
} from '../utils/control.utils';

interface UseControlDerivedStateInput {
  accessProfiles: AttendanceAccessProfile[];
  attendanceCalendarDays: AttendanceCalendarDay[];
  calendarMonth: string;
  controlDate: string;
  copy: ControlTranslations;
  faceEnrollment: { id: number; status: string; enrolled_at?: string | null } | null;
  isClearingCalendarDaySchedule: boolean;
  isLoading: boolean;
  isLoadingCalendar: boolean;
  isRemovingTimeTableDay: boolean;
  isSaving: boolean;
  isUpdatingCalendarDay: boolean;
  kioskDevices: AttendanceKioskDevice[];
  languageCode: string;
  locations: AttendanceControlLocation[];
  overview: AttendanceControlOverviewResponse | null;
  selectedCalendarDay: AttendanceCalendarDay | null;
  selectedEmployeeId: number | null;
  selectedKioskDeviceId: number | null;
  selectedTemplateId: number | null;
  templates: AttendanceControlTemplate[];
}

export function useControlDerivedState({
  accessProfiles,
  attendanceCalendarDays,
  calendarMonth,
  controlDate,
  copy,
  faceEnrollment,
  isClearingCalendarDaySchedule,
  isLoading,
  isLoadingCalendar,
  isRemovingTimeTableDay,
  isSaving,
  isUpdatingCalendarDay,
  kioskDevices,
  languageCode,
  locations,
  overview,
  selectedCalendarDay,
  selectedEmployeeId,
  selectedKioskDeviceId,
  selectedTemplateId,
  templates,
}: UseControlDerivedStateInput) {
  const attendanceCalendarMap = useMemo(
    () => new Map(attendanceCalendarDays.map((day) => [day.day, day])),
    [attendanceCalendarDays],
  );

  const selectedCalendarDetailDay = useMemo(
    () => (
      selectedCalendarDay?.date === controlDate
        ? selectedCalendarDay
        : attendanceCalendarDays.find((day) => day.date === controlDate) ?? null
    ),
    [attendanceCalendarDays, controlDate, selectedCalendarDay],
  );

  const selectedEmployee = useMemo(
    () => overview?.assignments.find((assignment) => assignment.user_company_id === selectedEmployeeId) ?? null,
    [overview?.assignments, selectedEmployeeId],
  );
  const selectedEmployeeBusyReason = selectedEmployee ? getAssignmentBusyReason(selectedEmployee, copy) : '';

  const occupiedContractSiteLocationIds = useMemo(() => {
    const locationIds = new Set<number>();
    overview?.assignments.forEach((assignment) => {
      const locationId = assignment.active_work_site?.location_id;
      if (locationId && assignment.user_company_id !== selectedEmployeeId) {
        locationIds.add(locationId);
      }
    });
    return locationIds;
  }, [overview?.assignments, selectedEmployeeId]);

  const availableContractSiteLocations = useMemo(
    () => locations.filter((location) =>
      location.status !== 'inactive' &&
      isDateWithinContractSiteWindow(location, controlDate) &&
      !occupiedContractSiteLocationIds.has(location.id),
    ),
    [controlDate, locations, occupiedContractSiteLocationIds],
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );
  const selectedRuleForDate = useMemo(
    () => findRuleForSelectedDay(selectedTemplate, controlDate),
    [controlDate, selectedTemplate],
  );
  const selectedKioskDevice = useMemo(
    () => kioskDevices.find((device) => device.id === selectedKioskDeviceId) ?? null,
    [kioskDevices, selectedKioskDeviceId],
  );
  const selectedAccessProfile = useMemo(
    () =>
      accessProfiles.find((profile) => profile.user_company_id === selectedEmployeeId)
      ?? selectedEmployee?.access_profile
      ?? null,
    [accessProfiles, selectedEmployee, selectedEmployeeId],
  );
  const selectedFaceEnrollment = useMemo(
    () => faceEnrollment ?? selectedAccessProfile?.face_enrollment ?? selectedEmployee?.access_profile?.face_enrollment ?? null,
    [faceEnrollment, selectedAccessProfile, selectedEmployee?.access_profile],
  );

  const calendarCells = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<number | null> = [];

    for (let index = 0; index < startOffset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth]);

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) =>
        new Intl.DateTimeFormat(languageCode, { weekday: 'short' }).format(new Date(2026, 0, 4 + index)),
      ),
    [languageCode],
  );

  const controlDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(languageCode, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${controlDate}T00:00:00`)),
    [controlDate, languageCode],
  );

  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(languageCode, {
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${calendarMonth}-01T00:00:00`)),
    [calendarMonth, languageCode],
  );

  const controlOperationSummary = useMemo(() => {
    const assignments = overview?.assignments ?? [];
    const totalCount = assignments.length;

    const summary = assignments.reduce(
      (current, assignment) => {
        const effectiveStatus = assignment.corrected_status ?? assignment.today_status;
        const hasCheckIn = Boolean(assignment.first_check_in_at);
        const hasCheckOut = Boolean(assignment.last_check_out_at);

        if (hasCheckIn) {
          current.checkInsCount += 1;
        }
        if (hasCheckOut) {
          current.checkOutsCount += 1;
        }
        if (hasCheckIn && !hasCheckOut) {
          current.activeShiftCount += 1;
        }

        switch (effectiveStatus) {
          case 'on_time':
            current.onTrackCount += 1;
            break;
          case 'late':
            current.lateCount += 1;
            break;
          case 'absence':
            current.absencesCount += 1;
            break;
          case 'pending':
            if (!hasCheckIn && !hasCheckOut) {
              current.noRecordCount += 1;
            } else {
              current.otherStatusCount += 1;
            }
            break;
          default:
            current.otherStatusCount += 1;
        }

        return current;
      },
      {
        absencesCount: 0,
        activeShiftCount: 0,
        checkInsCount: 0,
        checkOutsCount: 0,
        lateCount: 0,
        noRecordCount: 0,
        onTrackCount: 0,
        otherStatusCount: 0,
      },
    );

    return {
      ...summary,
      totalCount,
    };
  }, [overview?.assignments]);

  const isControlOverlayVisible = isSaving || isUpdatingCalendarDay || isRemovingTimeTableDay || isClearingCalendarDaySchedule || isLoadingCalendar || isLoading;
  const loadingOverlayTitle = isClearingCalendarDaySchedule
    ? copy.labels.clearingDaySchedule
    : isUpdatingCalendarDay
      ? copy.labels.savingDayStatus
      : isRemovingTimeTableDay
        ? copy.labels.removingTimeTableDay
        : isLoadingCalendar
          ? copy.labels.loadingCalendar
          : isLoading
            ? copy.loading
            : copy.labels.savingChanges;
  const loadingOverlayDescription = isClearingCalendarDaySchedule
    ? copy.labels.clearingDayScheduleDescription
    : isUpdatingCalendarDay
      ? copy.labels.savingDayStatusDescription
      : isRemovingTimeTableDay
        ? copy.labels.removingTimeTableDayDescription
        : isLoadingCalendar
          ? copy.labels.loadingCalendarDescription
          : isLoading
            ? copy.labels.loadingControlDescription
            : copy.labels.savingChangesDescription;

  return {
    attendanceCalendarMap,
    availableContractSiteLocations,
    calendarCells,
    calendarMonthLabel,
    controlDateLabel,
    controlOperationSummary,
    isControlOverlayVisible,
    loadingOverlayDescription,
    loadingOverlayTitle,
    selectedAccessProfile,
    selectedCalendarDetailDay,
    selectedEmployee,
    selectedEmployeeBusyReason,
    selectedFaceEnrollment,
    selectedKioskDevice,
    selectedRuleForDate,
    selectedTemplate,
    weekdayLabels,
  };
}
