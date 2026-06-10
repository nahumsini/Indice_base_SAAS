import type { AgendaTaskItem } from '../agendaApi';
import { toDateInputValue } from './agendaDateUtils';

export const agendaScheduleHours = Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);

function dateFromTimelineValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleDateKeyFromValue(value: string | null | undefined) {
  const date = dateFromTimelineValue(value);
  return date ? toDateInputValue(date) : null;
}

function taskKeepsHistoricalSchedule(task: AgendaTaskItem) {
  return task.status === 'completed' || task.status === 'cancelled' || task.audited;
}

export function getTaskScheduleDateKey(task: AgendaTaskItem, todayValue?: string) {
  const agendaDateKey = scheduleDateKeyFromValue(task.agendaDate);

  if (!agendaDateKey) {
    return null;
  }

  if (todayValue && agendaDateKey < todayValue && !taskKeepsHistoricalSchedule(task)) {
    return null;
  }

  return agendaDateKey;
}

export function normalizeAgendaScheduleHour(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().slice(0, 5);
  const [rawHour, rawMinute] = normalized.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getTaskScheduleHour(task: AgendaTaskItem, todayValue?: string) {
  if (!getTaskScheduleDateKey(task, todayValue)) {
    return null;
  }

  return normalizeAgendaScheduleHour(task.agendaStartTime);
}

export function getBrowserAgendaTimeZone() {
  if (typeof Intl === 'undefined') {
    return null;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
}

export function scheduleCellKey(dateKey: string, hour: string) {
  return `${dateKey}-${hour}`;
}
