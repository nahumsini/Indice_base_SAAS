import type { IncidentReportPeriod } from '../types/incidentReport';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const parsed = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && iso(date) === value ? date : null;
};

export function incidentPeriodRange(period: IncidentReportPeriod, anchor: string) {
  const date = parsed(anchor);
  if (!date) return { from: '', to: '' };
  const year = date.getUTCFullYear(); const month = date.getUTCMonth();
  if (period === 'week') {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const from = iso(date); date.setUTCDate(date.getUTCDate() + 6);
    return { from, to: iso(date) };
  }
  if (period === 'month') return {
    from: iso(new Date(Date.UTC(year, month, 1, 12))),
    to: iso(new Date(Date.UTC(year, month + 1, 0, 12))),
  };
  if (period === 'fortnight') {
    const firstHalf = date.getUTCDate() <= 15;
    return {
      from: iso(new Date(Date.UTC(year, month, firstHalf ? 1 : 16, 12))),
      to: iso(new Date(Date.UTC(year, firstHalf ? month : month + 1, firstHalf ? 15 : 0, 12))),
    };
  }
  return { from: anchor, to: anchor };
}

export function validIncidentRange(from: string, to: string) {
  const start = parsed(from); const end = parsed(to);
  return Boolean(start && end && end >= start && (end.getTime() - start.getTime()) / 86400000 < 93);
}

export const incidentDateLabel = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(parsed(value) ?? new Date());

export function incidentTimeLabel(value: string | null, locale: string, date?: string) {
  if (!value) return '—';
  // Attendance stores wall-clock date-times; do not shift calendar dates through browser timezones.
  const time = value.slice(11, 16);
  if (!/^\d{2}:\d{2}$/.test(time)) return '—';
  return date && value.slice(0, 10) !== date
    ? `${time} · ${incidentDateLabel(value.slice(0, 10), locale)}` : time;
}
