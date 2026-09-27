import jsPDF from 'jspdf';
import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import type { StandardDocumentDefinition } from '../../shared/print/standardDocumentPdf';
import autoTable from 'jspdf-autotable';
import type { SalesContact, SalesOpportunity, SalesQuote } from '../types';
import { formatSalesCurrencyAmount } from '../utils/salesCurrency';
import type { QuotesTranslations } from './translations';
import { getQuoteLineExchangeRateLabel } from './utils/quoteCurrencyConversion';
import { buildDocumentFileName } from '../../shared/print/documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata } from '../../shared/print/documentPdfEngine';
import type { CompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';

const brand = {
  coral: [138, 138, 138] as const,
  yellow: [200, 200, 200] as const,
  aqua: [170, 170, 170] as const,
  blue: [96, 96, 96] as const,
  graphite: [39, 39, 39] as const,
  slate: [114, 114, 114] as const,
  light: [248, 248, 248] as const,
  coralLight: [245, 245, 245] as const,
  border: [220, 220, 220] as const,
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
  company?: CompanyPrintIdentity | null;
  copy: QuotesTranslations;
  locale?: string;
};

const commercialLabelsFor = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  return ({
    en: { issuer: 'Issued by', fiscalData: 'Fiscal details', quantity: 'Quantity', discountShort: 'Disc. %', taxShort: 'Tax %', lineItems: 'Line items', units: 'Units', taxId: 'Tax ID', fiscalName: 'Legal name', fiscalAddress: 'Billing address', fiscalRegime: 'Tax regime', acceptance: 'Commercial acceptance', acceptanceNotice: 'By signing, the customer confirms the scope, prices and terms stated in this proposal.', customerSignature: 'Customer name and signature', date: 'Date', sellerSignature: 'Commercial representative' },
    es: { issuer: 'Emite', fiscalData: 'Datos fiscales', quantity: 'Cantidad', discountShort: 'Desc. %', taxShort: 'Imp. %', lineItems: 'Partidas', units: 'Unidades', taxId: 'RFC / ID fiscal', fiscalName: 'Razón social', fiscalAddress: 'Domicilio fiscal', fiscalRegime: 'Régimen fiscal', acceptance: 'Aceptación de la propuesta', acceptanceNotice: 'Al firmar, el cliente confirma el alcance, precios y condiciones indicados en esta propuesta.', customerSignature: 'Nombre y firma del cliente', date: 'Fecha', sellerSignature: 'Responsable comercial' },
    fr: { issuer: 'Émis par', fiscalData: 'Données fiscales', quantity: 'Quantité', discountShort: 'Rem. %', taxShort: 'Taxe %', lineItems: 'Lignes', units: 'Unités', taxId: 'Identifiant fiscal', fiscalName: 'Raison sociale', fiscalAddress: 'Adresse de facturation', fiscalRegime: 'Régime fiscal', acceptance: 'Acceptation commerciale', acceptanceNotice: 'En signant, le client confirme la portée, les prix et les conditions de cette proposition.', customerSignature: 'Nom et signature du client', date: 'Date', sellerSignature: 'Responsable commercial' },
  } as Record<string, Record<string, string>>)[language] ?? {
    issuer: 'Issued by', fiscalData: 'Fiscal details', quantity: 'Quantity', discountShort: 'Disc. %', taxShort: 'Tax %', lineItems: 'Line items', units: 'Units', taxId: 'Tax ID', fiscalName: 'Legal name', fiscalAddress: 'Billing address', fiscalRegime: 'Tax regime', acceptance: 'Commercial acceptance', acceptanceNotice: 'By signing, the customer confirms the scope, prices and terms stated in this proposal.', customerSignature: 'Customer name and signature', date: 'Date', sellerSignature: 'Commercial representative',
  };
};

function fitSingleLine(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let fitted = value;
  while (fitted.length > 1 && doc.getTextWidth(`${fitted}...`) > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted.trimEnd()}...`;
}

const loadLogoDataUrl = async (logoUrl: string) => {
  const trimmedUrl = logoUrl.trim();
  if (!trimmedUrl) return '';

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
      } catch {
        resolve('');
      }
    };
    image.onerror = () => resolve('');
    try {
      image.src = new URL(trimmedUrl, window.location.origin).href;
    } catch {
      resolve('');
    }
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
  const baseLabel = [item.productName, item.sku, item.notes].filter(Boolean).join('\n');

  if (!hasConversion) {
    return baseLabel;
  }

  return [
    baseLabel,
    `${copy.pricing.catalogPrice}: ${formatCurrency(item.originalUnitPrice ?? item.unitPrice, originalCurrency)}`,
    `${copy.pricing.exchangeRate}: 1 ${originalCurrency} = ${getQuoteLineExchangeRateLabel(item.exchangeRate)} ${targetCurrency} · ${item.exchangeRateDate}`,
  ].join('\n');
}

export async function buildQuotePdf({ quote, contact, opportunity, company, copy, locale = 'es-MX' }: QuotePdfContext) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  const contentWidth = right - left;
  const generatedAt = new Date();
  const generatedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(generatedAt);
  const generatedTime = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(generatedAt);
  const quoteCurrency = quote.currency ?? 'MXN';
  const labels = commercialLabelsFor(locale);
  const contactFiscalAddress = [
    contact?.fiscalAddressLine1,
    contact?.fiscalAddressLine2,
    contact?.fiscalCity,
    contact?.fiscalState,
    contact?.fiscalPostalCode,
    contact?.fiscalCountry,
  ].map((part) => part?.trim()).filter(Boolean).join(', ');
  const taxSummary = quote.items
    .map((item) => item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' / ') || copy.common.unassigned;
  const companyLogoDataUrl = await loadLogoDataUrl(company?.logoUrl || '');

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

  const drawCommercialParties = (currentY: number) => {
    const blockY = ensureSpace(currentY, 54);
    const gap = 4;
    const columnWidth = (contentWidth - gap * 2) / 3;
    setFill(doc, brand.light);
    setDraw(doc, brand.border);
    doc.roundedRect(left, blockY, contentWidth, 46, 3, 3, 'FD');
    doc.line(left + columnWidth + gap / 2, blockY + 5, left + columnWidth + gap / 2, blockY + 41);
    doc.line(left + (columnWidth + gap) * 2 - gap / 2, blockY + 5, left + (columnWidth + gap) * 2 - gap / 2, blockY + 41);

    const columns = [left + 5, left + columnWidth + gap + 3, left + (columnWidth + gap) * 2 + 3];
    const textWidth = columnWidth - 8;

    setText(doc, brand.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(copy.previewModal.clientBlock.toUpperCase(), columns[0], blockY + 7);
    doc.text(labels.fiscalData.toUpperCase(), columns[1], blockY + 7);
    doc.text(labels.issuer.toUpperCase(), columns[2], blockY + 7);

    setText(doc, brand.graphite);
    doc.setFontSize(11);
    doc.text(fitSingleLine(doc, quote.clientName, textWidth), columns[0], blockY + 15);
    doc.text(fitSingleLine(doc, contact?.fiscalLegalName || quote.clientName, textWidth), columns[1], blockY + 15);
    doc.text(fitSingleLine(doc, company?.name || quote.assignedSeller, textWidth), columns[2], blockY + 15);

    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const clientRows = [
      `${copy.labels.contact}: ${quote.contactPerson}`,
      contact?.phone ? `${copy.previewModal.phone}: ${contact.phone}` : '',
      contact?.email ? `${copy.previewModal.email}: ${contact.email}` : '',
    ].filter(Boolean);
    const fiscalRows = [
      contact?.fiscalTaxId ? `${labels.taxId}: ${contact.fiscalTaxId}` : '',
      contact?.fiscalRegime ? `${labels.fiscalRegime}: ${contact.fiscalRegime}` : '',
      contactFiscalAddress ? `${labels.fiscalAddress}: ${contactFiscalAddress}` : '',
    ].filter(Boolean);
    const issuerRows = [
      `${copy.labels.seller}: ${quote.assignedSeller}`,
      company?.phone ? `${copy.previewModal.phone}: ${company.phone}` : '',
      company?.email ? `${copy.previewModal.email}: ${company.email}` : '',
      company?.address || '',
      `${copy.labels.createdDate}: ${quote.createdDate}`,
      `${copy.labels.expirationDate}: ${quote.expirationDate}`,
      opportunity?.opportunityName ? `${copy.labels.opportunity}: ${opportunity.opportunityName}` : '',
      `${copy.labels.status}: ${copy.statusLabels[quote.status]} · ${taxSummary}`,
    ].filter(Boolean);
    clientRows.slice(0, 4).forEach((row, index) => {
      doc.text(fitSingleLine(doc, row, textWidth), columns[0], blockY + 22 + index * 5.3);
    });
    fiscalRows.slice(0, 4).forEach((row, index) => {
      doc.text(fitSingleLine(doc, row, textWidth), columns[1], blockY + 22 + index * 5.3);
    });
    issuerRows.slice(0, 4).forEach((row, index) => {
      doc.text(fitSingleLine(doc, row, textWidth), columns[2], blockY + 22 + index * 5.3);
    });

    return blockY + 54;
  };

  applyStandardPdfMetadata(doc, {
    author: company?.name,
    title: `${copy.previewModal.documentTitle} ${quote.quoteNumber}`,
    subject: copy.header.title,
  });

  let y = 16;
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(copy.previewModal.documentTitle, pageWidth / 2, y + 2, { align: 'center' });

  doc.setFontSize(8);
  const companyName = company?.name || `${copy.table.columns.number}: ${quote.quoteNumber}`;
  const companyHeaderWidth = 60;
  const companyHeaderCenter = left + companyHeaderWidth / 2;
  const fittedCompanyName = fitSingleLine(doc, companyName, companyHeaderWidth);
  if (companyLogoDataUrl) {
    try {
      const imageProperties = doc.getImageProperties(companyLogoDataUrl);
      const maxLogoWidth = 34;
      const maxLogoHeight = 8;
      const ratio = Math.min(maxLogoWidth / imageProperties.width, maxLogoHeight / imageProperties.height);
      const logoWidth = imageProperties.width * ratio;
      const logoHeight = imageProperties.height * ratio;
      const logoX = companyHeaderCenter - logoWidth / 2;
      doc.addImage(companyLogoDataUrl, 'PNG', logoX, 5, logoWidth, logoHeight, undefined, 'FAST');
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
  doc.text(`${copy.labels.createdDate}: ${generatedDate}`, right, y - 2, { align: 'right' });
  doc.text(`${generatedTime} · ${quote.quoteNumber}`, right, y + 4, { align: 'right' });

  y += 14;
  y = drawCommercialParties(y);
  y = ensureSpace(y, 70);
  drawSectionTitle(copy.previewModal.itemsTitle, y);

  autoTable(doc, {
    startY: y + 9,
    head: [[
      copy.labels.product,
      copy.labels.section,
      labels.quantity,
      copy.labels.unitPrice,
      labels.discountShort,
      labels.taxShort,
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
      fontSize: 7.2,
    },
    alternateRowStyles: {
      fillColor: rgb(brand.light),
    },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 30 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 17 },
      5: { halign: 'center', cellWidth: 17 },
      6: { halign: 'right', cellWidth: 26 },
    },
  });

  y = tableEndY(doc, y + 48) + 10;
  y = ensureSpace(y, 82);

  const totalsX = right - 70;
  setFill(doc, brand.coralLight);
  setDraw(doc, [210, 210, 210]);
  doc.roundedRect(totalsX, y, 70, 30, 3, 3, 'FD');
  const totalRows = [
    [copy.labels.subtotal, quote.subtotal],
    [copy.labels.discountTotal, quote.discountTotal],
    [copy.labels.taxTotal, quote.taxTotal],
    [copy.labels.total, quote.total],
  ] as const;

  totalRows.forEach(([label, value], index) => {
    const rowY = y + 6 + index * 6.2;
    setText(doc, index === totalRows.length - 1 ? brand.graphite : brand.slate);
    doc.setFont('helvetica', index === totalRows.length - 1 ? 'bold' : 'normal');
    doc.setFontSize(index === totalRows.length - 1 ? 10 : 8);
    doc.text(label, totalsX + 5, rowY);
    doc.text(formatCurrency(value, quoteCurrency), totalsX + 65, rowY, { align: 'right' });
  });

  const notesWidth = contentWidth - 80;
  if (quote.notes.trim()) {
    setText(doc, brand.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(copy.labels.notes, left, y + 5);
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(quote.notes, left, y + 12, { maxWidth: notesWidth });
  }

  y += 36;
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
    version: '1.0',
  });
  return doc;
}

export function getQuotePdfFileName(quote: SalesQuote) {
  return buildDocumentFileName({ documentType: 'quotation', identifier: quote.quoteNumber });
}

export async function getQuotePdfBlob(context: QuotePdfContext) {
  return (await buildQuotePdf(context)).output('blob');
}

export function buildQuoteWebDocument({ quote, contact, opportunity, company, copy, locale = 'es-MX' }: QuotePdfContext): StandardDocumentDefinition {
  const labels = commercialLabelsFor(locale);
  const currency = quote.currency ?? 'MXN';
  const fiscalAddress = [contact?.fiscalAddressLine1, contact?.fiscalAddressLine2, contact?.fiscalCity, contact?.fiscalState, contact?.fiscalPostalCode, contact?.fiscalCountry].filter(Boolean).join(', ');
  return {
    contract: { category: 'transaction-document', modifiers: ['customer-facing', 'multi-currency'], pageSize: 'a4', orientation: 'portrait', version: '1.0' },
    fileName: { documentType: 'quotation', identifier: quote.quoteNumber },
    title: copy.previewModal.documentTitle, folio: quote.quoteNumber, status: copy.statusLabels[quote.status],
    issuer: company?.name, logoUrl: company?.logoUrl, recipient: quote.clientName, locale,
    metadata: [
      { label: copy.labels.contact, value: quote.contactPerson },
      { label: copy.previewModal.phone, value: contact?.phone },
      { label: copy.previewModal.email, value: contact?.email },
      { label: labels.fiscalName, value: contact?.fiscalLegalName || quote.clientName },
      { label: labels.taxId, value: contact?.fiscalTaxId },
      { label: labels.fiscalRegime, value: contact?.fiscalRegime },
      { label: labels.fiscalAddress, value: fiscalAddress },
      { label: copy.labels.seller, value: quote.assignedSeller },
      { label: labels.issuer, value: [company?.phone, company?.email, company?.address].filter(Boolean).join('\n') },
      { label: copy.labels.createdDate, value: quote.createdDate },
      { label: copy.labels.expirationDate, value: quote.expirationDate },
      { label: copy.labels.opportunity, value: opportunity?.opportunityName },
    ].filter(field => field.value),
    tables: [{
      title: copy.previewModal.itemsTitle,
      columns: [copy.labels.product, copy.labels.section, labels.quantity, copy.labels.unitPrice, labels.discountShort, labels.taxShort, copy.previewModal.lineTotal],
      numericColumnIndices: [2, 3, 4, 5, 6],
      rows: quote.items.map(item => [getQuoteLinePdfLabel(item, copy, currency), item.section, String(item.quantity), formatCurrency(item.unitPrice, currency), `${item.discountPercent}%`, item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`, formatCurrency(getLineTotal(item), currency)]),
    }],
    metrics: [
      { label: copy.labels.subtotal, value: formatCurrency(quote.subtotal, currency) },
      { label: copy.labels.discountTotal, value: formatCurrency(quote.discountTotal, currency) },
      { label: copy.labels.taxTotal, value: formatCurrency(quote.taxTotal, currency) },
      { label: copy.labels.total, value: formatCurrency(quote.total, currency) },
    ],
    sections: [
      ...(quote.notes.trim() ? [{ title: copy.labels.notes, paragraphs: [quote.notes] }] : []),
      { title: copy.labels.terms, paragraphs: [quote.terms || copy.previewModal.defaultTerms] },
    ],
  };
}

export async function downloadQuotePdf(context: QuotePdfContext) {
  return printQuotePdf(context);
}

export async function printQuotePdf(context: QuotePdfContext) {
  return printStandardDocumentHtml(buildQuoteWebDocument(context));
}
