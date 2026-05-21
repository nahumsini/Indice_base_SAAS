import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  CalendarRange,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Save,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { FailureToast } from '../../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../../components/ui/pagination';
import {
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlLocation,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
} from '../../../../api/humanResources';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../../api/dashboard';
import { useControlTranslations } from '../hooks/useControlTranslations';
import type { ControlTranslations } from '../translations';

interface HorarioDiaDraft {
  dayOfWeek: number;
  dia: string;
  entrada: string;
  salida: string;
  comida: number;
  descanso: number;
  isRestDay: boolean;
}

type ScheduleLocationRule = 'business' | 'temporary' | 'open';
type ScheduleBuilderStep = 'setup' | 'workdays' | 'rules' | 'review';

interface OperationalScheduleSummary {
  compact: string;
  reviewItems: Array<{
    label: string;
    value: string;
  }>;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: AttendanceControlTemplate[];
  locations: AttendanceControlLocation[];
  selectedTemplateId?: number | null;
  effectiveStartDate?: string;
  onApplied?: (result: {
    employeeIds: number[];
    templateId: number;
    templateName: string;
  }) => Promise<void> | void;
}
type ScheduleCopy = ControlTranslations['schedule'];
type WeekdayKey = keyof ScheduleCopy['workdays']['days'];

const weekdayConfig = [
  { dayOfWeek: 1, dia: 'Mon' },
  { dayOfWeek: 2, dia: 'Tue' },
  { dayOfWeek: 3, dia: 'Wed' },
  { dayOfWeek: 4, dia: 'Thu' },
  { dayOfWeek: 5, dia: 'Fri' },
  { dayOfWeek: 6, dia: 'Sat' },
  { dayOfWeek: 7, dia: 'Sun' },
] as const;

const employeesPerPage = 10;
const defaultScheduleTemplateName = 'Default Schedule';
const defaultScheduleStartTime = '08:00';
const defaultScheduleEndTime = '16:00';
const permanentScheduleEndDate = '9999-12-31';
const scheduleSaveMinimumLoadingMs = 2000;
const isDefaultNoShiftDay = (dayOfWeek: number) => dayOfWeek === 6 || dayOfWeek === 7;
const dateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const emptyScheduleDays = (): HorarioDiaDraft[] =>
  weekdayConfig.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    dia: day.dia,
    entrada: defaultScheduleStartTime,
    salida: defaultScheduleEndTime,
    comida: 0,
    descanso: 0,
    isRestDay: isDefaultNoShiftDay(day.dayOfWeek),
  }));

const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);

const draftFromTemplate = (template: AttendanceControlTemplate | null) => {
  const modoHorario: 'Horario estricto' | 'Horario abierto' =
    template?.schedule_mode === 'open' ? 'Horario abierto' : 'Horario estricto';
  const locationRule: ScheduleLocationRule = template?.enforce_location
    ? 'temporary'
    : template?.schedule_mode === 'open'
      ? 'open'
      : 'business';
  const toleranciaIngreso = template?.days.find((day) => !day.is_rest_day)?.late_after_minutes ?? 10;
  const horarios = weekdayConfig.map((config) => {
    const day = template?.days.find((item) => item.day_of_week === config.dayOfWeek);
    return {
      dayOfWeek: config.dayOfWeek,
      dia: config.dia,
      entrada: timeToInput(day?.start_time) || defaultScheduleStartTime,
      salida: timeToInput(day?.end_time) || defaultScheduleEndTime,
      comida: day?.meal_minutes ?? 0,
      descanso: day?.rest_minutes ?? 0,
      isRestDay: day?.is_rest_day ?? isDefaultNoShiftDay(config.dayOfWeek),
    };
  });

  return {
    modoHorario,
    locationRule,
    toleranciaIngreso,
    noPermitirFueraUbicacion: Boolean(template?.enforce_location),
    ubicacionSeleccionada: template?.location_id ? String(template.location_id) : '',
    horarios,
  };
};

const normalizeTemplatePayload = (payload: AttendanceControlTemplatePayload) =>
  JSON.stringify({
    schedule_mode: payload.schedule_mode,
    block_after_grace_period: false,
    enforce_location: payload.enforce_location,
    location_id: payload.location_id ?? null,
    days: payload.days.map((day) => ({
      day_of_week: day.day_of_week,
      start_time: day.start_time ?? null,
      end_time: day.end_time ?? null,
      meal_minutes: day.meal_minutes,
      rest_minutes: day.rest_minutes,
      late_after_minutes: day.late_after_minutes,
      is_rest_day: day.is_rest_day,
    })),
  });

const payloadFromTemplate = (template: AttendanceControlTemplate): AttendanceControlTemplatePayload => ({
  name: template.name,
  status: template.status === 'inactive' ? 'inactive' : 'active',
  schedule_mode: template.schedule_mode === 'open' ? 'open' : 'strict',
  block_after_grace_period: false,
  enforce_location: Boolean(template.enforce_location),
  location_id: template.location_id ?? null,
  days: template.days.map((day) => ({
    day_of_week: day.day_of_week,
    start_time: day.start_time ?? null,
    end_time: day.end_time ?? null,
    meal_minutes: day.meal_minutes ?? 0,
    rest_minutes: day.rest_minutes ?? 0,
    late_after_minutes: day.late_after_minutes,
    is_rest_day: day.is_rest_day,
  })),
});

const getBusinessUnitId = (business: BackendBusiness) => business.unit_id ?? business.unitId ?? null;

const toPositiveNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const uniquePositiveNumbers = (values: Array<number | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is number => typeof value === 'number' && value > 0)));

const formatPreviewList = (values: string[], fallback: string, copy: ScheduleCopy) => {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return fallback;
  }
  if (cleaned.length <= 2) {
    return cleaned.join(', ');
  }
  return `${cleaned.slice(0, 2).join(', ')} ${copy.moreItems(cleaned.length - 2)}`;
};

const formatLocationOption = (location: AttendanceControlLocation) => {
  const scope = location.business_name || location.unit_name || '';
  return scope ? `${location.name} - ${scope}` : location.name;
};

const getScheduleBlockReason = (assignment: AttendanceControlAssignment) => assignment.schedule_busy_reason?.trim() ?? '';

const blocksScheduleSave = (assignment: AttendanceControlAssignment) => {
  if (assignment.can_assign_schedule !== false) {
    return false;
  }
  const reason = getScheduleBlockReason(assignment).toLowerCase();
  if (!reason) {
    return true;
  }
  return !reason.includes('schedule already assigned');
};

const isScheduleAssignable = (assignment: AttendanceControlAssignment) => !blocksScheduleSave(assignment);

const scheduleBuilderStepIds: ScheduleBuilderStep[] = ['setup', 'workdays', 'rules', 'review'];

const getScheduleBuilderSteps = (copy: ScheduleCopy) =>
  scheduleBuilderStepIds.map((id) => ({
    id,
    label: copy.builder.steps[id].label,
    description: copy.builder.steps[id].description,
  }));

const dayName = (shortName: string, copy: ScheduleCopy) =>
  copy.workdays.days[shortName as WeekdayKey] ?? shortName;

const workingDays = (horarios: HorarioDiaDraft[]) => horarios.filter((horario) => !horario.isRestDay);

const formatWorkingDaysSummary = (horarios: HorarioDiaDraft[], copy: ScheduleCopy) => {
  const days = workingDays(horarios);
  if (days.length === 0) {
    return copy.noWorkingDaysSelected;
  }

  const isConsecutive = days.every((day, index) => index === 0 || day.dayOfWeek === days[index - 1].dayOfWeek + 1);
  if (days.length > 1 && isConsecutive) {
    return `${dayName(days[0].dia, copy)}-${dayName(days[days.length - 1].dia, copy)}`;
  }

  return days.map((day) => dayName(day.dia, copy)).join(', ');
};

const formatTimeSummary = (horarios: HorarioDiaDraft[], isOpenSchedule: boolean, copy: ScheduleCopy) => {
  const days = workingDays(horarios);
  if (days.length === 0) {
    return copy.noActiveHours;
  }
  if (isOpenSchedule) {
    return copy.openWorkdays;
  }

  const ranges = Array.from(new Set(days.map((day) => `${day.entrada || '--:--'}-${day.salida || '--:--'}`)));
  return ranges.length === 1 ? ranges[0] : copy.timeRanges(ranges.length);
};

const firstSharedMinutes = (horarios: HorarioDiaDraft[], field: 'comida' | 'descanso') =>
  workingDays(horarios).find((day) => day[field] > 0)?.[field] ?? 0;

const locationRuleSummary = (locationRule: ScheduleLocationRule, copy: ScheduleCopy) => {
  if (locationRule === 'temporary') {
    return copy.locationRule.temporary;
  }
  if (locationRule === 'open') {
    return copy.locationRule.open;
  }
  return copy.locationRule.business;
};

const buildOperationalScheduleSummary = ({
  copy,
  effectiveStartDate,
  horarios,
  isOpenSchedule,
  locationRule,
  selectedEmployeeCount,
  selectedTemplateName,
  toleranciaIngreso,
}: {
  copy: ScheduleCopy;
  effectiveStartDate: string;
  horarios: HorarioDiaDraft[];
  isOpenSchedule: boolean;
  locationRule: ScheduleLocationRule;
  selectedEmployeeCount: number;
  selectedTemplateName: string;
  toleranciaIngreso: number;
}): OperationalScheduleSummary => {
  const employeeLabel = copy.summary.collaborators(selectedEmployeeCount);
  const scheduleType = isOpenSchedule ? copy.summary.openSchedule : copy.summary.strictSchedule;
  const daysLabel = formatWorkingDaysSummary(horarios, copy);
  const timeLabel = formatTimeSummary(horarios, isOpenSchedule, copy);
  const locationLabel = locationRuleSummary(locationRule, copy);
  const toleranceLabel = isOpenSchedule ? copy.summary.noLateTolerance : copy.summary.minuteTolerance(toleranciaIngreso);
  const templateLabel = selectedTemplateName && selectedTemplateName !== defaultScheduleTemplateName
    ? selectedTemplateName
    : copy.customSchedule;

  return {
    compact: `${employeeLabel} | ${scheduleType} | ${daysLabel} | ${timeLabel}`,
    reviewItems: [
      { label: copy.summary.labels.collaborators, value: employeeLabel },
      { label: copy.summary.labels.ruleType, value: scheduleType },
      { label: copy.summary.labels.template, value: templateLabel },
      { label: copy.summary.labels.workdays, value: daysLabel },
      { label: copy.summary.labels.hours, value: timeLabel },
      { label: copy.summary.labels.attendanceRule, value: toleranceLabel },
      { label: copy.summary.labels.locationRule, value: locationLabel },
      { label: copy.summary.labels.effectiveFrom, value: formatEffectiveDate(effectiveStartDate) },
    ],
  };
};

const formatEffectiveDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export function ScheduleModal({
  isOpen,
  onClose,
  templates,
  locations,
  selectedTemplateId,
  effectiveStartDate,
  onApplied,
}: ScheduleModalProps) {
  const copy = useControlTranslations();
  const todayDate = dateInputValue();
  const requestedAvailabilityDate = effectiveStartDate?.trim() || todayDate;
  const defaultAvailabilityDate = requestedAvailabilityDate < todayDate ? todayDate : requestedAvailabilityDate;
  const [searchQuery, setSearchQuery] = useState('');
  const [unidadFilter, setUnidadFilter] = useState('');
  const [negocioFilter, setNegocioFilter] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedUnidadFilter, setAppliedUnidadFilter] = useState('');
  const [appliedNegocioFilter, setAppliedNegocioFilter] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(defaultAvailabilityDate);
  const [appliedAvailabilityDate, setAppliedAvailabilityDate] = useState(defaultAvailabilityDate);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [selectedEmployeeAssignments, setSelectedEmployeeAssignments] = useState<Record<number, AttendanceControlAssignment>>({});
  const [candidateAssignments, setCandidateAssignments] = useState<AttendanceControlAssignment[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<BackendUnit[]>([]);
  const [organizationBusinesses, setOrganizationBusinesses] = useState<BackendBusiness[]>([]);
  const [candidateTotalCount, setCandidateTotalCount] = useState(0);
  const [candidateTotalPages, setCandidateTotalPages] = useState(1);
  const [, setCandidateAvailableCount] = useState(0);
  const [candidateBusyCount, setCandidateBusyCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedScheduleTemplateId, setSelectedScheduleTemplateId] = useState<number | null>(null);
  const [createdTemplates, setCreatedTemplates] = useState<AttendanceControlTemplate[]>([]);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [templateNameError, setTemplateNameError] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [deletedTemplateIds, setDeletedTemplateIds] = useState<number[]>([]);
  const [modoHorario, setModoHorario] = useState<'Horario estricto' | 'Horario abierto'>('Horario estricto');
  const [toleranciaIngreso, setToleranciaIngreso] = useState(10);
  const [locationRule, setLocationRule] = useState<ScheduleLocationRule>('business');
  const [noPermitirFueraUbicacion, setNoPermitirFueraUbicacion] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [horarios, setHorarios] = useState<HorarioDiaDraft[]>(emptyScheduleDays());
  const [builderStep, setBuilderStep] = useState<ScheduleBuilderStep>('setup');
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const leftPanelScrollRef = useRef<HTMLDivElement>(null);
  const rightPanelScrollRef = useRef<HTMLDivElement>(null);

  const availableTemplates = useMemo(() => {
    const deletedTemplateIdSet = new Set(deletedTemplateIds);
    const templateMap = new Map<number, AttendanceControlTemplate>();
    templates.forEach((template) => {
      if (!deletedTemplateIdSet.has(template.id)) {
        templateMap.set(template.id, template);
      }
    });
    createdTemplates.forEach((template) => {
      if (!deletedTemplateIdSet.has(template.id)) {
        templateMap.set(template.id, template);
      }
    });
    return Array.from(templateMap.values());
  }, [createdTemplates, deletedTemplateIds, templates]);

  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === selectedScheduleTemplateId) ?? null,
    [availableTemplates, selectedScheduleTemplateId],
  );
  const assignmentEffectiveStartDate = appliedAvailabilityDate || defaultAvailabilityDate;
  const hasPastAssignmentStartDate = assignmentEffectiveStartDate < todayDate;
  const assignmentDateError = hasPastAssignmentStartDate
    ? copy.schedule.errors.effectiveDatePast
    : '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
    const templateDraft = draftFromTemplate(initialTemplate);
    setSearchQuery('');
    setUnidadFilter('');
    setNegocioFilter('');
    setAppliedSearchQuery('');
    setAppliedUnidadFilter('');
    setAppliedNegocioFilter('');
    setAvailabilityDate(defaultAvailabilityDate);
    setAppliedAvailabilityDate(defaultAvailabilityDate);
    setSelectedEmployeeIds([]);
    setSelectedEmployeeAssignments({});
    setCandidateAssignments([]);
    setOrganizationUnits([]);
    setOrganizationBusinesses([]);
    setCandidateTotalCount(0);
    setCandidateTotalPages(1);
    setCandidateAvailableCount(0);
    setCandidateBusyCount(0);
    setCurrentPage(1);
    setSelectedTemplateName(initialTemplate?.name ?? defaultScheduleTemplateName);
    setSelectedScheduleTemplateId(initialTemplate?.id ?? null);
    setModoHorario(templateDraft.modoHorario);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setLocationRule(templateDraft.locationRule);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
    setBuilderStep('setup');
    setIsSaveTemplateModalOpen(false);
    setTemplateNameDraft('');
    setTemplateNameError('');
    setIsSavingTemplate(false);
    setIsDeletingTemplate(false);
    setErrorMessage('');
    setFailureToastMessage('');
  }, [defaultAvailabilityDate, isOpen, selectedTemplateId, templates]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    Promise.all([
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
    ])
      .then(([nextUnits, nextBusinesses]) => {
        if (!active) {
          return;
        }

        setOrganizationUnits(nextUnits);
        setOrganizationBusinesses(nextBusinesses);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : copy.schedule.errors.loadOrganizationUnits;
        setOrganizationUnits([]);
        setOrganizationBusinesses([]);
        setErrorMessage(message);
        showFailureToast(message);
      });

    return () => {
      active = false;
    };
  }, [copy, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (assignmentDateError) {
      setIsLoadingCandidates(false);
      setCandidateAssignments([]);
      setCandidateTotalCount(0);
      setCandidateTotalPages(1);
      setCandidateAvailableCount(0);
      setCandidateBusyCount(0);
      setErrorMessage(assignmentDateError);
      return;
    }

    let active = true;
    setIsLoadingCandidates(true);
    setErrorMessage('');

    humanResourcesApi.listAttendanceScheduleCandidates({
      date: assignmentEffectiveStartDate,
      page: currentPage,
      size: employeesPerPage,
      search: appliedSearchQuery,
      unit_id: appliedUnidadFilter,
      business_id: appliedNegocioFilter,
    })
      .then((response) => {
        if (!active) {
          return;
        }

        setCandidateAssignments(response.items);
        setCandidateTotalCount(response.total_count);
        setCandidateTotalPages(response.total_pages);
        setCandidateAvailableCount(response.available_count);
        setCandidateBusyCount(response.busy_count);
        if (response.page !== currentPage) {
          setCurrentPage(response.page);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : copy.schedule.errors.loadScheduleCandidates;
        setCandidateAssignments([]);
        setCandidateTotalCount(0);
        setCandidateTotalPages(1);
        setErrorMessage(message);
        showFailureToast(message);
      })
      .finally(() => {
        if (active) {
          setIsLoadingCandidates(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    appliedNegocioFilter,
    appliedAvailabilityDate,
    appliedSearchQuery,
    appliedUnidadFilter,
    assignmentEffectiveStartDate,
    assignmentDateError,
    copy,
    currentPage,
    isOpen,
  ]);

  const unitOptions = useMemo(
    () => organizationUnits.map((option) => [String(option.id), option.name || copy.labels.unit] as const),
    [copy, organizationUnits],
  );

  const businessOptions = useMemo(
    () => organizationBusinesses
      .filter((option) => !unidadFilter || String(getBusinessUnitId(option) ?? '') === unidadFilter)
      .map((option) => [String(option.id), option.name || copy.labels.business] as const),
    [copy, organizationBusinesses, unidadFilter],
  );

  const totalPages = Math.max(1, candidateTotalPages);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * employeesPerPage;
  const paginatedAssignments = candidateAssignments;
  const visibleAssignableEmployeeIds = paginatedAssignments
    .map((assignment) => assignment.user_company_id);
  const allVisibleSelected = visibleAssignableEmployeeIds.length > 0
    && visibleAssignableEmployeeIds.every((employeeId) => selectedEmployeeIds.includes(employeeId));
  const paginationStart = candidateTotalCount === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = candidateTotalCount === 0 ? 0 : pageStartIndex + paginatedAssignments.length;
  const assignmentByEmployeeId = useMemo(
    () => new Map(candidateAssignments.map((assignment) => [assignment.user_company_id, assignment] as const)),
    [candidateAssignments],
  );
  const selectedAssignments = useMemo(
    () => selectedEmployeeIds
      .map((employeeId) => selectedEmployeeAssignments[employeeId] ?? assignmentByEmployeeId.get(employeeId))
      .filter((assignment): assignment is AttendanceControlAssignment => Boolean(assignment)),
    [assignmentByEmployeeId, selectedEmployeeAssignments, selectedEmployeeIds],
  );
  const selectedLockedAssignments = useMemo(
    () => selectedAssignments.filter((assignment) => !isScheduleAssignable(assignment)),
    [selectedAssignments],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedAvailabilityDate, appliedNegocioFilter, appliedSearchQuery, appliedUnidadFilter, isOpen]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const scrollAvailableEmployeesToTop = () => {
    window.requestAnimationFrame(() => {
      leftPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) {
      return;
    }

    setCurrentPage(page);
    scrollAvailableEmployeesToTop();
  };

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>([1, totalPages, safeCurrentPage]);
    if (safeCurrentPage - 1 > 1) {
      pages.add(safeCurrentPage - 1);
    }
    if (safeCurrentPage + 1 < totalPages) {
      pages.add(safeCurrentPage + 1);
    }

    const sortedPages = Array.from(pages).sort((left, right) => left - right);
    const items: Array<number | 'ellipsis'> = [];

    sortedPages.forEach((page, index) => {
      const previousPage = sortedPages[index - 1];
      if (previousPage && page - previousPage > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  }, [safeCurrentPage, totalPages]);

  const activeLocationOptions = useMemo(
    () => locations.filter((location) => location.status !== 'inactive'),
    [locations],
  );
  const selectedBusinessIds = useMemo(
    () => uniquePositiveNumbers(selectedAssignments.map((assignment) => assignment.business_id)),
    [selectedAssignments],
  );
  const selectedUnitIds = useMemo(
    () => uniquePositiveNumbers(selectedAssignments.map((assignment) => assignment.unit_id)),
    [selectedAssignments],
  );
  const selectedBusinessKey = selectedBusinessIds.join(',');
  const selectedUnitKey = selectedUnitIds.join(',');
  const appliedBusinessId = toPositiveNumber(appliedNegocioFilter);
  const appliedUnitId = toPositiveNumber(appliedUnidadFilter);
  const hasSelectedEmployees = selectedEmployeeIds.length > 0;
  const scopedBusinessIds = hasSelectedEmployees
    ? selectedBusinessIds.length === 1 || selectedUnitIds.length === 0
      ? selectedBusinessIds
      : []
    : appliedBusinessId
      ? [appliedBusinessId]
      : [];
  const scopedUnitIds = hasSelectedEmployees
    ? scopedBusinessIds.length === 0
      ? selectedUnitIds
      : []
    : scopedBusinessIds.length === 0 && appliedUnitId
      ? [appliedUnitId]
      : [];
  const scopedBusinessKey = scopedBusinessIds.join(',');
  const scopedUnitKey = scopedUnitIds.join(',');
  const hasLocationScope = scopedBusinessIds.length > 0 || scopedUnitIds.length > 0;
  const scopedExactLocationOptions = useMemo(() => {
    if (scopedBusinessIds.length > 0) {
      const scopedBusinessIdSet = new Set(scopedBusinessIds);
      return activeLocationOptions.filter((location) => (
        typeof location.business_id === 'number' && scopedBusinessIdSet.has(location.business_id)
      ));
    }

    if (scopedUnitIds.length > 0) {
      const scopedUnitIdSet = new Set(scopedUnitIds);
      return activeLocationOptions.filter((location) => (
        typeof location.unit_id === 'number' && scopedUnitIdSet.has(location.unit_id)
      ));
    }

    return activeLocationOptions;
  }, [activeLocationOptions, scopedBusinessKey, scopedUnitKey]);
  const exactLocationOptions = hasLocationScope && scopedExactLocationOptions.length === 0
    ? activeLocationOptions
    : scopedExactLocationOptions;
  const businessNameById = useMemo(() => {
    const names = new Map<number, string>();
    organizationBusinesses.forEach((business) => {
      names.set(business.id, business.name || copy.labels.business);
    });
    selectedAssignments.forEach((assignment) => {
      if (typeof assignment.business_id === 'number' && assignment.business_id > 0 && assignment.business_name) {
        names.set(assignment.business_id, assignment.business_name);
      }
    });
    return names;
  }, [copy, organizationBusinesses, selectedAssignments]);
  const unitNameById = useMemo(() => {
    const names = new Map<number, string>();
    organizationUnits.forEach((unit) => {
      names.set(unit.id, unit.name || copy.labels.unit);
    });
    selectedAssignments.forEach((assignment) => {
      if (typeof assignment.unit_id === 'number' && assignment.unit_id > 0 && assignment.unit_name) {
        names.set(assignment.unit_id, assignment.unit_name);
      }
    });
    return names;
  }, [copy, organizationUnits, selectedAssignments]);
  const selectedEmployeeBusinessWarning = useMemo(() => {
    if (selectedEmployeeIds.length === 0 || selectedAssignments.length === 0) {
      return '';
    }

    const missingBusinessCount = selectedAssignments.filter((assignment) => !assignment.business_id).length;
    if (missingBusinessCount > 0) {
      return copy.schedule.location.summaries.missingBusinessWarning(missingBusinessCount);
    }

    const businessIdsWithoutLocations = selectedBusinessIds.filter((businessId) =>
      !activeLocationOptions.some((location) => location.business_id === businessId),
    );
    if (businessIdsWithoutLocations.length > 0) {
      const businessNames = businessIdsWithoutLocations.map((businessId) => businessNameById.get(businessId) || `Business ${businessId}`);
      return copy.schedule.location.summaries.noActiveBusinessLocation(
        formatPreviewList(businessNames, copy.schedule.location.summaries.selectedBusiness, copy.schedule),
      );
    }

    return '';
  }, [activeLocationOptions, businessNameById, copy, selectedAssignments, selectedBusinessIds, selectedEmployeeIds.length]);
  const locationScopeSummary = useMemo(() => {
    if (hasSelectedEmployees && selectedAssignments.length === 0) {
      return copy.schedule.location.summaries.loadingSelectedDetails;
    }

    if (scopedBusinessIds.length === 1) {
      const businessId = scopedBusinessIds[0];
      return copy.schedule.location.summaries.forBusiness(
        businessNameById.get(businessId) || copy.schedule.location.summaries.selectedBusiness,
      );
    }

    if (scopedBusinessIds.length > 1) {
      const businessNames = scopedBusinessIds.map((businessId) => businessNameById.get(businessId) || `Business ${businessId}`);
      return copy.schedule.location.summaries.fromBusinesses(
        formatPreviewList(businessNames, copy.schedule.location.summaries.selectedBusinesses, copy.schedule),
      );
    }

    if (scopedUnitIds.length === 1) {
      const unitId = scopedUnitIds[0];
      return copy.schedule.location.summaries.forUnit(
        unitNameById.get(unitId) || copy.schedule.location.summaries.selectedUnit,
      );
    }

    if (scopedUnitIds.length > 1) {
      const unitNames = scopedUnitIds.map((unitId) => unitNameById.get(unitId) || `Unit ${unitId}`);
      return copy.schedule.location.summaries.fromUnits(
        formatPreviewList(unitNames, copy.schedule.location.summaries.selectedUnits, copy.schedule),
      );
    }

    if (appliedBusinessId) {
      return copy.schedule.location.summaries.forBusiness(
        businessNameById.get(appliedBusinessId) || copy.schedule.location.summaries.currentBusinessFilter,
      );
    }

    if (appliedUnitId) {
      return copy.schedule.location.summaries.forUnit(
        unitNameById.get(appliedUnitId) || copy.schedule.location.summaries.currentUnitFilter,
      );
    }

    return copy.schedule.location.summaries.allLocations;
  }, [
    appliedBusinessId,
    appliedUnitId,
    businessNameById,
    copy,
    hasSelectedEmployees,
    selectedAssignments.length,
    scopedBusinessIds,
    scopedBusinessKey,
    scopedUnitIds,
    scopedUnitKey,
    unitNameById,
  ]);
  const employeeBusinessLocationSummary = useMemo(() => {
    if (selectedEmployeeIds.length === 0) {
      return copy.schedule.location.summaries.assignedBusinessLocation;
    }

    if (selectedAssignments.length === 0) {
      return copy.schedule.location.summaries.assignedBusinessLocationPending;
    }

    if (selectedBusinessIds.length === 1) {
      const businessId = selectedBusinessIds[0];
      return copy.schedule.location.summaries.assignedBusinessLocationName(
        businessNameById.get(businessId) || copy.schedule.location.summaries.assignedBusinessFallback,
      );
    }

    if (selectedBusinessIds.length > 1) {
      const businessNames = selectedBusinessIds.map((businessId) => businessNameById.get(businessId) || `Business ${businessId}`);
      return copy.schedule.location.summaries.multipleBusinessLocations(
        formatPreviewList(businessNames, copy.schedule.location.summaries.multipleBusinessesFallback, copy.schedule),
      );
    }

    return copy.schedule.location.summaries.needAssignedBusiness;
  }, [businessNameById, copy, selectedAssignments.length, selectedBusinessIds, selectedBusinessKey, selectedEmployeeIds.length]);
  const locationScopeFallbackMessage = hasLocationScope && scopedExactLocationOptions.length === 0 && activeLocationOptions.length > 0
    ? copy.schedule.location.summaries.noScopedLocationFallback
    : '';
  const exactLocationWarning = selectedBusinessIds.length > 1
    ? copy.schedule.location.summaries.exactLocationWarning
    : '';
  const operationalSummary = useMemo(() => buildOperationalScheduleSummary({
    copy: copy.schedule,
    effectiveStartDate: assignmentEffectiveStartDate,
    horarios,
    isOpenSchedule: modoHorario === 'Horario abierto',
    locationRule,
    selectedEmployeeCount: selectedEmployeeIds.length,
    selectedTemplateName,
    toleranciaIngreso,
  }), [
    assignmentEffectiveStartDate,
    copy,
    horarios,
    locationRule,
    modoHorario,
    selectedEmployeeIds.length,
    selectedTemplateName,
    toleranciaIngreso,
  ]);

  useEffect(() => {
    if (!noPermitirFueraUbicacion || !ubicacionSeleccionada) {
      return;
    }

    const selectedLocationStillAvailable = exactLocationOptions.some((location) => String(location.id) === ubicacionSeleccionada);
    if (!selectedLocationStillAvailable) {
      setUbicacionSeleccionada('');
    }
  }, [exactLocationOptions, noPermitirFueraUbicacion, ubicacionSeleccionada]);

  if (!isOpen) {
    return (
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
    );
  }

  const isHorarioAbierto = modoHorario === 'Horario abierto';

  const rememberSelectedAssignments = (assignments: AttendanceControlAssignment[]) => {
    if (assignments.length === 0) {
      return;
    }

    setSelectedEmployeeAssignments((current) => {
      const next = { ...current };
      assignments.forEach((assignment) => {
        next[assignment.user_company_id] = assignment;
      });
      return next;
    });
  };

  const forgetSelectedAssignments = (employeeIds: number[]) => {
    if (employeeIds.length === 0) {
      return;
    }

    setSelectedEmployeeAssignments((current) => {
      const next = { ...current };
      employeeIds.forEach((employeeId) => {
        delete next[employeeId];
      });
      return next;
    });
  };

  const toggleEmployee = (employeeId: number) => {
    const isSelected = selectedEmployeeIds.includes(employeeId);
    const assignment = assignmentByEmployeeId.get(employeeId);
    if (isSelected) {
      forgetSelectedAssignments([employeeId]);
    } else if (assignment) {
      rememberSelectedAssignments([assignment]);
    }

    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  const setEmployeeSelection = (employeeId: number, shouldSelect: boolean) => {
    if (shouldSelect) {
      const assignment = assignmentByEmployeeId.get(employeeId);
      if (assignment) {
        rememberSelectedAssignments([assignment]);
      }
    } else {
      forgetSelectedAssignments([employeeId]);
    }

    setSelectedEmployeeIds((current) => {
      const isSelected = current.includes(employeeId);
      if (shouldSelect && !isSelected) {
        return [...current, employeeId];
      }
      if (!shouldSelect && isSelected) {
        return current.filter((id) => id !== employeeId);
      }
      return current;
    });
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      forgetSelectedAssignments(visibleAssignableEmployeeIds);
      setSelectedEmployeeIds((current) => current.filter((id) => !visibleAssignableEmployeeIds.includes(id)));
      return;
    }
    rememberSelectedAssignments(
      paginatedAssignments.filter((assignment) => visibleAssignableEmployeeIds.includes(assignment.user_company_id)),
    );
    setSelectedEmployeeIds((current) => Array.from(new Set([...current, ...visibleAssignableEmployeeIds])));
  };

  const handleLocationRuleChange = (value: string) => {
    const nextRule = (value === 'temporary' || value === 'open' || value === 'business')
      ? value
      : 'business';
    const useExactLocation = nextRule === 'temporary';
    setLocationRule(nextRule);
    setNoPermitirFueraUbicacion(useExactLocation);
    if (nextRule === 'open') {
      setModoHorario('Horario abierto');
    } else if (modoHorario === 'Horario abierto') {
      setModoHorario('Horario estricto');
    }
    if (!useExactLocation) {
      setUbicacionSeleccionada('');
    }
  };

  const handleScheduleModeChange = (value: 'Horario estricto' | 'Horario abierto') => {
    setModoHorario(value);
    if (value === 'Horario abierto') {
      setLocationRule('open');
      setNoPermitirFueraUbicacion(false);
      setUbicacionSeleccionada('');
      return;
    }

    if (locationRule === 'open') {
      setLocationRule('business');
      setNoPermitirFueraUbicacion(false);
      setUbicacionSeleccionada('');
    }
  };

  const updateHorario = (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => {
    setHorarios((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value } : item));
  };

  const updateWorkingDay = (index: number, isWorkingDay: boolean) => {
    setHorarios((current) =>
      current.map((item, currentIndex) => {
        if (currentIndex !== index) {
          return item;
        }

        return {
          ...item,
          isRestDay: !isWorkingDay,
          entrada: item.entrada || defaultScheduleStartTime,
          salida: item.salida || defaultScheduleEndTime,
        };
      }),
    );
  };

  const copyMondayToAllDays = () => {
    setHorarios((current) => {
      const monday = current.find((item) => item.dayOfWeek === 1) ?? current[0];
      if (!monday) {
        return current;
      }

      return current.map((item) => (
        item.dayOfWeek === monday.dayOfWeek
          ? item
          : {
            ...item,
            entrada: monday.entrada,
            salida: monday.salida,
            comida: monday.comida,
            descanso: monday.descanso,
            isRestDay: monday.isRestDay,
          }
      ));
    });
  };

  const showFailureToast = (message: string) => {
    setFailureToastMessage('');
    window.setTimeout(() => setFailureToastMessage(message), 0);
  };

  const resolveBusinessFilterForUnit = (businessId: string, unitId: string) => {
    if (!businessId || !unitId) {
      return businessId;
    }

    const selectedBusiness = organizationBusinesses.find((option) => String(option.id) === businessId);
    if (!selectedBusiness) {
      return '';
    }

    return String(getBusinessUnitId(selectedBusiness) ?? '') === unitId ? businessId : '';
  };

  const applyCandidateFilters = (
    nextUnitFilter = unidadFilter,
    nextBusinessFilter = negocioFilter,
    nextAvailabilityDate = availabilityDate,
  ) => {
    const resolvedBusinessFilter = resolveBusinessFilterForUnit(nextBusinessFilter, nextUnitFilter);
    const resolvedAvailabilityDate = nextAvailabilityDate || defaultAvailabilityDate;
    setNegocioFilter(resolvedBusinessFilter);
    setCurrentPage(1);
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(nextUnitFilter);
    setAppliedNegocioFilter(resolvedBusinessFilter);
    setAppliedAvailabilityDate(resolvedAvailabilityDate);
  };

  const handleUnitFilterChange = (value: string) => {
    const nextBusinessFilter = resolveBusinessFilterForUnit(negocioFilter, value);
    setUnidadFilter(value);
    setNegocioFilter(nextBusinessFilter);
    applyCandidateFilters(value, nextBusinessFilter);
  };

  const handleBusinessFilterChange = (value: string) => {
    const selectedBusiness = organizationBusinesses.find((option) => String(option.id) === value);
    const selectedBusinessUnitId = selectedBusiness ? getBusinessUnitId(selectedBusiness) : null;
    const nextUnitFilter = value && !unidadFilter && selectedBusinessUnitId
      ? String(selectedBusinessUnitId)
      : unidadFilter;

    setUnidadFilter(nextUnitFilter);
    setNegocioFilter(value);
    applyCandidateFilters(nextUnitFilter, value);
  };

  const handleAvailabilityDateChange = (value: string) => {
    setAvailabilityDate(value);
    if (!value) {
      return;
    }
    applyCandidateFilters(unidadFilter, negocioFilter, value);
    setSelectedEmployeeIds([]);
    setSelectedEmployeeAssignments({});
  };

  const applySearchFilters = () => {
    applyCandidateFilters();
  };

  const limpiarHorarios = () => {
    const templateDraft = draftFromTemplate(null);
    setSelectedTemplateName(defaultScheduleTemplateName);
    setSelectedScheduleTemplateId(null);
    setModoHorario(templateDraft.modoHorario);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setLocationRule(templateDraft.locationRule);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
    setErrorMessage('');
    window.requestAnimationFrame(() => {
      rightPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleScheduleTemplateChange = (value: string) => {
    if (!value) {
      limpiarHorarios();
      return;
    }

    const template = availableTemplates.find((option) => String(option.id) === value) ?? null;
    const templateDraft = draftFromTemplate(template);
    setSelectedScheduleTemplateId(template?.id ?? null);
    setSelectedTemplateName(template?.name ?? defaultScheduleTemplateName);
    setModoHorario(templateDraft.modoHorario);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setLocationRule(templateDraft.locationRule);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
    setErrorMessage('');
    window.requestAnimationFrame(() => {
      rightPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const buildTemplatePayload = (templateName = selectedTemplateName.trim() || defaultScheduleTemplateName): AttendanceControlTemplatePayload | null => {
    const usesExactLocation = locationRule === 'temporary';
    const usesOpenRegistration = locationRule === 'open' || isHorarioAbierto;

    if (usesExactLocation && !ubicacionSeleccionada) {
      const message = copy.schedule.errors.selectAllowedLocation;
      setErrorMessage(message);
      showFailureToast(message);
      return null;
    }

    const days = horarios.map((horario) => {
      const startTime = horario.entrada ? `${horario.entrada}:00` : null;
      const endTime = horario.salida ? `${horario.salida}:00` : null;

      if (!usesOpenRegistration && !horario.isRestDay) {
        if (!startTime || !endTime) {
          throw new Error(copy.schedule.errors.missingTimeForDay(dayName(horario.dia, copy.schedule)));
        }
        if (endTime === startTime) {
          throw new Error(copy.schedule.errors.equalTimeForDay(dayName(horario.dia, copy.schedule)));
        }
      }

      return {
        day_of_week: horario.dayOfWeek,
        start_time: usesOpenRegistration || horario.isRestDay ? null : startTime,
        end_time: usesOpenRegistration || horario.isRestDay ? null : endTime,
        meal_minutes: horario.comida,
        rest_minutes: horario.descanso,
        late_after_minutes: usesOpenRegistration ? 0 : toleranciaIngreso,
        is_rest_day: horario.isRestDay,
      };
    });

    return {
      name: templateName,
      status: 'active',
      schedule_mode: usesOpenRegistration ? 'open' : 'strict',
      block_after_grace_period: false,
      enforce_location: usesExactLocation,
      location_id: usesExactLocation && ubicacionSeleccionada ? Number(ubicacionSeleccionada) : null,
      days,
    };
  };

  const aplicarHorarios = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    setFailureToastMessage('');
    await waitForNextPaint();

    try {
      const appliedResult = await runWithMinimumDuration((async () => {
        if (selectedEmployeeIds.length === 0) {
          const message = copy.schedule.errors.selectHrUser;
          setErrorMessage(message);
          showFailureToast(message);
          return null;
        }

        if (selectedLockedAssignments.length > 0) {
          const lockedNames = formatPreviewList(
            selectedLockedAssignments.map((assignment) => assignment.user_name),
            copy.schedule.selectedHrUsersFallback,
            copy.schedule,
          );
          const message = copy.schedule.errors.lockedAssignments(lockedNames);
          setErrorMessage(message);
          showFailureToast(message);
          return null;
        }

        const payload = buildTemplatePayload();
        if (!payload) {
          return null;
        }
        if (assignmentDateError) {
          const message = assignmentDateError;
          setErrorMessage(message);
          showFailureToast(message);
          return null;
        }

        const normalizedPayload = normalizeTemplatePayload(payload);
        const sameAsSelectedTemplate = selectedTemplate
          ? normalizedPayload === normalizeTemplatePayload(payloadFromTemplate(selectedTemplate))
          : false;
        const reusableTemplate = sameAsSelectedTemplate
          ? selectedTemplate
          : availableTemplates.find((template) =>
            template.status !== 'inactive' &&
              normalizedPayload === normalizeTemplatePayload(payloadFromTemplate(template)),
          ) ?? null;

        let templateId = reusableTemplate?.id ?? null;
        let appliedTemplateName = reusableTemplate?.name ?? payload.name;
        if (!templateId) {
          const templateName = availableTemplates.some((template) => template.name === payload.name)
            ? `${payload.name} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
            : payload.name;
          const response = await humanResourcesApi.createAttendanceControlTemplate({
            ...payload,
            name: templateName,
          });
          templateId = response.template.id;
          appliedTemplateName = response.template.name;
          setCreatedTemplates((current) => [...current.filter((template) => template.id !== response.template.id), response.template]);
        }

        await humanResourcesApi.bulkAssignAttendanceSchedule({
          user_company_ids: selectedEmployeeIds,
          template_id: templateId,
          effective_start_date: assignmentEffectiveStartDate,
          effective_end_date: permanentScheduleEndDate,
        });

        return {
          employeeIds: selectedEmployeeIds,
          templateId,
          templateName: appliedTemplateName,
        };
      })(), scheduleSaveMinimumLoadingMs);

      if (!appliedResult) {
        return;
      }

      await Promise.resolve(onApplied?.(appliedResult));
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.schedule.errors.applyFailed;
      setErrorMessage(message);
      showFailureToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSaveTemplateModal = () => {
    setTemplateNameDraft(selectedTemplateName && selectedTemplateName !== defaultScheduleTemplateName ? selectedTemplateName : '');
    setTemplateNameError('');
    setIsSaveTemplateModalOpen(true);
  };

  const closeSaveTemplateModal = () => {
    if (isSavingTemplate) {
      return;
    }

    setIsSaveTemplateModalOpen(false);
    setTemplateNameError('');
  };

  const saveScheduleTemplate = async () => {
    const templateName = templateNameDraft.trim();
    if (!templateName) {
      setTemplateNameError(copy.schedule.errors.templateNameRequired);
      return;
    }

    if (availableTemplates.some((template) => template.name.trim().toLowerCase() === templateName.toLowerCase())) {
      setTemplateNameError(copy.schedule.errors.templateExists);
      return;
    }

    setIsSavingTemplate(true);
    setTemplateNameError('');
    setErrorMessage('');
    setFailureToastMessage('');

    try {
      const payload = buildTemplatePayload(templateName);
      if (!payload) {
        setTemplateNameError(copy.schedule.errors.templateIncomplete);
        return;
      }

      const response = await humanResourcesApi.createAttendanceControlTemplate(payload);
      setCreatedTemplates((current) => [...current.filter((template) => template.id !== response.template.id), response.template]);
      setSelectedScheduleTemplateId(response.template.id);
      setSelectedTemplateName(response.template.name);
      setIsSaveTemplateModalOpen(false);
      setTemplateNameDraft('');
      window.requestAnimationFrame(() => {
        rightPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.schedule.errors.templateSaveFailed;
      setTemplateNameError(message);
      showFailureToast(message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const deleteSelectedScheduleTemplate = async () => {
    const template = selectedTemplate;
    if (!template) {
      const message = copy.schedule.errors.selectTemplateBeforeRemove;
      setErrorMessage(message);
      showFailureToast(message);
      return;
    }

    const confirmed = window.confirm(copy.schedule.errors.removeTemplateConfirm(template.name));
    if (!confirmed) {
      return;
    }

    setIsDeletingTemplate(true);
    setErrorMessage('');
    setFailureToastMessage('');

    try {
      await humanResourcesApi.updateAttendanceControlTemplate(template.id, {
        ...payloadFromTemplate(template),
        status: 'inactive',
      });
      setDeletedTemplateIds((current) => Array.from(new Set([...current, template.id])));
      setCreatedTemplates((current) => current.filter((item) => item.id !== template.id));
      limpiarHorarios();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.schedule.errors.removeTemplateFailed;
      setErrorMessage(message);
      showFailureToast(message);
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={copy.schedule.savingSchedule}
        description={copy.schedule.savingScheduleDescription}
        className="z-[95]"
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
        className="z-[100]"
      />
      <SaveTemplateModal
        copy={copy}
        errorMessage={templateNameError}
        isOpen={isSaveTemplateModalOpen}
        isSaving={isSavingTemplate}
        templateName={templateNameDraft}
        onClose={closeSaveTemplateModal}
        onSave={() => void saveScheduleTemplate()}
        onTemplateNameChange={setTemplateNameDraft}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="my-8 flex max-h-[92vh] w-full max-w-[96rem] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white text-gray-900 shadow-2xl dark:border-slate-700 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex shrink-0 items-start justify-between gap-4 bg-[#59C3A5] px-6 py-4 text-white">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-white">{copy.schedule.modalTitle}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                  {copy.schedule.modalDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={copy.schedule.closeModal}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-950/40">
            {errorMessage ? (
              <div className="shrink-0 px-5 pt-5">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                  {errorMessage}
                </div>
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
              <section className="order-2 flex min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:order-1">
                <div ref={leftPanelScrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  <EmployeeSelectionTable
                    allVisibleSelected={allVisibleSelected}
                    assignmentEffectiveStartDate={assignmentEffectiveStartDate}
                    availabilityDate={availabilityDate}
                    businessOptions={businessOptions}
                    candidateBusyCount={candidateBusyCount}
                    candidateTotalCount={candidateTotalCount}
                    changePage={changePage}
                    copy={copy}
                    currentPage={safeCurrentPage}
                    isLoadingCandidates={isLoadingCandidates}
                    negocioFilter={negocioFilter}
                    paginatedAssignments={paginatedAssignments}
                    paginationEnd={paginationEnd}
                    paginationItems={paginationItems}
                    paginationStart={paginationStart}
                    searchQuery={searchQuery}
                    selectedEmployeeIds={selectedEmployeeIds}
                    setEmployeeSelection={setEmployeeSelection}
                    setSearchQuery={setSearchQuery}
                    todayDate={todayDate}
                    toggleAll={toggleAll}
                    toggleEmployee={toggleEmployee}
                    totalPages={totalPages}
                    unidadFilter={unidadFilter}
                    unitOptions={unitOptions}
                    visibleAssignableEmployeeIds={visibleAssignableEmployeeIds}
                    onApplySearchFilters={applySearchFilters}
                    onAvailabilityDateChange={handleAvailabilityDateChange}
                    onBusinessFilterChange={handleBusinessFilterChange}
                    onUnitFilterChange={handleUnitFilterChange}
                  />
                </div>
              </section>

              <section className="order-1 flex min-h-0 flex-col bg-white dark:bg-slate-950 lg:order-2">
                <div ref={rightPanelScrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pb-28">
                  <ScheduleBuilder
                    activeStep={builderStep}
                    copy={copy}
                    employeeBusinessLocationSummary={employeeBusinessLocationSummary}
                    exactLocationOptions={exactLocationOptions}
                    exactLocationWarning={exactLocationWarning}
                    effectiveStartDate={assignmentEffectiveStartDate}
                    horarios={horarios}
                    isDeletingTemplate={isDeletingTemplate}
                    isHorarioAbierto={isHorarioAbierto}
                    isSubmitting={isSubmitting}
                    locationRule={locationRule}
                    locationScopeFallbackMessage={locationScopeFallbackMessage}
                    locationScopeSummary={locationScopeSummary}
                    operationalSummary={operationalSummary}
                    selectedEmployeeBusinessWarning={selectedEmployeeBusinessWarning}
                    selectedEmployeeCount={selectedEmployeeIds.length}
                    selectedScheduleTemplateId={selectedScheduleTemplateId}
                    selectedTemplateName={selectedTemplateName}
                    templates={availableTemplates}
                    toleranciaIngreso={toleranciaIngreso}
                    ubicacionSeleccionada={ubicacionSeleccionada}
                    onCopyMondayToAllDays={copyMondayToAllDays}
                    onDeleteSelectedTemplate={deleteSelectedScheduleTemplate}
                    onHorarioChange={updateHorario}
                    onLocationRuleChange={handleLocationRuleChange}
                    onModeChange={handleScheduleModeChange}
                    onStepChange={setBuilderStep}
                    onOpenSaveTemplateModal={openSaveTemplateModal}
                    onResetSchedule={limpiarHorarios}
                    onScheduleTemplateChange={handleScheduleTemplateChange}
                    onToleranciaIngresoChange={setToleranciaIngreso}
                    onUbicacionSeleccionadaChange={setUbicacionSeleccionada}
                    onWorkingDayChange={updateWorkingDay}
                  />
                </div>
              </section>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 bg-[#59C3A5] px-6 py-3 text-white md:flex-row md:items-center md:justify-between">
            <ScheduleImpactSummary
              assignmentDateError={assignmentDateError}
              copy={copy}
              effectiveStartDate={assignmentEffectiveStartDate}
              operationalSummary={operationalSummary}
              selectedEmployeeCount={selectedEmployeeIds.length}
              compact
            />
            <div className="flex shrink-0 items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {copy.schedule.cancel}
              </Button>
              <Button
                type="button"
                onClick={() => void aplicarHorarios()}
                className="gap-2 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
                disabled={selectedEmployeeIds.length === 0 || isSubmitting || Boolean(assignmentDateError)}
                title={
                  selectedEmployeeIds.length === 0
                    ? copy.schedule.errors.selectedHrUserTitle
                    : assignmentDateError
                      ? assignmentDateError
                      : undefined
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                {copy.schedule.saveSchedule}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SaveTemplateModal({
  copy,
  errorMessage,
  isOpen,
  isSaving,
  templateName,
  onClose,
  onSave,
  onTemplateNameChange,
}: {
  copy: ControlTranslations;
  errorMessage: string;
  isOpen: boolean;
  isSaving: boolean;
  templateName: string;
  onClose: () => void;
  onSave: () => void;
  onTemplateNameChange: (value: string) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 bg-[#59C3A5] px-5 py-4 text-white">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">{copy.schedule.saveTemplate.title}</h3>
            <p className="mt-1 text-sm text-white/75">{copy.schedule.saveTemplate.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={copy.schedule.saveTemplate.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {copy.schedule.saveTemplate.nameLabel}
            </span>
            <input
              autoFocus
              type="text"
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSave();
                }
              }}
              placeholder={copy.schedule.saveTemplate.placeholder}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          {errorMessage ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
              {errorMessage}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.schedule.saveTemplate.helper}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 bg-[#59C3A5] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {copy.schedule.cancel}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
          >
            <Save className="h-4 w-4" />
            {isSaving ? copy.schedule.saveTemplate.saving : copy.schedule.saveTemplate.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmployeeSelectionTable({
  allVisibleSelected,
  assignmentEffectiveStartDate,
  availabilityDate,
  businessOptions,
  candidateBusyCount,
  candidateTotalCount,
  changePage,
  copy,
  currentPage,
  isLoadingCandidates,
  negocioFilter,
  paginatedAssignments,
  paginationEnd,
  paginationItems,
  paginationStart,
  searchQuery,
  selectedEmployeeIds,
  setEmployeeSelection,
  setSearchQuery,
  todayDate,
  toggleAll,
  toggleEmployee,
  totalPages,
  unidadFilter,
  unitOptions,
  visibleAssignableEmployeeIds,
  onApplySearchFilters,
  onAvailabilityDateChange,
  onBusinessFilterChange,
  onUnitFilterChange,
}: {
  allVisibleSelected: boolean;
  assignmentEffectiveStartDate: string;
  availabilityDate: string;
  businessOptions: ReadonlyArray<readonly [string, string]>;
  candidateBusyCount: number;
  candidateTotalCount: number;
  changePage: (page: number) => void;
  copy: ControlTranslations;
  currentPage: number;
  isLoadingCandidates: boolean;
  negocioFilter: string;
  paginatedAssignments: AttendanceControlAssignment[];
  paginationEnd: number;
  paginationItems: Array<number | 'ellipsis'>;
  paginationStart: number;
  searchQuery: string;
  selectedEmployeeIds: number[];
  setEmployeeSelection: (employeeId: number, shouldSelect: boolean) => void;
  setSearchQuery: (value: string) => void;
  todayDate: string;
  toggleAll: () => void;
  toggleEmployee: (employeeId: number) => void;
  totalPages: number;
  unidadFilter: string;
  unitOptions: ReadonlyArray<readonly [string, string]>;
  visibleAssignableEmployeeIds: number[];
  onApplySearchFilters: () => void;
  onAvailabilityDateChange: (value: string) => void;
  onBusinessFilterChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
}) {
  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.filters.applySchedule}</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.filters.effectiveDate}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {copy.schedule.filters.effectiveDescription}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/15 dark:text-[#8FE0CA] sm:self-auto">
            <UserCheck className="h-3.5 w-3.5" />
            {copy.schedule.selectedCount(selectedEmployeeIds.length)}
          </span>
        </div>
        <input
          type="date"
          value={availabilityDate}
          min={todayDate}
          onChange={(event) => onAvailabilityDateChange(event.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-56"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 id="available-hr-users-heading" className="text-sm font-semibold text-slate-950 dark:text-white">
              {copy.schedule.filters.selectHrUsers}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {copy.schedule.newScheduleStartsOn(assignmentEffectiveStartDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {copy.schedule.shownCount(candidateTotalCount)}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
              {copy.schedule.selectedCount(selectedEmployeeIds.length)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onApplySearchFilters();
                }
              }}
              placeholder={copy.schedule.filters.searchPlaceholder}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            aria-label={copy.schedule.filters.filterByUnit}
            value={unidadFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.schedule.filters.allUnits}</option>
            {unitOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            aria-label={copy.schedule.filters.filterByBusiness}
            value={negocioFilter}
            onChange={(event) => onBusinessFilterChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.schedule.filters.allBusinesses}</option>
            {businessOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={onApplySearchFilters}
            className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-3 text-[#59C3A5] shadow-sm hover:bg-blue-50 hover:text-[#59C3A5] dark:border-slate-700 dark:bg-slate-950 dark:text-[#8FE0CA] dark:hover:bg-blue-950/20"
          >
            <Search className="h-4 w-4" />
            {copy.schedule.filters.filter}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  <Checkbox
                    checked={allVisibleSelected}
                    disabled={isLoadingCandidates || visibleAssignableEmployeeIds.length === 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.table.code}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.table.employee}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.table.department}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.table.currentSchedule}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {isLoadingCandidates ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.schedule.filters.loadingHrUsers}
                  </td>
                </tr>
              ) : candidateTotalCount === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.schedule.filters.noHrUsers}
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((assignment) => {
                  const isSelected = selectedEmployeeIds.includes(assignment.user_company_id);
                  const hasScheduleNotice = !isScheduleAssignable(assignment);
                  const lockedReason = getScheduleBlockReason(assignment) || copy.schedule.existingScheduleOrSite;
                  const isAttendanceLocked = lockedReason.toLowerCase().includes('attendance');
                  const currentScheduleName = assignment.schedule_template_name || copy.schedule.noScheduleSaved;
                  const statusTooltip = hasScheduleNotice
                    ? `${lockedReason}. ${copy.schedule.chooseAnotherDate}`
                    : assignment.schedule_template_name
                      ? copy.schedule.existingScheduleWillReplace
                      : copy.schedule.canReceiveSchedule;

                  return (
                    <tr
                      key={assignment.user_company_id}
                      title={statusTooltip}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 ${
                        isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-100 dark:bg-blue-950/20 dark:ring-blue-900/40' : ''
                      }`}
                      onClick={() => toggleEmployee(assignment.user_company_id)}
                    >
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => setEmployeeSelection(assignment.user_company_id, checked === true)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {assignment.user_code || assignment.user_company_id}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-slate-950 dark:text-white">
                        {assignment.user_name}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {assignment.department || assignment.position_title || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          title={statusTooltip}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            hasScheduleNotice
                              ? isAttendanceLocked
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                          }`}
                        >
                          {hasScheduleNotice ? <Info className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {currentScheduleName}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoadingCandidates && candidateTotalCount > 0 ? (
          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.schedule.showingRows(paginationStart, paginationEnd, candidateTotalCount)}
              </p>
              {candidateBusyCount > 0 ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {copy.schedule.filters.busyContext(candidateBusyCount)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.schedule.pageLabel(currentPage, totalPages)}</p>
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        changePage(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                  {paginationItems.map((item, index) => (
                    item === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          isActive={item === currentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            changePage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        changePage(currentPage + 1);
                      }}
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

function ScheduleBuilder({
  activeStep,
  copy,
  employeeBusinessLocationSummary,
  exactLocationOptions,
  exactLocationWarning,
  effectiveStartDate,
  horarios,
  isDeletingTemplate,
  isHorarioAbierto,
  isSubmitting,
  locationRule,
  locationScopeFallbackMessage,
  locationScopeSummary,
  operationalSummary,
  selectedEmployeeBusinessWarning,
  selectedEmployeeCount,
  selectedScheduleTemplateId,
  selectedTemplateName,
  templates,
  toleranciaIngreso,
  ubicacionSeleccionada,
  onCopyMondayToAllDays,
  onDeleteSelectedTemplate,
  onHorarioChange,
  onLocationRuleChange,
  onModeChange,
  onOpenSaveTemplateModal,
  onStepChange,
  onResetSchedule,
  onScheduleTemplateChange,
  onToleranciaIngresoChange,
  onUbicacionSeleccionadaChange,
  onWorkingDayChange,
}: {
  activeStep: ScheduleBuilderStep;
  copy: ControlTranslations;
  employeeBusinessLocationSummary: string;
  exactLocationOptions: AttendanceControlLocation[];
  exactLocationWarning: string;
  effectiveStartDate: string;
  horarios: HorarioDiaDraft[];
  isDeletingTemplate: boolean;
  isHorarioAbierto: boolean;
  isSubmitting: boolean;
  locationRule: ScheduleLocationRule;
  locationScopeFallbackMessage: string;
  locationScopeSummary: string;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeBusinessWarning: string;
  selectedEmployeeCount: number;
  selectedScheduleTemplateId: number | null;
  selectedTemplateName: string;
  templates: AttendanceControlTemplate[];
  toleranciaIngreso: number;
  ubicacionSeleccionada: string;
  onCopyMondayToAllDays: () => void;
  onDeleteSelectedTemplate: () => void;
  onHorarioChange: (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => void;
  onLocationRuleChange: (value: string) => void;
  onModeChange: (value: 'Horario estricto' | 'Horario abierto') => void;
  onOpenSaveTemplateModal: () => void;
  onStepChange: (step: ScheduleBuilderStep) => void;
  onResetSchedule: () => void;
  onScheduleTemplateChange: (value: string) => void;
  onToleranciaIngresoChange: (value: number) => void;
  onUbicacionSeleccionadaChange: (value: string) => void;
  onWorkingDayChange: (index: number, isWorkingDay: boolean) => void;
}) {
  const scheduleBuilderSteps = useMemo(() => getScheduleBuilderSteps(copy.schedule), [copy]);
  const activeTemplates = templates.filter((template) => template.status !== 'inactive');
  const currentStepIndex = scheduleBuilderSteps.findIndex((step) => step.id === activeStep);
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex >= 0 && currentStepIndex < scheduleBuilderSteps.length - 1;
  const goBack = () => {
    if (!canGoBack) {
      return;
    }
    onStepChange(scheduleBuilderSteps[currentStepIndex - 1].id);
  };
  const goNext = () => {
    if (!canGoNext) {
      return;
    }
    onStepChange(scheduleBuilderSteps[currentStepIndex + 1].id);
  };

  return (
    <section aria-labelledby="schedule-details-heading" className="flex min-h-full flex-col gap-5">
      <div className="rounded-2xl border border-[#59C3A5]/20 bg-blue-50/60 p-4 shadow-sm dark:border-[#8FE0CA]/30 dark:bg-blue-950/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="schedule-details-heading" className="text-sm font-semibold text-slate-950 dark:text-white">
              {copy.schedule.builder.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {copy.schedule.builder.description}
            </p>
          </div>
          <span className="inline-flex shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#59C3A5] shadow-sm dark:bg-slate-950 dark:text-[#8FE0CA]">
            {currentStepIndex + 1}/{scheduleBuilderSteps.length}
          </span>
        </div>

        <ScheduleWorkflowTabs activeStep={activeStep} copy={copy} onStepChange={onStepChange} />
      </div>

      {activeStep === 'setup' ? (
        <ScheduleSetupStep
          activeTemplates={activeTemplates}
          copy={copy}
          isDeletingTemplate={isDeletingTemplate}
          isHorarioAbierto={isHorarioAbierto}
          isSubmitting={isSubmitting}
          selectedScheduleTemplateId={selectedScheduleTemplateId}
          selectedTemplateName={selectedTemplateName}
          onDeleteSelectedTemplate={onDeleteSelectedTemplate}
          onModeChange={onModeChange}
          onOpenSaveTemplateModal={onOpenSaveTemplateModal}
          onResetSchedule={onResetSchedule}
          onScheduleTemplateChange={onScheduleTemplateChange}
        />
      ) : null}

      {activeStep === 'workdays' ? (
        <section className="space-y-4">
          <WorkingGrid
            copy={copy}
            horarios={horarios}
            isHorarioAbierto={isHorarioAbierto}
            onCopyMondayToAllDays={onCopyMondayToAllDays}
            onHorarioChange={onHorarioChange}
            onWorkingDayChange={onWorkingDayChange}
          />
          <BreakConfigurationCard
            copy={copy}
            horarios={horarios}
            onHorarioChange={onHorarioChange}
          />
        </section>
      ) : null}

      {activeStep === 'rules' ? (
        <section className="space-y-4">
          {!isHorarioAbierto ? (
            <AttendanceRulesCard
              copy={copy}
              toleranciaIngreso={toleranciaIngreso}
              onToleranciaIngresoChange={onToleranciaIngresoChange}
            />
          ) : (
            <OpenScheduleRulesCard copy={copy} />
          )}
          <LocationRuleSelector
            copy={copy}
            employeeBusinessLocationSummary={employeeBusinessLocationSummary}
            exactLocationOptions={exactLocationOptions}
            exactLocationWarning={exactLocationWarning}
            locationRule={locationRule}
            locationScopeFallbackMessage={locationScopeFallbackMessage}
            locationScopeSummary={locationScopeSummary}
            selectedEmployeeBusinessWarning={selectedEmployeeBusinessWarning}
            ubicacionSeleccionada={ubicacionSeleccionada}
            onLocationRuleChange={onLocationRuleChange}
            onUbicacionSeleccionadaChange={onUbicacionSeleccionadaChange}
          />
        </section>
      ) : null}

      {activeStep === 'review' ? (
        <ScheduleReviewStep
          copy={copy}
          effectiveStartDate={effectiveStartDate}
          horarios={horarios}
          isHorarioAbierto={isHorarioAbierto}
          locationRule={locationRule}
          operationalSummary={operationalSummary}
          selectedEmployeeCount={selectedEmployeeCount}
          selectedTemplateName={selectedTemplateName}
          toleranciaIngreso={toleranciaIngreso}
        />
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={!canGoBack}
          className="rounded-xl"
        >
          {copy.schedule.builder.back}
        </Button>
        <div className="min-w-0 text-center text-xs text-slate-500 dark:text-slate-400">
          {operationalSummary.compact}
        </div>
        <Button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-xl bg-[#59C3A5] text-white hover:bg-[#3AAE90]"
        >
          {canGoNext ? copy.schedule.builder.continue : copy.schedule.builder.readyToSave}
        </Button>
      </div>
    </section>
  );
}

function ScheduleWorkflowTabs({
  activeStep,
  copy,
  onStepChange,
}: {
  activeStep: ScheduleBuilderStep;
  copy: ControlTranslations;
  onStepChange: (step: ScheduleBuilderStep) => void;
}) {
  const scheduleBuilderSteps = useMemo(() => getScheduleBuilderSteps(copy.schedule), [copy]);
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-4">
      {scheduleBuilderSteps.map((step, index) => {
        const isActive = activeStep === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              isActive
                ? 'border-[#59C3A5] bg-white text-[#59C3A5] shadow-sm dark:border-[#8FE0CA] dark:bg-slate-950 dark:text-[#8FE0CA]'
                : 'border-transparent bg-white/50 text-slate-600 hover:bg-white dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{copy.schedule.builder.stepLabel(index + 1)}</span>
            <span className="mt-1 block text-sm font-semibold">{step.label}</span>
            <span className="mt-0.5 block text-xs opacity-75">{step.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScheduleSetupStep({
  activeTemplates,
  copy,
  isDeletingTemplate,
  isHorarioAbierto,
  isSubmitting,
  selectedScheduleTemplateId,
  selectedTemplateName,
  onDeleteSelectedTemplate,
  onModeChange,
  onOpenSaveTemplateModal,
  onResetSchedule,
  onScheduleTemplateChange,
}: {
  activeTemplates: AttendanceControlTemplate[];
  copy: ControlTranslations;
  isDeletingTemplate: boolean;
  isHorarioAbierto: boolean;
  isSubmitting: boolean;
  selectedScheduleTemplateId: number | null;
  selectedTemplateName: string;
  onDeleteSelectedTemplate: () => void;
  onModeChange: (value: 'Horario estricto' | 'Horario abierto') => void;
  onOpenSaveTemplateModal: () => void;
  onResetSchedule: () => void;
  onScheduleTemplateChange: (value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.setup.eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.setup.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.schedule.setup.description}
          </p>
        </div>
        <ScheduleTemplateSelector
          activeTemplates={activeTemplates}
          copy={copy}
          isDeletingTemplate={isDeletingTemplate}
          isSubmitting={isSubmitting}
          selectedScheduleTemplateId={selectedScheduleTemplateId}
          selectedTemplateName={selectedTemplateName}
          onDeleteSelectedTemplate={onDeleteSelectedTemplate}
          onScheduleTemplateChange={onScheduleTemplateChange}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onResetSchedule} disabled={isSubmitting}>
            {copy.schedule.setup.createNewSchedule}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSaveTemplateModal}
            disabled={isSubmitting}
            className="gap-2 text-[#59C3A5] hover:text-[#59C3A5] dark:text-[#8FE0CA]"
          >
            <Save className="h-4 w-4" />
            {copy.schedule.setup.saveAsTemplate}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <ScheduleTypeSelector
          copy={copy}
          isHorarioAbierto={isHorarioAbierto}
          onModeChange={onModeChange}
        />
      </div>
    </section>
  );
}

function ScheduleTypeSelector({
  copy,
  isHorarioAbierto,
  onModeChange,
}: {
  copy: ControlTranslations;
  isHorarioAbierto: boolean;
  onModeChange: (value: 'Horario estricto' | 'Horario abierto') => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.setup.scheduleType}</span>
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onModeChange('Horario estricto')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            !isHorarioAbierto
              ? 'border-[#59C3A5] bg-white ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
              : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              !isHorarioAbierto ? 'border-[#59C3A5] bg-[#59C3A5] text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
            }`}
            >
              {!isHorarioAbierto ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.setup.strictTitle}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {copy.schedule.setup.strictDescription}
              </p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onModeChange('Horario abierto')}
          className={`rounded-2xl border p-4 text-left transition-all ${
            isHorarioAbierto
              ? 'border-[#59C3A5] bg-white ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
              : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              isHorarioAbierto ? 'border-[#59C3A5] bg-[#59C3A5] text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
            }`}
            >
              {isHorarioAbierto ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.setup.openTitle}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {copy.schedule.setup.openDescription}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function ScheduleTemplateSelector({
  activeTemplates,
  copy,
  isDeletingTemplate,
  isSubmitting,
  selectedScheduleTemplateId,
  selectedTemplateName,
  onDeleteSelectedTemplate,
  onScheduleTemplateChange,
}: {
  activeTemplates: AttendanceControlTemplate[];
  copy: ControlTranslations;
  isDeletingTemplate: boolean;
  isSubmitting: boolean;
  selectedScheduleTemplateId: number | null;
  selectedTemplateName: string;
  onDeleteSelectedTemplate: () => void;
  onScheduleTemplateChange: (value: string) => void;
}) {
  const canDeleteSelectedTemplate = Boolean(selectedScheduleTemplateId) && !isDeletingTemplate && !isSubmitting;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.template.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.schedule.template.description}</p>
        </div>
        <span className="inline-flex max-w-[14rem] shrink-0 truncate rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-blue-950/40 dark:text-[#8FE0CA]">
          {selectedTemplateName === defaultScheduleTemplateName ? copy.schedule.defaultTemplateName : selectedTemplateName}
        </span>
      </div>
      <select
        value={selectedScheduleTemplateId ? String(selectedScheduleTemplateId) : ''}
        onChange={(event) => onScheduleTemplateChange(event.target.value)}
        disabled={isDeletingTemplate || isSubmitting}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        <option value="">{copy.schedule.defaultTemplateOption}</option>
        {activeTemplates.map((template) => (
          <option key={template.id} value={template.id}>{template.name}</option>
        ))}
      </select>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {selectedScheduleTemplateId
            ? copy.schedule.template.removeSelected
            : copy.schedule.template.selectToRemove}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDeleteSelectedTemplate}
          disabled={!canDeleteSelectedTemplate}
          className="shrink-0 gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4" />
          {isDeletingTemplate ? copy.schedule.template.removing : copy.schedule.template.remove}
        </Button>
      </div>
    </div>
  );
}

function WorkingGrid({
  copy,
  horarios,
  isHorarioAbierto,
  onCopyMondayToAllDays,
  onHorarioChange,
  onWorkingDayChange,
}: {
  copy: ControlTranslations;
  horarios: HorarioDiaDraft[];
  isHorarioAbierto: boolean;
  onCopyMondayToAllDays: () => void;
  onHorarioChange: (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => void;
  onWorkingDayChange: (index: number, isWorkingDay: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.workdays.eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.workdays.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.schedule.workdays.description}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCopyMondayToAllDays}>
          {copy.schedule.workdays.copyMonday}
        </Button>
      </div>

      <div className="grid gap-2">
        {horarios.map((horario, index) => {
          const isWorkingDay = !horario.isRestDay;
          const isOvernightShift = !horario.isRestDay
            && Boolean(horario.entrada)
            && Boolean(horario.salida)
            && horario.salida < horario.entrada;

          return (
            <div
              key={horario.dayOfWeek}
              className={`rounded-2xl border p-3 transition-colors ${
                isWorkingDay
                  ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 items-center gap-3">
                  <Checkbox
                    checked={isWorkingDay}
                    onCheckedChange={(checked) => onWorkingDayChange(index, checked === true)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950 dark:text-white">{dayName(horario.dia, copy.schedule)}</span>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isWorkingDay
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    >
                      {isWorkingDay ? copy.schedule.workdays.workingDay : copy.schedule.workdays.offDay}
                    </span>
                  </span>
                </label>

                {!isHorarioAbierto && isWorkingDay ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:w-64">
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.workdays.start}</span>
                      <input
                        type="time"
                        value={horario.entrada}
                        onChange={(event) => onHorarioChange(index, 'entrada', event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <span className="mt-6 text-sm font-semibold text-slate-400">{copy.schedule.workdays.to}</span>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.workdays.end}</span>
                      <input
                        type="time"
                        value={horario.salida}
                        onChange={(event) => onHorarioChange(index, 'salida', event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                  </div>
                ) : null}

                {isHorarioAbierto && isWorkingDay ? (
                  <p className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200">
                    {copy.schedule.workdays.openAccessDay}
                  </p>
                ) : null}
              </div>
              {isOvernightShift ? (
                <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-300">{copy.schedule.workdays.overnightShift}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BreakConfigurationCard({
  copy,
  horarios,
  onHorarioChange,
}: {
  copy: ControlTranslations;
  horarios: HorarioDiaDraft[];
  onHorarioChange: (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => void;
}) {
  const mealMinutes = firstSharedMinutes(horarios, 'comida');
  const breakMinutes = firstSharedMinutes(horarios, 'descanso');
  const hasMealBreak = mealMinutes > 0;
  const hasShortBreak = breakMinutes > 0;

  const updateAllWorkingDays = (field: 'comida' | 'descanso', value: number) => {
    horarios.forEach((horario, index) => {
      onHorarioChange(index, field, horario.isRestDay ? 0 : value);
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.breaks.eyebrow}</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.breaks.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.breaks.description}
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.breaks.mealTitle}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{copy.schedule.breaks.mealDescription}</span>
            </span>
            <Checkbox
              checked={hasMealBreak}
              onCheckedChange={(checked) => updateAllWorkingDays('comida', checked === true ? mealMinutes || 60 : 0)}
            />
          </label>
          {hasMealBreak ? (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={mealMinutes}
                onChange={(event) => updateAllWorkingDays('comida', Number(event.target.value) || 0)}
                className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">{copy.schedule.breaks.minutes}</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.breaks.shortTitle}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{copy.schedule.breaks.shortDescription}</span>
            </span>
            <Checkbox
              checked={hasShortBreak}
              onCheckedChange={(checked) => updateAllWorkingDays('descanso', checked === true ? breakMinutes || 15 : 0)}
            />
          </label>
          {hasShortBreak ? (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={breakMinutes}
                onChange={(event) => updateAllWorkingDays('descanso', Number(event.target.value) || 0)}
                className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">{copy.schedule.breaks.minutes}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AttendanceRulesCard({
  copy,
  toleranciaIngreso,
  onToleranciaIngresoChange,
}: {
  copy: ControlTranslations;
  toleranciaIngreso: number;
  onToleranciaIngresoChange: (value: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.attendance.eyebrow}</p>
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.attendance.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.attendance.description}
        </p>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/30">
        <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">{copy.schedule.attendance.markLateAfter}</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            max="60"
            value={toleranciaIngreso}
            onChange={(event) => onToleranciaIngresoChange(Number(event.target.value) || 0)}
            className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">{copy.schedule.attendance.minutes}</span>
        </div>
        <p className="mt-2 text-xs text-orange-700 dark:text-orange-300">
          {copy.schedule.attendance.helper}
        </p>
      </div>
    </section>
  );
}

function OpenScheduleRulesCard({ copy }: { copy: ControlTranslations }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
        <p className="font-semibold">{copy.schedule.attendance.openTitle}</p>
        <p className="mt-1 text-blue-800/80 dark:text-blue-100/75">
          {copy.schedule.attendance.openDescription}
        </p>
      </div>
    </section>
  );
}

function ScheduleReviewStep({
  copy,
  effectiveStartDate,
  horarios,
  isHorarioAbierto,
  locationRule,
  operationalSummary,
  selectedEmployeeCount,
  selectedTemplateName,
  toleranciaIngreso,
}: {
  copy: ControlTranslations;
  effectiveStartDate: string;
  horarios: HorarioDiaDraft[];
  isHorarioAbierto: boolean;
  locationRule: ScheduleLocationRule;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeCount: number;
  selectedTemplateName: string;
  toleranciaIngreso: number;
}) {
  const mealMinutes = firstSharedMinutes(horarios, 'comida');
  const breakMinutes = firstSharedMinutes(horarios, 'descanso');
  const hasNoEmployees = selectedEmployeeCount === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.review.eyebrow}</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.review.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.review.description}
        </p>
      </div>

      {hasNoEmployees ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          {copy.schedule.review.selectCollaborator}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#59C3A5]/20 bg-blue-50 p-4 text-[#59C3A5] dark:border-[#8FE0CA]/30 dark:bg-blue-950/20 dark:text-blue-100">
        <p className="text-sm font-semibold">{copy.schedule.review.willApply}</p>
        <p className="mt-2 text-lg font-semibold leading-7">{operationalSummary.compact}</p>
      </div>

      <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {operationalSummary.reviewItems.map((item) => (
          <div key={item.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{item.label}</span>
            <span className="text-sm font-medium text-slate-950 dark:text-white">{item.value}</span>
          </div>
        ))}
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.summary.labels.breaks}</span>
          <span className="text-sm font-medium text-slate-950 dark:text-white">
            {copy.schedule.summary.breakSummary(mealMinutes, breakMinutes)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {copy.schedule.summary.existingSchedulesProtected(formatEffectiveDate(effectiveStartDate))}
        {isHorarioAbierto ? ` ${copy.schedule.summary.openScheduleNote}` : ` ${copy.schedule.summary.strictScheduleNote(toleranciaIngreso)}`}
        {selectedTemplateName && selectedTemplateName !== defaultScheduleTemplateName ? ` ${copy.schedule.summary.templateNote(selectedTemplateName)}` : ''}
        {locationRule === 'open' ? ` ${copy.schedule.summary.noExactLocationNote}` : ''}
      </p>
    </section>
  );
}

function LocationRuleSelector({
  copy,
  employeeBusinessLocationSummary,
  exactLocationOptions,
  exactLocationWarning,
  locationRule,
  locationScopeFallbackMessage,
  locationScopeSummary,
  selectedEmployeeBusinessWarning,
  ubicacionSeleccionada,
  onLocationRuleChange,
  onUbicacionSeleccionadaChange,
}: {
  copy: ControlTranslations;
  employeeBusinessLocationSummary: string;
  exactLocationOptions: AttendanceControlLocation[];
  exactLocationWarning: string;
  locationRule: ScheduleLocationRule;
  locationScopeFallbackMessage: string;
  locationScopeSummary: string;
  selectedEmployeeBusinessWarning: string;
  ubicacionSeleccionada: string;
  onLocationRuleChange: (value: string) => void;
  onUbicacionSeleccionadaChange: (value: string) => void;
}) {
  const locationOptions: Array<{
    value: ScheduleLocationRule;
    title: string;
    description: string;
  }> = [
    {
      value: 'business',
      title: copy.schedule.location.options.business.title,
      description: copy.schedule.location.options.business.description,
    },
    {
      value: 'temporary',
      title: copy.schedule.location.options.temporary.title,
      description: copy.schedule.location.options.temporary.description,
    },
    {
      value: 'open',
      title: copy.schedule.location.options.open.title,
      description: copy.schedule.location.options.open.description,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.location.eyebrow}</p>
        <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
          <MapPin className="h-4 w-4 text-[#59C3A5] dark:text-[#8FE0CA]" />
          {copy.schedule.location.title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.location.description}
        </p>
      </div>

      <div className="grid gap-3">
        {locationOptions.map((option) => {
          const isSelected = locationRule === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onLocationRuleChange(option.value)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#59C3A5] bg-blue-50 ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? 'border-[#59C3A5] bg-[#59C3A5] text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
                }`}
                >
                  {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{option.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {locationRule === 'temporary' ? (
        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.schedule.location.temporaryLabel}
          </label>
          <select
            value={ubicacionSeleccionada}
            onChange={(event) => onUbicacionSeleccionadaChange(event.target.value)}
            disabled={exactLocationOptions.length === 0}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#59C3A5] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{exactLocationOptions.length === 0 ? copy.schedule.location.noActiveLocations : copy.schedule.location.selectLocation}</option>
            {exactLocationOptions.map((location) => (
              <option key={location.id} value={location.id}>{formatLocationOption(location)}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{locationScopeSummary}</p>
          {locationScopeFallbackMessage ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{locationScopeFallbackMessage}</p>
          ) : null}
          {exactLocationWarning ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{exactLocationWarning}</p>
          ) : null}
        </div>
      ) : null}

      {locationRule === 'business' ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p>{employeeBusinessLocationSummary}</p>
            {selectedEmployeeBusinessWarning ? (
              <p className="mt-1 text-amber-700 dark:text-amber-300">{selectedEmployeeBusinessWarning}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {locationRule === 'open' ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          {copy.schedule.location.openNoExactLocation}
        </div>
      ) : null}
    </section>
  );
}

function ScheduleImpactSummary({
  assignmentDateError,
  compact = false,
  copy,
  effectiveStartDate,
  operationalSummary,
  selectedEmployeeCount,
}: {
  assignmentDateError: string;
  compact?: boolean;
  copy: ControlTranslations;
  effectiveStartDate: string;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeCount: number;
}) {
  const formattedStartDate = formatEffectiveDate(effectiveStartDate);
  const hasSelectedEmployees = selectedEmployeeCount > 0;
  const startMessage = copy.schedule.impact.startMessage(formattedStartDate);
  const overrideMessage = hasSelectedEmployees
    ? copy.schedule.impact.overrideMessageSelected
    : copy.schedule.impact.overrideMessageEmpty;

  if (compact) {
    return (
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-white">{operationalSummary.compact}</p>
        <p className="mt-0.5 max-w-2xl truncate text-white/75">{assignmentDateError || `${startMessage} ${overrideMessage}`}</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
      <div className="flex items-start gap-3">
        <CalendarRange className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-[#8FE0CA]" />
        <div>
          <p className="font-semibold">{copy.schedule.impact.selectedUsers(selectedEmployeeCount)}</p>
          <p className="mt-1 text-blue-800/80 dark:text-blue-100/75">{assignmentDateError || startMessage}</p>
          {!assignmentDateError ? (
            <p className="mt-1 text-blue-800/80 dark:text-blue-100/75">{overrideMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
