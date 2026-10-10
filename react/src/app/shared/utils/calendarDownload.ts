/** RFC 5545 export only: no invitations, attendee addresses, credentials or synchronization. */
export type CalendarExport = {
  uid: string; title: string; startAt: string; endAt: string; location?: string;
  version: number; status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
};
const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = (value: string | Date) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
function fold(line: string): string {
  const encoder = new TextEncoder(); let size = 0, result = '';
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (size + bytes > 75) { result += '\r\n '; size = 1; }
    result += character; size += bytes;
  }
  return result;
}
export function buildCalendarExport(event: CalendarExport, now = new Date()): string {
  if (!/^[A-Za-z0-9@._-]{1,180}$/.test(event.uid) || !Number.isSafeInteger(event.version) || event.version < 0
    || !['CONFIRMED', 'TENTATIVE', 'CANCELLED'].includes(event.status)
    || !Number.isFinite(Date.parse(event.startAt)) || !Number.isFinite(Date.parse(event.endAt))
    || Date.parse(event.startAt) >= Date.parse(event.endAt)) throw new Error('Invalid calendar event');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Indice//Calendar export//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${event.uid}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(event.startAt)}`,
    `DTEND:${stamp(event.endAt)}`, `SEQUENCE:${event.version}`, `SUMMARY:${escapeText(event.title)}`,
    `STATUS:${event.status}`, 'CLASS:PRIVATE', ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
export function downloadCalendarExport(event: CalendarExport) {
  const url = URL.createObjectURL(new Blob([buildCalendarExport(event)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `calendar-${event.uid.split('@')[0]}.ics`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
