import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { buildDocumentFileName } from '../../../shared/print/documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata } from '../../../shared/print/documentPdfEngine';
import { taskReportRows } from './agendaReports';

export function downloadAgendaTaskReport(task: AgendaTaskItem, copy: AgendaTranslations, locale = 'es-MX') {
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
  const title = `${copy.report.title} - ${task.folio}`;
  applyStandardPdfMetadata(doc, { subject: copy.report.title, title });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(32, 36, 41);
  doc.text(title, 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 107, 115);
  doc.text(task.title, 14, 27);

  autoTable(doc, {
    startY: 36,
    theme: 'plain',
    head: [[copy.report.pdf.headField, copy.report.pdf.headValue]],
    body: taskReportRows(task, copy),
    styles: {
      cellPadding: 3,
      fontSize: 9,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [243, 244, 244],
      textColor: [72, 79, 87],
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold' },
      1: { cellWidth: 126 },
    },
  });

  addStandardPdfFooters(doc, { confidentiality: 'Internal', folio: task.folio, locale, version: '1.0' });
  doc.save(buildDocumentFileName({
    documentType: copy.report.pdf.filePrefix,
    identifier: task.folio,
  }));
}
