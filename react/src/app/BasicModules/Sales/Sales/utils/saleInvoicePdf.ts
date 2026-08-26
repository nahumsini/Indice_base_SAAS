import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesQuote } from '../../types';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleLine, SaleRecord, SaleRecordDraft, SalesOperationalContext } from '../types/salesTypes';
import { buildDocumentFileName } from '../../../shared/print/documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata, openStandardPdfForPrint } from '../../../shared/print/documentPdfEngine';
import type { CompanyPrintIdentity } from '../../../shared/print/useCompanyPrintIdentity';

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

type SaleNoteLine = {
  id: string;
  productName: string;
  sku: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
};

export type SaleNotePdfContext = {
  sale: SaleRecord | SaleRecordDraft;
  quote?: SalesQuote | null;
  operationalContext: SalesOperationalContext;
  company?: CompanyPrintIdentity | null;
  copy: SalesRecordsTranslations;
  locale?: string;
};

function fitSingleLine(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let fitted = value;
  while (fitted.length > 1 && doc.getTextWidth(`${fitted}...`) > maxWidth) fitted = fitted.slice(0, -1);
  return `${fitted.trimEnd()}...`;
}

const loadLogoDataUrl = async (logoUrl: string) => {
  if (!logoUrl.trim()) return '';
  return new Promise<string>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return resolve('');
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(''); }
    };
    image.onerror = () => resolve('');
    try { image.src = new URL(logoUrl.trim(), window.location.origin).href; } catch { resolve(''); }
  });
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

function getSaleNoteCopy(locale: string) {
  const language = locale.toLowerCase().split('-')[0];
  const labels = {
    en: {
      title: 'Sales note',
      noteTitle: 'Document classification',
      noteBody: 'Sales note only. This document is not a fiscal invoice or proof of payment.',
    },
    es: {
      title: 'Nota de venta',
      noteTitle: 'Clasificación del documento',
      noteBody: 'Nota de venta únicamente. Este documento no es una factura fiscal ni un comprobante de pago.',
    },
    fr: {
      title: 'Note de vente',
      noteTitle: 'Classification du document',
      noteBody: 'Note de vente uniquement. Ce document n’est ni une facture fiscale ni une preuve de paiement.',
    },
    ko: {
      title: '판매 내역서',
      noteTitle: '문서 분류',
      noteBody: '판매 내역서이며 세금계산서 또는 결제 증빙이 아닙니다.',
    },
    pt: {
      title: 'Nota de venda',
      noteTitle: 'Classificação do documento',
      noteBody: 'Nota de venda apenas. Este documento não é uma nota fiscal nem um comprovante de pagamento.',
    },
    zh: {
      title: '销售单',
      noteTitle: '文件分类',
      noteBody: '此文件仅为销售单，不是税务发票或付款凭证。',
    },
  } as const;
  return labels[language as keyof typeof labels] ?? labels.en;
}

function getLineTotal(line: SaleNoteLine) {
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

function getSaleNoteLines(sale: SaleRecord | SaleRecordDraft, quote?: SalesQuote | null): SaleNoteLine[] {
  if (sale.saleLines.length > 0) {
    return sale.saleLines.map((line: SaleLine) => ({
      id: line.id,
      productName: line.productName,
      sku: line.sku,
      categoryName: line.categoryName || '',
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
      categoryName: line.section || '',
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
  const registryLabel = context.companyRegistryNumber ? ` · ${copy.saleNote.registry}: ${context.companyRegistryNumber}` : '';

  return `${jurisdiction} · ${taxLabel}${registryLabel}`;
}

function buildLegacySaleNotePdf({
  sale,
  quote,
  operationalContext,
  copy,
  locale = 'es-MX',
}: SaleNotePdfContext) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;
  const currency = sale.currency || operationalContext.currency || 'MXN';
  const salesNoteNumber = sale.saleNumber || sale.saleDocumentReference || quote?.quoteNumber || copy.common.notAvailable;
  const generatedAt = new Date();
  const documentCopy = getSaleNoteCopy(locale);
  const generatedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(generatedAt);
  const lines = getSaleNoteLines(sale, quote);
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

  applyStandardPdfMetadata(doc, {
    title: `${documentCopy.title} ${salesNoteNumber}`,
    subject: documentCopy.title,
  });

  let y = 16;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`${copy.saleNote.number}: ${salesNoteNumber}`, left, y + 2);
  doc.setFontSize(16);
  doc.text(documentCopy.title, pageWidth / 2, y + 2, { align: 'center' });

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${copy.saleNote.generated}: ${generatedDate}`, right, y + 2, { align: 'right' });
  drawBrandBar(left, y + 13, contentWidth);

  y += 28;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(documentCopy.title, left, y);

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copy.saleNote.subtitle, left, y + 8, { maxWidth: contentWidth * 0.66 });

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
  doc.text(copy.saleNote.customer.toUpperCase(), left + 5, y + 7);
  doc.text(copy.saleNote.issuedBy.toUpperCase(), left + columnWidth + 13, y + 7);

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
  doc.text(copy.saleNote.itemsTitle, left, y);
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
    [copy.saleNote.subtotal, formatCurrency(sale.subtotal, currency)],
    [copy.saleNote.discount, formatCurrency(sale.discountTotal, currency)],
    [copy.modal.fields.taxTotal, formatCurrency(sale.taxTotal, currency)],
    [copy.saleNote.total, formatCurrency(sale.totalAmount, currency)],
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
  doc.text(sale.notes || copy.saleNote.defaultNotes, left, y + 12, { maxWidth: notesWidth });
  doc.text(`${copy.saleNote.taxSummary}: ${taxSummary}`, left, y + 28, { maxWidth: notesWidth });

  y += 50;
  y = ensureSpace(y, 26);
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, contentWidth, 22, 3, 3, 'FD');
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(documentCopy.noteTitle, left + 5, y + 8);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(documentCopy.noteBody, left + 5, y + 16, { maxWidth: contentWidth - 10 });

  addStandardPdfFooters(doc, {
    folio: salesNoteNumber,
    locale,
    updatedAt: generatedAt,
    version: '1.0',
  });
  return doc;
}

export async function buildSaleNotePdf({
  sale,
  quote,
  operationalContext,
  company,
  copy,
  locale = 'es-MX',
}: SaleNotePdfContext) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;
  const currency = sale.currency || operationalContext.currency || 'MXN';
  const saleNumber = sale.saleNumber || sale.saleDocumentReference || quote?.quoteNumber || copy.common.notAvailable;
  const generatedAt = new Date();
  const generatedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(generatedAt);
  const generatedTime = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(generatedAt);
  const documentCopy = getSaleNoteCopy(locale);
  const lines = getSaleNoteLines(sale, quote);
  const logoDataUrl = await loadLogoDataUrl(company?.logoUrl || '');
  const language = locale.toLowerCase().split('-')[0];
  const labels = ({
    es: { saleData: 'Datos de la venta', quantity: 'Cantidad', discount: 'Desc. %', tax: 'Imp. %' },
    en: { saleData: 'Sale details', quantity: 'Quantity', discount: 'Disc. %', tax: 'Tax %' },
    fr: { saleData: 'Détails de la vente', quantity: 'Quantité', discount: 'Rem. %', tax: 'Taxe %' },
  } as Record<string, Record<string, string>>)[language] ?? { saleData: 'Sale details', quantity: 'Quantity', discount: 'Disc. %', tax: 'Tax %' };

  const ensureSpace = (currentY: number, neededHeight: number) => {
    if (currentY + neededHeight <= pageHeight - 22) return currentY;
    doc.addPage();
    return 24;
  };
  const drawSectionTitle = (title: string, sectionY: number) => {
    setText(doc, brand.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, left, sectionY);
    setDraw(doc, brand.border);
    doc.line(left, sectionY + 3, right, sectionY + 3);
  };

  applyStandardPdfMetadata(doc, {
    author: company?.name,
    title: `${documentCopy.title} ${saleNumber}`,
    subject: documentCopy.title,
  });

  let y = 16;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(documentCopy.title, pageWidth / 2, y + 2, { align: 'center' });

  const companyName = company?.name || sale.businessName || copy.common.notAvailable;
  const companyHeaderWidth = 60;
  const companyHeaderCenter = left + companyHeaderWidth / 2;
  doc.setFontSize(8);
  const fittedCompanyName = fitSingleLine(doc, companyName, companyHeaderWidth);
  if (logoDataUrl) {
    try {
      const image = doc.getImageProperties(logoDataUrl);
      const ratio = Math.min(34 / image.width, 8 / image.height);
      const logoWidth = image.width * ratio;
      const logoHeight = image.height * ratio;
      doc.addImage(logoDataUrl, 'PNG', companyHeaderCenter - logoWidth / 2, 5, logoWidth, logoHeight, undefined, 'FAST');
      doc.text(fittedCompanyName, companyHeaderCenter, y + 5, { align: 'center' });
    } catch {
      doc.text(fittedCompanyName, companyHeaderCenter, y + 2, { align: 'center' });
    }
  } else {
    doc.text(fittedCompanyName, companyHeaderCenter, y + 2, { align: 'center' });
  }

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${copy.saleNote.generated}: ${generatedDate}`, right, y - 2, { align: 'right' });
  doc.text(`${generatedTime} · ${saleNumber}`, right, y + 4, { align: 'right' });

  y += 14;
  const gap = 4;
  const columnWidth = (contentWidth - gap * 2) / 3;
  const columns = [left + 5, left + columnWidth + gap + 3, left + (columnWidth + gap) * 2 + 3];
  const textWidth = columnWidth - 8;
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, contentWidth, 46, 3, 3, 'FD');
  doc.line(left + columnWidth + gap / 2, y + 5, left + columnWidth + gap / 2, y + 41);
  doc.line(left + (columnWidth + gap) * 2 - gap / 2, y + 5, left + (columnWidth + gap) * 2 - gap / 2, y + 41);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(copy.saleNote.customer.toUpperCase(), columns[0], y + 7);
  doc.text(labels.saleData.toUpperCase(), columns[1], y + 7);
  doc.text(copy.saleNote.issuedBy.toUpperCase(), columns[2], y + 7);
  setText(doc, brand.graphite);
  doc.setFontSize(11);
  doc.text(fitSingleLine(doc, sale.customerName || copy.common.notAvailable, textWidth), columns[0], y + 15);
  doc.text(fitSingleLine(doc, saleNumber, textWidth), columns[1], y + 15);
  doc.text(fitSingleLine(doc, companyName, textWidth), columns[2], y + 15);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const customerRows = [
    sale.sellerName ? `${copy.modal.fields.sellerName}: ${sale.sellerName}` : '',
    sale.paymentMethod ? `${copy.modal.fields.paymentMethod}: ${sale.paymentMethod}` : '',
    sale.paymentReference ? `${copy.modal.fields.paymentReference}: ${sale.paymentReference}` : '',
  ].filter(Boolean);
  const saleRows = [
    `${copy.modal.fields.saleDate}: ${sale.saleDate || copy.common.notAvailable}`,
    sale.quoteReference || quote?.quoteNumber ? `${copy.modal.fields.quoteReference}: ${sale.quoteReference || quote?.quoteNumber}` : '',
    sale.businessUnitName ? `${copy.modal.fields.businessUnit}: ${sale.businessUnitName}` : '',
    sale.businessName ? `${copy.modal.fields.business}: ${sale.businessName}` : '',
  ].filter(Boolean);
  const issuerRows = [
    company?.phone ? `${company.phone}` : '',
    company?.email ? `${company.email}` : '',
    company?.address || '',
    `${copy.modal.fields.currency}: ${currency}`,
  ].filter(Boolean);
  [customerRows, saleRows, issuerRows].forEach((rows, columnIndex) => {
    rows.slice(0, 4).forEach((row, index) => {
      doc.text(fitSingleLine(doc, row, textWidth), columns[columnIndex], y + 22 + index * 5.3);
    });
  });

  y += 54;
  y = ensureSpace(y, 70);
  drawSectionTitle(copy.saleNote.itemsTitle, y);
  autoTable(doc, {
    startY: y + 9,
    head: [[copy.modal.summaryColumns.item, copy.modal.summaryColumns.category, labels.quantity, copy.modal.summaryColumns.unitPrice, labels.discount, labels.tax, copy.modal.summaryColumns.total]],
    body: lines.map((item) => [
      [item.productName, item.sku].filter(Boolean).join('\n'),
      item.categoryName || copy.common.notAvailable,
      String(item.quantity),
      formatCurrency(item.unitPrice, currency),
      `${item.discountPercent}%`,
      `${item.taxPercent}%`,
      formatCurrency(getLineTotal(item), currency),
    ]),
    theme: 'grid',
    margin: { left, right: pageWidth - right },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.6, textColor: rgb(brand.graphite), lineColor: rgb(brand.border), lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: rgb(brand.light), textColor: rgb(brand.graphite), fontStyle: 'bold', fontSize: 7.2 },
    alternateRowStyles: { fillColor: rgb(brand.light) },
    columnStyles: {
      0: { cellWidth: 44 }, 1: { cellWidth: 30 }, 2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 24 }, 4: { halign: 'center', cellWidth: 17 },
      5: { halign: 'center', cellWidth: 17 }, 6: { halign: 'right', cellWidth: 26 },
    },
  });

  y = tableEndY(doc, y + 48) + 10;
  y = ensureSpace(y, sale.notes.trim() ? 76 : 62);
  const totalsX = right - 70;
  setFill(doc, brand.coralLight);
  setDraw(doc, [255, 199, 193]);
  doc.roundedRect(totalsX, y, 70, 30, 3, 3, 'FD');
  const totalRows = [[copy.saleNote.subtotal, sale.subtotal], [copy.saleNote.discount, sale.discountTotal], [copy.modal.fields.taxTotal, sale.taxTotal], [copy.saleNote.total, sale.totalAmount]] as const;
  totalRows.forEach(([label, value], index) => {
    const rowY = y + 6 + index * 6.2;
    const isTotal = index === totalRows.length - 1;
    setText(doc, isTotal ? brand.graphite : brand.slate);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 10 : 8);
    doc.text(label, totalsX + 5, rowY);
    doc.text(formatCurrency(value, currency), totalsX + 65, rowY, { align: 'right' });
  });
  if (sale.notes.trim()) {
    setText(doc, brand.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(copy.modal.fields.notes, left, y + 5);
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(sale.notes, left, y + 12, { maxWidth: contentWidth - 80 });
  }

  y += 36;
  y = ensureSpace(y, 22);
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(left, y, contentWidth, 18, 3, 3, 'FD');
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(documentCopy.noteTitle, left + 5, y + 7);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(documentCopy.noteBody, left + 5, y + 13, { maxWidth: contentWidth - 10 });

  addStandardPdfFooters(doc, { folio: saleNumber, locale, updatedAt: generatedAt, version: '1.0' });
  return doc;
}

export function getSaleNotePdfFileName(sale: SaleRecord | SaleRecordDraft) {
  const reference = sale.saleNumber || sale.saleDocumentReference || sale.quoteReference || 'sale';
  return buildDocumentFileName({ documentType: 'sale-note', identifier: reference });
}

export async function getSaleNotePdfBlob(context: SaleNotePdfContext) {
  return (await buildSaleNotePdf(context)).output('blob');
}

export async function downloadSaleNotePdf(context: SaleNotePdfContext) {
  const blob = await getSaleNotePdfBlob(context);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getSaleNotePdfFileName(context.sale);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function printSaleNotePdf(context: SaleNotePdfContext) {
  return openStandardPdfForPrint(await buildSaleNotePdf(context), { locale: context.locale });
}
