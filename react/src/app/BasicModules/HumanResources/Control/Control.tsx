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
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { Skeleton } from '../../../components/ui/skeleton';
import { LocationRegistrationModal } from './components/LocationRegistrationModal';
import { ScheduleModal } from './components/ScheduleModal';
import { ScheduleOverviewModal } from './components/ScheduleOverviewModal';
import { EmployeeAccessActions } from './components/EmployeeAccessActions';
import {
  type AttendanceControlCopy,
  ControlAttendanceRow,
  CompactInfoChip,
  ControlCalendarDayCell,
  LegendOutline,
  LegendPill,
  applyCalendarDayUpdate,
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
  ControlLocationDialog,
  ControlTemplateDialog,
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

const summaryIcons = [Users, Clock3, AlertTriangle, MapPin, ShieldCheck, AlertTriangle, ShieldCheck, CalendarDays] as const;
const attendanceListBatchSize = 10;

const createDefaultTemplateDays = () =>
  weekdayNumbers.map((day) => ({
    day_of_week: day,
    start_time: day >= 1 && day <= 5 ? '08:00:00' : null,
    end_time: day >= 1 && day <= 5 ? '09:00:00' : null,
    meal_minutes: 0,
    rest_minutes: 0,
    late_after_minutes: 10,
    is_rest_day: day >= 6,
  }));

const defaultLocationForm = (): AttendanceControlLocationPayload => ({
  unit_id: null,
  business_id: null,
  name: '',
  latitude: 25.686614,
  longitude: -100.316113,
  radius_meters: 120,
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
  const [isKioskQrDialogOpen, setIsKioskQrDialogOpen] = useState(false);
  const [kioskQrDataUrl, setKioskQrDataUrl] = useState('');

  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isLocationRegistrationModalOpen, setIsLocationRegistrationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AttendanceControlLocation | null>(null);
  const [locationForm, setLocationForm] = useState<AttendanceControlLocationPayload>(defaultLocationForm());

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isScheduleOverviewModalOpen, setIsScheduleOverviewModalOpen] = useState(false);
  const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AttendanceControlTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<AttendanceControlTemplatePayload>(defaultTemplateForm());

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AttendanceControlAssignmentPayload>(defaultAssignmentForm());
  const [isKioskManagerOpen, setIsKioskManagerOpen] = useState(false);
  const [isKioskDialogOpen, setIsKioskDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<AttendanceKioskDevice | null>(null);
  const [kioskForm, setKioskForm] = useState<AttendanceKioskDevicePayload>(defaultKioskForm());

  const loadControl = async (date: string) => {
    setIsLoading(true);
    setErrorMessage('');

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
      setErrorMessage(toErrorMessage(error, copy));
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
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

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
        setErrorMessage(toErrorMessage(error, copy));
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
        `${assignment.employee_name} ${assignment.employee_number ?? ''} ${assignment.position_title ?? ''} ${assignment.schedule_template_name ?? ''}`
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
      const result = await runWithMinimumDuration(
        humanResourcesApi.updateAttendanceDailyRecord(selectedEmployeeId, date, { status }),
        850,
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
      setSuccessMessage(status ? copy.labels.correctionApplied : copy.labels.correctionCleared);
      return true;
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
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
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
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
        return {
          day_of_week: dayOfWeek,
          start_time: rule?.start_time ?? null,
          end_time: rule?.end_time ?? null,
          meal_minutes: rule?.meal_minutes ?? 0,
          rest_minutes: rule?.rest_minutes ?? 0,
          late_after_minutes: rule?.late_after_minutes ?? 10,
          is_rest_day: rule?.is_rest_day ?? (dayOfWeek >= 6),
        };
      }),
    });
    setSelectedTemplateId(template.id);
    setIsTemplateDialogOpen(true);
  };

  const openAssignmentDialog = () => {
    setAssignmentForm({
      employee_ids: selectedEmployee ? [selectedEmployee.employee_id] : [],
      template_id: selectedEmployee?.schedule_template_id ?? selectedTemplate?.id ?? templates[0]?.id ?? 0,
      effective_start_date: controlDate,
      effective_end_date: '',
    });
    setIsAssignmentDialogOpen(true);
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
    setErrorMessage('');

    try {
      if (editingLocation) {
        await humanResourcesApi.updateAttendanceControlLocation(editingLocation.id, locationForm);
      } else {
        await humanResourcesApi.createAttendanceControlLocation(locationForm);
      }

      setIsLocationDialogOpen(false);
      setSuccessMessage(copy.locationSaved);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingTemplate) {
        await humanResourcesApi.updateAttendanceControlTemplate(editingTemplate.id, templateForm);
      } else {
        await humanResourcesApi.createAttendanceControlTemplate(templateForm);
      }

      setIsTemplateDialogOpen(false);
      setSuccessMessage(copy.templateSaved);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await humanResourcesApi.bulkAssignAttendanceSchedule({
        employee_ids: assignmentForm.employee_ids,
        template_id: Number(assignmentForm.template_id),
        effective_start_date: assignmentForm.effective_start_date,
        effective_end_date: assignmentForm.effective_end_date || undefined,
      });

      setIsAssignmentDialogOpen(false);
      setSuccessMessage(copy.bulkAssignSuccess);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKiosk = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (editingKiosk) {
        await humanResourcesApi.updateAttendanceKioskDevice(editingKiosk.id, kioskForm);
      } else {
        await humanResourcesApi.createAttendanceKioskDevice(kioskForm);
      }

      setIsKioskDialogOpen(false);
      setSuccessMessage(copy.labels.kioskSaved);
      await loadControl(controlDate);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
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
      setErrorMessage(copy.labels.kioskTokenUnavailable);
      return;
    }

    const kioskWindow = window.open('', '_blank');
    if (kioskWindow) {
      kioskWindow.opener = null;
      kioskWindow.location.href = kioskLink;
      return;
    }

    setErrorMessage(copy.labels.kioskTabBlocked);
  };

  const handleCopyKioskLink = async (device?: AttendanceKioskDevice | null) => {
    const kioskLink = buildKioskDeviceLink(device ?? selectedKioskDevice);
    if (!kioskLink) {
      setErrorMessage(copy.labels.kioskTokenUnavailable);
      return;
    }

    try {
      await navigator.clipboard.writeText(kioskLink);
      setSuccessMessage(copy.labels.kioskLinkCopied);
    } catch {
      setErrorMessage(copy.saveError);
    }
  };

  const handleRotateKioskLink = async (device?: AttendanceKioskDevice | null) => {
    const targetDevice = device ?? selectedKioskDevice;
    if (!targetDevice) {
      setErrorMessage(copy.labels.kioskTokenUnavailable);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await humanResourcesApi.rotateAttendanceKioskDevicePublicToken(targetDevice.id);
      setKioskDevices((current) => current.map((device) => (
        device.id === response.kiosk_device.id ? response.kiosk_device : device
      )));
      setSelectedKioskDeviceId(response.kiosk_device.id);
      setSuccessMessage(copy.labels.kioskLinkRotated);
      setIsKioskQrDialogOpen(false);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy) || copy.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isUpdatingCalendarDay}
        title={copy.labels.savingDayStatus}
        description={copy.labels.savingDayStatusDescription}
      />

      {errorMessage ? (
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

      <div className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 dark:border-[#143675]/30 dark:bg-[#143675]/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">📅</span>
              {copy.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{copy.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setIsLocationRegistrationModalOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              Register locations
            </Button>
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setIsScheduleOverviewModalOpen(true)}
            >
              <Table2 className="h-3.5 w-3.5" />
              {copy.labels.viewSchedules}
            </Button>
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => setIsSchedulesModalOpen(true)}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {copy.labels.setSchedules}
            </Button>
            <Button
              variant="outline"
              className="h-8 whitespace-nowrap rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.labels.attendanceCalendar}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {selectedEmployee ? selectedEmployee.employee_name : copy.labels.selectEmployeeCalendar}
                </p>
                {selectedEmployee ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CompactInfoChip>{selectedEmployee.position_title || selectedEmployee.department || copy.labels.noDepartment}</CompactInfoChip>
                    <CompactInfoChip>{selectedEmployee.schedule_template_name || copy.labels.noSchedule}</CompactInfoChip>
                    <CompactInfoChip tone={statusClasses[selectedEmployee.today_status]}>
                      {copy.statuses[selectedEmployee.today_status]}
                    </CompactInfoChip>
                    <CompactInfoChip tone={faceEnrollment?.status === 'active' ? statusClasses.on_time : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}>
                      {copy.labels.faceEnrollmentStatus}: {faceEnrollment?.status ?? 'not_enrolled'}
                    </CompactInfoChip>
                  </div>
                ) : null}
              </div>

              {selectedEmployee ? (
                <EmployeeAccessActions
                  selectedEmployee={selectedEmployee}
                  selectedAccessProfile={selectedAccessProfile}
                  faceEnrollment={faceEnrollment}
                  assignments={overview?.assignments ?? []}
                  onFaceEnrollmentChange={setFaceEnrollment}
                  onReload={() => loadControl(controlDate)}
                  onSuccess={setSuccessMessage}
                  onError={setErrorMessage}
                />
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

      <ControlLocationDialog
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

      <LocationRegistrationModal
        isOpen={isLocationRegistrationModalOpen}
        onClose={() => setIsLocationRegistrationModalOpen(false)}
        locations={locations}
        onReload={() => loadControl(controlDate)}
      />

      <ScheduleOverviewModal
        isOpen={isScheduleOverviewModalOpen}
        onClose={() => setIsScheduleOverviewModalOpen(false)}
        assignments={overview?.assignments ?? []}
        date={controlDate}
        locale={currentLanguage.code}
        onDateChange={setControlDate}
      />

      <ScheduleModal
        isOpen={isSchedulesModalOpen}
        onClose={() => setIsSchedulesModalOpen(false)}
        assignments={overview?.assignments ?? []}
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
          setSuccessMessage(copy.bulkAssignSuccess);
        }}
      />
    </>
  );
}
