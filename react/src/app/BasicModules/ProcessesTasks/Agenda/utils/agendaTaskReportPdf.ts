import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { printStandardDocumentHtml } from '../../../shared/print/standardDocumentHtml';
import { taskReportRows } from './agendaReports';

export function downloadAgendaTaskReport(task: AgendaTaskItem, copy: AgendaTranslations, locale = 'es-MX') {
  return printStandardDocumentHtml({
    contract: { category: 'operational-report', modifiers: ['internal'], pageSize: 'a4', orientation: 'portrait', version: '1.0' },
    fileName: { documentType: copy.report.pdf.filePrefix, identifier: task.folio },
    title: copy.report.title, subtitle: task.title, folio: task.folio, locale, confidentiality: 'Internal',
    tables: [{ columns: [copy.report.pdf.headField, copy.report.pdf.headValue], rows: taskReportRows(task, copy) }],
  });
}
