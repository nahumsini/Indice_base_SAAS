import type {
  AttendanceControlTemplate,
  AttendanceControlTemplatePayload,
} from '../../../../api/humanResources';
import {
  defaultScheduleEndTime,
  defaultScheduleStartTime,
  isDefaultNoShiftDay,
  weekdayConfig,
} from '../constants/scheduleConstants';
import type {
  HorarioDiaDraft,
  ScheduleCopy,
  ScheduleLocationRule,
  ScheduleMode,
} from '../types/scheduleTypes';
import { dayName } from './scheduleFormatters';

export const emptyScheduleDays = (): HorarioDiaDraft[] =>
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

export const draftFromTemplate = (template: AttendanceControlTemplate | null) => {
  const scheduleMode: ScheduleMode = template?.schedule_mode === 'open' ? 'open' : 'strict';
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
    scheduleMode,
    locationRule,
    toleranciaIngreso,
    noPermitirFueraUbicacion: Boolean(template?.enforce_location),
    ubicacionSeleccionada: template?.location_id ? String(template.location_id) : '',
    horarios,
  };
};

export const normalizeTemplatePayload = (payload: AttendanceControlTemplatePayload) =>
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

export const payloadFromTemplate = (template: AttendanceControlTemplate): AttendanceControlTemplatePayload => ({
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

export const buildScheduleTemplatePayload = ({
  copy,
  horarios,
  isOpenSchedule,
  locationRule,
  templateName,
  toleranciaIngreso,
  ubicacionSeleccionada,
}: {
  copy: ScheduleCopy;
  horarios: HorarioDiaDraft[];
  isOpenSchedule: boolean;
  locationRule: ScheduleLocationRule;
  templateName: string;
  toleranciaIngreso: number;
  ubicacionSeleccionada: string;
}): AttendanceControlTemplatePayload | null => {
  const usesExactLocation = locationRule === 'temporary';
  const usesOpenRegistration = locationRule === 'open' || isOpenSchedule;

  if (usesExactLocation && !ubicacionSeleccionada) {
    return null;
  }

  const days = horarios.map((horario) => {
    const startTime = horario.entrada ? `${horario.entrada}:00` : null;
    const endTime = horario.salida ? `${horario.salida}:00` : null;

    if (!usesOpenRegistration && !horario.isRestDay) {
      if (!startTime || !endTime) {
        throw new Error(copy.errors.missingTimeForDay(dayName(horario.dia, copy)));
      }
      if (endTime === startTime) {
        throw new Error(copy.errors.equalTimeForDay(dayName(horario.dia, copy)));
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
