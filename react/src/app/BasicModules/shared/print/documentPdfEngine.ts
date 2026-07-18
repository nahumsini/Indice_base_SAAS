import type jsPDF from 'jspdf';
import { documentPrintAttribution } from './documentPrintContract';

const footerLabels = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  return ({
    en: { page: 'Page', updated: 'Updated' },
    es: { page: 'Página', updated: 'Actualizado' },
    fr: { page: 'Page', updated: 'Mis à jour' },
    ko: { page: '페이지', updated: '업데이트' },
    pt: { page: 'Página', updated: 'Atualizado' },
    zh: { page: '页', updated: '更新' },
  } as Record<string, { page: string; updated: string }>)[language]
    ?? { page: 'Page', updated: 'Updated' };
};

export const applyStandardPdfMetadata = (
  doc: jsPDF,
  {
    author = 'Indice',
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
  }: {
    confidentiality?: string;
    folio?: string;
    locale?: string;
    updatedAt?: Date;
  } = {},
) => {
  const pageCount = doc.getNumberOfPages();
  const labels = footerLabels(locale);
  const updatedValue = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(updatedAt);

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = Math.max(12, pageWidth * 0.065);
    doc.setDrawColor(207, 212, 216);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(108, 114, 122);
    doc.text(`${documentPrintAttribution} · ${labels.updated}: ${updatedValue}`, margin, pageHeight - 8.5, {
      maxWidth: pageWidth * 0.55,
    });
    if (folio || confidentiality) {
      doc.text([folio, confidentiality].filter(Boolean).join(' · '), pageWidth / 2, pageHeight - 8.5, {
        align: 'center',
        maxWidth: pageWidth * 0.25,
      });
    }
    doc.text(`${labels.page} ${page} / ${pageCount}`, pageWidth - margin, pageHeight - 8.5, { align: 'right' });
  }
};

export const openStandardPdfForPrint = (doc: jsPDF) => {
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  }, { once: true });
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  return true;
};

