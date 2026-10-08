export const dateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function localDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid date");
  const date = new Date(value + "T12:00:00");
  if (!Number.isFinite(date.getTime()) || dateInput(date) !== value)
    throw new Error("Invalid date");
  return date;
}
export const dateEnd = (value: string) => {
  const date = localDate(value);
  date.setDate(date.getDate() + 1);
  return dateInput(date);
};
export function dayCount(from: string, to: string) {
  localDate(from);
  localDate(to);
  const count =
    (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) /
      86400000 +
    1;
  if (count < 1 || count > 366) throw new Error("Invalid range");
  return count;
}
export function instantRange(from: string, to: string) {
  dayCount(from, to);
  return {
    from: new Date(from + "T00:00:00").toISOString(),
    to: new Date(dateEnd(to) + "T00:00:00").toISOString(),
  };
}
export function calendarDates(from: string, to: string) {
  const count = dayCount(from, to);
  if (count > 43) throw new Error("Calendar range too wide");
  return Array.from({ length: count }, (_, i) => {
    const date = localDate(from);
    date.setDate(date.getDate() + i);
    return date;
  });
}
