import { useEffect, useRef, useState } from 'react';
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

export interface LoadControlOptions {
  reloadReferenceData?: boolean;
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
  const hasLoadedReferenceDataRef = useRef(false);

  const loadControl = async (date: string, options: LoadControlOptions = { reloadReferenceData: true }) => {
    setIsLoading(true);
    clearControlMessages();

    try {
      const shouldLoadReferenceData = Boolean(options.reloadReferenceData) || !hasLoadedReferenceDataRef.current;
      const response = await runWithMinimumDuration(
        shouldLoadReferenceData
          ? Promise.all([
              humanResourcesApi.getAttendanceControlOverview(date),
              humanResourcesApi.listAttendanceControlLocations(),
              humanResourcesApi.listAttendanceControlTemplates(),
              humanResourcesApi.listAttendanceKioskDevices(),
              humanResourcesApi.listAttendanceAccessProfiles(),
            ]).then(([overviewResponse, locationsResponse, templatesResponse, kioskDevicesResponse, accessProfilesResponse]) => ({
              accessProfiles: accessProfilesResponse.items,
              kioskDevices: kioskDevicesResponse.items,
              locations: locationsResponse.items,
              overview: overviewResponse,
              templates: templatesResponse.items,
            }))
          : humanResourcesApi.getAttendanceControlOverview(date).then((overviewResponse) => ({
              accessProfiles: null,
              kioskDevices: null,
              locations: null,
              overview: overviewResponse,
              templates: null,
            })),
        CONTROL_SAVE_MINIMUM_LOADING_MS,
      );

      setOverview(response.overview);
      if (response.locations && response.templates && response.kioskDevices && response.accessProfiles) {
        hasLoadedReferenceDataRef.current = true;
        setLocations(response.locations);
        setTemplates(response.templates);
        setKioskDevices(response.kioskDevices);
        setAccessProfiles(response.accessProfiles);
      }

      const nextTemplates = response.templates ?? templates;
      const nextKioskDevices = response.kioskDevices ?? kioskDevices;
      setSelectedEmployeeId((current) =>
        current && response.overview.assignments.some((assignment) => assignment.user_company_id === current)
          ? current
          : response.overview.assignments[0]?.user_company_id ?? null,
      );
      setSelectedTemplateId((current) =>
        current && nextTemplates.some((template) => template.id === current)
          ? current
          : response.overview.assignments[0]?.schedule_template_id ?? nextTemplates[0]?.id ?? null,
      );
      setSelectedKioskDeviceId((current) =>
        current && nextKioskDevices.some((device) => device.id === current)
          ? current
          : nextKioskDevices[0]?.id ?? null,
      );
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadControl(controlDate, { reloadReferenceData: false });
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
