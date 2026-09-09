export function ticketDuration(minutes: number | null, locale: string) {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  const absolute = Math.max(0, minutes);
  const unit = absolute < 60 ? 'minute' : absolute < 1440 ? 'hour' : 'day';
  const value = unit === 'minute' ? absolute : Math.round(absolute / (unit === 'hour' ? 60 : 1440));
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 0 }).format(value);
}
export function ticketFileSize(bytes: number, locale: string) {
  const unit = bytes < 1024 ? 'byte' : bytes < 1024 ** 2 ? 'kilobyte' : 'megabyte';
  const value = bytes / (unit === 'byte' ? 1 : unit === 'kilobyte' ? 1024 : 1024 ** 2);
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(value);
}
