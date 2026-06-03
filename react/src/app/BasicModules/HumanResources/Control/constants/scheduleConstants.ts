import type { ScheduleBuilderStep } from '../types/scheduleTypes';

export const weekdayConfig = [
  { dayOfWeek: 1, dia: 'Mon' },
  { dayOfWeek: 2, dia: 'Tue' },
  { dayOfWeek: 3, dia: 'Wed' },
  { dayOfWeek: 4, dia: 'Thu' },
  { dayOfWeek: 5, dia: 'Fri' },
  { dayOfWeek: 6, dia: 'Sat' },
  { dayOfWeek: 7, dia: 'Sun' },
] as const;

export const employeesPerPage = 10;
export const defaultScheduleTemplateName = 'Default Schedule';
export const defaultScheduleStartTime = '08:00';
export const defaultScheduleEndTime = '16:00';
export const permanentScheduleEndDate = '9999-12-31';
export const scheduleSaveMinimumLoadingMs = 2000;
export const scheduleBuilderStepIds: ScheduleBuilderStep[] = ['setup', 'workdays', 'rules', 'review'];

export const isDefaultNoShiftDay = (dayOfWeek: number) => dayOfWeek === 6 || dayOfWeek === 7;
