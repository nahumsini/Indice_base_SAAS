import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../types';
import type { QuotesTranslations } from './translations';

const brand = {
  coral: [255, 107, 94] as const,
  yellow: [244, 200, 74] as const,
  aqua: [89, 195, 165] as const,
  blue: [37, 99, 235] as const,
  graphite: [34, 40, 49] as const,
  slate: [107, 114, 128] as const,
  light: [247, 248, 250] as const,
  coralLight: [255, 243, 241] as const,
  border: [216, 220, 227] as const,
};

type PdfDocumentWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

export type QuotePdfContext = {
  quote: SalesQuote;
  contact?: SalesContact | null;
  opportunity?: SalesOpportunity | null;
  copy: QuotesTranslations;
  locale?: string;
};

function rgb(color: readonly number[]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

function setFill(doc: jsPDF, color: readonly number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: readonly number[]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: readonly number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function tableEndY(doc: jsPDF, fallback: number) {
  return (doc as PdfDocumentWithTable).lastAutoTable?.finalY ?? fallback;
}

function drawIndiceMark(doc: jsPDF, x: number, y: number) {
  const bars = [
    { color: brand.coral, height: 6, offset: 9 },
    { color: brand.yellow, height: 9, offset: 6 },
    { color: brand.aqua, height: 12, offset: 3 },
    { color: brand.blue, height: 15, offset: 0 },
  ];

  bars.forEach((bar, index) => {
    setFill(doc, bar.color);
    doc.roundedRect(x + index * 4.2, y + bar.offset, 3.1, bar.height, 1.1, 1.1, 'F');
  });
}

function formatCurrency(value: number, locale = 'es-MX') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function getLineTotal(item: SalesQuote['items'][number]) {
  const subtotal = item.quantity * item.unitPrice;
  const discount = subtotal * (item.discountPercent / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (item.taxPercent / 100);
  return taxable + tax;
}

function addFooter(doc: jsPDF, copy: QuotesTranslations) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setDraw(doc, brand.border);
    doc.line(16, pageHeight - 15, pageWidth - 16, pageHeight - 15);
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Indice', 16, pageHeight - 9);
    doc.text(copy.previewModal.pageLabel(page, pageCount), pageWidth - 16, pageHeight - 9, { align: 'right' });
  }
}

export function buildQuotePdf({ quote, contact, opportunity, copy, locale = 'es-MX' }: QuotePdfContext) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;

  doc.setProperties({
    title: `${copy.previewModal.documentTitle} ${quote.quoteNumber}`,
    subject: copy.header.title,
    creator: 'Indice',
  });

  setFill(doc, brand.graphite);
  doc.rect(0, 0, pageWidth, 37, 'F');
  drawIndiceMark(doc, left, 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('INDICE', left + 25, 17);

  doc.setFontSize(8);
  doc.setTextColor(216, 220, 227);
  doc.text(copy.previewModal.documentEyebrow.toUpperCase(), left + 25, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(quote.quoteNumber, right, 18, { align: 'right' });

  setFill(doc, brand.coral);
  doc.rect(0, 36, pageWidth, 1.5, 'F');

  let y = 52;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(copy.previewModal.documentTitle, left, y);

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copy.previewModal.documentSubtitle, left, y + 8, { maxWidth: contentWidth * 0.72 });

  setText(doc, brand.coral);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(formatCurrency(quote.total, locale), right, y + 1, { align: 'right' });
  setText(doc, brand.slate);
  doc.setFontSize(7);
  doc.text(copy.labels.total.toUpperCase(), right, y + 8, { align: 'right' });

  y += 24;
  setDraw(doc, brand.border);
  doc.line(left, y, right, y);

  y += 10;
  const columnWidth = (contentWidth - 8) / 2;
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, columnWidth, 38, 3, 3, 'FD');
  doc.roundedRect(left + columnWidth + 8, y, columnWidth, 38, 3, 3, 'FD');

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(copy.previewModal.clientBlock.toUpperCase(), left + 5, y + 7);
  doc.text(copy.previewModal.commercialBlock.toUpperCase(), left + columnWidth + 13, y + 7);

  setText(doc, brand.graphite);
  doc.setFontSize(11);
  doc.text(quote.clientName, left + 5, y + 15, { maxWidth: columnWidth - 10 });
  doc.text(quote.assignedSeller, left + columnWidth + 13, y + 15, { maxWidth: columnWidth - 10 });

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${copy.labels.contact}: ${quote.contactPerson}`, left + 5, y + 22, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.previewModal.phone}: ${contact?.phone ?? copy.common.unassigned}`, left + 5, y + 28, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.previewModal.email}: ${contact?.email ?? copy.common.unassigned}`, left + 5, y + 34, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.labels.createdDate}: ${quote.createdDate}`, left + columnWidth + 13, y + 22, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.labels.expirationDate}: ${quote.expirationDate}`, left + columnWidth + 13, y + 28, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.labels.opportunity}: ${opportunity?.opportunityName ?? copy.common.unassigned}`, left + columnWidth + 13, y + 34, { maxWidth: columnWidth - 10 });

  y += 52;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(copy.previewModal.itemsTitle, left, y);
  setDraw(doc, brand.border);
  doc.line(left, y + 3, right, y + 3);

  autoTable(doc, {
    startY: y + 9,
    head: [[
      copy.labels.product,
      copy.labels.section,
      copy.labels.quantity,
      copy.labels.unitPrice,
      copy.labels.discount,
      copy.labels.tax,
      copy.previewModal.lineTotal,
    ]],
    body: quote.items.map((item) => [
      `${item.productName}\n${item.sku}`,
      item.section,
      String(item.quantity),
      formatCurrency(item.unitPrice, locale),
      `${item.discountPercent}%`,
      `${item.taxPercent}%`,
      formatCurrency(getLineTotal(item), locale),
    ]),
    theme: 'grid',
    margin: { left, right: pageWidth - right },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: rgb(brand.graphite),
      lineColor: rgb(brand.border),
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: rgb(brand.graphite),
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: rgb(brand.light),
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 34 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 19 },
      5: { halign: 'center', cellWidth: 17 },
      6: { halign: 'right', cellWidth: 26 },
    },
  });

  y = tableEndY(doc, y + 48) + 10;
  if (y > pageHeight - 74) {
    doc.addPage();
    y = 24;
  }

  const totalsX = right - 70;
  setFill(doc, brand.coralLight);
  setDraw(doc, [255, 199, 193]);
  doc.roundedRect(totalsX, y, 70, 34, 3, 3, 'FD');
  const totalRows = [
    [copy.labels.subtotal, quote.subtotal],
    [copy.labels.discountTotal, quote.discountTotal],
    [copy.labels.taxTotal, quote.taxTotal],
    [copy.labels.total, quote.total],
  ] as const;

  totalRows.forEach(([label, value], index) => {
    const rowY = y + 7 + index * 7;
    setText(doc, index === totalRows.length - 1 ? brand.graphite : brand.slate);
    doc.setFont('helvetica', index === totalRows.length - 1 ? 'bold' : 'normal');
    doc.setFontSize(index === totalRows.length - 1 ? 10 : 8);
    doc.text(label, totalsX + 5, rowY);
    doc.text(formatCurrency(value, locale), totalsX + 65, rowY, { align: 'right' });
  });

  const notesWidth = contentWidth - 80;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(copy.labels.notes, left, y + 5);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(quote.notes || copy.previewModal.noNotes, left, y + 12, { maxWidth: notesWidth });

  y += 46;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(copy.labels.terms, left, y);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(quote.terms || copy.previewModal.defaultTerms, left, y + 7, { maxWidth: contentWidth });

  addFooter(doc, copy);
  return doc;
}

export function getQuotePdfFileName(quote: SalesQuote) {
  return `${quote.quoteNumber.replace(/[^a-z0-9-]+/gi, '-')}.pdf`;
}

export function getQuotePdfBlob(context: QuotePdfContext) {
  return buildQuotePdf(context).output('blob');
}

export function downloadQuotePdf(context: QuotePdfContext) {
  const blob = getQuotePdfBlob(context);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getQuotePdfFileName(context.quote);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printQuotePdf(context: QuotePdfContext) {
  const blob = getQuotePdfBlob(context);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}
