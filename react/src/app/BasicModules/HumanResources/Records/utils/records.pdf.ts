import type { RecordsTranslations } from '../translations';
import type { EmployeeRecord } from '../types/records.types';

const sanitizeFileName = (value: string) => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'record'
);

export async function downloadRecordPdf(
  record: EmployeeRecord,
  copy: RecordsTranslations,
  locale: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const left = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - left * 2;
  let cursorY = 20;

  const addSection = (label: string, value: string) => {
    if (!value.trim()) {
      return;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(label, left, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, maxWidth);
    doc.text(lines, left, cursorY);
    cursorY += lines.length * 5 + 5;
  };

  const ensurePage = () => {
    if (cursorY <= 270) {
      return;
    }
    doc.addPage();
    cursorY = 20;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(record.title, left, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(record.recordNumber || copy.pdf.recordNumber(record.id), left, cursorY);
  cursorY += 8;

  addSection(copy.pdf.employee, `${record.user.name}${record.user.position ? ` - ${record.user.position}` : ''}`);
  ensurePage();
  addSection(copy.pdf.reportedBy, record.reportedBy.name);
  ensurePage();
  addSection(copy.pdf.eventDate, new Date(record.eventDate).toLocaleString(locale));
  ensurePage();
  addSection(copy.pdf.type, copy.types[record.type]);
  ensurePage();
  addSection(copy.pdf.severity, record.severity ? copy.severity[record.severity] : copy.pdf.notAvailable);
  ensurePage();
  addSection(copy.pdf.status, copy.status[record.status]);
  ensurePage();
  addSection(copy.pdf.description, record.description);
  ensurePage();

  if (record.actionsTaken) {
    addSection(copy.pdf.actionsTaken, record.actionsTaken);
    ensurePage();
  }

  if (record.witnesses?.length) {
    addSection(copy.pdf.witnesses, record.witnesses.join(', '));
    ensurePage();
  }

  if (record.attachments?.length) {
    addSection(copy.pdf.attachments, record.attachments.map((attachment) => attachment.name).join(', '));
  }

  doc.save(`${sanitizeFileName(record.recordNumber || record.title)}.pdf`);
}
