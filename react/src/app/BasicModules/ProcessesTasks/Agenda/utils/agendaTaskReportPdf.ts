import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { taskReportRows } from './agendaReports';

export function downloadAgendaTaskReport(task: AgendaTaskItem, copy: AgendaTranslations) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`${copy.report.title} - ${task.folio}`, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90, 98, 112);
  doc.text(task.title, 14, 27);

  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    head: [[copy.report.pdf.headField, copy.report.pdf.headValue]],
    body: taskReportRows(task, copy),
    styles: {
      cellPadding: 3,
      fontSize: 9,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [235, 165, 52],
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold' },
      1: { cellWidth: 126 },
    },
  });

  doc.save(`${task.folio}-${copy.report.pdf.filePrefix}.pdf`);
}
