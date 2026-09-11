import type jsPDF from 'jspdf';
import {
  documentPrintAttribution,
  formatDocumentPrintDateTime,
  getDocumentPrintLabels,
} from './documentPrintContract';
import { notifyDocumentPrintFailure } from './documentPrintFeedback';
export const applyStandardPdfMetadata = (
  doc: jsPDF,
  {
    author = '',
    subject,
    title,
  }: { author?: string; subject?: string; title: string },
) => {
  doc.setProperties({
    author,
    creator: 'Indice',
    subject: subject ?? title,
    title,
  });
};

export const addStandardPdfFooters = (
  doc: jsPDF,
  {
    confidentiality = '',
    folio = '',
    locale = 'es-MX',
    updatedAt = new Date(),
    version = '',
  }: {
    confidentiality?: string;
    folio?: string;
    locale?: string;
    updatedAt?: Date;
    version?: string;
  } = {},
) => {
  const pageCount = doc.getNumberOfPages();
  const labels = getDocumentPrintLabels(locale);
  const updatedValue = formatDocumentPrintDateTime(updatedAt, locale);
  const millimeters = (value: number) => (
    value * (72 / 25.4) / doc.internal.scaleFactor
  );

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = Math.max(millimeters(12), pageWidth * 0.065);
    const ruleY = pageHeight - millimeters(14);
    const footerY = pageHeight - millimeters(8.5);
    doc.setDrawColor(207, 212, 216);
    doc.setLineWidth(0.2);
    doc.line(margin, ruleY, pageWidth - margin, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(108, 114, 122);
    doc.text(`${documentPrintAttribution} · ${labels.updated}: ${updatedValue}`, margin, footerY, {
      maxWidth: pageWidth - margin * 2 - millimeters(35),
    });
    if (folio || confidentiality || version) {
      doc.text([folio, confidentiality, version ? `v${version}` : ''].filter(Boolean).join(' · '), pageWidth / 2, pageHeight - millimeters(4), {
        align: 'center',
        maxWidth: pageWidth - margin * 2,
      });
    }
    doc.text(`${labels.page} ${page} / ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
  }
};

export const openStandardPdfForPrint = (
  doc: jsPDF,
  {
    locale = 'es-MX',
    notifyOnBlocked = true,
  }: {
    locale?: string;
    notifyOnBlocked?: boolean;
  } = {},
) => {
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    if (notifyOnBlocked) notifyDocumentPrintFailure(locale, 'popup-blocked');
    return false;
  }
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  }, { once: true });
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  return true;
};
