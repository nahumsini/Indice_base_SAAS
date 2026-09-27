import type { RecordsTranslations } from '../translations';
import type { EmployeeRecord } from '../types/records.types';
import { buildStandardDocumentHtml, printStandardDocumentHtml } from '../../../shared/print/standardDocumentHtml';
import { printDocumentHtml } from '../../../shared/print/documentHtmlPrintEngine';
import type { StandardDocumentDefinition } from '../../../shared/print/standardDocumentPdf';

export function buildRecordWebDocument(record: EmployeeRecord, copy: RecordsTranslations, locale: string): StandardDocumentDefinition {
  const text = copy.pdfDocument;
  const folio = record.recordNumber || copy.pdf.recordNumber(record.id);
  return {
    contract: { category: 'legal-document', modifiers: ['confidential', 'employee-facing', 'signature-required'], orientation: 'portrait', pageSize: 'letter', version: '1.0' },
    fileName: { documentType: 'hr-record', identifier: folio },
    locale, folio, title: text.title, subtitle: record.title, confidentiality: 'Confidential',
    metadata: [
      { label: copy.pdf.employee, value: [record.user.name, record.user.position].filter(Boolean).join(' - ') },
      { label: copy.pdf.reportedBy, value: record.reportedBy.name },
      { label: copy.pdf.eventDate, value: new Date(record.eventDate).toLocaleString(locale) },
      { label: copy.pdf.type, value: copy.types[record.type] },
      { label: copy.pdf.severity, value: record.severity ? copy.severity[record.severity] : copy.pdf.notAvailable },
      { label: copy.pdf.status, value: copy.status[record.status] },
    ],
    sections: [{
      title: text.followUp, fields: [
        { label: copy.pdf.description, value: record.description },
        { label: copy.pdf.actionsTaken, value: record.actionsTaken || copy.pdf.notAvailable },
        { label: copy.pdf.witnesses, value: record.witnesses?.join(', ') || copy.pdf.notAvailable },
        { label: copy.pdf.attachments, value: record.attachments?.map(item => item.name).join(', ') || copy.pdf.notAvailable },
      ],
    }],
    signatures: [
      { label: text.employeeSignature, caption: record.user.name },
      { label: text.reportedBySignature, caption: record.reportedBy.name },
    ],
  };
}

export async function downloadRecordPdf(record: EmployeeRecord, copy: RecordsTranslations, locale: string) {
  return printStandardDocumentHtml(buildRecordWebDocument(record, copy, locale));
}

/** One user gesture opens one print job; each selected act retains its folio and signatures. */
export function printRecordsWeb(records: EmployeeRecord[], copy: RecordsTranslations, locale: string) {
  if (!records.length) return false;
  return printDocumentHtml({
    bodyHtml: records.map(record => buildStandardDocumentHtml(buildRecordWebDocument(record, copy, locale))).join(''),
    contentStyles: '.quotation-document + .quotation-document { break-before: page; }',
    documentTitle: 'hr-records', locale, pageSize: 'letter',
  });
}
