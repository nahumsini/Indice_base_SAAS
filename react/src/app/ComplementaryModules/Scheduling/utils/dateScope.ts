export const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Calendar dates use the viewer's explicit browser time zone, with an exclusive upper bound. */
export function dateScope(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T00:00:00`);
  if (dateInput(start) !== from || dateInput(end) !== to) throw new Error('invalid_scope');
  end.setDate(end.getDate() + 1);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end || end.getTime() - start.getTime() > 366 * 86400000) throw new Error('invalid_scope');
  return { from: start.toISOString(), to: end.toISOString() };
}
