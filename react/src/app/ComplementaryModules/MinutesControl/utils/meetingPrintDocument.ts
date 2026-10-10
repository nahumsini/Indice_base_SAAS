import { printStandardDocumentHtml } from '../../../BasicModules/shared/print/standardDocumentHtml';
import type { MeetingDetail } from '../services/meetingApi';
import type { MeetingCopy } from '../translations/meetingCopy';
import { getMeetingOperationsCopy } from '../translations/meetingOperationsCopy';

export function printMeetingMinutes(detail: MeetingDetail, copy: MeetingCopy, locale: string) {
  const op = getMeetingOperationsCopy(locale), row = detail.meeting;
  const format = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: row.timezone }).format(new Date(date));
  return printStandardDocumentHtml({
    title: `${copy.minutes}: ${row.title}`, folio: String(row.id), status: copy[row.status], locale,
    contract: { category: 'operational-report', modifiers: ['internal', 'confidential'], orientation: 'portrait', pageSize: 'a4', version: String(row.version) },
    fileName: { documentType: copy.minutes, identifier: String(row.id) }, confidentiality: 'Confidential',
    metadata: [
      { label: copy.owner, value: row.ownerName }, { label: copy.start, value: `${format(row.startAt)} – ${format(row.endAt)} · ${row.timezone}` },
      { label: copy.location, value: detail.location }, { label: copy.participants, value: detail.participants.map(p => p.name).join(', ') },
    ],
    notice: detail.history.length === 100 ? copy.partial : undefined,
    sections: [
      { title: copy.agenda, paragraphs: [detail.agenda] }, { title: copy.minutes, paragraphs: [detail.minutes] },
      { title: copy.decisions, paragraphs: [detail.decisions] },
      ...detail.history.filter(entry => entry.action === 'MINUTES_ADDENDUM').reverse().map(entry => ({
        title: `${op.addendum} · ${format(entry.occurredAt)} · ${entry.actorName}`, paragraphs: [entry.reason],
      })),
    ],
  });
}
