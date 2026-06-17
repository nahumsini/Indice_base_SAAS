import type { DragEvent } from 'react';
import type { OpportunityStage, OpportunityStatus, SalesOpportunity } from '../../salesCrmContext';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import { opportunityDragDataType, spanishWeekdayAliases } from './prospectosStatus';

export function parseMoney(value: string) {
  const normalizedValue = value.toUpperCase();
  const numericValue = Number(value.replace(/[^0-9.]/g, '')) || 0;

  if (normalizedValue.includes('M')) {
    return numericValue * 1_000_000;
  }
  if (normalizedValue.includes('K')) {
    return numericValue * 1_000;
  }

  return numericValue;
}

export function formatCurrencyAmount(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

export function normalizeEstimatedValueInput(value: string) {
  const numericValue = value.replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = numericValue.split('.');
  return decimalParts.length > 0 ? `${integerPart}.${decimalParts.join('')}` : integerPart;
}

export function toEstimatedValueInputValue(value: string) {
  if (/[km]/i.test(value)) {
    const parsedValue = parseMoney(value);
    return parsedValue > 0 ? String(parsedValue) : '';
  }

  return normalizeEstimatedValueInput(value);
}

export function setOpportunityDragData(event: DragEvent<HTMLElement>, opportunityId: string) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(opportunityDragDataType, opportunityId);
  event.dataTransfer.setData('text/plain', opportunityId);
}

export function getOpportunityIdFromDragEvent(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.getData(opportunityDragDataType) || event.dataTransfer.getData('text/plain');
}

export function getOpportunityStatusForStage(stage: OpportunityStage, currentStatus: OpportunityStatus): OpportunityStatus {
  if (stage === 'Won' || stage === 'Lost') {
    return 'Closed';
  }
  return currentStatus === 'Closed' ? 'Active' : currentStatus;
}

export function parsePercentage(value: string) {
  return Number(value.replace('%', '')) || 0;
}

export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToInputDate(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

export function inputDateToLocalDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`);
}

export function getWeekStartInputDate(dateValue: string) {
  const date = inputDateToLocalDate(dateValue);
  const dayIndex = date.getDay();
  const daysFromMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  return addDaysToInputDate(date, -daysFromMonday);
}

export function getWeekDates(dateValue: string) {
  const weekStart = inputDateToLocalDate(getWeekStartInputDate(dateValue));
  return Array.from({ length: 7 }, (_, index) => addDaysToInputDate(weekStart, index));
}

export function formatAgendaDayLabel(dateValue: string, format: 'short' | 'long' = 'short') {
  const date = inputDateToLocalDate(dateValue);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: format === 'short' ? 'short' : 'long',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatAgendaWeekRange(weekDates: string[]) {
  const firstDate = weekDates[0];
  const lastDate = weekDates[weekDates.length - 1];
  if (!firstDate || !lastDate) {
    return '';
  }

  return `${formatAgendaDayLabel(firstDate)} - ${formatAgendaDayLabel(lastDate)}`;
}

export function getNextWeekdayInputDate(baseDate: Date, dayIndex: number) {
  const currentDayIndex = baseDate.getDay();
  const daysUntilTarget = (dayIndex - currentDayIndex + 7) % 7;
  return addDaysToInputDate(baseDate, daysUntilTarget);
}

export function getWeekdayInputDate(rawValue: string, baseDate: Date) {
  const normalizedValue = rawValue.toLowerCase();
  const matchedWeekday = spanishWeekdayAliases.find(({ aliases }) => (
    aliases.some((alias) => normalizedValue.includes(alias))
  ));

  return matchedWeekday ? getNextWeekdayInputDate(baseDate, matchedWeekday.dayIndex) : '';
}

export function parseTimeToMinutes(value: string) {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function minutesToHourLabel(totalMinutes: number) {
  const hours = Math.max(0, Math.min(23, Math.floor(totalMinutes / 60)));
  return `${String(hours).padStart(2, '0')}:00`;
}

export function getOpportunitySchedule(opportunity: SalesOpportunity) {
  const rawValue = opportunity.nextActionDate.trim();
  const today = new Date();
  const defaultDate = getTodayInputValue();

  if (!rawValue) {
    return { date: '', time: '' };
  }

  const isoDateMatch = rawValue.match(/\d{4}-\d{2}-\d{2}/);
  const timeMinutes = parseTimeToMinutes(rawValue);
  const time = timeMinutes === null
    ? ''
    : `${String(Math.floor(timeMinutes / 60)).padStart(2, '0')}:${String(timeMinutes % 60).padStart(2, '0')}`;

  if (isoDateMatch) {
    return { date: isoDateMatch[0], time };
  }
  if (rawValue.toLowerCase().includes('mañana')) {
    return { date: addDaysToInputDate(today, 1), time };
  }
  if (rawValue.toLowerCase().includes('hoy')) {
    return { date: defaultDate, time };
  }
  const weekdayDate = getWeekdayInputDate(rawValue, today);
  if (weekdayDate) {
    return { date: weekdayDate, time };
  }
  if (time) {
    return { date: '', time };
  }

  return { date: '', time: '' };
}

export function formatOpportunitySchedule(date: string, time: string) {
  if (!date && !time) {
    return '';
  }
  return [date, time].filter(Boolean).join(' ');
}
