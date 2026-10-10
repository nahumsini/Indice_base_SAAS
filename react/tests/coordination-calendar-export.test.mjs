import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarExport } from '../src/app/shared/utils/calendarDownload.ts';
const event = { uid: 'meeting-17@indice', title: 'Review', startAt: '2026-11-01T01:30:00-04:00', endAt: '2026-11-01T01:30:00-05:00', status: 'CONFIRMED', version: 3 };
test('calendar export preserves DST instants, stable identity and version', () => {
  const text = buildCalendarExport(event, new Date('2026-10-08T12:00:00Z'));
  assert.match(text, /DTSTART:20261101T053000Z\r\nDTEND:20261101T063000Z/);
  assert.match(text, /UID:meeting-17@indice/); assert.match(text, /SEQUENCE:3/);
  assert.doesNotMatch(text, /ATTENDEE|ORGANIZER|METHOD:REQUEST/);
});
test('calendar text cannot inject properties and UTF-8 folds preserve full text', () => {
  const title = '診断😀'.repeat(50) + ',;\\\r\nATTENDEE:private@example.com';
  const text = buildCalendarExport({ ...event, title });
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  assert.equal(text.split('\r\n').filter(line => line.startsWith('ATTENDEE:')).length, 0);
  assert.ok(text.replace(/\r\n /g, '').includes('診断😀'.repeat(50)));
  assert.throws(() => buildCalendarExport({ ...event, uid: 'bad\r\nUID:injection' }));
  assert.throws(() => buildCalendarExport({ ...event, endAt: event.startAt }));
});
