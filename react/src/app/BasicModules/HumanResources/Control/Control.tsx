import { type MouseEvent, type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '../../../components/ui/button';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { Skeleton } from '../../../components/ui/skeleton';
import { AttendanceControlDialogs } from './components/AttendanceControlDialogs';
import { AttendanceDailyBoard } from './components/AttendanceDailyBoard';
import { AttendanceQuickActions } from './components/AttendanceQuickActions';
import { AttendanceSettingsActions } from './components/AttendanceSettingsActions';
import { EmployeeAttendanceDetailPanel } from './components/EmployeeAttendanceDetailPanel';
import { EmployeeCalendarPanel } from './components/EmployeeCalendarPanel';
import {
  type AttendanceControlCopy,
  applyCalendarDayUpdate,
  getAssignmentBusyReason,
} from './components/ControlAttendanceWidgets';
import {
  ControlKpiStrip,
  type ControlKpiStripLabels,
} from './components/ControlKpiStrip';
import {
  type ControlWorkSiteForm,
} from './components/ControlDialogs';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { ApiClientError } from '../../../lib/apiClient';
import {
  type AttendanceCalendarDay,
  type AttendanceAccessProfile,
  type AttendanceCorrectionStatus,
  type AttendanceManualEventKind,
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlAssignmentPayload,
  type AttendanceKioskDevice,
  type AttendanceKioskDevicePayload,
  type AttendanceControlLocation,
  type AttendanceControlLocationPayload,
  type AttendanceControlOverviewResponse,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
} from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';
import { useControlTranslations } from './hooks/useControlTranslations';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const todayIsoDate = () => localDateString(new Date());
const hrAttendanceSelectedEmployeeStorageKey = 'indice.hr.attendance.selectedEmployeeId';
const allFilterValue = 'all';
const emptyFilterValue = '__empty__';
const attendanceStatusFilterValues = [
  'on_time',
  'late',
  'absence',
  'leave',
  'rest',
  'pending',
  'not_scheduled',
] as const;
const toMonthValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

const assignmentUnitFilterKey = (assignment: AttendanceControlAssignment) =>
  assignment.unit_id != null
    ? `id:${assignment.unit_id}`
    : assignment.unit_name
    ? `name:${assignment.unit_name}`
    : emptyFilterValue;

const assignmentBusinessFilterKey = (assignment: AttendanceControlAssignment) =>
  assignment.business_id != null
    ? `id:${assignment.business_id}`
    : assignment.business_name
    ? `name:${assignment.business_name}`
    : emptyFilterValue;

const weekdayNumbers = [1, 2, 3, 4, 5, 6, 7] as const;
const CONTROL_SAVE_MINIMUM_LOADING_MS = 1000;
const isDefaultNoShiftDay = (dayOfWeek: number) => dayOfWeek === 6 || dayOfWeek === 7;

const waitForNextPaint = () => (
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
      return;
    }

    setTimeout(resolve, 0);
  })
);

const attendanceListBatchSize = 10;

const createDefaultTemplateDays = () =>
  weekdayNumbers.map((day) => ({
    day_of_week: day,
    start_time: '08:00:00',
    end_time: '16:00:00',
    meal_minutes: 0,
    rest_minutes: 0,
    late_after_minutes: 10,
    is_rest_day: isDefaultNoShiftDay(day),
  }));

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const defaultLocationForm = (): AttendanceControlLocationPayload => ({
  unit_id: null,
  business_id: null,
  contract_start_date: todayInputValue(),
  contract_end_date: todayInputValue(),
  name: '',
  latitude: 25.686614,
  longitude: -100.316113,
  radius_meters: 120,
  required_hours_per_day: 8,
  required_start_time: '08:00:00',
  required_end_time: '16:00:00',
  status: 'active',
});

const defaultTemplateForm = (): AttendanceControlTemplatePayload => ({
  name: '',
  status: 'active',
  schedule_mode: 'strict',
  block_after_grace_period: false,
  enforce_location: false,
  location_id: null,
  days: createDefaultTemplateDays(),
});

const defaultAssignmentForm = (): AttendanceControlAssignmentPayload => ({
  user_company_ids: [],
  template_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: todayIsoDate(),
});

const defaultWorkSiteForm = (): ControlWorkSiteForm => ({
  user_company_ids: [],
  location_ids: [],
  location_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: todayIsoDate(),
  start_time: '08:00',
  end_time: '16:00',
});

const laterDate = (...dates: Array<string | null | undefined>) => {
  const values = dates.filter((date): date is string => Boolean(date));
  values.sort();
  return values.length > 0 ? values[values.length - 1] : '';
};

const isDateWithinContractSiteWindow = (location: AttendanceControlLocation, date: string) => (
  (!location.contract_start_date || date >= location.contract_start_date) &&
  (!location.contract_end_date || date <= location.contract_end_date)
);

const contractSiteAssignmentDates = (location: AttendanceControlLocation | undefined, requestedDate: string) => {
  const today = todayIsoDate();
  if (!location) {
    const startDate = laterDate(today, requestedDate) || today;
    return { startDate, endDate: startDate };
  }

  const minimumStartDate = laterDate(today, location.contract_start_date);
  const requestedStartDate = requestedDate && requestedDate >= minimumStartDate ? requestedDate : minimumStartDate;
  const maximumEndDate = location.contract_end_date;
  const startDate = maximumEndDate && requestedStartDate > maximumEndDate ? maximumEndDate : requestedStartDate;
  const endDate = maximumEndDate && maximumEndDate >= startDate ? maximumEndDate : startDate;
  return { startDate, endDate };
};

const defaultKioskForm = (): AttendanceKioskDevicePayload => ({
  code: '',
  name: '',
  unit_id: null,
  business_id: null,
  location_id: null,
  status: 'active',
  metadata: {
    kiosk_type: 'business_unit',
    supports_face_recognition: false,
  },
});

const findRuleForSelectedDay = (
  template: AttendanceControlTemplate | null,
  selectedDate: string,
) => {
  if (!template) {
    return null;
  }

  const parsed = new Date(`${selectedDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dayOfWeek = parsed.getDay() === 0 ? 7 : parsed.getDay();
  return template.days.find((day) => day.day_of_week === dayOfWeek) ?? null;
};

const timeInputValue = (value?: string | null) => (value ? value.slice(0, 5) : '');
const templateDayMatchesHours = (
  day: AttendanceControlTemplate['days'][number] | undefined,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
) => {
  if (!day) {
    return false;
  }
  return !day.is_rest_day && timeInputValue(day.start_time) === startTime && timeInputValue(day.end_time) === endTime;
};

const toErrorMessage = (error: unknown, copy: AttendanceControlCopy) => {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return copy.notFound;
    }
    if (error.status === 401) {
      return copy.unauthorized;
    }
    return error.message || copy.genericError;
  }

  return error instanceof Error ? error.message : copy.genericError;
};

export default function Control() {
  const { currentLanguage } = useLanguage();
  const copy = useControlTranslations();
  const controlKpiLabels = useMemo(
    () => copy.kpi satisfies ControlKpiStripLabels,
    [copy.kpi],
  );
  const headerActionButtonClassName = 'h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#59C3A5] shadow-none hover:bg-[#59C3A5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto';
  const headerPrimaryActionButtonClassName = 'h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl bg-[#59C3A5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3AAE90] sm:w-auto';
  const [controlDate, setControlDate] = useState(todayIsoDate());
  const [calendarMonth, setCalendarMonth] = useState(toMonthValue(todayIsoDate()));
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState(allFilterValue);
  const [businessFilter, setBusinessFilter] = useState(allFilterValue);
  const [statusFilter, setStatusFilter] = useState(allFilterValue);
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
  const [pendingCalendarStatus, setPendingCalendarStatus] = useState<AttendanceCorrectionStatus | ''>('');
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<string[]>([]);
  const [bulkCalendarStatus, setBulkCalendarStatus] = useState<AttendanceCorrectionStatus | ''>('on_time');
  const [visibleAttendanceCount, setVisibleAttendanceCount] = useState(attendanceListBatchSize);
  const [faceEnrollment, setFaceEnrollment] = useState<{ id: number; status: string; enrolled_at?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isUpdatingCalendarDay, setIsUpdatingCalendarDay] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingTimeTableDay, setIsRemovingTimeTableDay] = useState(false);
  const [isClearingCalendarDaySchedule, setIsClearingCalendarDaySchedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isKioskQrDialogOpen, setIsKioskQrDialogOpen] = useState(false);
  const [kioskQrDataUrl, setKioskQrDataUrl] = useState('');
  const isCalendarDateSelectionActive = useRef(false);
  const didDragCalendarDateSelection = useRef(false);
  const calendarDateSelectionLastDate = useRef<string | null>(null);
  const calendarDateSelectionLastDay = useRef<AttendanceCalendarDay | null>(null);
  const suppressCalendarDateClick = useRef(false);
  const selectedCalendarDatesRef = useRef<string[]>([]);

  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isContractSiteRegistrationModalOpen, setIsContractSiteRegistrationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AttendanceControlLocation | null>(null);
  const [locationForm, setLocationForm] = useState<AttendanceControlLocationPayload>(defaultLocationForm());

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false);
  const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);
  const [pendingTimeTableRemoval, setPendingTimeTableRemoval] = useState<{
    assignment: AttendanceControlAssignment;
    targetDate: string;
  } | null>(null);
  const [pendingCalendarScheduleClear, setPendingCalendarScheduleClear] = useState<{
    employeeId: number;
    employeeName: string;
    targetDate: string;
  } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AttendanceControlTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<AttendanceControlTemplatePayload>(defaultTemplateForm());

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AttendanceControlAssignmentPayload>(defaultAssignmentForm());
  const [isWorkSiteDialogOpen, setIsWorkSiteDialogOpen] = useState(false);
  const [workSiteForm, setWorkSiteForm] = useState<ControlWorkSiteForm>(defaultWorkSiteForm());
  const [isKioskManagerOpen, setIsKioskManagerOpen] = useState(false);
  const [isKioskDialogOpen, setIsKioskDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<AttendanceKioskDevice | null>(null);
  const [kioskForm, setKioskForm] = useState<AttendanceKioskDevicePayload>(defaultKioskForm());
  const [kioskDeviceToDelete, setKioskDeviceToDelete] = useState<AttendanceKioskDevice | null>(null);

  const showSuccessToast = (message: string) => {
    setErrorMessage('');
    setFailureToastMessage('');
    setSuccessMessage('');
    window.setTimeout(() => setSuccessMessage(message), 0);
  };

  const showFailureToast = (message: string) => {
    setSuccessMessage('');
    setErrorMessage(message);
    setFailureToastMessage('');
    window.setTimeout(() => setFailureToastMessage(message), 0);
  };

  const clearControlMessages = () => {
    setErrorMessage('');
    setFailureToastMessage('');
  };

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

  useEffect(() => {
    if (!selectedCalendarDetailDay) {
      setPendingCalendarStatus('');
      return;
    }

    setPendingCalendarStatus(selectedCalendarDetailDay.corrected_status ?? '');
  }, [selectedCalendarDetailDay]);

  useEffect(() => {
    selectedCalendarDatesRef.current = selectedCalendarDates;
  }, [selectedCalendarDates]);

  const unitFilterOptions = useMemo(() => {
    const options = new Map<string, string>();
    overview?.assignments.forEach((assignment) => {
      options.set(assignmentUnitFilterKey(assignment), assignment.unit_name || copy.labels.noUnit);
    });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [copy.labels.noUnit, overview?.assignments]);

  const businessFilterOptions = useMemo(() => {
    const options = new Map<string, string>();
    overview?.assignments
      .filter((assignment) => unitFilter === allFilterValue || assignmentUnitFilterKey(assignment) === unitFilter)
      .forEach((assignment) => {
        options.set(assignmentBusinessFilterKey(assignment), assignment.business_name || copy.labels.noBusiness);
      });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [copy.labels.noBusiness, overview?.assignments, unitFilter]);

  useEffect(() => {
    if (
      unitFilter !== allFilterValue &&
      !unitFilterOptions.some((option) => option.value === unitFilter)
    ) {
      setUnitFilter(allFilterValue);
      setBusinessFilter(allFilterValue);
    }
  }, [unitFilter, unitFilterOptions]);

  useEffect(() => {
    if (
      businessFilter !== allFilterValue &&
      !businessFilterOptions.some((option) => option.value === businessFilter)
    ) {
      setBusinessFilter(allFilterValue);
    }
  }, [businessFilter, businessFilterOptions]);

  const filteredAssignments = useMemo(() => {
    if (!overview) {
      return [];
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    return overview.assignments.filter((assignment) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          assignment.user_name,
          assignment.user_code,
          assignment.position_title,
          assignment.department,
          assignment.unit_name,
          assignment.business_name,
          assignment.schedule_template_name,
          assignment.active_work_site?.location_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesUnit = unitFilter === allFilterValue || assignmentUnitFilterKey(assignment) === unitFilter;
      const matchesBusiness = businessFilter === allFilterValue || assignmentBusinessFilterKey(assignment) === businessFilter;

      return matchesSearch && matchesUnit && matchesBusiness;
    });
  }, [businessFilter, overview, searchQuery, unitFilter]);

  const statusFilterOptions = useMemo(() => {
    const statusCounts = filteredAssignments.reduce(
      (counts, assignment) => {
        const status = assignment.corrected_status ?? assignment.today_status;
        counts.set(status, (counts.get(status) ?? 0) + 1);
        return counts;
      },
      new Map<string, number>(),
    );

    return [
      {
        value: allFilterValue,
        label: copy.filters.all,
        count: filteredAssignments.length,
      },
      ...attendanceStatusFilterValues.map((status) => ({
        value: status,
        label: copy.statuses[status],
        count: statusCounts.get(status) ?? 0,
      })),
    ];
  }, [copy.filters.all, copy.statuses, filteredAssignments]);

  const statusFilteredAssignments = useMemo(
    () => (
      statusFilter === allFilterValue
        ? filteredAssignments
        : filteredAssignments.filter((assignment) => (assignment.corrected_status ?? assignment.today_status) === statusFilter)
    ),
    [filteredAssignments, statusFilter],
  );

  useEffect(() => {
    if (
      statusFilter !== allFilterValue &&
      !statusFilterOptions.some((option) => option.value === statusFilter)
    ) {
      setStatusFilter(allFilterValue);
    }
  }, [statusFilter, statusFilterOptions]);

  useEffect(() => {
    setVisibleAttendanceCount(attendanceListBatchSize);
  }, [businessFilter, controlDate, overview?.date, searchQuery, statusFilter, unitFilter]);

  const visibleAttendanceAssignments = useMemo(
    () => statusFilteredAssignments.slice(0, visibleAttendanceCount),
    [statusFilteredAssignments, visibleAttendanceCount],
  );

  const handleAttendanceListScroll = (event: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;

    if (scrollHeight - scrollTop - clientHeight > 160) {
      return;
    }

    setVisibleAttendanceCount((current) => Math.min(current + attendanceListBatchSize, statusFilteredAssignments.length));
  };

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

  const selectedKioskDevice = useMemo(
    () => kioskDevices.find((device) => device.id === selectedKioskDeviceId) ?? null,
    [kioskDevices, selectedKioskDeviceId],
  );

  const buildKioskDeviceLink = (device: AttendanceKioskDevice | null | undefined) => {
    if (!device?.public_access_token || typeof window === 'undefined') {
      return '';
    }

    return `${window.location.origin}/kiosk/${device.public_access_token}`;
  };

  const selectedKioskDeviceLink = useMemo(
    () => buildKioskDeviceLink(selectedKioskDevice),
    [selectedKioskDevice?.public_access_token],
  );

  useEffect(() => {
    if (!isKioskQrDialogOpen || !selectedKioskDeviceLink) {
      setKioskQrDataUrl('');
      return;
    }

    let active = true;
    QRCode.toDataURL(selectedKioskDeviceLink, {
      margin: 1,
      width: 320,
      color: {
        dark: '#59C3A5',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (active) {
          setKioskQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setKioskQrDataUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [isKioskQrDialogOpen, selectedKioskDeviceLink]);

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
        new Intl.DateTimeFormat(currentLanguage.code, { weekday: 'short' }).format(new Date(2026, 0, 4 + index)),
      ),
    [currentLanguage.code],
  );

  const controlDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLanguage.code, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${controlDate}T00:00:00`)),
    [controlDate, currentLanguage.code],
  );

  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLanguage.code, {
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${calendarMonth}-01T00:00:00`)),
    [calendarMonth, currentLanguage.code],
  );

  const selectedRuleForDate = useMemo(
    () => findRuleForSelectedDay(selectedTemplate, controlDate),
    [controlDate, selectedTemplate],
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

  const shiftCalendarMonth = (direction: -1 | 1) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const base = new Date(year, month - 1, 1);
    const next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
    const nextMonth = toMonthValue(next);
    const currentDay = Number(controlDate.slice(8, 10));
    const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    const nextDay = `${Math.min(currentDay, lastDayOfNextMonth)}`.padStart(2, '0');

    setCalendarMonth(nextMonth);
    setControlDate(`${nextMonth}-${nextDay}`);
    setSelectedCalendarDates([]);
  };

  const selectedCalendarDateSet = useMemo(
    () => new Set(selectedCalendarDates),
    [selectedCalendarDates],
  );

  const startCalendarDateSelection = (
    date: string,
    event: MouseEvent<HTMLButtonElement>,
    day: AttendanceCalendarDay | null,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    isCalendarDateSelectionActive.current = true;
    didDragCalendarDateSelection.current = false;
    calendarDateSelectionLastDate.current = date;
    calendarDateSelectionLastDay.current = day;
    setSelectedCalendarDay(null);
    setControlDate(date);
    selectedCalendarDatesRef.current = [date];
    setSelectedCalendarDates([date]);
  };

  const extendCalendarDateSelection = (date: string, day: AttendanceCalendarDay | null) => {
    if (!isCalendarDateSelectionActive.current) {
      return;
    }

    calendarDateSelectionLastDate.current = date;
    calendarDateSelectionLastDay.current = day;
    setSelectedCalendarDates((current) => {
      if (current.includes(date)) {
        selectedCalendarDatesRef.current = current;
        return current;
      }

      const nextDates = [...current, date];
      selectedCalendarDatesRef.current = nextDates;
      didDragCalendarDateSelection.current = true;
      return nextDates;
    });
  };

  const finishCalendarDateSelection = useCallback(() => {
    if (!isCalendarDateSelectionActive.current) {
      return;
    }

    const date = calendarDateSelectionLastDate.current;
    const day = calendarDateSelectionLastDay.current;
    const shouldKeepMultiSelection = didDragCalendarDateSelection.current || selectedCalendarDatesRef.current.length > 1;
    isCalendarDateSelectionActive.current = false;
    didDragCalendarDateSelection.current = false;
    calendarDateSelectionLastDate.current = null;
    calendarDateSelectionLastDay.current = null;

    if (date) {
      setControlDate(date);
    }

    if (shouldKeepMultiSelection) {
      suppressCalendarDateClick.current = true;
      setSelectedCalendarDay(null);
      return;
    }

    selectedCalendarDatesRef.current = [];
    setSelectedCalendarDates([]);
    if (day) {
      setSelectedCalendarDay(day);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', finishCalendarDateSelection);

    return () => {
      window.removeEventListener('mouseup', finishCalendarDateSelection);
    };
  }, [finishCalendarDateSelection]);

  const clearCalendarDateSelection = () => {
    isCalendarDateSelectionActive.current = false;
    didDragCalendarDateSelection.current = false;
    calendarDateSelectionLastDate.current = null;
    calendarDateSelectionLastDay.current = null;
    selectedCalendarDatesRef.current = [];
    setSelectedCalendarDates([]);
  };

  const handleCalendarStatusUpdate = async (
    date: string,
    status: AttendanceCorrectionStatus | '',
  ) => {
    if (!selectedEmployeeId) {
      return false;
    }
    if (date > todayIsoDate()) {
      showFailureToast(copy.labels.futureAttendanceLocked);
      return false;
    }

    const targetDay = selectedCalendarDay?.date === date
      ? selectedCalendarDay
      : attendanceCalendarDays.find((day) => day.date === date);
    if (targetDay?.attendance_editable === false) {
      showFailureToast(targetDay.edit_lock_reason || copy.labels.notModifiable);
      return false;
    }

    try {
      setIsUpdatingCalendarDay(true);
      await waitForNextPaint();
      const result = await runWithMinimumDuration(
        humanResourcesApi.updateAttendanceDailyRecord(selectedEmployeeId, date, { status }),
        CONTROL_SAVE_MINIMUM_LOADING_MS,
      );
      setControlDate(date);

      setAttendanceCalendarDays((current) =>
        current.map((day) => (day.date === date ? applyCalendarDayUpdate(day, result) : day)),
      );
      setSelectedCalendarDay((current) =>
        current && current.date === date ? applyCalendarDayUpdate(current, result) : current,
      );

      setOverview((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          date,
          assignments: current.assignments.map((assignment) =>
            assignment.user_company_id === selectedEmployeeId
              ? {
                  ...assignment,
                  today_status: result.effective_status as AttendanceControlAssignment['today_status'],
                  system_status: result.system_status as AttendanceControlAssignment['system_status'],
                  corrected_status: (result.corrected_status ?? null) as AttendanceControlAssignment['corrected_status'],
                }
              : assignment,
          ),
        };
      });

      const [calendarResponse] = await Promise.all([
        humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, calendarMonth),
        loadControl(date),
      ]);

      setAttendanceCalendarDays(calendarResponse.items);
      setSelectedCalendarDay(calendarResponse.items.find((day) => day.date === date) ?? null);
      showSuccessToast(status ? copy.labels.correctionApplied : copy.labels.correctionCleared);
      return true;
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
      return false;
    } finally {
      setIsUpdatingCalendarDay(false);
    }
  };

  const handleBulkCalendarStatusUpdate = async () => {
    if (!selectedEmployeeId || selectedCalendarDates.length === 0) {
      return;
    }

    const dates = [...selectedCalendarDates].sort();
    const today = todayIsoDate();
    const futureDate = dates.find((date) => date > today);
    if (futureDate) {
      showFailureToast(copy.labels.futureAttendanceLocked);
      return;
    }

    const lockedDay = dates
      .map((date) => attendanceCalendarDays.find((day) => day.date === date))
      .find((day) => day?.attendance_editable === false);
    if (lockedDay?.attendance_editable === false) {
      showFailureToast(lockedDay.edit_lock_reason || copy.labels.notModifiable);
      return;
    }

    try {
      setIsUpdatingCalendarDay(true);
      clearControlMessages();
      await waitForNextPaint();

      const results = await runWithMinimumDuration(
        Promise.all(
          dates.map((date) =>
            humanResourcesApi.updateAttendanceDailyRecord(selectedEmployeeId, date, { status: bulkCalendarStatus }),
          ),
        ),
        CONTROL_SAVE_MINIMUM_LOADING_MS,
      );

      const resultsByDate = new Map(dates.map((date, index) => [date, results[index]] as const));
      setAttendanceCalendarDays((current) =>
        current.map((day) => {
          const result = resultsByDate.get(day.date);
          return result ? applyCalendarDayUpdate(day, result) : day;
        }),
      );

      const focusDate = dates[dates.length - 1];
      const focusMonth = toMonthValue(focusDate);
      setControlDate(focusDate);
      setCalendarMonth(focusMonth);

      const [calendarResponse] = await Promise.all([
        humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, focusMonth),
        loadControl(focusDate),
      ]);

      setAttendanceCalendarDays(calendarResponse.items);
      setSelectedCalendarDay(null);
      setSelectedCalendarDates([]);
      showSuccessToast(`${dates.length} selected days updated.`);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsUpdatingCalendarDay(false);
    }
  };

  const handleManualCalendarPunch = async (
    date: string,
    eventKind: AttendanceManualEventKind,
    eventDate: string,
    eventTime: string,
  ) => {
    if (!selectedEmployeeId) {
      return false;
    }
    if (date > todayIsoDate() || eventDate > todayIsoDate()) {
      showFailureToast(copy.labels.futureAttendanceLocked);
      return false;
    }

    const targetDay = selectedCalendarDay?.date === date
      ? selectedCalendarDay
      : attendanceCalendarDays.find((day) => day.date === date);
    if (targetDay?.attendance_editable === false) {
      showFailureToast(targetDay.edit_lock_reason || copy.labels.notModifiable);
      return false;
    }
    if (!eventDate || !eventTime) {
      showFailureToast(copy.saveError);
      return false;
    }

    try {
      setIsUpdatingCalendarDay(true);
      clearControlMessages();
      await waitForNextPaint();
      const result = await runWithMinimumDuration(
        humanResourcesApi.recordManualAttendanceEvent(selectedEmployeeId, date, {
          event_kind: eventKind,
          event_date: eventDate,
          event_time: eventTime,
        }),
        CONTROL_SAVE_MINIMUM_LOADING_MS,
      );
      const targetCalendarMonth = toMonthValue(date);
      setControlDate(date);
      setCalendarMonth(targetCalendarMonth);

      setAttendanceCalendarDays((current) =>
        current.map((day) => (day.date === date ? applyCalendarDayUpdate(day, result) : day)),
      );
      setSelectedCalendarDay((current) =>
        current && current.date === date ? applyCalendarDayUpdate(current, result) : current,
      );

      const [calendarResponse] = await Promise.all([
        humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, targetCalendarMonth),
        loadControl(date),
      ]);

      setAttendanceCalendarDays(calendarResponse.items);
      setSelectedCalendarDay(calendarResponse.items.find((day) => day.date === date) ?? null);
      showSuccessToast(copy.labels.manualPunchSaved);
      return true;
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
      return false;
    } finally {
      setIsUpdatingCalendarDay(false);
    }
  };

  const handleClearCalendarDaySchedule = async (date: string) => {
    if (!selectedEmployeeId) {
      return false;
    }

    setPendingCalendarScheduleClear({
      employeeId: selectedEmployeeId,
      employeeName: selectedEmployee?.user_name ?? 'this employee',
      targetDate: date,
    });

    return false;
  };

  const handleConfirmClearCalendarDaySchedule = async () => {
    if (!pendingCalendarScheduleClear || isSaving || isUpdatingCalendarDay) {
      return;
    }

    const { employeeId, targetDate } = pendingCalendarScheduleClear;
    setPendingCalendarScheduleClear(null);

    setIsUpdatingCalendarDay(true);
    setIsClearingCalendarDaySchedule(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.clearAttendanceWorkAssignments({
          user_company_id: employeeId,
          date: targetDate,
        });
        const targetCalendarMonth = toMonthValue(targetDate);
        setControlDate(targetDate);
        setCalendarMonth(targetCalendarMonth);

        const [calendarResponse] = await Promise.all([
          humanResourcesApi.getAttendanceCalendar(employeeId, targetCalendarMonth),
          loadControl(targetDate),
        ]);
        setAttendanceCalendarDays(calendarResponse.items);
        setSelectedCalendarDay(null);
        showSuccessToast(copy.labels.clearDayScheduleSuccess);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsClearingCalendarDaySchedule(false);
      setIsUpdatingCalendarDay(false);
    }
  };

  const openNewLocationDialog = () => {
    setEditingLocation(null);
    setLocationForm(defaultLocationForm());
    setIsLocationDialogOpen(true);
  };

  const openEditLocationDialog = (location: AttendanceControlLocation) => {
    setEditingLocation(location);
    setLocationForm({
      unit_id: location.unit_id ?? null,
      business_id: location.business_id ?? null,
      contract_start_date: location.contract_start_date ?? todayInputValue(),
      contract_end_date: location.contract_end_date ?? location.contract_start_date ?? todayInputValue(),
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
      required_hours_per_day: location.required_hours_per_day ?? 8,
      required_start_time: location.required_start_time ?? '08:00:00',
      required_end_time: location.required_end_time ?? '16:00:00',
      status: location.status === 'inactive' ? 'inactive' : 'active',
    });
    setIsLocationDialogOpen(true);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm());
    setIsTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: AttendanceControlTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      status: template.status === 'inactive' ? 'inactive' : 'active',
      schedule_mode: template.schedule_mode === 'open' ? 'open' : 'strict',
      block_after_grace_period: false,
      enforce_location: Boolean(template.enforce_location),
      location_id: template.location_id ?? null,
      days: weekdayNumbers.map((dayOfWeek) => {
        const rule = template.days.find((day) => day.day_of_week === dayOfWeek);
        const isRestDay = rule?.is_rest_day ?? false;
        return {
          day_of_week: dayOfWeek,
          start_time: isRestDay ? null : rule?.start_time ?? '08:00:00',
          end_time: isRestDay ? null : rule?.end_time ?? '16:00:00',
          meal_minutes: rule?.meal_minutes ?? 0,
          rest_minutes: rule?.rest_minutes ?? 0,
          late_after_minutes: rule?.late_after_minutes ?? 10,
          is_rest_day: isRestDay,
        };
      }),
    });
    setSelectedTemplateId(template.id);
    setIsTemplateDialogOpen(true);
  };

  const openAssignmentDialog = () => {
    const today = todayIsoDate();
    const effectiveStartDate = controlDate < today ? today : controlDate;
    setAssignmentForm({
      user_company_ids: selectedEmployee && !getAssignmentBusyReason(selectedEmployee, copy) ? [selectedEmployee.user_company_id] : [],
      template_id: selectedEmployee?.schedule_template_id ?? selectedTemplate?.id ?? templates[0]?.id ?? 0,
      effective_start_date: effectiveStartDate,
      effective_end_date: effectiveStartDate,
    });
    setIsAssignmentDialogOpen(true);
  };

  const openWorkSiteDialog = () => {
    if (!selectedEmployee) {
      return;
    }
    if (controlDate < todayIsoDate()) {
      showFailureToast(copy.labels.chooseFutureShiftDate);
      return;
    }
    const busyReason = getAssignmentBusyReason(selectedEmployee, copy);
    if (busyReason) {
      showFailureToast(`${busyReason}. Remove the existing shift before assigning a contract site.`);
      return;
    }

    if (availableContractSiteLocations.length === 0) {
      showFailureToast(copy.labels.noAvailableContractSites);
    }

    const availableLocationIds = new Set(availableContractSiteLocations.map((location) => location.id));
    const allowedLocationIds = selectedEmployee.allowed_locations?.map((location) => location.id) ?? [];
    const firstAvailableLocationId = availableContractSiteLocations[0]?.id ?? 0;
    const activeLocationId = allowedLocationIds.find((locationId) => availableLocationIds.has(locationId)) ?? firstAvailableLocationId;
    const activeLocation = locations.find((location) => location.id === activeLocationId);
    const assignmentDates = contractSiteAssignmentDates(activeLocation, controlDate);
    const nextAllowedLocationIds = Array.from(new Set([
      ...allowedLocationIds,
      ...(activeLocationId > 0 ? [activeLocationId] : []),
    ]));

    setWorkSiteForm({
      user_company_ids: [selectedEmployee.user_company_id],
      location_ids: nextAllowedLocationIds,
      location_id: activeLocationId,
      effective_start_date: assignmentDates.startDate,
      effective_end_date: assignmentDates.endDate,
      start_time: timeInputValue(activeLocation?.required_start_time) || timeInputValue(selectedRuleForDate?.start_time) || '08:00',
      end_time: timeInputValue(activeLocation?.required_end_time) || timeInputValue(selectedRuleForDate?.end_time) || '16:00',
    });
    setIsWorkSiteDialogOpen(true);
  };

  const openNewKioskDialog = () => {
    setEditingKiosk(null);
    setKioskForm(defaultKioskForm());
    setIsKioskDialogOpen(true);
  };

  const openEditKioskDialog = (device: AttendanceKioskDevice) => {
    setEditingKiosk(device);
    setKioskForm({
      code: device.code,
      name: device.name,
      unit_id: device.unit_id ?? null,
      business_id: device.business_id ?? null,
      location_id: device.location_id ?? null,
      status: device.status,
      metadata: {
        supports_face_recognition: false,
        kiosk_type: 'business_unit',
        ...(device.metadata ?? {}),
      },
    });
    setSelectedKioskDeviceId(device.id);
    setIsKioskDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        if (editingLocation) {
          await humanResourcesApi.updateAttendanceControlLocation(editingLocation.id, locationForm);
        } else {
          await humanResourcesApi.createAttendanceControlLocation(locationForm);
        }

        setIsLocationDialogOpen(false);
        showSuccessToast(copy.locationSaved);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        if (editingTemplate) {
          await humanResourcesApi.updateAttendanceControlTemplate(editingTemplate.id, templateForm);
        } else {
          await humanResourcesApi.createAttendanceControlTemplate(templateForm);
        }

        setIsTemplateDialogOpen(false);
        showSuccessToast(copy.templateSaved);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    const today = todayIsoDate();
    if (!assignmentForm.effective_start_date || !assignmentForm.effective_end_date) {
      showFailureToast(copy.labels.startEndDateRequired);
      return;
    }
    if (assignmentForm.effective_start_date < today) {
      showFailureToast(copy.labels.startDatePast);
      return;
    }
    if (assignmentForm.effective_end_date < assignmentForm.effective_start_date) {
      showFailureToast(copy.labels.endDateBeforeStart);
      return;
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.bulkAssignAttendanceSchedule({
          user_company_ids: assignmentForm.user_company_ids,
          template_id: Number(assignmentForm.template_id),
          effective_start_date: assignmentForm.effective_start_date,
          effective_end_date: assignmentForm.effective_end_date,
        });

        setIsAssignmentDialogOpen(false);
        showSuccessToast(copy.bulkAssignSuccess);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const buildWorkSiteTemplateDays = (startTime: string, endTime: string): AttendanceControlTemplatePayload['days'] =>
    weekdayNumbers.map((dayOfWeek) => ({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      meal_minutes: 0,
      rest_minutes: 0,
      late_after_minutes: 10,
      is_rest_day: false,
    }));

  const findReusableWorkSiteTemplate = (
    names: string[],
    locationId: number,
    startTime: string,
    endTime: string,
  ) =>
    templates.find((template) =>
      template.status !== 'inactive' &&
        names.includes(template.name) &&
        template.location_id === locationId &&
        weekdayNumbers.every((dayOfWeek) =>
          templateDayMatchesHours(
            template.days.find((day) => day.day_of_week === dayOfWeek),
            dayOfWeek,
            startTime,
            endTime,
          ),
        ),
    ) ?? null;

  const handleSaveWorkSite = async () => {
    const employeeId = workSiteForm.user_company_ids[0];
    const today = todayIsoDate();
    if (
      !employeeId ||
      workSiteForm.location_id <= 0 ||
      !workSiteForm.effective_start_date ||
      !workSiteForm.effective_end_date ||
      !workSiteForm.start_time ||
      !workSiteForm.end_time ||
      workSiteForm.end_time === workSiteForm.start_time
    ) {
      showFailureToast(copy.saveError);
      return;
    }
    if (workSiteForm.effective_start_date < today) {
      showFailureToast(copy.labels.startDatePast);
      return;
    }
    if (workSiteForm.effective_end_date < workSiteForm.effective_start_date) {
      showFailureToast(copy.labels.endDateBeforeStart);
      return;
    }

    const selectedLocation = locations.find((location) => location.id === workSiteForm.location_id);
    if (!selectedLocation) {
      showFailureToast(copy.saveError);
      return;
    }
    if (selectedLocation.status === 'inactive') {
      showFailureToast(copy.labels.activeContractSiteRequired);
      return;
    }
    if (
      (selectedLocation.contract_start_date && workSiteForm.effective_start_date < selectedLocation.contract_start_date) ||
      (selectedLocation.contract_end_date && workSiteForm.effective_end_date > selectedLocation.contract_end_date)
    ) {
      showFailureToast(`Contract site is only open from ${selectedLocation.contract_start_date ?? 'the first configured day'} to ${selectedLocation.contract_end_date ?? 'the last configured day'}.`);
      return;
    }

    const currentAssignment = overview?.assignments.find((assignment) => assignment.user_company_id === employeeId) ?? null;
    const busyReason = currentAssignment ? getAssignmentBusyReason(currentAssignment, copy) : '';
    if (busyReason) {
      showFailureToast(`${busyReason}. Remove the existing shift before assigning a contract site.`);
      return;
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        const baseTemplateName = `${selectedLocation.name} Contract Hours`;
        const timeTemplateName = `${baseTemplateName} ${workSiteForm.start_time}-${workSiteForm.end_time}`;
        const reusableTemplate = findReusableWorkSiteTemplate(
          [baseTemplateName, timeTemplateName],
          selectedLocation.id,
          workSiteForm.start_time,
          workSiteForm.end_time,
        );
        let templateId = reusableTemplate?.id ?? 0;
        if (!templateId) {
          const templateName = templates.some((template) => template.name === baseTemplateName)
            ? templates.some((template) => template.name === timeTemplateName)
              ? `${timeTemplateName} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
              : timeTemplateName
            : baseTemplateName;
          const templateResponse = await humanResourcesApi.createAttendanceControlTemplate({
            name: templateName,
            status: 'active',
            schedule_mode: 'strict',
            block_after_grace_period: false,
            enforce_location: true,
            location_id: selectedLocation.id,
            days: buildWorkSiteTemplateDays(workSiteForm.start_time, workSiteForm.end_time),
          });
          templateId = templateResponse.template.id;
        }

        await humanResourcesApi.replaceAttendanceHrUserAllowedLocations(employeeId, {
          location_ids: Array.from(new Set([...workSiteForm.location_ids, selectedLocation.id])),
        });
        await humanResourcesApi.bulkAssignAttendanceWorkSite({
          user_company_ids: workSiteForm.user_company_ids,
          location_id: workSiteForm.location_id,
          template_id: templateId,
          effective_start_date: workSiteForm.effective_start_date,
          effective_end_date: workSiteForm.effective_end_date,
        });

        setIsWorkSiteDialogOpen(false);
        showSuccessToast(copy.labels.workSiteAssignmentSaved);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestClearEmployeeShift = (assignment: AttendanceControlAssignment, targetDate = controlDate) => {
    if (isSaving || !assignment.user_company_id) {
      return;
    }

    setPendingTimeTableRemoval({ assignment, targetDate });
  };

  const handleConfirmClearEmployeeShift = async () => {
    if (!pendingTimeTableRemoval || isSaving) {
      return;
    }

    const { assignment, targetDate } = pendingTimeTableRemoval;
    setPendingTimeTableRemoval(null);

    setIsSaving(true);
    setIsRemovingTimeTableDay(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.clearAttendanceWorkAssignments({
          user_company_id: assignment.user_company_id,
          date: targetDate,
        });
        showSuccessToast(copy.labels.removeTimeTableDaySuccess);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsRemovingTimeTableDay(false);
      setIsSaving(false);
    }
  };

  const handleSaveKiosk = async () => {
    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        if (editingKiosk) {
          await humanResourcesApi.updateAttendanceKioskDevice(editingKiosk.id, kioskForm);
        } else {
          await humanResourcesApi.createAttendanceKioskDevice(kioskForm);
        }

        setIsKioskDialogOpen(false);
        showSuccessToast(copy.labels.kioskSaved);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowKioskQr = (device: AttendanceKioskDevice) => {
    setSelectedKioskDeviceId(device.id);
    setIsKioskQrDialogOpen(true);
  };

  const handleOpenKiosk = (device?: AttendanceKioskDevice | null) => {
    const kioskLink = buildKioskDeviceLink(device ?? selectedKioskDevice);
    if (!kioskLink) {
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    const kioskWindow = window.open('', '_blank');
    if (kioskWindow) {
      kioskWindow.opener = null;
      kioskWindow.location.href = kioskLink;
      return;
    }

    showFailureToast(copy.labels.kioskTabBlocked);
  };

  const handleCopyKioskLink = async (device?: AttendanceKioskDevice | null) => {
    const kioskLink = buildKioskDeviceLink(device ?? selectedKioskDevice);
    if (!kioskLink) {
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    try {
      await navigator.clipboard.writeText(kioskLink);
      showSuccessToast(copy.labels.kioskLinkCopied);
    } catch {
      showFailureToast(copy.saveError);
    }
  };

  const handleRotateKioskLink = async (device?: AttendanceKioskDevice | null) => {
    const targetDevice = device ?? selectedKioskDevice;
    if (!targetDevice) {
      showFailureToast(copy.kiosk.card.noAccessLink);
      return;
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        const response = await humanResourcesApi.rotateAttendanceKioskDevicePublicToken(targetDevice.id);
        setKioskDevices((current) => current.map((device) => (
          device.id === response.kiosk_device.id ? response.kiosk_device : device
        )));
        setSelectedKioskDeviceId(response.kiosk_device.id);
        showSuccessToast(copy.labels.kioskLinkRotated);
        setIsKioskQrDialogOpen(false);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKiosk = async () => {
    if (!kioskDeviceToDelete) {
      return;
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.deleteAttendanceKioskDevice(kioskDeviceToDelete.id);
        setIsKioskQrDialogOpen(false);
        setKioskDeviceToDelete(null);
        showSuccessToast(copy.labels.kioskDeleted);
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <>
      <LoadingBarOverlay
        isVisible={isControlOverlayVisible}
        title={loadingOverlayTitle}
        description={loadingOverlayDescription}
      />

      {errorMessage && !overview ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void loadControl(controlDate)}>
              {copy.retry}
            </Button>
          </div>
        </div>
      ) : null}

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />

      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />

      <AttendanceSettingsActions
        copy={copy}
        actionButtonClassName={headerActionButtonClassName}
        primaryActionButtonClassName={headerPrimaryActionButtonClassName}
        onOpenContractSites={() => setIsContractSiteRegistrationModalOpen(true)}
        onOpenTimeTable={() => setIsTimeTableModalOpen(true)}
        onOpenSchedules={() => setIsSchedulesModalOpen(true)}
        onOpenKiosks={() => setIsKioskManagerOpen(true)}
      />

      {isLoading || overview ? (
        <ControlKpiStrip
          absencesCount={controlOperationSummary.absencesCount}
          activeShiftCount={controlOperationSummary.activeShiftCount}
          checkInsCount={controlOperationSummary.checkInsCount}
          checkOutsCount={controlOperationSummary.checkOutsCount}
          isLoading={isLoading}
          labels={controlKpiLabels}
          lateCount={controlOperationSummary.lateCount}
          noRecordCount={controlOperationSummary.noRecordCount}
          onTrackCount={controlOperationSummary.onTrackCount}
          otherStatusCount={controlOperationSummary.otherStatusCount}
          totalCount={controlOperationSummary.totalCount}
        />
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] bg-[#f6f8fc] p-3 dark:bg-gray-950/30 sm:p-4">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.8fr]">
            <Skeleton className="h-[900px] rounded-2xl" />
            <Skeleton className="h-[900px] rounded-2xl" />
          </div>
        </div>
      ) : overview ? (
        <div className="rounded-[28px] bg-[#f6f8fc] p-3 dark:bg-gray-950/30 sm:p-4">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.92fr_1.78fr]">
            <AttendanceDailyBoard
              copy={copy}
              locale={currentLanguage.code}
              controlDate={controlDate}
              controlDateLabel={controlDateLabel}
              visibleCount={Math.min(visibleAttendanceAssignments.length, statusFilteredAssignments.length)}
              filteredCount={statusFilteredAssignments.length}
              assignments={visibleAttendanceAssignments}
              selectedEmployeeId={selectedEmployeeId}
              searchQuery={searchQuery}
              unitFilter={unitFilter}
              businessFilter={businessFilter}
              statusFilter={statusFilter}
              unitFilterOptions={unitFilterOptions}
              businessFilterOptions={businessFilterOptions}
              statusFilterOptions={statusFilterOptions}
              allFilterValue={allFilterValue}
              onDateChange={setControlDate}
              onSearchChange={setSearchQuery}
              onUnitFilterChange={(value) => {
                setUnitFilter(value);
                setBusinessFilter(allFilterValue);
              }}
              onBusinessFilterChange={setBusinessFilter}
              onStatusFilterChange={setStatusFilter}
              onSelectAssignment={(assignment) => {
                setSelectedEmployeeId(assignment.user_company_id);
                if (assignment.schedule_template_id) {
                  setSelectedTemplateId(assignment.schedule_template_id);
                }
              }}
              onScroll={handleAttendanceListScroll}
            />

            <EmployeeAttendanceDetailPanel
              copy={copy}
              selectedEmployee={selectedEmployee}
              selectedCalendarDay={selectedCalendarDetailDay}
              selectedAccessProfile={selectedAccessProfile}
              faceEnrollment={selectedFaceEnrollment}
              templates={templates}
              assignments={overview?.assignments ?? []}
              selectedEmployeeBusyReason={selectedEmployeeBusyReason}
              onAssignLocation={openWorkSiteDialog}
              onFaceEnrollmentChange={setFaceEnrollment}
              onReload={() => loadControl(controlDate)}
              onSuccess={showSuccessToast}
              onError={showFailureToast}
              quickActions={(
                <AttendanceQuickActions
                  copy={copy}
                  day={selectedCalendarDetailDay}
                  employeeName={selectedEmployee?.user_name || '—'}
                  locale={currentLanguage.code}
                  pendingStatus={pendingCalendarStatus}
                  isSaving={isUpdatingCalendarDay}
                  onPendingStatusChange={setPendingCalendarStatus}
                  onSave={handleCalendarStatusUpdate}
                  onClearDaySchedule={handleClearCalendarDaySchedule}
                  onManualPunch={handleManualCalendarPunch}
                />
              )}
              calendar={(
                <EmployeeCalendarPanel
                  copy={copy}
                  locale={currentLanguage.code}
                  calendarMonthLabel={calendarMonthLabel}
                  selectedCalendarDates={selectedCalendarDates}
                  selectedCalendarDateSet={selectedCalendarDateSet}
                  bulkCalendarStatus={bulkCalendarStatus}
                  isUpdatingCalendarDay={isUpdatingCalendarDay}
                  isLoadingCalendar={isLoadingCalendar}
                  weekdayLabels={weekdayLabels}
                  calendarCells={calendarCells}
                  attendanceCalendarMap={attendanceCalendarMap}
                  controlDate={controlDate}
                calendarMonth={calendarMonth}
                onShiftMonth={shiftCalendarMonth}
                onBulkStatusChange={setBulkCalendarStatus}
                onBulkApply={() => void handleBulkCalendarStatusUpdate()}
                onClearSelection={clearCalendarDateSelection}
                onDayMouseDown={startCalendarDateSelection}
                onDayMouseEnter={extendCalendarDateSelection}
                onDaySelect={(dateKey, day) => {
                  if (suppressCalendarDateClick.current) {
                    suppressCalendarDateClick.current = false;
                      return;
                    }
                    if (!selectedCalendarDatesRef.current.includes(dateKey)) {
                      setControlDate(dateKey);
                    }
                    if (day && selectedCalendarDatesRef.current.length <= 1) {
                      setSelectedCalendarDay(day);
                    }
                  }}
                />
              )}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {copy.loading}
        </div>
      )}

      <AttendanceControlDialogs
        copy={copy}
        locale={currentLanguage.code}
        controlDate={controlDate}
        isSaving={isSaving}
        assignments={overview?.assignments ?? []}
        availableContractSiteLocations={availableContractSiteLocations}
        locations={locations}
        templates={templates}
        kioskDevices={kioskDevices}
        selectedEmployeeName={selectedEmployee?.user_name ?? '—'}
        selectedTemplateId={selectedTemplateId}
        selectedKioskDeviceLink={selectedKioskDeviceLink}
        kioskQrDataUrl={kioskQrDataUrl}
        isKioskQrDialogOpen={isKioskQrDialogOpen}
        onKioskQrDialogOpenChange={setIsKioskQrDialogOpen}
        onCopySelectedKioskLink={() => void handleCopyKioskLink(selectedKioskDevice)}
        isKioskManagerOpen={isKioskManagerOpen}
        onCloseKioskManager={() => setIsKioskManagerOpen(false)}
        onNewKiosk={openNewKioskDialog}
        onEditKiosk={openEditKioskDialog}
        onOpenKiosk={handleOpenKiosk}
        onCopyKioskLink={(device) => void handleCopyKioskLink(device)}
        onShowKioskQr={handleShowKioskQr}
        onRotateKioskLink={(device) => void handleRotateKioskLink(device)}
        onRequestDeleteKiosk={setKioskDeviceToDelete}
        isLocationDialogOpen={isLocationDialogOpen}
        editingLocationName={editingLocation?.name ?? null}
        locationForm={locationForm}
        onCloseLocationDialog={() => setIsLocationDialogOpen(false)}
        onLocationFormChange={setLocationForm}
        onSaveLocation={() => void handleSaveLocation()}
        isTemplateDialogOpen={isTemplateDialogOpen}
        editingTemplateName={editingTemplate?.name ?? null}
        templateForm={templateForm}
        onCloseTemplateDialog={() => setIsTemplateDialogOpen(false)}
        onTemplateFormChange={setTemplateForm}
        onSaveTemplate={() => void handleSaveTemplate()}
        isAssignmentDialogOpen={isAssignmentDialogOpen}
        assignmentForm={assignmentForm}
        onCloseAssignmentDialog={() => setIsAssignmentDialogOpen(false)}
        onAssignmentFormChange={setAssignmentForm}
        onSaveAssignment={() => void handleBulkAssign()}
        isWorkSiteDialogOpen={isWorkSiteDialogOpen}
        workSiteForm={workSiteForm}
        onCloseWorkSiteDialog={() => setIsWorkSiteDialogOpen(false)}
        onWorkSiteFormChange={setWorkSiteForm}
        onSaveWorkSite={() => void handleSaveWorkSite()}
        isKioskDialogOpen={isKioskDialogOpen}
        editingKioskName={editingKiosk?.name ?? null}
        kioskForm={kioskForm}
        onCloseKioskDialog={() => setIsKioskDialogOpen(false)}
        onKioskFormChange={setKioskForm}
        onSaveKiosk={() => void handleSaveKiosk()}
        isContractSiteRegistrationModalOpen={isContractSiteRegistrationModalOpen}
        onCloseContractSiteRegistration={() => setIsContractSiteRegistrationModalOpen(false)}
        onReloadContractSites={() => loadControl(controlDate)}
        onContractSiteSaved={() => showSuccessToast(copy.locationSaved)}
        isTimeTableModalOpen={isTimeTableModalOpen}
        onCloseTimeTable={() => setIsTimeTableModalOpen(false)}
        onDateChange={setControlDate}
        onRemoveShift={(assignment, targetDate) => handleRequestClearEmployeeShift(assignment, targetDate)}
        isSchedulesModalOpen={isSchedulesModalOpen}
        onCloseSchedules={() => setIsSchedulesModalOpen(false)}
        onScheduleApplied={async (result) => {
          setSelectedEmployeeId((current) => (
            current && result.employeeIds.includes(current)
              ? current
              : result.employeeIds[0] ?? current
          ));
          setSelectedTemplateId(result.templateId);
          await loadControl(controlDate);
          showSuccessToast(copy.bulkAssignSuccess);
        }}
        pendingTimeTableRemoval={pendingTimeTableRemoval}
        onConfirmTimeTableRemoval={() => void handleConfirmClearEmployeeShift()}
        onCancelTimeTableRemoval={() => setPendingTimeTableRemoval(null)}
        pendingCalendarScheduleClear={pendingCalendarScheduleClear}
        onConfirmCalendarScheduleClear={() => void handleConfirmClearCalendarDaySchedule()}
        onCancelCalendarScheduleClear={() => setPendingCalendarScheduleClear(null)}
        kioskDeviceToDelete={kioskDeviceToDelete}
        onConfirmDeleteKiosk={() => void handleDeleteKiosk()}
        onCancelDeleteKiosk={() => setKioskDeviceToDelete(null)}
      />
    </>
  );
}
