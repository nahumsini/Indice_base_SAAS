import { dateInput, dateScope } from './dateScope';
export type CalendarPeriod = 'day' | 'week' | 'month';
export function calendarPeriod(anchor: string, period: CalendarPeriod) {
  dateScope(anchor, anchor);
  const from = new Date(`${anchor}T12:00:00`), to = new Date(from);
  if (period === 'week') { from.setDate(from.getDate() - (from.getDay() + 6) % 7); to.setTime(from.getTime()); to.setDate(to.getDate() + 6); }
  if (period === 'month') { from.setDate(1); to.setMonth(to.getMonth() + 1, 0); }
  return { from: dateInput(from), to: dateInput(to) };
}
export function calendarDates(from: string, to: string): Date[] {
  dateScope(from, to);
  const values: Date[] = [], date = new Date(`${from}T12:00:00`), end = new Date(`${to}T12:00:00`);
  while (date <= end) { if (values.length >= 42) throw new Error('Calendar range exceeds 42 days'); values.push(new Date(date)); date.setDate(date.getDate() + 1); }
  return values;
}

/** Use the displayed calendar dates without depending on Intl.formatRange support. */
export function calendarRangeLabel(from: string, to: string, locale: string): string {
  dateScope(from, to);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const start = formatter.format(new Date(`${from}T12:00:00`));
  return from === to ? start : `${start} — ${formatter.format(new Date(`${to}T12:00:00`))}`;
}
