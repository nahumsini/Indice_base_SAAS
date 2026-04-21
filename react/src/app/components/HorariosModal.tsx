import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { X, Search, Clock, AlertCircle, MapPin } from 'lucide-react';
import { LoadingBarOverlay, runWithMinimumDuration } from './LoadingBarOverlay';
import {
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlLocation,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
} from '../api/humanResources';

interface HorarioDiaDraft {
  dayOfWeek: number;
  dia: string;
  entrada: string;
  salida: string;
  comida: number;
  descanso: number;
  isRestDay: boolean;
}

interface HorariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AttendanceControlAssignment[];
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

const emptyScheduleDays = (): HorarioDiaDraft[] =>
  weekdayConfig.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    dia: day.dia,
    entrada: '',
    salida: '',
    comida: 0,
    descanso: 0,
    isRestDay: day.dayOfWeek >= 6,
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
      entrada: timeToInput(day?.start_time),
      salida: timeToInput(day?.end_time),
      comida: day?.meal_minutes ?? 0,
      descanso: day?.rest_minutes ?? 0,
      isRestDay: day?.is_rest_day ?? (config.dayOfWeek >= 6),
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

export function HorariosModal({
  isOpen,
  onClose,
  assignments,
  templates,
  locations,
  selectedTemplateId,
  effectiveStartDate,
  onApplied,
}: HorariosModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unidadFilter, setUnidadFilter] = useState('');
  const [negocioFilter, setNegocioFilter] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedUnidadFilter, setAppliedUnidadFilter] = useState('');
  const [appliedNegocioFilter, setAppliedNegocioFilter] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [modoHorario, setModoHorario] = useState<'Horario estricto' | 'Horario abierto'>('Horario estricto');
  const [toleranciaIngreso, setToleranciaIngreso] = useState(10);
  const [noPermitirDespuesTolerancia, setNoPermitirDespuesTolerancia] = useState(false);
  const [noPermitirFueraUbicacion, setNoPermitirFueraUbicacion] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [horarios, setHorarios] = useState<HorarioDiaDraft[]>(emptyScheduleDays());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates],
  );
  const assignmentEffectiveStartDate = effectiveStartDate?.trim() || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const templateDraft = draftFromTemplate(selectedTemplate);
    setSearchQuery('');
    setUnidadFilter('');
    setNegocioFilter('');
    setAppliedSearchQuery('');
    setAppliedUnidadFilter('');
    setAppliedNegocioFilter('');
    setSelectedEmployeeIds([]);
    setSelectedTemplateName(selectedTemplate?.name ?? 'Custom schedule');
    setModoHorario(templateDraft.modoHorario);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setNoPermitirDespuesTolerancia(templateDraft.noPermitirDespuesTolerancia);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
    setErrorMessage('');
  }, [isOpen, selectedTemplate]);

  const unitOptions = useMemo(
    () => Array.from(new Map(
      assignments
        .filter((assignment) => assignment.unit_id)
        .map((assignment) => [String(assignment.unit_id), assignment.unit_name || 'Unit']),
    ).entries()),
    [assignments],
  );

  const businessOptions = useMemo(
    () => Array.from(new Map(
      assignments
        .filter((assignment) => assignment.business_id)
        .map((assignment) => [String(assignment.business_id), assignment.business_name || 'Business']),
    ).entries()),
    [assignments],
  );

  const filteredAssignments = useMemo(() => assignments.filter((assignment) => {
    const normalizedSearch = appliedSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      assignment.employee_name.toLowerCase().includes(normalizedSearch) ||
      (assignment.employee_number ?? '').toLowerCase().includes(normalizedSearch);
    const matchesUnit = !appliedUnidadFilter || String(assignment.unit_id ?? '') === appliedUnidadFilter;
    const matchesBusiness = !appliedNegocioFilter || String(assignment.business_id ?? '') === appliedNegocioFilter;
    return matchesSearch && matchesUnit && matchesBusiness;
  }), [appliedNegocioFilter, appliedSearchQuery, appliedUnidadFilter, assignments]);

  const allVisibleSelected = filteredAssignments.length > 0
    && filteredAssignments.every((assignment) => selectedEmployeeIds.includes(assignment.employee_id));

  if (!isOpen) return null;

  const isHorarioAbierto = modoHorario === 'Horario abierto';

  const toggleEmployee = (employeeId: number) => {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  const setEmployeeSelection = (employeeId: number, shouldSelect: boolean) => {
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
      setSelectedEmployeeIds((current) => current.filter((id) => !filteredAssignments.some((assignment) => assignment.employee_id === id)));
      return;
    }
    setSelectedEmployeeIds((current) => Array.from(new Set([...current, ...filteredAssignments.map((assignment) => assignment.employee_id)])));
  };

  const updateHorario = (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => {
    setHorarios((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value } : item));
  };

  const applySearchFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(unidadFilter);
    setAppliedNegocioFilter(negocioFilter);
  };

  const limpiarHorarios = () => {
    setHorarios(emptyScheduleDays());
    setToleranciaIngreso(10);
    setNoPermitirDespuesTolerancia(false);
    setNoPermitirFueraUbicacion(false);
    setUbicacionSeleccionada('');
  };

  const buildTemplatePayload = (): AttendanceControlTemplatePayload | null => {
    if (selectedEmployeeIds.length === 0) {
      setErrorMessage('Select at least one collaborator.');
      return null;
    }

    if (noPermitirFueraUbicacion && !ubicacionSeleccionada) {
      setErrorMessage('Select the allowed location for this schedule.');
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
      name: selectedTemplateName.trim() || selectedTemplate?.name || 'Custom schedule',
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

    try {
      const appliedResult = await runWithMinimumDuration((async () => {
        const payload = buildTemplatePayload();
        if (!payload) {
          return null;
        }

        const sameAsSelectedTemplate = selectedTemplate
          ? normalizeTemplatePayload(payload) === normalizeTemplatePayload({
              name: selectedTemplate.name,
              status: selectedTemplate.status === 'inactive' ? 'inactive' : 'active',
              schedule_mode: selectedTemplate.schedule_mode === 'open' ? 'open' : 'strict',
              block_after_grace_period: Boolean(selectedTemplate.block_after_grace_period),
              enforce_location: Boolean(selectedTemplate.enforce_location),
              location_id: selectedTemplate.location_id ?? null,
              days: selectedTemplate.days.map((day) => ({
                day_of_week: day.day_of_week,
                start_time: day.start_time ?? null,
                end_time: day.end_time ?? null,
                meal_minutes: day.meal_minutes ?? 0,
                rest_minutes: day.rest_minutes ?? 0,
                late_after_minutes: day.late_after_minutes,
                is_rest_day: day.is_rest_day,
              })),
            })
          : false;

        let templateId = selectedTemplate?.id ?? null;
        let appliedTemplateName = selectedTemplate?.name ?? payload.name;
        if (!templateId || !sameAsSelectedTemplate) {
          const templateName = sameAsSelectedTemplate
            ? payload.name
            : `${payload.name} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
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
      })(), 850);

      if (!appliedResult) {
        return;
      }

      onClose();
      await Promise.resolve(onApplied?.(appliedResult));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The schedule could not be applied.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title="Applying schedule"
        description="Saving the schedule configuration and assigning it to the selected collaborators."
        className="z-[95]"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="my-8 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-[#143675] bg-[#143675] p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Set schedules</h2>
          </div>
          <button onClick={onClose} className="text-white transition-colors hover:text-blue-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="xl:min-w-0 xl:flex-[1.8]">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Look for</label>
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
                onChange={(event) => setUnidadFilter(event.target.value)}
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
                onChange={(event) => setNegocioFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All</option>
                {businessOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="xl:flex-none">
              <Button
                className="w-full gap-2 whitespace-nowrap bg-[#143675] px-4 text-white hover:bg-[#0f2855] xl:w-auto"
                type="button"
                onClick={applySearchFilters}
              >
                <Search className="h-4 w-4" />
                Look for
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {errorMessage ? (
            <div className="px-6 pt-6">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                {errorMessage}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 divide-x divide-gray-200 dark:divide-gray-700 lg:grid-cols-2">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Collaborators</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Selected: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedEmployeeIds.length}</span>
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                    <tr>
                      <th className="w-10 px-3 py-2 text-left">
                        <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Contributor</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Dept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No collaborators available.
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((assignment) => {
                        const isSelected = selectedEmployeeIds.includes(assignment.employee_id);

                        return (
                        <tr
                          key={assignment.employee_id}
                          className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isSelected ? 'bg-blue-50/70 dark:bg-blue-900/10' : ''}`}
                          onClick={() => toggleEmployee(assignment.employee_id)}
                        >
                          <td className="px-3 py-3">
                            <Checkbox
                              checked={isSelected}
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
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Schedule to be applied</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  It will be applied equally to all those selected starting on {assignmentEffectiveStartDate}.
                </p>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                  {selectedTemplateName}
                </span>
                <Button variant="outline" size="sm" onClick={limpiarHorarios} disabled={isSubmitting}>
                  × Clean
                </Button>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Way</label>
                <select
                  value={modoHorario}
                  onChange={(event) => setModoHorario(event.target.value as 'Horario estricto' | 'Horario abierto')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Horario estricto">Strict schedule</option>
                  <option value="Horario abierto">Open schedule</option>
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Open: mark anytime. Strict: only during business hours.
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
                          Do not allow registration after the grace period has expired
                        </label>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          The record will be blocked if the configured tolerance time expires.
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
                          Do not allow registration outside of the selected location
                        </label>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Registration will only be possible from the configured location.
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
                        Collaborators will be able to clock in at any time. Specific entry and exit windows are optional.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Day</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Entry</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Exit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Meal (min)</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Rest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                      {horarios.map((horario, index) => (
                        <tr key={horario.dayOfWeek}>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={horario.isRestDay}
                                onCheckedChange={(checked) => updateHorario(index, 'isRestDay', checked === true)}
                              />
                              {horario.dia}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="time"
                              value={horario.entrada}
                              onChange={(event) => updateHorario(index, 'entrada', event.target.value)}
                              disabled={isHorarioAbierto || horario.isRestDay}
                              className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="time"
                              value={horario.salida}
                              onChange={(event) => updateHorario(index, 'salida', event.target.value)}
                              disabled={isHorarioAbierto || horario.isRestDay}
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
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-700/50">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void aplicarHorarios()}
            className="gap-2 bg-[#143675] text-white hover:bg-[#0f2855]"
            disabled={selectedEmployeeIds.length === 0 || isSubmitting}
            title={selectedEmployeeIds.length === 0 ? 'Select at least one collaborator first.' : undefined}
          >
            Apply to selected positions
          </Button>
        </div>
        </div>
      </div>
    </>
  );
}
