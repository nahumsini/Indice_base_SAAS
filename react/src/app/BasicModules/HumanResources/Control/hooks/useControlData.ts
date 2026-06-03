import { useEffect, useState } from 'react';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { useLocalStorageState } from '../../../../hooks/useLocalStorageState';
import {
  type AttendanceAccessProfile,
  type AttendanceCalendarDay,
  type AttendanceControlLocation,
  type AttendanceControlOverviewResponse,
  type AttendanceControlTemplate,
  type AttendanceKioskDevice,
  humanResourcesApi,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import {
  CONTROL_SAVE_MINIMUM_LOADING_MS,
  hrAttendanceSelectedEmployeeStorageKey,
  toErrorMessage,
  toMonthValue,
  todayIsoDate,
} from '../utils/control.utils';

interface UseControlDataInput {
  clearControlMessages: () => void;
  copy: ControlTranslations;
  showFailureToast: (message: string) => void;
  successMessage: string;
}

export function useControlData({
  clearControlMessages,
  copy,
  showFailureToast,
  successMessage,
}: UseControlDataInput) {
  const [controlDate, setControlDate] = useState(todayIsoDate());
  const [calendarMonth, setCalendarMonth] = useState(toMonthValue(todayIsoDate()));
  const [overview, setOverview] = useState<AttendanceControlOverviewResponse | null>(null);
  const [attendanceCalendarDays, setAttendanceCalendarDays] = useState<AttendanceCalendarDay[]>([]);
  const [locations, setLocations] = useState<AttendanceControlLocation[]>([]);
  const [templates, setTemplates] = useState<AttendanceControlTemplate[]>([]);
  const [kioskDevices, setKioskDevices] = useState<AttendanceKioskDevice[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AttendanceAccessProfile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useLocalStorageState<number | null>(
    hrAttendanceSelectedEmployeeStorageKey,
    null,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedKioskDeviceId, setSelectedKioskDeviceId] = useState<number | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<AttendanceCalendarDay | null>(null);
  const [faceEnrollment, setFaceEnrollment] = useState<{ id: number; status: string; enrolled_at?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const loadControl = async (date: string) => {
    setIsLoading(true);
    clearControlMessages();

    try {
      const [overviewResponse, locationsResponse, templatesResponse, kioskDevicesResponse, accessProfilesResponse] = await runWithMinimumDuration(
        Promise.all([
          humanResourcesApi.getAttendanceControlOverview(date),
          humanResourcesApi.listAttendanceControlLocations(),
          humanResourcesApi.listAttendanceControlTemplates(),
          humanResourcesApi.listAttendanceKioskDevices(),
          humanResourcesApi.listAttendanceAccessProfiles(),
        ]),
        CONTROL_SAVE_MINIMUM_LOADING_MS,
      );

      setOverview(overviewResponse);
      setLocations(locationsResponse.items);
      setTemplates(templatesResponse.items);
      setKioskDevices(kioskDevicesResponse.items);
      setAccessProfiles(accessProfilesResponse.items);
      setSelectedEmployeeId((current) =>
        current && overviewResponse.assignments.some((assignment) => assignment.user_company_id === current)
          ? current
          : overviewResponse.assignments[0]?.user_company_id ?? null,
      );
      setSelectedTemplateId((current) =>
        current && templatesResponse.items.some((template) => template.id === current)
          ? current
          : overviewResponse.assignments[0]?.schedule_template_id ?? templatesResponse.items[0]?.id ?? null,
      );
      setSelectedKioskDeviceId((current) =>
        current && kioskDevicesResponse.items.some((device) => device.id === current)
          ? current
          : kioskDevicesResponse.items[0]?.id ?? null,
      );
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadControl(controlDate);
  }, [controlDate]);

  useEffect(() => {
    const nextMonth = controlDate.slice(0, 7);
    setCalendarMonth((current) => (current === nextMonth ? current : nextMonth));
  }, [controlDate]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setFaceEnrollment(null);
      return;
    }

    let active = true;
    humanResourcesApi.getFaceEnrollment(selectedEmployeeId)
      .then((response) => {
        if (active) {
          setFaceEnrollment(response.enrollment);
        }
      })
      .catch(() => {
        if (active) {
          setFaceEnrollment(null);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedEmployeeId, successMessage]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setAttendanceCalendarDays([]);
      setSelectedCalendarDay(null);
      setIsLoadingCalendar(false);
      return;
    }

    let active = true;
    setIsLoadingCalendar(true);

    runWithMinimumDuration(
      humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, calendarMonth),
      CONTROL_SAVE_MINIMUM_LOADING_MS,
    )
      .then((response) => {
        if (active) {
          setAttendanceCalendarDays(response.items);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setAttendanceCalendarDays([]);
        showFailureToast(toErrorMessage(error, copy));
      })
      .finally(() => {
        if (active) {
          setIsLoadingCalendar(false);
        }
      });

    return () => {
      active = false;
    };
  }, [calendarMonth, copy, selectedEmployeeId, successMessage]);

  useEffect(() => {
    if (!selectedCalendarDay) {
      return;
    }

    const refreshedDay = attendanceCalendarDays.find((day) => day.date === selectedCalendarDay.date);
    if (!refreshedDay) {
      setSelectedCalendarDay(null);
      return;
    }

    if (refreshedDay !== selectedCalendarDay) {
      setSelectedCalendarDay(refreshedDay);
    }
  }, [attendanceCalendarDays, selectedCalendarDay]);

  return {
    accessProfiles,
    attendanceCalendarDays,
    calendarMonth,
    controlDate,
    faceEnrollment,
    isLoading,
    isLoadingCalendar,
    kioskDevices,
    loadControl,
    locations,
    overview,
    selectedCalendarDay,
    selectedEmployeeId,
    selectedKioskDeviceId,
    selectedTemplateId,
    setAttendanceCalendarDays,
    setCalendarMonth,
    setControlDate,
    setFaceEnrollment,
    setIsLoadingCalendar,
    setKioskDevices,
    setOverview,
    setSelectedCalendarDay,
    setSelectedEmployeeId,
    setSelectedKioskDeviceId,
    setSelectedTemplateId,
    templates,
  };
}
