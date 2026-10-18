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
  generatedAt?: Date;
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

function setDraw(doc: jsPDF, color: readonly number[]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: readonly number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function tableEndY(doc: jsPDF, fallback: number) {
  return (doc as PdfDocumentWithTable).lastAutoTable?.finalY ?? fallback;
}

export function formatQuoteDocumentAmount(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    `${copy.pricing.catalogPrice}: ${formatQuoteDocumentAmount(item.originalUnitPrice ?? item.unitPrice, originalCurrency)}`,
    `${copy.pricing.exchangeRate}: 1 ${originalCurrency} = ${getQuoteLineExchangeRateLabel(item.exchangeRate)} ${targetCurrency} · ${item.exchangeRateDate}`,
  ].join('\n');
}

/** Binary sharing adapter: consumes the same commercial definition as preview/print. */
export async function buildQuotePdf(context: QuotePdfContext) {
  const { quote, company, copy, locale = 'es-MX' } = context;
  const definition = buildQuoteWebDocument(context);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 10;
  const right = pageWidth - 10;
  const contentWidth = right - left;
  const companyLogoDataUrl = await loadLogoDataUrl(company?.logoUrl || '');
  const ensureSpace = (currentY: number, height: number) => {
    if (currentY + height <= pageHeight - 22) return currentY;
    doc.addPage();
    return 16;
  };
  applyStandardPdfMetadata(doc, { author: definition.issuer, title: `${definition.title} ${quote.quoteNumber}`, subject: copy.header.title });
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(definition.title, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(8);
  const companyHeaderCenter = left + 29;
  const fittedCompanyName = fitSingleLine(doc, company?.name || '', 58);
  if (companyLogoDataUrl) {
    const imageProperties = doc.getImageProperties(companyLogoDataUrl);
    const ratio = Math.min(32 / imageProperties.width, 10 / imageProperties.height);
    const logoWidth = imageProperties.width * ratio;
    const logoHeight = imageProperties.height * ratio;
    const logoX = companyHeaderCenter - logoWidth / 2;
    doc.addImage(companyLogoDataUrl, 'PNG', logoX, 7, logoWidth, logoHeight, undefined, 'FAST');
    doc.text(fittedCompanyName, companyHeaderCenter, 22, { align: 'center' });
  } else {
    doc.text(fittedCompanyName, companyHeaderCenter, 18, { align: 'center' });
  }
  doc.text(quote.quoteNumber, right, 15, { align: 'right' });
  doc.text(definition.status || '', right, 20, { align: 'right' });
  let y = 30;
  const tableStyles = { font: 'helvetica', fontSize: 8, cellPadding: 2.4, textColor: rgb(brand.graphite), lineColor: rgb(brand.border), lineWidth: 0.1, overflow: 'linebreak' as const };
  const tableMargin = { left, right: 10, top: 16, bottom: 22 };
  // Auto-sized rows keep complete names, fiscal details and issuer data without truncation.
  const fields = [{ label: copy.previewModal.clientBlock, value: definition.recipient }, ...(definition.metadata ?? [])];
  const fieldRows = Array.from({ length: Math.ceil(fields.length / 3) }, (_, row) => Array.from({ length: 3 }, (_, column) => {
    const field = fields[row * 3 + column];
    return field ? `${field.label}\n${field.value ?? ''}` : '';
  }));
  autoTable(doc, { startY: y, body: fieldRows, theme: 'grid', margin: tableMargin, styles: { ...tableStyles, fillColor: rgb(brand.light) }, rowPageBreak: 'avoid' });
  y = tableEndY(doc, y) + 6;
  for (const table of definition.tables ?? []) {
    y = ensureSpace(y, 24);
    doc.setFontSize(11);
    doc.text(table.title || '', left, y);
    autoTable(doc, {
      startY: y + 4, head: [table.columns],
      body: table.rows.length ? table.rows.map(row => row.map(value => String(value ?? ''))) : [[{ content: table.emptyMessage || '', colSpan: table.columns.length }]],
      theme: 'grid', margin: tableMargin, styles: tableStyles, rowPageBreak: 'avoid',
      headStyles: { fillColor: rgb(brand.light), textColor: rgb(brand.graphite), fontStyle: 'normal' },
      alternateRowStyles: { fillColor: rgb(brand.light) },
      columnStyles: Object.fromEntries((table.columnWidths ?? []).map((width, index) => [index, { cellWidth: width / (table.columnWidths ?? []).reduce((sum, item) => sum + item, 0) * contentWidth, halign: table.numericColumnIndices?.includes(index) ? 'right' as const : 'left' as const }])),
    });
    y = tableEndY(doc, y) + 6;
  }
  y = ensureSpace(y, 32);
  autoTable(doc, { startY: y, body: (definition.metrics ?? []).map(metric => [metric.label, String(metric.value ?? '')]),
    theme: 'grid', margin: { ...tableMargin, left: right - 90 }, tableWidth: 90,
    styles: { ...tableStyles, fillColor: rgb(brand.coralLight) }, columnStyles: { 1: { halign: 'right' } }, pageBreak: 'avoid' });
  y = tableEndY(doc, y) + 7;
  for (const section of definition.sections ?? []) {
    y = ensureSpace(y, 16);
    // A paragraph taller than a sheet continues through the existing table pagination engine.
    autoTable(doc, { startY: y, head: [[section.title]], body: (section.paragraphs ?? []).map(text => [text]),
      theme: 'plain', margin: tableMargin, styles: { ...tableStyles, fontSize: 9, cellPadding: 1.2, lineWidth: 0 },
      headStyles: { fontStyle: 'normal', fontSize: 10, textColor: rgb(brand.graphite) }, rowPageBreak: 'avoid' });
    y = tableEndY(doc, y) + 3;
  }
  y = ensureSpace(y, 26);
  const signatures = definition.signatures ?? [];
  const signatureWidth = (contentWidth - 12 * (signatures.length - 1)) / Math.max(1, signatures.length);
  signatures.forEach((signature, index) => {
    const x = left + index * (signatureWidth + 12);
    setDraw(doc, brand.slate);
    doc.line(x, y + 10, x + signatureWidth, y + 10);
    doc.setFontSize(8);
    doc.text(signature.label, x, y + 15, { maxWidth: signatureWidth });
  });
  addStandardPdfFooters(doc, { folio: quote.quoteNumber, locale, updatedAt: definition.generatedAt, version: definition.contract.version });
  return doc;
}

export function getQuotePdfFileName(quote: SalesQuote) {
  return buildDocumentFileName({ documentType: 'quotation', identifier: quote.quoteNumber });
}

export async function getQuotePdfBlob(context: QuotePdfContext) {
  return (await buildQuotePdf(context)).output('blob');
}

export function buildQuoteWebDocument({ quote, contact, opportunity, company, copy, locale = 'es-MX', generatedAt = new Date() }: QuotePdfContext): StandardDocumentDefinition {
  const labels = commercialLabelsFor(locale);
  const currency = quote.currency ?? 'MXN';
  const contactFiscalAddress = [contact?.fiscalAddressLine1, contact?.fiscalAddressLine2, contact?.fiscalCity, contact?.fiscalState, contact?.fiscalPostalCode, contact?.fiscalCountry].filter(Boolean).join(', ');
  return {
    contract: { category: 'transaction-document', modifiers: ['customer-facing', 'multi-currency'], pageSize: 'a4', orientation: 'portrait', version: '1.0' },
    fileName: { documentType: 'quotation', identifier: quote.quoteNumber },
    title: copy.previewModal.documentTitle, folio: quote.quoteNumber, status: copy.statusLabels[quote.status],
    issuer: company?.name, logoUrl: company?.logoUrl, recipient: quote.clientName, locale, generatedAt,
    metadata: [
      { label: copy.labels.currency, value: currency },
      { label: copy.labels.contact, value: quote.contactPerson },
      { label: copy.previewModal.phone, value: contact?.phone },
      { label: copy.previewModal.email, value: contact?.email },
      { label: labels.fiscalName, value: contact?.fiscalLegalName || quote.clientName },
      { label: labels.taxId, value: contact?.fiscalTaxId },
      { label: labels.fiscalRegime, value: contact?.fiscalRegime },
      { label: labels.fiscalAddress, value: contactFiscalAddress },
      { label: copy.labels.seller, value: quote.assignedSeller },
      { label: labels.issuer, value: [company?.phone, company?.email, company?.address].filter(Boolean).join('\n') },
      { label: copy.labels.createdDate, value: quote.createdDate },
      { label: copy.labels.expirationDate, value: quote.expirationDate },
      { label: copy.labels.opportunity, value: opportunity?.opportunityName },
    ].filter(field => field.value),
    tables: [{
      title: copy.previewModal.itemsTitle,
      columns: [copy.labels.product, copy.labels.section, labels.quantity, copy.labels.unitPrice, labels.discountShort, labels.taxShort, copy.previewModal.lineTotal],
      columnWidths: [49, 28, 18, 26, 17, 22, 30],
      numericColumnIndices: [2, 3, 4, 5, 6],
      emptyMessage: copy.builder.emptyItems,
      rows: quote.items.map(item => [getQuoteLinePdfLabel(item, copy, currency), item.section, String(item.quantity), formatQuoteDocumentAmount(item.unitPrice, currency), `${item.discountPercent}%`, item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`, formatQuoteDocumentAmount(getLineTotal(item), currency)]),
    }],
    metrics: [
      { label: copy.labels.subtotal, value: formatQuoteDocumentAmount(quote.subtotal, currency) },
      { label: copy.labels.discountTotal, value: formatQuoteDocumentAmount(quote.discountTotal, currency) },
      { label: copy.labels.taxTotal, value: formatQuoteDocumentAmount(quote.taxTotal, currency) },
      { label: copy.labels.total, value: formatQuoteDocumentAmount(quote.total, currency) },
    ],
    sections: [
      ...(quote.notes.trim() ? [{ title: copy.labels.notes, paragraphs: [quote.notes] }] : []),
      { title: copy.labels.terms, paragraphs: [quote.terms || copy.previewModal.defaultTerms] },
      { title: labels.acceptance, paragraphs: [labels.acceptanceNotice] },
    ],
    signatures: [{ label: labels.customerSignature }, { label: labels.date }, { label: labels.sellerSignature }],
  };
}

export async function downloadQuotePdf(context: QuotePdfContext) {
  return printQuotePdf(context);
}

export async function printQuotePdf(context: QuotePdfContext) {
  return printStandardDocumentHtml(buildQuoteWebDocument(context));
}
