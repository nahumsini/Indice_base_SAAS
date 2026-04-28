import { type UIEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '../../../components/ui/button';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { Skeleton } from '../../../components/ui/skeleton';
import { ContractSiteRegistrationModal } from './components/ContractSiteRegistrationModal';
import { ScheduleModal } from './components/ScheduleModal';
import { ScheduleOverviewModal } from './components/ScheduleOverviewModal';
import { EmployeeAccessActions } from './components/EmployeeAccessActions';
import {
  type AttendanceControlCopy,
  ControlAttendanceRow,
  ControlCalendarDayCell,
  LegendOutline,
  LegendPill,
  applyCalendarDayUpdate,
  getAssignmentBusyReason,
  statusClasses,
  weekdayLabel,
} from './components/ControlAttendanceWidgets';
import {
  ControlCalendarDayDialog,
  ControlKioskQrDialog,
} from './components/ControlCalendarDialogs';
import {
  ControlAssignmentDialog,
  ControlKioskDialog,
  ControlKioskManagerDialog,
  ControlContractSiteDialog,
  ControlTemplateDialog,
  ControlWorkSiteDialog,
  type ControlWorkSiteForm,
} from './components/ControlDialogs';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { ApiClientError } from '../../../lib/apiClient';
import {
  type AttendanceCalendarDay,
  type AttendanceAccessProfile,
  type AttendanceCorrectionStatus,
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
import { useHRLanguage } from '../HRLanguage';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const todayIsoDate = () => localDateString(new Date());
const hrAttendanceSelectedEmployeeStorageKey = 'indice.hr.attendance.selectedEmployeeId';
const toMonthValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

const weekdayNumbers = [1, 2, 3, 4, 5, 6, 7] as const;
const CONTROL_SAVE_MINIMUM_LOADING_MS = 2000;

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

const summaryIcons = [Users, Clock3, AlertTriangle, MapPin, ShieldCheck, AlertTriangle, ShieldCheck, CalendarDays] as const;
const attendanceListBatchSize = 10;

const createDefaultTemplateDays = () =>
  weekdayNumbers.map((day) => ({
    day_of_week: day,
    start_time: '08:00:00',
    end_time: '16:00:00',
    meal_minutes: 0,
    rest_minutes: 0,
    late_after_minutes: 10,
    is_rest_day: false,
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
  employee_ids: [],
  template_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: '',
});

const defaultWorkSiteForm = (): ControlWorkSiteForm => ({
  employee_ids: [],
  location_ids: [],
  location_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: '',
  start_time: '08:00',
  end_time: '16:00',
});

const defaultKioskForm = (): AttendanceKioskDevicePayload => ({
  code: '',
  name: '',
  unit_id: null,
  business_id: null,
  location_id: null,
  status: 'active',
  metadata: {
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
  const copy = useHRLanguage().attendanceControl;
  const headerActionButtonClassName = 'h-8 w-full justify-center whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white sm:w-auto';
  const selectedEmployeeActionButtonClassName = 'h-9 min-w-[8.75rem] shrink-0 justify-center whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:hover:text-white';

  const [controlDate, setControlDate] = useState(todayIsoDate());
  const [calendarMonth, setCalendarMonth] = useState(toMonthValue(todayIsoDate()));
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned' | 'late' | 'corrected'>('all');
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
  const [visibleAttendanceCount, setVisibleAttendanceCount] = useState(attendanceListBatchSize);
  const [faceEnrollment, setFaceEnrollment] = useState<{ id: number; status: string; enrolled_at?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isUpdatingCalendarDay, setIsUpdatingCalendarDay] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isKioskQrDialogOpen, setIsKioskQrDialogOpen] = useState(false);
  const [kioskQrDataUrl, setKioskQrDataUrl] = useState('');

  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isContractSiteRegistrationModalOpen, setIsContractSiteRegistrationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AttendanceControlLocation | null>(null);
  const [locationForm, setLocationForm] = useState<AttendanceControlLocationPayload>(defaultLocationForm());

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isScheduleOverviewModalOpen, setIsScheduleOverviewModalOpen] = useState(false);
  const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);
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
      const [overviewResponse, locationsResponse, templatesResponse, kioskDevicesResponse, accessProfilesResponse] = await Promise.all([
        humanResourcesApi.getAttendanceControlOverview(date),
        humanResourcesApi.listAttendanceControlLocations(),
        humanResourcesApi.listAttendanceControlTemplates(),
        humanResourcesApi.listAttendanceKioskDevices(),
        humanResourcesApi.listAttendanceAccessProfiles(),
      ]);

      setOverview(overviewResponse);
      setLocations(locationsResponse.items);
      setTemplates(templatesResponse.items);
      setKioskDevices(kioskDevicesResponse.items);
      setAccessProfiles(accessProfilesResponse.items);
      setSelectedEmployeeId((current) =>
        current && overviewResponse.assignments.some((assignment) => assignment.employee_id === current)
          ? current
          : overviewResponse.assignments[0]?.employee_id ?? null,
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

    humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, calendarMonth)
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

  useEffect(() => {
    if (!selectedCalendarDay) {
      setPendingCalendarStatus('');
      return;
    }

    setPendingCalendarStatus(selectedCalendarDay.corrected_status ?? '');
  }, [selectedCalendarDay]);

  const filteredAssignments = useMemo(() => {
    if (!overview) {
      return [];
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    return overview.assignments.filter((assignment) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          assignment.employee_name,
          assignment.employee_number,
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

      const matchesFilter = (() => {
        switch (assignmentFilter) {
          case 'assigned':
            return Boolean(assignment.schedule_template_id);
          case 'unassigned':
            return !assignment.schedule_template_id;
          case 'late':
            return assignment.today_status === 'late';
          case 'corrected':
            return Boolean(assignment.corrected_status);
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });
  }, [assignmentFilter, overview, searchQuery]);

  useEffect(() => {
    setVisibleAttendanceCount(attendanceListBatchSize);
  }, [assignmentFilter, controlDate, overview?.date, searchQuery]);

  const visibleAttendanceAssignments = useMemo(
    () => filteredAssignments.slice(0, visibleAttendanceCount),
    [filteredAssignments, visibleAttendanceCount],
  );

  const handleAttendanceListScroll = (event: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;

    if (scrollHeight - scrollTop - clientHeight > 160) {
      return;
    }

    setVisibleAttendanceCount((current) => Math.min(current + attendanceListBatchSize, filteredAssignments.length));
  };

  const selectedEmployee = useMemo(
    () => overview?.assignments.find((assignment) => assignment.employee_id === selectedEmployeeId) ?? null,
    [overview?.assignments, selectedEmployeeId],
  );
  const selectedEmployeeBusyReason = selectedEmployee ? getAssignmentBusyReason(selectedEmployee) : '';
  const occupiedContractSiteLocationIds = useMemo(() => {
    const locationIds = new Set<number>();
    overview?.assignments.forEach((assignment) => {
      const locationId = assignment.active_work_site?.location_id;
      if (locationId && assignment.employee_id !== selectedEmployeeId) {
        locationIds.add(locationId);
      }
    });
    return locationIds;
  }, [overview?.assignments, selectedEmployeeId]);
  const availableContractSiteLocations = useMemo(
    () => locations.filter((location) => location.status !== 'inactive' && !occupiedContractSiteLocationIds.has(location.id)),
    [locations, occupiedContractSiteLocationIds],
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
        dark: '#143675',
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
    () => accessProfiles.find((profile) => profile.employee_id === selectedEmployeeId) ?? null,
    [accessProfiles, selectedEmployeeId],
  );

  const attendanceCalendarMap = useMemo(
    () => new Map(attendanceCalendarDays.map((day) => [day.day, day])),
    [attendanceCalendarDays],
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

  const summaryCards = overview
    ? [
        { label: copy.summary.employees, value: overview.summary.employees_count },
        { label: copy.summary.assigned, value: overview.summary.assigned_employees_count },
        { label: copy.summary.unassigned, value: overview.summary.unassigned_employees_count },
        { label: copy.summary.locations, value: overview.summary.locations_count },
        { label: copy.summary.templates, value: overview.summary.templates_count },
        { label: copy.summary.late, value: overview.summary.late_today_count },
        { label: copy.summary.corrections, value: overview.summary.manual_corrections_count },
        { label: copy.summary.records, value: overview.summary.records_today_count },
        { label: copy.summary.authSuccess, value: overview.summary.auth_success_count },
        { label: copy.summary.authFailure, value: overview.summary.auth_failure_count },
        { label: copy.summary.overrides, value: overview.summary.override_count },
      ]
    : [];

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
  };

  const handleCalendarStatusUpdate = async (
    date: string,
    status: AttendanceCorrectionStatus | '',
  ) => {
    if (!selectedEmployeeId) {
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
            assignment.employee_id === selectedEmployeeId
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

  const handleClearCalendarDaySchedule = async (date: string) => {
    if (!selectedEmployeeId) {
      return false;
    }

    if (typeof window !== 'undefined') {
      const employeeName = selectedEmployee?.employee_name ?? 'this employee';
      const confirmed = window.confirm(
        `Clear ${employeeName}'s schedule for ${date}? Check-in and check-out records will stay saved.`,
      );
      if (!confirmed) {
        return false;
      }
    }

    setIsUpdatingCalendarDay(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.clearAttendanceWorkAssignments({
          employee_id: selectedEmployeeId,
          date,
        });
        setControlDate(date);

        const [calendarResponse] = await Promise.all([
          humanResourcesApi.getAttendanceCalendar(selectedEmployeeId, calendarMonth),
          loadControl(date),
        ]);
        setAttendanceCalendarDays(calendarResponse.items);
        setSelectedCalendarDay(calendarResponse.items.find((day) => day.date === date) ?? null);
        showSuccessToast('Schedule cleared for this day.');
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
      return true;
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
      return false;
    } finally {
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
      block_after_grace_period: Boolean(template.block_after_grace_period),
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
    setAssignmentForm({
      employee_ids: selectedEmployee && !getAssignmentBusyReason(selectedEmployee) ? [selectedEmployee.employee_id] : [],
      template_id: selectedEmployee?.schedule_template_id ?? selectedTemplate?.id ?? templates[0]?.id ?? 0,
      effective_start_date: controlDate,
      effective_end_date: '',
    });
    setIsAssignmentDialogOpen(true);
  };

  const openWorkSiteDialog = () => {
    if (!selectedEmployee) {
      return;
    }
    const busyReason = getAssignmentBusyReason(selectedEmployee);
    if (busyReason) {
      showFailureToast(`${busyReason}. Remove the existing shift before assigning a contract site.`);
      return;
    }

    if (availableContractSiteLocations.length === 0) {
      showFailureToast('No available contract sites for this date. Sites already assigned to another employee are hidden.');
    }

    const availableLocationIds = new Set(availableContractSiteLocations.map((location) => location.id));
    const allowedLocationIds = selectedEmployee.allowed_locations?.map((location) => location.id) ?? [];
    const firstAvailableLocationId = availableContractSiteLocations[0]?.id ?? 0;
    const activeLocationId = allowedLocationIds.find((locationId) => availableLocationIds.has(locationId)) ?? firstAvailableLocationId;
    const activeLocation = locations.find((location) => location.id === activeLocationId);
    const nextAllowedLocationIds = Array.from(new Set([
      ...allowedLocationIds,
      ...(activeLocationId > 0 ? [activeLocationId] : []),
    ]));

    setWorkSiteForm({
      employee_ids: [selectedEmployee.employee_id],
      location_ids: nextAllowedLocationIds,
      location_id: activeLocationId,
      effective_start_date: controlDate,
      effective_end_date: '',
      start_time: timeInputValue(selectedRuleForDate?.start_time) || timeInputValue(activeLocation?.required_start_time) || '08:00',
      end_time: timeInputValue(selectedRuleForDate?.end_time) || timeInputValue(activeLocation?.required_end_time) || '16:00',
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
      metadata: device.metadata ?? { supports_face_recognition: false },
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
    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.bulkAssignAttendanceSchedule({
          employee_ids: assignmentForm.employee_ids,
          template_id: Number(assignmentForm.template_id),
          effective_start_date: assignmentForm.effective_start_date,
          effective_end_date: assignmentForm.effective_end_date || undefined,
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
    const employeeId = workSiteForm.employee_ids[0];
    if (
      !employeeId ||
      workSiteForm.location_id <= 0 ||
      !workSiteForm.effective_start_date ||
      !workSiteForm.start_time ||
      !workSiteForm.end_time ||
      workSiteForm.end_time <= workSiteForm.start_time
    ) {
      showFailureToast(copy.saveError);
      return;
    }

    const selectedLocation = locations.find((location) => location.id === workSiteForm.location_id);
    if (!selectedLocation) {
      showFailureToast(copy.saveError);
      return;
    }
    if (selectedLocation.status === 'inactive') {
      showFailureToast('Only active contract sites can be assigned.');
      return;
    }

    const currentAssignment = overview?.assignments.find((assignment) => assignment.employee_id === employeeId) ?? null;
    const busyReason = currentAssignment ? getAssignmentBusyReason(currentAssignment) : '';
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

        await humanResourcesApi.replaceAttendanceEmployeeAllowedLocations(employeeId, {
          location_ids: Array.from(new Set([...workSiteForm.location_ids, selectedLocation.id])),
        });
        await humanResourcesApi.bulkAssignAttendanceWorkSite({
          employee_ids: workSiteForm.employee_ids,
          location_id: workSiteForm.location_id,
          template_id: templateId,
          effective_start_date: workSiteForm.effective_start_date,
          effective_end_date: workSiteForm.effective_end_date || undefined,
        });

        setIsWorkSiteDialogOpen(false);
        showSuccessToast('Contract site assignment saved successfully.');
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearEmployeeShift = async (assignment: AttendanceControlAssignment, targetDate = controlDate) => {
    if (isSaving || !assignment.employee_id) {
      return;
    }

    if (typeof window !== 'undefined') {
      const siteText = assignment.active_work_site?.location_name
        ? ` at ${assignment.active_work_site.location_name}`
        : '';
      const confirmed = window.confirm(`Remove ${assignment.employee_name}'s shift${siteText} from ${targetDate}?`);
      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    clearControlMessages();
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        await humanResourcesApi.clearAttendanceWorkAssignments({
          employee_id: assignment.employee_id,
          date: targetDate,
        });
        showSuccessToast('Shift removed for this date. Future dates stay assigned.');
        await loadControl(controlDate);
      })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
    } catch (error) {
      showFailureToast(toErrorMessage(error, copy) || copy.saveError);
    } finally {
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
      showFailureToast(copy.labels.kioskTokenUnavailable);
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
      showFailureToast(copy.labels.kioskTokenUnavailable);
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
      showFailureToast(copy.labels.kioskTokenUnavailable);
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

  const isControlOverlayVisible = isSaving || isUpdatingCalendarDay;
  const loadingOverlayTitle = isUpdatingCalendarDay
    ? copy.labels.savingDayStatus
    : 'Saving changes';
  const loadingOverlayDescription = isUpdatingCalendarDay
    ? copy.labels.savingDayStatusDescription
    : 'Please wait while the attendance control changes are saved.';

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

      <div className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 dark:border-[#143675]/30 dark:bg-[#143675]/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">📅</span>
              {copy.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{copy.subtitle}</p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="outline"
              className={headerActionButtonClassName}
              onClick={() => setIsContractSiteRegistrationModalOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              Contract sites
            </Button>
            <Button
              variant="outline"
              className={headerActionButtonClassName}
              onClick={() => setIsScheduleOverviewModalOpen(true)}
            >
              <Table2 className="h-3.5 w-3.5" />
              {copy.labels.viewSchedules}
            </Button>
            <Button
              variant="outline"
              className={headerActionButtonClassName}
              onClick={() => setIsSchedulesModalOpen(true)}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {copy.labels.setSchedules}
            </Button>
            <Button
              variant="outline"
              className={headerActionButtonClassName}
              onClick={() => setIsKioskManagerOpen(true)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {copy.labels.manageKiosks}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[110px] rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.8fr]">
            <Skeleton className="h-[900px] rounded-2xl" />
            <Skeleton className="h-[900px] rounded-2xl" />
          </div>
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.78fr]">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-6 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.labels.dailyAttendance}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{controlDateLabel}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {Math.min(visibleAttendanceAssignments.length, filteredAssignments.length)} / {filteredAssignments.length}
                  </p>
                </div>
                <div className="w-full max-w-[180px]">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {copy.labels.controlDate}
                  </label>
                  <input
                    type="date"
                    value={controlDate}
                    onChange={(event) => setControlDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/40">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Search employee
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  <select
                    value={assignmentFilter}
                    onChange={(event) => setAssignmentFilter(event.target.value as typeof assignmentFilter)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">{copy.filters.all}</option>
                    <option value="assigned">{copy.filters.assigned}</option>
                    <option value="unassigned">{copy.filters.unassigned}</option>
                    <option value="late">{copy.filters.late}</option>
                    <option value="corrected">{copy.filters.corrected}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="max-h-[860px] overflow-y-auto" onScroll={handleAttendanceListScroll}>
              {filteredAssignments.length > 0 ? (
                visibleAttendanceAssignments.map((assignment) => (
                  <ControlAttendanceRow
                    key={assignment.employee_id}
                    assignment={assignment}
                    copy={copy}
                    locale={currentLanguage.code}
                    selected={selectedEmployeeId === assignment.employee_id}
                    onSelect={() => {
                      setSelectedEmployeeId(assignment.employee_id);
                      if (assignment.schedule_template_id) {
                        setSelectedTemplateId(assignment.schedule_template_id);
                      }
                    }}
                  />
                ))
              ) : (
                <div className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400">
                  {copy.labels.noEmployees}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.labels.attendanceCalendar}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {selectedEmployee ? selectedEmployee.employee_name : copy.labels.selectEmployeeCalendar}
                </p>
                </div>

                {selectedEmployee ? (
                  <div className="flex w-full max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:justify-end xl:w-auto xl:overflow-visible xl:pb-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className={selectedEmployeeActionButtonClassName}
                      disabled={Boolean(selectedEmployeeBusyReason)}
                      title={selectedEmployeeBusyReason ? `${selectedEmployeeBusyReason}. Remove the existing shift first.` : undefined}
                      onClick={openWorkSiteDialog}
                    >
                      <MapPin className="h-4 w-4" />
                      Assign contract site
                    </Button>
                    <EmployeeAccessActions
                      selectedEmployee={selectedEmployee}
                      selectedAccessProfile={selectedAccessProfile}
                      faceEnrollment={faceEnrollment}
                      assignments={overview?.assignments ?? []}
                      inlineLayout
                      onFaceEnrollmentChange={setFaceEnrollment}
                      onReload={() => loadControl(controlDate)}
                      onSuccess={showSuccessToast}
                      onError={showFailureToast}
                    />
                  </div>
                ) : null}
              </div>

              {selectedEmployee ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Role</p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedEmployee.position_title || selectedEmployee.department || copy.labels.noDepartment}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{copy.labels.schedule}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedEmployee.schedule_template_name || copy.labels.noSchedule}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{copy.labels.openLocation}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#143675] dark:text-[#8bb3ff]">
                      {selectedEmployee.active_work_site?.location_name ?? 'None'}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{copy.labels.currentDay}</p>
                    <span className={`mt-1 inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[selectedEmployee.today_status]}`}>
                      <span className="truncate">{copy.statuses[selectedEmployee.today_status]}</span>
                    </span>
                  </div>
                  <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{copy.labels.faceEnrollmentStatus}</p>
                    <span className={`mt-1 inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${faceEnrollment?.status === 'active' ? statusClasses.on_time : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                      <span className="truncate">{faceEnrollment?.status ?? 'not_enrolled'}</span>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {selectedEmployee ? (
              <>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <Button variant="outline" size="icon" onClick={() => shiftCalendarMonth(-1)}>
                    <span aria-hidden="true">‹</span>
                  </Button>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{calendarMonthLabel}</p>
                  <Button variant="outline" size="icon" onClick={() => shiftCalendarMonth(1)}>
                    <span aria-hidden="true">›</span>
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-7 gap-3">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="px-2 text-center text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      {label}
                    </div>
                  ))}
                </div>

                {isLoadingCalendar ? (
                  <div className="mt-4 grid grid-cols-7 gap-3">
                    {Array.from({ length: 35 }).map((_, index) => (
                      <Skeleton key={index} className="h-[92px] rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-7 gap-3">
                    {calendarCells.map((dayNumber, index) => {
                      if (dayNumber === null) {
                        return <div key={`empty-${index}`} className="h-[92px]" />;
                      }

                      const day = attendanceCalendarMap.get(dayNumber) ?? null;
                      const dateKey = `${calendarMonth}-${`${dayNumber}`.padStart(2, '0')}`;

                      return (
                        <ControlCalendarDayCell
                          key={dateKey}
                          copy={copy}
                          day={day}
                          dayNumber={dayNumber}
                          isSelected={controlDate === dateKey}
                          onSelect={() => {
                            setControlDate(dateKey);
                            if (day) {
                              setSelectedCalendarDay(day);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex flex-wrap gap-5 text-xs text-gray-600 dark:text-gray-300">
                    <LegendPill color="bg-emerald-500" label={copy.labels.checkIn} />
                    <LegendPill color="bg-sky-500" label={copy.labels.checkOut} />
                    <LegendOutline label={copy.labels.currentDay} />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                {copy.labels.selectEmployeeCalendar}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {copy.loading}
        </div>
      )}

      <ControlCalendarDayDialog
        copy={copy}
        day={selectedCalendarDay}
        employeeName={selectedEmployee?.employee_name || '—'}
        locale={currentLanguage.code}
        pendingStatus={pendingCalendarStatus}
        isSaving={isUpdatingCalendarDay}
	        onPendingStatusChange={setPendingCalendarStatus}
	        onClose={() => setSelectedCalendarDay(null)}
	        onSave={handleCalendarStatusUpdate}
	        onClearDaySchedule={handleClearCalendarDaySchedule}
	      />

      <ControlKioskQrDialog
        copy={copy}
        isOpen={isKioskQrDialogOpen}
        kioskLink={selectedKioskDeviceLink}
        qrDataUrl={kioskQrDataUrl}
        onOpenChange={setIsKioskQrDialogOpen}
        onCopy={() => void handleCopyKioskLink(selectedKioskDevice)}
      />

      <ControlKioskManagerDialog
        copy={copy}
        isOpen={isKioskManagerOpen}
        isSaving={isSaving}
        kioskDevices={kioskDevices}
        locations={locations}
        onClose={() => setIsKioskManagerOpen(false)}
        onNew={openNewKioskDialog}
        onEdit={openEditKioskDialog}
        onOpen={(device) => handleOpenKiosk(device)}
        onCopy={(device) => void handleCopyKioskLink(device)}
        onQr={handleShowKioskQr}
        onRotate={(device) => void handleRotateKioskLink(device)}
      />

      <ControlContractSiteDialog
        copy={copy}
        isOpen={isLocationDialogOpen}
        isSaving={isSaving}
        form={locationForm}
        onClose={() => setIsLocationDialogOpen(false)}
        onChange={setLocationForm}
        onSave={() => void handleSaveLocation()}
        title={editingLocation ? `${copy.labels.addLocation}: ${editingLocation.name}` : copy.labels.addLocation}
      />

      <ControlTemplateDialog
        copy={copy}
        isOpen={isTemplateDialogOpen}
        isSaving={isSaving}
        form={templateForm}
        onClose={() => setIsTemplateDialogOpen(false)}
        onChange={setTemplateForm}
        onSave={() => void handleSaveTemplate()}
        title={editingTemplate ? `${copy.labels.addTemplate}: ${editingTemplate.name}` : copy.labels.addTemplate}
        locale={currentLanguage.code}
      />

      <ControlAssignmentDialog
        copy={copy}
        isOpen={isAssignmentDialogOpen}
        isSaving={isSaving}
        assignments={overview?.assignments ?? []}
        templates={templates}
        form={assignmentForm}
        onClose={() => setIsAssignmentDialogOpen(false)}
        onChange={setAssignmentForm}
        onSave={() => void handleBulkAssign()}
      />

      <ControlWorkSiteDialog
        copy={copy}
        isOpen={isWorkSiteDialogOpen}
        isSaving={isSaving}
        employeeName={selectedEmployee?.employee_name ?? '—'}
        locations={availableContractSiteLocations}
        form={workSiteForm}
        onClose={() => setIsWorkSiteDialogOpen(false)}
        onChange={setWorkSiteForm}
        onSave={() => void handleSaveWorkSite()}
      />

      <ControlKioskDialog
        copy={copy}
        isOpen={isKioskDialogOpen}
        isSaving={isSaving}
        form={kioskForm}
        assignments={overview?.assignments ?? []}
        locations={locations}
        onClose={() => setIsKioskDialogOpen(false)}
        onChange={setKioskForm}
        onSave={() => void handleSaveKiosk()}
        title={editingKiosk ? `${copy.labels.editKiosk}: ${editingKiosk.name}` : copy.labels.newKiosk}
      />

      <ContractSiteRegistrationModal
        isOpen={isContractSiteRegistrationModalOpen}
        onClose={() => setIsContractSiteRegistrationModalOpen(false)}
        locations={locations}
        assignments={overview?.assignments ?? []}
        controlDate={controlDate}
        onReload={() => loadControl(controlDate)}
        onSaved={() => showSuccessToast(copy.locationSaved)}
      />

      <ScheduleOverviewModal
        isOpen={isScheduleOverviewModalOpen}
        onClose={() => setIsScheduleOverviewModalOpen(false)}
        assignments={overview?.assignments ?? []}
        date={controlDate}
        locale={currentLanguage.code}
        isSaving={isSaving}
        onDateChange={setControlDate}
        onRemoveShift={(assignment, targetDate) => handleClearEmployeeShift(assignment, targetDate)}
      />

      <ScheduleModal
        isOpen={isSchedulesModalOpen}
        onClose={() => setIsSchedulesModalOpen(false)}
        templates={templates}
        locations={locations.filter((location) => location.status !== 'inactive')}
        selectedTemplateId={selectedTemplateId}
        effectiveStartDate={controlDate}
        onApplied={async (result) => {
          setSelectedEmployeeId((current) => (
            current && result.employeeIds.includes(current)
              ? current
              : result.employeeIds[0] ?? current
          ));
          setSelectedTemplateId(result.templateId);
          await loadControl(controlDate);
          showSuccessToast(copy.bulkAssignSuccess);
        }}
      />
    </>
  );
}
