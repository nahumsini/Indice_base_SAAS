import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { X, Search, Clock, MapPin } from 'lucide-react';
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
import { useHRLanguage } from '../../HRLanguage';

interface HorarioDiaDraft {
  dayOfWeek: number;
  dia: string;
  entrada: string;
  salida: string;
  comida: number;
  descanso: number;
  isRestDay: boolean;
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
const scheduleSaveMinimumLoadingMs = 2000;

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
    isRestDay: false,
  }));

const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);

const draftFromTemplate = (template: AttendanceControlTemplate | null) => {
  const modoHorario: 'Horario estricto' | 'Horario abierto' =
    template?.schedule_mode === 'open' ? 'Horario abierto' : 'Horario estricto';
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
      isRestDay: day?.is_rest_day ?? false,
    };
  });

  return {
    modoHorario,
    toleranciaIngreso,
    noPermitirDespuesTolerancia: Boolean(template?.block_after_grace_period),
    noPermitirFueraUbicacion: Boolean(template?.enforce_location),
    ubicacionSeleccionada: template?.location_id ? String(template.location_id) : '',
    horarios,
  };
};

const normalizeTemplatePayload = (payload: AttendanceControlTemplatePayload) =>
  JSON.stringify({
    schedule_mode: payload.schedule_mode,
    block_after_grace_period: payload.block_after_grace_period,
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
  block_after_grace_period: Boolean(template.block_after_grace_period),
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

export function ScheduleModal({
  isOpen,
  onClose,
  templates,
  locations,
  selectedTemplateId,
  effectiveStartDate,
  onApplied,
}: ScheduleModalProps) {
  const copy = useHRLanguage().attendanceControl;
  const [searchQuery, setSearchQuery] = useState('');
  const [unidadFilter, setUnidadFilter] = useState('');
  const [negocioFilter, setNegocioFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedUnidadFilter, setAppliedUnidadFilter] = useState('');
  const [appliedNegocioFilter, setAppliedNegocioFilter] = useState('');
  const [appliedAvailableOnly, setAppliedAvailableOnly] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [candidateAssignments, setCandidateAssignments] = useState<AttendanceControlAssignment[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<BackendUnit[]>([]);
  const [organizationBusinesses, setOrganizationBusinesses] = useState<BackendBusiness[]>([]);
  const [candidateTotalCount, setCandidateTotalCount] = useState(0);
  const [candidateTotalPages, setCandidateTotalPages] = useState(1);
  const [candidateAvailableCount, setCandidateAvailableCount] = useState(0);
  const [candidateBusyCount, setCandidateBusyCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [modoHorario, setModoHorario] = useState<'Horario estricto' | 'Horario abierto'>('Horario estricto');
  const [toleranciaIngreso, setToleranciaIngreso] = useState(10);
  const [noPermitirDespuesTolerancia, setNoPermitirDespuesTolerancia] = useState(false);
  const [noPermitirFueraUbicacion, setNoPermitirFueraUbicacion] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [horarios, setHorarios] = useState<HorarioDiaDraft[]>(emptyScheduleDays());
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const leftPanelScrollRef = useRef<HTMLDivElement>(null);
  const rightPanelScrollRef = useRef<HTMLDivElement>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );
  const assignmentEffectiveStartDate = effectiveStartDate?.trim() || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const templateDraft = draftFromTemplate(null);
    setSearchQuery('');
    setUnidadFilter('');
    setNegocioFilter('');
    setAvailableOnly(false);
    setAppliedSearchQuery('');
    setAppliedUnidadFilter('');
    setAppliedNegocioFilter('');
    setAppliedAvailableOnly(false);
    setSelectedEmployeeIds([]);
    setCandidateAssignments([]);
    setOrganizationUnits([]);
    setOrganizationBusinesses([]);
    setCandidateTotalCount(0);
    setCandidateTotalPages(1);
    setCandidateAvailableCount(0);
    setCandidateBusyCount(0);
    setCurrentPage(1);
    setSelectedTemplateName(defaultScheduleTemplateName);
    setModoHorario(templateDraft.modoHorario);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setNoPermitirDespuesTolerancia(templateDraft.noPermitirDespuesTolerancia);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
    setErrorMessage('');
    setFailureToastMessage('');
  }, [isOpen]);

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

        const message = error instanceof Error ? error.message : 'Could not load organization units.';
        setOrganizationUnits([]);
        setOrganizationBusinesses([]);
        setErrorMessage(message);
        showFailureToast(message);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
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
      available_only: appliedAvailableOnly ? 1 : undefined,
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

        const message = error instanceof Error ? error.message : 'Could not load schedule candidates.';
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
    appliedAvailableOnly,
    appliedSearchQuery,
    appliedUnidadFilter,
    assignmentEffectiveStartDate,
    currentPage,
    isOpen,
  ]);

  const unitOptions = useMemo(
    () => organizationUnits.map((option) => [String(option.id), option.name || 'Unit'] as const),
    [organizationUnits],
  );

  const businessOptions = useMemo(
    () => organizationBusinesses
      .filter((option) => !unidadFilter || String(getBusinessUnitId(option) ?? '') === unidadFilter)
      .map((option) => [String(option.id), option.name || 'Business'] as const),
    [organizationBusinesses, unidadFilter],
  );

  const totalPages = Math.max(1, candidateTotalPages);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * employeesPerPage;
  const paginatedAssignments = candidateAssignments;
  const visibleAssignableEmployeeIds = paginatedAssignments
    .filter((assignment) => assignment.can_assign_schedule !== false)
    .map((assignment) => assignment.employee_id);
  const allVisibleSelected = visibleAssignableEmployeeIds.length > 0
    && visibleAssignableEmployeeIds.every((employeeId) => selectedEmployeeIds.includes(employeeId));
  const paginationStart = candidateTotalCount === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = candidateTotalCount === 0 ? 0 : pageStartIndex + paginatedAssignments.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedNegocioFilter, appliedSearchQuery, appliedUnidadFilter, isOpen]);

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
  const isEmployeeAssignable = (employeeId: number) =>
    candidateAssignments.find((assignment) => assignment.employee_id === employeeId)?.can_assign_schedule !== false;

  const toggleEmployee = (employeeId: number) => {
    if (!isEmployeeAssignable(employeeId)) {
      return;
    }

    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  const setEmployeeSelection = (employeeId: number, shouldSelect: boolean) => {
    if (shouldSelect && !isEmployeeAssignable(employeeId)) {
      return;
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
      setSelectedEmployeeIds((current) => current.filter((id) => !visibleAssignableEmployeeIds.includes(id)));
      return;
    }
    setSelectedEmployeeIds((current) => Array.from(new Set([...current, ...visibleAssignableEmployeeIds])));
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

  const handleUnitFilterChange = (value: string) => {
    const nextBusinessFilter = resolveBusinessFilterForUnit(negocioFilter, value);
    setUnidadFilter(value);
    setNegocioFilter(nextBusinessFilter);
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(value);
    setAppliedNegocioFilter(nextBusinessFilter);
    setAppliedAvailableOnly(availableOnly);
    setCurrentPage(1);
  };

  const handleBusinessFilterChange = (value: string) => {
    const selectedBusiness = organizationBusinesses.find((option) => String(option.id) === value);
    const selectedBusinessUnitId = selectedBusiness ? getBusinessUnitId(selectedBusiness) : null;
    const nextUnitFilter = value && !unidadFilter && selectedBusinessUnitId
      ? String(selectedBusinessUnitId)
      : unidadFilter;

    setUnidadFilter(nextUnitFilter);
    setNegocioFilter(value);
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(nextUnitFilter);
    setAppliedNegocioFilter(value);
    setAppliedAvailableOnly(availableOnly);
    setCurrentPage(1);
  };

  const handleAvailableOnlyChange = (checked: boolean) => {
    const nextBusinessFilter = resolveBusinessFilterForUnit(negocioFilter, unidadFilter);
    setAvailableOnly(checked);
    setNegocioFilter(nextBusinessFilter);
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(unidadFilter);
    setAppliedNegocioFilter(nextBusinessFilter);
    setAppliedAvailableOnly(checked);
    setCurrentPage(1);
  };

  const applySearchFilters = () => {
    const nextBusinessFilter = resolveBusinessFilterForUnit(negocioFilter, unidadFilter);
    setNegocioFilter(nextBusinessFilter);
    setCurrentPage(1);
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(unidadFilter);
    setAppliedNegocioFilter(nextBusinessFilter);
    setAppliedAvailableOnly(availableOnly);
  };

  const limpiarHorarios = () => {
    const templateDraft = draftFromTemplate(null);
    setSelectedTemplateName(defaultScheduleTemplateName);
    setModoHorario(templateDraft.modoHorario);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setNoPermitirDespuesTolerancia(templateDraft.noPermitirDespuesTolerancia);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
    setErrorMessage('');
    window.requestAnimationFrame(() => {
      rightPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const buildTemplatePayload = (): AttendanceControlTemplatePayload | null => {
    if (selectedEmployeeIds.length === 0) {
      const message = 'Select at least one employee.';
      setErrorMessage(message);
      showFailureToast(message);
      return null;
    }

    if (noPermitirFueraUbicacion && !ubicacionSeleccionada) {
      const message = 'Select the allowed location for this schedule.';
      setErrorMessage(message);
      showFailureToast(message);
      return null;
    }

    const days = horarios.map((horario) => {
      const startTime = horario.entrada ? `${horario.entrada}:00` : null;
      const endTime = horario.salida ? `${horario.salida}:00` : null;

      if (!isHorarioAbierto && !horario.isRestDay) {
        if (!startTime || !endTime) {
          throw new Error(`Provide entry and exit times for ${horario.dia}.`);
        }
        if (endTime <= startTime) {
          throw new Error(`Exit time must be after entry time for ${horario.dia}.`);
        }
      }

      return {
        day_of_week: horario.dayOfWeek,
        start_time: isHorarioAbierto || horario.isRestDay ? null : startTime,
        end_time: isHorarioAbierto || horario.isRestDay ? null : endTime,
        meal_minutes: horario.comida,
        rest_minutes: horario.descanso,
        late_after_minutes: isHorarioAbierto ? 0 : toleranciaIngreso,
        is_rest_day: horario.isRestDay,
      };
    });

    return {
      name: selectedTemplateName.trim() || defaultScheduleTemplateName,
      status: 'active',
      schedule_mode: isHorarioAbierto ? 'open' : 'strict',
      block_after_grace_period: !isHorarioAbierto && noPermitirDespuesTolerancia,
      enforce_location: !isHorarioAbierto && noPermitirFueraUbicacion,
      location_id: !isHorarioAbierto && noPermitirFueraUbicacion && ubicacionSeleccionada ? Number(ubicacionSeleccionada) : null,
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
        const payload = buildTemplatePayload();
        if (!payload) {
          return null;
        }

        const normalizedPayload = normalizeTemplatePayload(payload);
        const sameAsSelectedTemplate = selectedTemplate
          ? normalizedPayload === normalizeTemplatePayload(payloadFromTemplate(selectedTemplate))
          : false;
        const reusableTemplate = sameAsSelectedTemplate
          ? selectedTemplate
          : templates.find((template) =>
            template.status !== 'inactive' &&
              normalizedPayload === normalizeTemplatePayload(payloadFromTemplate(template)),
          ) ?? null;

        let templateId = reusableTemplate?.id ?? null;
        let appliedTemplateName = reusableTemplate?.name ?? payload.name;
        if (!templateId) {
          const templateName = templates.some((template) => template.name === payload.name)
            ? `${payload.name} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
            : payload.name;
          const response = await humanResourcesApi.createAttendanceControlTemplate({
            ...payload,
            name: templateName,
          });
          templateId = response.template.id;
          appliedTemplateName = response.template.name;
        }

        await humanResourcesApi.bulkAssignAttendanceSchedule({
          employee_ids: selectedEmployeeIds,
          template_id: templateId,
          effective_start_date: assignmentEffectiveStartDate,
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
      const message = error instanceof Error ? error.message : 'The schedule could not be applied.';
      setErrorMessage(message);
      showFailureToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title="Applying schedule"
        description="Saving the schedule and assigning it to the selected employees."
        className="z-[95]"
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
        className="z-[100]"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="my-8 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white text-gray-900 shadow-xl dark:border dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-[#143675] bg-[#143675] p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">{copy.labels.setSchedules}</h2>
          </div>
          <button onClick={onClose} className="text-white transition-colors hover:text-blue-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <section
          aria-label="Find employees for the schedule"
          className="border-b border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/70"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="xl:min-w-0 xl:flex-[1.8]">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Search employee</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name or code"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="xl:w-64 xl:flex-none">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
              <select
                value={unidadFilter}
                onChange={(event) => handleUnitFilterChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All</option>
                {unitOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="xl:w-64 xl:flex-none">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Business</label>
              <select
                value={negocioFilter}
                onChange={(event) => handleBusinessFilterChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All</option>
                {businessOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950 xl:flex-none">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule-available-only"
                  checked={availableOnly}
                  onCheckedChange={(checked) => handleAvailableOnlyChange(checked === true)}
                />
                <label htmlFor="schedule-available-only" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available only
                </label>
              </div>
            </div>
            <div className="xl:flex-none">
              <Button
                className="w-full gap-2 whitespace-nowrap bg-[#143675] px-4 text-white hover:bg-[#0f2855] xl:w-auto"
                type="button"
                onClick={applySearchFilters}
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-gray-950">
          {errorMessage ? (
            <div className="px-6 pt-6">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                {errorMessage}
              </div>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:divide-x lg:divide-gray-200 lg:overflow-hidden dark:lg:divide-gray-700">
            <section
              aria-labelledby="available-employees-heading"
              className="min-h-0 bg-white dark:bg-gray-950"
            >
              <div ref={leftPanelScrollRef} className="p-6 lg:h-full lg:overflow-y-auto">
	              <div className="mb-4 flex items-center justify-between gap-3">
	                <h3 id="available-employees-heading" className="font-semibold text-gray-900 dark:text-white">
                    Employees
                  </h3>
	                <div className="flex flex-wrap justify-end gap-2 text-sm text-gray-500 dark:text-gray-400">
	                  <span>Available to schedule: <span className="font-medium text-gray-900 dark:text-white">{candidateAvailableCount}</span></span>
	                  <span>Selected: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedEmployeeIds.length}</span></span>
	                </div>
	              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
	                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
	                    <tr>
	                      <th className="w-10 px-3 py-2 text-left">
	                        <Checkbox
                            checked={allVisibleSelected}
                            disabled={isLoadingCandidates || visibleAssignableEmployeeIds.length === 0}
                            onCheckedChange={toggleAll}
                          />
	                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Dept</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Schedule status</th>
                    </tr>
	                  </thead>
	                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
	                    {isLoadingCandidates ? (
	                      <tr>
	                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
	                          Loading employees...
	                        </td>
	                      </tr>
	                    ) : candidateTotalCount === 0 ? (
	                      <tr>
	                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
	                          No employees match these filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedAssignments.map((assignment) => {
                        const isSelected = selectedEmployeeIds.includes(assignment.employee_id);
                        const canAssign = assignment.can_assign_schedule !== false;
                        const statusText = canAssign ? 'Available' : assignment.schedule_busy_reason || 'Already assigned';

                        return (
                        <tr
                          key={assignment.employee_id}
                          className={`${
                            canAssign ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'bg-gray-50/70 text-gray-500 dark:bg-gray-900/30'
                          } ${isSelected ? 'bg-blue-50/70 dark:bg-blue-900/10' : ''}`}
                          onClick={() => toggleEmployee(assignment.employee_id)}
                        >
                          <td className="px-3 py-3">
                            <Checkbox
                              checked={isSelected}
                              disabled={!canAssign}
                              onCheckedChange={(checked) => setEmployeeSelection(assignment.employee_id, checked === true)}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {assignment.employee_number || assignment.employee_id}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                            {assignment.employee_name}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {assignment.department || assignment.position_title || '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                canAssign
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                              }`}
                            >
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
	                </table>
	              </div>
	              {!isLoadingCandidates && candidateTotalCount > 0 ? (
	                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
	                  <p className="text-sm text-gray-500 dark:text-gray-400">
	                    Showing {paginationStart}-{paginationEnd} of {candidateTotalCount} employees
	                  </p>
	                  {candidateBusyCount > 0 ? (
	                    <p className="text-xs text-gray-500 dark:text-gray-400">
	                      {appliedAvailableOnly
                          ? `${candidateBusyCount} unavailable employees are hidden.`
                          : `${candidateBusyCount} employees are already scheduled or locked for this date.`}
	                    </p>
	                  ) : null}
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Page {safeCurrentPage} of {totalPages}
                    </p>
                    <Pagination className="mx-0 w-auto justify-start md:justify-end">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              changePage(safeCurrentPage - 1);
                            }}
                            aria-disabled={safeCurrentPage === 1}
                            className={safeCurrentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
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
                                isActive={item === safeCurrentPage}
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
                              changePage(safeCurrentPage + 1);
                            }}
                            aria-disabled={safeCurrentPage === totalPages}
                            className={safeCurrentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              ) : null}
              </div>
            </section>

            <section
              aria-labelledby="schedule-details-heading"
              className="min-h-0 bg-white dark:bg-gray-950"
            >
              <div ref={rightPanelScrollRef} className="p-6 lg:h-full lg:overflow-y-auto">
              <div className="mb-4">
                <h3 id="schedule-details-heading" className="font-semibold text-gray-900 dark:text-white">
                  Schedule details
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This schedule will be applied to every selected employee starting on {assignmentEffectiveStartDate}.
                </p>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                  {selectedTemplateName}
                </span>
                <Button variant="outline" size="sm" onClick={limpiarHorarios} disabled={isSubmitting}>
                  Reset schedule
                </Button>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule type</label>
                <select
                  value={modoHorario}
                  onChange={(event) => setModoHorario(event.target.value as 'Horario estricto' | 'Horario abierto')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Horario estricto">Strict schedule</option>
                  <option value="Horario abierto">Open schedule</option>
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Open: no fixed start or end time. Strict: employees follow the times below.
                </p>
              </div>

              {modoHorario === 'Horario estricto' ? (
                <>
                  <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">⏱ Entry tolerance</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={toleranciaIngreso}
                        onChange={(event) => setToleranciaIngreso(Number(event.target.value) || 0)}
                        className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-900 focus:border-orange-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                    </div>
                    <p className="mt-2 text-xs text-orange-700 dark:text-orange-300">
                      Employees can clock in up to {toleranciaIngreso} minutes late without penalty.
                    </p>
                  </div>

                  <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/20">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={noPermitirDespuesTolerancia}
                        onCheckedChange={(checked) => setNoPermitirDespuesTolerancia(checked === true)}
                        id="grace-period-block"
                      />
                      <div>
                        <label htmlFor="grace-period-block" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                          Do not allow check-in after tolerance time
                        </label>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          The check-in will be blocked after the tolerance time expires.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/20">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={noPermitirFueraUbicacion}
                        onCheckedChange={(checked) => setNoPermitirFueraUbicacion(checked === true)}
                        id="location-restriction"
                      />
                      <div className="flex-1">
                        <label htmlFor="location-restriction" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                          Do not allow check-in outside the selected location
                        </label>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Employees can only clock in from the selected location.
                        </p>
                        {noPermitirFueraUbicacion ? (
                          <div className="mt-3">
                            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                              <MapPin className="mr-1 inline h-3 w-3" />
                              Allowed location
                            </label>
                            <select
                              value={ubicacionSeleccionada}
                              onChange={(event) => setUbicacionSeleccionada(event.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            >
                              <option value="">Select location</option>
                              {locations.filter((location) => location.status !== 'inactive').map((location) => (
                                <option key={location.id} value={location.id}>{location.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Open schedule enabled</p>
                      <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                        No fixed start or end time is stored. Attendance still follows same-day and location rules.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isHorarioAbierto ? (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Working days</p>
                  </div>
                  <div className="grid gap-2 bg-white p-4 sm:grid-cols-2 dark:bg-gray-950">
                    {horarios.map((horario, index) => {
                      const isWorkingDay = !horario.isRestDay;

                      return (
                        <div
                          key={horario.dayOfWeek}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                            isWorkingDay
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isWorkingDay}
                              onCheckedChange={(checked) => updateWorkingDay(index, checked === true)}
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{horario.dia}</span>
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              isWorkingDay ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {isWorkingDay ? 'Working' : 'Rest'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Work day</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Start</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">End</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Meal (min)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Break (min)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {horarios.map((horario, index) => (
                          <tr key={horario.dayOfWeek}>
                            <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!horario.isRestDay}
                                  onCheckedChange={(checked) => updateWorkingDay(index, checked === true)}
                                />
                                {horario.dia}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="time"
                                value={horario.entrada}
                                onChange={(event) => updateHorario(index, 'entrada', event.target.value)}
                                disabled={horario.isRestDay}
                                className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="time"
                                value={horario.salida}
                                onChange={(event) => updateHorario(index, 'salida', event.target.value)}
                                disabled={horario.isRestDay}
                                className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                value={horario.comida}
                                onChange={(event) => updateHorario(index, 'comida', Number(event.target.value) || 0)}
                                className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-center text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                value={horario.descanso}
                                onChange={(event) => updateHorario(index, 'descanso', Number(event.target.value) || 0)}
                                className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-center text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/70">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void aplicarHorarios()}
            className="gap-2 bg-[#143675] text-white hover:bg-[#0f2855]"
            disabled={selectedEmployeeIds.length === 0 || isSubmitting}
            title={selectedEmployeeIds.length === 0 ? 'Select at least one employee first.' : undefined}
          >
            Apply schedule
          </Button>
        </div>
        </div>
      </div>
    </>
  );
}
