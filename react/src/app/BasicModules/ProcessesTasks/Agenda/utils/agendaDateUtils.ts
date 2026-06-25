export function isDateInputValue(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfWeek(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

export function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateInputValueToDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function getWeekDateKeys(dateKey: string) {
  const weekStart = startOfWeek(dateInputValueToDate(dateKey));
  return Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(weekStart, index)));
}

export function formatScheduleDayLabel(dateKey: string, format: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: format === 'short' ? 'short' : 'long',
    day: 'numeric',
    month: 'short',
  }).format(dateInputValueToDate(dateKey));
}

export function formatScheduleWeekRange(dateKeys: string[]) {
  const firstDate = dateKeys[0];
  const lastDate = dateKeys[dateKeys.length - 1];

  if (!firstDate || !lastDate) {
    return '';
  }

  return `${formatScheduleDayLabel(firstDate)} - ${formatScheduleDayLabel(lastDate)}`;
}

export function normalizeScheduleHourInput(value: string) {
  if (!value) {
    return null;
  }

  const [rawHour, rawMinute = '00'] = value.split(':');
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
