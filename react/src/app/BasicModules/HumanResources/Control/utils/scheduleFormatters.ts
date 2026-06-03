import type { BackendBusiness } from '../../../../api/dashboard';
import type { AttendanceControlLocation } from '../../../../api/humanResources';
import {
  defaultScheduleTemplateName,
  scheduleBuilderStepIds,
} from '../constants/scheduleConstants';
import type {
  HorarioDiaDraft,
  OperationalScheduleSummary,
  ScheduleCopy,
  ScheduleLocationRule,
  WeekdayKey,
} from '../types/scheduleTypes';
import { formatEffectiveDate } from './scheduleDates';

export const getBusinessUnitId = (business: BackendBusiness) => business.unit_id ?? business.unitId ?? null;

export const toPositiveNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const uniquePositiveNumbers = (values: Array<number | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is number => typeof value === 'number' && value > 0)));

export const formatPreviewList = (values: string[], fallback: string, copy: ScheduleCopy) => {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return fallback;
  }
  if (cleaned.length <= 2) {
    return cleaned.join(', ');
  }
  return `${cleaned.slice(0, 2).join(', ')} ${copy.moreItems(cleaned.length - 2)}`;
};

export const formatLocationOption = (location: AttendanceControlLocation) => {
  const scope = location.business_name || location.unit_name || '';
  return scope ? `${location.name} - ${scope}` : location.name;
};

export const getScheduleBuilderSteps = (copy: ScheduleCopy) =>
  scheduleBuilderStepIds.map((id) => ({
    id,
    label: copy.builder.steps[id].label,
    description: copy.builder.steps[id].description,
  }));

export const dayName = (shortName: string, copy: ScheduleCopy) =>
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

export const firstSharedMinutes = (horarios: HorarioDiaDraft[], field: 'comida' | 'descanso') =>
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

export const buildOperationalScheduleSummary = ({
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
