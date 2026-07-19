import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SaleRecord } from '../../Sales/types/salesTypes';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { PostSalesTranslations } from '../translations';
import { buildDocumentFileName } from '../../../shared/print/documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata } from '../../../shared/print/documentPdfEngine';

const brand = {
  coral: [255, 107, 94] as const,
  blue: [37, 99, 235] as const,
  graphite: [34, 40, 49] as const,
  slate: [107, 114, 128] as const,
  light: [247, 248, 250] as const,
  border: [216, 220, 227] as const,
};

function setText(doc: jsPDF, color: readonly number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFill(doc: jsPDF, color: readonly number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function rgb(color: readonly number[]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

function getSalePdfFileName(sale: SaleRecord) {
  return buildDocumentFileName({ documentType: 'post-sale-summary', identifier: sale.saleNumber });
}

function buildSaleSummaryPdf(sale: SaleRecord, copy: PostSalesTranslations) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const left = 42;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - left * 2;
  applyStandardPdfMetadata(doc, {
    subject: copy.saleDetail.title,
    title: `${copy.saleDetail.title} ${sale.saleNumber}`,
  });

  setFill(doc, brand.coral);
  doc.roundedRect(left, 36, contentWidth, 86, 12, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(copy.saleDetail.title, left + 24, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(copy.saleDetail.pdfNote, left + 24, 94, { maxWidth: contentWidth - 48 });

  const summaryY = 148;
  const cardWidth = (contentWidth - 24) / 3;
  [
    [copy.saleDetail.saleReference, sale.saleNumber, sale.quoteReference],
    [copy.saleDetail.total, formatCurrency(sale.totalAmount, sale.currency), sale.currency],
    [copy.saleDetail.status, sale.commercialStatus, `${sale.financeStatus} · ${sale.inventoryStatus}`],
  ].forEach(([label, value, meta], index) => {
    const x = left + index * (cardWidth + 12);
    setFill(doc, brand.light);
    doc.setDrawColor(brand.border[0], brand.border[1], brand.border[2]);
    doc.roundedRect(x, summaryY, cardWidth, 78, 8, 8, 'FD');
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, x + 12, summaryY + 22);
    setText(doc, brand.graphite);
    doc.setFontSize(12);
    doc.text(value, x + 12, summaryY + 45, { maxWidth: cardWidth - 24 });
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(meta, x + 12, summaryY + 62, { maxWidth: cardWidth - 24 });
  });

  autoTable(doc, {
    startY: 252,
    head: [[
      copy.saleDetail.product,
      copy.saleDetail.quantity,
      copy.saleDetail.unitPrice,
      copy.saleDetail.margin,
      copy.saleDetail.warehouse,
    ]],
    body: sale.saleLines.map((line) => [
      `${line.productName}\n${line.sku}`,
      String(line.quantity),
      formatCurrency(line.unitPrice, sale.currency),
      formatCurrency(line.marginAmount, sale.currency),
      line.warehouseId,
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 8,
      textColor: rgb(brand.graphite),
      lineColor: rgb(brand.border),
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: rgb(brand.light),
      textColor: rgb(brand.slate),
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
  });

  let notesY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 360;
  if (notesY + 116 > doc.internal.pageSize.getHeight() - 22) {
    doc.addPage();
    notesY = 28;
  }
  setFill(doc, [255, 243, 241]);
  doc.setDrawColor(255, 199, 193);
  doc.roundedRect(left, notesY + 24, contentWidth, 72, 8, 8, 'FD');
  setText(doc, brand.coral);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(copy.table.columns.notes, left + 18, notesY + 48);
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(sale.notes || copy.common.notAvailable, left + 18, notesY + 66, { maxWidth: contentWidth - 36 });

  addStandardPdfFooters(doc, {
    folio: sale.saleNumber,
    locale: 'es-MX',
  });

  return doc;
}

export function openSaleSummaryPdf(sale: SaleRecord, copy: PostSalesTranslations) {
  const blob = buildSaleSummaryPdf(sale, copy).output('blob');
  const url = URL.createObjectURL(blob);
  const pdfWindow = window.open(url, '_blank');

  if (!pdfWindow) {
    const link = document.createElement('a');
    link.href = url;
    link.download = getSalePdfFileName(sale);
    link.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
