/** Preserve business wall time: a date-only action must never become a midnight call. */
export function readOpportunitySchedule(value: unknown, scheduledAt: unknown): string {
  const raw = String(value ?? '').trim().replace('T', ' ');
  const date = raw.slice(0, 10);
  const time = /^\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/.exec(raw)?.[1];
  return time && (scheduledAt || time !== '00:00') ? `${date} ${time}` : date;
}
