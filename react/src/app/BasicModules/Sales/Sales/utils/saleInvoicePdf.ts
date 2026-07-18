import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesQuote } from '../../types';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleLine, SaleRecord, SaleRecordDraft, SalesOperationalContext } from '../types/salesTypes';
import { buildDocumentFileName } from '../../../shared/print/documentFileName';
import { addStandardPdfFooters, openStandardPdfForPrint } from '../../../shared/print/documentPdfEngine';

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

type InvoiceLine = {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
};

export type SaleInvoicePdfContext = {
  sale: SaleRecord | SaleRecordDraft;
  quote?: SalesQuote | null;
  operationalContext: SalesOperationalContext;
  copy: SalesRecordsTranslations;
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

function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

function getLineTotal(line: InvoiceLine) {
  return line.subtotal + (line.subtotal * (line.taxPercent / 100));
}

function getTaxIdentifierLabel(context: SalesOperationalContext, copy: SalesRecordsTranslations) {
  if (context.taxIdentifierLabel) {
    return context.taxIdentifierLabel;
  }

  const countryLabels: Record<string, string> = {
    BR: 'CNPJ / CPF',
    CA: 'BN / GST-HST',
    CO: 'NIT',
    MX: 'RFC',
    US: 'EIN / Sales Tax ID',
  };

  return countryLabels[String(context.country ?? '').toUpperCase()] ?? copy.modal.operationalContext.taxIdentifier;
}

function getInvoiceLines(sale: SaleRecord | SaleRecordDraft, quote?: SalesQuote | null): InvoiceLine[] {
  if (sale.saleLines.length > 0) {
    return sale.saleLines.map((line: SaleLine) => ({
      id: line.id,
      productName: line.productName,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      taxPercent: line.taxPercent,
      subtotal: line.subtotal,
    }));
  }

  return (quote?.items ?? []).map((line) => {
    const grossSubtotal = line.quantity * line.unitPrice;
    const discount = grossSubtotal * (line.discountPercent / 100);

    return {
      id: line.id,
      productName: line.productName,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      taxPercent: line.taxPercent,
      subtotal: Math.max(grossSubtotal - discount, 0),
    };
  });
}

function getTaxJurisdictionNote(context: SalesOperationalContext, copy: SalesRecordsTranslations) {
  const jurisdiction = context.jurisdictionName || context.country || copy.common.notAvailable;
  const taxLabel = getTaxIdentifierLabel(context, copy);
  const registryLabel = context.companyRegistryNumber ? ` · ${copy.invoice.registry}: ${context.companyRegistryNumber}` : '';

  return `${jurisdiction} · ${taxLabel}${registryLabel}`;
}

export function buildSaleInvoicePdf({
  sale,
  quote,
  operationalContext,
  copy,
  locale = 'es-MX',
}: SaleInvoicePdfContext) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;
  const currency = sale.currency || operationalContext.currency || 'MXN';
  const invoiceNumber = sale.saleNumber || sale.saleDocumentReference || quote?.quoteNumber || copy.common.notAvailable;
  const generatedAt = new Date();
  const generatedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(generatedAt);
  const lines = getInvoiceLines(sale, quote);
  const itemCount = lines.reduce((total, item) => total + item.quantity, 0);
  const taxSummary = lines
    .map((item) => `${item.taxPercent}%`)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' / ') || copy.common.notAvailable;

  const drawBrandBar = (x: number, y: number, width: number, height = 2.5) => {
    const segments = [
      { color: brand.coral, ratio: 0.34 },
      { color: brand.yellow, ratio: 0.22 },
      { color: brand.aqua, ratio: 0.22 },
      { color: brand.blue, ratio: 0.22 },
    ];
    let cursor = x;

    segments.forEach((segment) => {
      const segmentWidth = width * segment.ratio;
      setFill(doc, segment.color);
      doc.rect(cursor, y, segmentWidth, height, 'F');
      cursor += segmentWidth;
    });
  };

  const ensureSpace = (currentY: number, neededHeight: number) => {
    if (currentY + neededHeight <= pageHeight - 22) {
      return currentY;
    }

    doc.addPage();
    return 24;
  };

  doc.setProperties({
    title: `${copy.invoice.documentTitle} ${invoiceNumber}`,
    subject: copy.invoice.documentTitle,
    creator: copy.header.title,
  });

  let y = 16;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`${copy.invoice.number}: ${invoiceNumber}`, left, y + 2);
  doc.setFontSize(16);
  doc.text(copy.invoice.documentTitle, pageWidth / 2, y + 2, { align: 'center' });

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${copy.invoice.generated}: ${generatedDate}`, right, y + 2, { align: 'right' });
  drawBrandBar(left, y + 13, contentWidth);

  y += 28;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(copy.invoice.documentTitle, left, y);

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copy.invoice.subtitle, left, y + 8, { maxWidth: contentWidth * 0.66 });

  setText(doc, brand.coral);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(formatCurrency(sale.totalAmount, currency), right, y, { align: 'right' });
  setText(doc, brand.slate);
  doc.setFontSize(7);
  doc.text(`${copy.modal.fields.totalAmount.toUpperCase()} · ${currency}`, right, y + 7, { align: 'right' });

  y += 22;
  const metricGap = 4;
  const metricWidth = (contentWidth - metricGap * 3) / 4;
  const metrics = [
    { label: copy.modal.fields.saleDate, value: sale.saleDate || copy.common.notAvailable, accent: brand.blue },
    { label: copy.modal.fields.currency, value: currency, accent: brand.blue },
    { label: copy.modal.workspace.itemsLabel, value: String(itemCount), accent: brand.aqua },
    { label: copy.modal.fields.taxTotal, value: formatCurrency(sale.taxTotal, currency), accent: brand.yellow },
  ];

  metrics.forEach((metric, index) => {
    const x = left + index * (metricWidth + metricGap);
    setFill(doc, brand.light);
    setDraw(doc, brand.border);
    doc.roundedRect(x, y, metricWidth, 22, 3, 3, 'FD');
    setFill(doc, metric.accent);
    doc.roundedRect(x, y, 2.2, 22, 1, 1, 'F');
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(metric.label.toUpperCase(), x + 5, y + 7, { maxWidth: metricWidth - 10 });
    setText(doc, brand.graphite);
    doc.setFontSize(10);
    doc.text(metric.value, x + 5, y + 16, { maxWidth: metricWidth - 10 });
  });

  y += 34;
  const columnWidth = (contentWidth - 8) / 2;
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, columnWidth, 52, 3, 3, 'FD');
  doc.roundedRect(left + columnWidth + 8, y, columnWidth, 52, 3, 3, 'FD');

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(copy.invoice.billTo.toUpperCase(), left + 5, y + 7);
  doc.text(copy.invoice.issuedBy.toUpperCase(), left + columnWidth + 13, y + 7);

  setText(doc, brand.graphite);
  doc.setFontSize(11);
  doc.text(sale.customerName || copy.common.notAvailable, left + 5, y + 16, { maxWidth: columnWidth - 10 });
  doc.text(operationalContext.legalName || copy.common.notAvailable, left + columnWidth + 13, y + 16, { maxWidth: columnWidth - 10 });

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${copy.modal.fields.quoteReference}: ${sale.quoteReference || quote?.quoteNumber || copy.common.notAvailable}`, left + 5, y + 25, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.modal.fields.sellerName}: ${sale.sellerName || copy.common.notAvailable}`, left + 5, y + 32, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.modal.fields.paymentMethod}: ${sale.paymentMethod || copy.common.notAvailable}`, left + 5, y + 39, { maxWidth: columnWidth - 10 });
  doc.text(operationalContext.fiscalAddress || '', left + columnWidth + 13, y + 25, { maxWidth: columnWidth - 10 });
  doc.text(`${getTaxIdentifierLabel(operationalContext, copy)}: ${operationalContext.taxIdentifier || ''}`, left + columnWidth + 13, y + 36, { maxWidth: columnWidth - 10 });
  doc.text(getTaxJurisdictionNote(operationalContext, copy), left + columnWidth + 13, y + 45, { maxWidth: columnWidth - 10 });

  y += 64;
  y = ensureSpace(y, 70);
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(copy.invoice.itemsTitle, left, y);
  setDraw(doc, brand.border);
  doc.line(left, y + 3, right, y + 3);

  autoTable(doc, {
    startY: y + 9,
    head: [[
      copy.modal.summaryColumns.item,
      copy.modal.summaryColumns.sku,
      copy.modal.summaryColumns.quantity,
      copy.modal.summaryColumns.unitPrice,
      copy.modal.summaryColumns.tax,
      copy.modal.summaryColumns.total,
    ]],
    body: lines.map((item) => [
      item.productName,
      item.sku,
      String(item.quantity),
      formatCurrency(item.unitPrice, currency),
      `${item.taxPercent}%`,
      formatCurrency(getLineTotal(item), currency),
    ]),
    theme: 'grid',
    margin: { left, right: pageWidth - right },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.6,
      textColor: rgb(brand.graphite),
      lineColor: rgb(brand.border),
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: rgb(brand.light),
      textColor: rgb(brand.graphite),
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: rgb(brand.light),
    },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 30 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 28 },
    },
  });

  y = tableEndY(doc, y + 48) + 10;
  y = ensureSpace(y, 62);

  const totalsX = right - 76;
  setFill(doc, brand.coralLight);
  setDraw(doc, [255, 199, 193]);
  doc.roundedRect(totalsX, y, 76, 40, 3, 3, 'FD');
  const totalRows = [
    [copy.modal.fields.currency, currency],
    [copy.invoice.subtotal, formatCurrency(sale.subtotal, currency)],
    [copy.invoice.discount, formatCurrency(sale.discountTotal, currency)],
    [copy.modal.fields.taxTotal, formatCurrency(sale.taxTotal, currency)],
    [copy.invoice.total, formatCurrency(sale.totalAmount, currency)],
  ] as const;

  totalRows.forEach(([label, value], index) => {
    const rowY = y + 7 + index * 7;
    const isTotal = index === totalRows.length - 1;
    setText(doc, isTotal ? brand.graphite : brand.slate);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 10 : 8);
    doc.text(label, totalsX + 5, rowY);
    doc.text(value, totalsX + 71, rowY, { align: 'right' });
  });

  const notesWidth = contentWidth - 86;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(copy.modal.fields.notes, left, y + 5);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(sale.notes || copy.invoice.defaultNotes, left, y + 12, { maxWidth: notesWidth });
  doc.text(`${copy.invoice.taxSummary}: ${taxSummary}`, left, y + 28, { maxWidth: notesWidth });

  y += 50;
  y = ensureSpace(y, 26);
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, contentWidth, 22, 3, 3, 'FD');
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(copy.invoice.disclaimerTitle, left + 5, y + 8);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(copy.invoice.disclaimerBody, left + 5, y + 16, { maxWidth: contentWidth - 10 });

  addStandardPdfFooters(doc, {
    folio: invoiceNumber,
    locale,
    updatedAt: generatedAt,
  });
  return doc;
}

export function getSaleInvoicePdfFileName(sale: SaleRecord | SaleRecordDraft) {
  const reference = sale.saleNumber || sale.saleDocumentReference || sale.quoteReference || 'invoice';
  return buildDocumentFileName({ documentType: 'sale-summary', identifier: reference });
}

export function getSaleInvoicePdfBlob(context: SaleInvoicePdfContext) {
  return buildSaleInvoicePdf(context).output('blob');
}

export function downloadSaleInvoicePdf(context: SaleInvoicePdfContext) {
  const blob = getSaleInvoicePdfBlob(context);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getSaleInvoicePdfFileName(context.sale);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printSaleInvoicePdf(context: SaleInvoicePdfContext) {
  return openStandardPdfForPrint(buildSaleInvoicePdf(context));
}
