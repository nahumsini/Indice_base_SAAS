import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../types';
import { formatSalesCurrencyAmount } from '../utils/salesCurrency';
import type { QuotesTranslations } from './translations';
import { getQuoteLineExchangeRateLabel } from './utils/quoteCurrencyConversion';
import { buildDocumentFileName } from '../../shared/print/documentFileName';
import { addStandardPdfFooters, openStandardPdfForPrint } from '../../shared/print/documentPdfEngine';

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

function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

function getLineTotal(item: SalesQuote['items'][number]) {
  const subtotal = item.quantity * item.unitPrice;
  const discount = subtotal * (item.discountPercent / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (item.taxPercent / 100);
  return taxable + tax;
}

function getQuoteLinePdfLabel(item: SalesQuote['items'][number], copy: QuotesTranslations, quoteCurrency?: string | null) {
  const originalCurrency = item.originalCurrency ?? item.quoteCurrency ?? quoteCurrency;
  const targetCurrency = item.quoteCurrency ?? quoteCurrency;
  const hasConversion = Boolean(originalCurrency && targetCurrency && originalCurrency.toUpperCase() !== targetCurrency.toUpperCase());
  const baseLabel = `${item.productName}\n${item.sku}`;

  if (!hasConversion) {
    return baseLabel;
  }

  return [
    baseLabel,
    `${copy.pricing.catalogPrice}: ${formatCurrency(item.originalUnitPrice ?? item.unitPrice, originalCurrency)}`,
    `${copy.pricing.exchangeRate}: 1 ${originalCurrency} = ${getQuoteLineExchangeRateLabel(item.exchangeRate)} ${targetCurrency} · ${item.exchangeRateDate}`,
  ].join('\n');
}

export function buildQuotePdf({ quote, contact, opportunity, copy, locale = 'es-MX' }: QuotePdfContext) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;
  const generatedAt = new Date();
  const isSpanishDocument = locale.toLowerCase().startsWith('es-');
  const generatedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(generatedAt);
  const generatedTime = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(generatedAt);
  const quoteCurrency = quote.currency ?? 'MXN';
  const itemCount = quote.items.reduce((total, item) => total + item.quantity, 0);
  const taxSummary = quote.items
    .map((item) => item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' / ') || copy.common.unassigned;
  const isExpired = new Date(quote.expirationDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const customerSummary = isSpanishDocument
    ? {
      scope: 'Alcance comercial',
      validity: 'Vigencia',
      terms: 'Condiciones',
      scopeBody: `${quote.items.length} partida(s) comerciales por ${formatCurrency(quote.total, quoteCurrency)}.`,
      validityBody: isExpired ? `Cotización vencida el ${quote.expirationDate}.` : `Válida hasta el ${quote.expirationDate}.`,
    }
    : {
      scope: 'Commercial scope',
      validity: 'Validity',
      terms: 'Terms',
      scopeBody: `${quote.items.length} commercial line(s) for ${formatCurrency(quote.total, quoteCurrency)}.`,
      validityBody: isExpired ? `Quote expired on ${quote.expirationDate}.` : `Valid through ${quote.expirationDate}.`,
    };

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

  const drawSectionTitle = (title: string, y: number) => {
    setText(doc, brand.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, left, y);
    setDraw(doc, brand.border);
    doc.line(left, y + 3, right, y + 3);
  };

  const drawMetricCard = (
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    accent: readonly number[] = brand.coral,
  ) => {
    setFill(doc, brand.light);
    setDraw(doc, brand.border);
    doc.roundedRect(x, y, width, 22, 3, 3, 'FD');
    setFill(doc, accent);
    doc.roundedRect(x, y, 2.2, 22, 1, 1, 'F');
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(label.toUpperCase(), x + 5, y + 7, { maxWidth: width - 10 });
    setText(doc, brand.graphite);
    doc.setFontSize(10);
    doc.text(value, x + 5, y + 16, { maxWidth: width - 10 });
  };

  const drawInsightCard = (
    x: number,
    y: number,
    width: number,
    title: string,
    body: string,
    accent: readonly number[],
  ) => {
    setFill(doc, [255, 255, 255]);
    setDraw(doc, brand.border);
    doc.roundedRect(x, y, width, 34, 3, 3, 'FD');
    setFill(doc, accent);
    doc.circle(x + 5, y + 7, 1.8, 'F');
    setText(doc, brand.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, x + 10, y + 8, { maxWidth: width - 14 });
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(body, x + 5, y + 16, { maxWidth: width - 10, lineHeightFactor: 1.35 });
  };

  doc.setProperties({
    title: `${copy.previewModal.documentTitle} ${quote.quoteNumber}`,
    subject: copy.header.title,
    creator: copy.header.title,
  });

  let y = 16;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(copy.previewModal.documentTitle, pageWidth / 2, y + 2, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`${copy.table.columns.number}: ${quote.quoteNumber}`, left, y + 2);

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${copy.labels.createdDate}: ${generatedDate}`, right, y - 2, { align: 'right' });
  doc.text(`${generatedTime} · ${quote.quoteNumber}`, right, y + 4, { align: 'right' });
  drawBrandBar(left, y + 13, contentWidth);

  y += 28;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${copy.previewModal.documentEyebrow} ${quote.quoteNumber}`, left, y);

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copy.previewModal.documentSubtitle, left, y + 8, { maxWidth: contentWidth * 0.68 });

  setText(doc, brand.coral);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(formatCurrency(quote.total, quoteCurrency), right, y, { align: 'right' });
  setText(doc, brand.slate);
  doc.setFontSize(7);
  doc.text(`${copy.labels.total.toUpperCase()} · ${quoteCurrency}`, right, y + 7, { align: 'right' });

  y += 18;
  const insightWidth = (contentWidth - 8) / 3;
  drawInsightCard(
    left,
    y,
    insightWidth,
    customerSummary.scope,
    customerSummary.scopeBody,
    brand.coral,
  );
  drawInsightCard(
    left + insightWidth + 4,
    y,
    insightWidth,
    customerSummary.validity,
    customerSummary.validityBody,
    brand.yellow,
  );
  drawInsightCard(
    left + (insightWidth + 4) * 2,
    y,
    insightWidth,
    customerSummary.terms,
    quote.terms || copy.previewModal.defaultTerms,
    isExpired ? brand.coral : brand.aqua,
  );

  y += 44;
  const metricGap = 4;
  const metricWidth = (contentWidth - metricGap * 3) / 4;
  const metrics = [
    { label: copy.labels.total, value: formatCurrency(quote.total, quoteCurrency), accent: brand.coral },
    { label: copy.labels.currency, value: quoteCurrency, accent: brand.blue },
    { label: copy.summary.items, value: String(itemCount), accent: brand.blue },
    { label: copy.labels.subtotal, value: formatCurrency(quote.subtotal, quoteCurrency), accent: brand.yellow },
    { label: copy.labels.taxTotal, value: formatCurrency(quote.taxTotal, quoteCurrency), accent: brand.yellow },
    { label: copy.labels.expirationDate, value: quote.expirationDate, accent: isExpired ? brand.coral : brand.blue },
  ];

  metrics.forEach((metric, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    drawMetricCard(
      left + column * (metricWidth + metricGap),
      y + row * 27,
      metricWidth,
      metric.label,
      metric.value,
      metric.accent,
    );
  });

  y += 60;
  const columnWidth = (contentWidth - 8) / 2;
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, columnWidth, 48, 3, 3, 'FD');
  doc.roundedRect(left + columnWidth + 8, y, columnWidth, 48, 3, 3, 'FD');

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
  doc.text(`${copy.labels.status}: ${copy.statusLabels[quote.status]}`, left + columnWidth + 13, y + 40, { maxWidth: columnWidth - 10 });
  doc.text(`${copy.labels.currency}: ${quoteCurrency} · ${copy.taxBuilder.taxPreset}: ${taxSummary}`, left + columnWidth + 13, y + 46, { maxWidth: columnWidth - 10 });

  y += 60;
  y = ensureSpace(y, 70);
  drawSectionTitle(copy.previewModal.itemsTitle, y);

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
      getQuoteLinePdfLabel(item, copy, quoteCurrency),
      item.section,
      String(item.quantity),
      formatCurrency(item.unitPrice, quoteCurrency),
      `${item.discountPercent}%`,
      item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`,
      formatCurrency(getLineTotal(item), quoteCurrency),
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
      0: { cellWidth: 42 },
      1: { cellWidth: 28 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 17 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 24 },
    },
  });

  y = tableEndY(doc, y + 48) + 10;
  y = ensureSpace(y, 82);

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
    doc.text(formatCurrency(value, quoteCurrency), totalsX + 65, rowY, { align: 'right' });
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

  y += 42;
  y = ensureSpace(y, 42);
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(copy.labels.terms, left, y);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(quote.terms || copy.previewModal.defaultTerms, left, y + 7, { maxWidth: contentWidth });

  addStandardPdfFooters(doc, {
    folio: quote.quoteNumber,
    locale,
    updatedAt: generatedAt,
  });
  return doc;
}

export function getQuotePdfFileName(quote: SalesQuote) {
  return buildDocumentFileName({ documentType: 'quotation', identifier: quote.quoteNumber });
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
  return openStandardPdfForPrint(buildQuotePdf(context));
}
