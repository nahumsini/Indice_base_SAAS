import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  PettyCashFund,
  PettyCashMovement,
  PettyCashSettlementLine,
  PettyCashStatement,
} from '../types/pettyCash.types';
import type { PettyCashTranslations } from '../translations';
import {
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getStatementSettlementBalance,
} from './pettyCash.utils';
import { buildDocumentFileName } from '../../shared/print/documentFileName';
import {
  addStandardPdfFooters,
  applyStandardPdfMetadata,
  openStandardPdfForPrint,
} from '../../shared/print/documentPdfEngine';

type PdfDocumentWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

type PettyCashStatementPdfContext = {
  copy: PettyCashTranslations;
  fund: PettyCashFund;
  locale: string;
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  statement: PettyCashStatement;
};

const brand = {
  aqua: [89, 195, 165] as const,
  blue: [37, 99, 235] as const,
  blueSoft: [235, 242, 255] as const,
  border: [216, 220, 227] as const,
  coral: [255, 107, 94] as const,
  graphite: [34, 40, 49] as const,
  light: [247, 248, 250] as const,
  slate: [71, 85, 105] as const,
  text: [15, 23, 42] as const,
  warning: [244, 200, 74] as const,
};

const layout = {
  bottom: 22,
  left: 16,
  right: 16,
  top: 18,
};

const rgb = (color: readonly number[]): [number, number, number] => [color[0], color[1], color[2]];

const setText = (doc: jsPDF, color: readonly number[]) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const setFill = (doc: jsPDF, color: readonly number[]) => {
  doc.setFillColor(color[0], color[1], color[2]);
};

const setDraw = (doc: jsPDF, color: readonly number[]) => {
  doc.setDrawColor(color[0], color[1], color[2]);
};

const tableEndY = (doc: jsPDF, fallback: number) => (
  (doc as PdfDocumentWithTable).lastAutoTable?.finalY ?? fallback
);

const isSpanish = (locale: string) => locale.toLowerCase().startsWith('es');

const labelsFor = (locale: string) => {
  if (isSpanish(locale)) {
    return {
      accountingAccount: 'Cuenta contable',
      amount: 'Importe',
      attachments: 'Adjuntos',
      budgetLine: 'Linea presupuestal',
      closingBalance: 'Saldo declarado',
      documentTitle: 'Estado de cuenta de caja chica',
      expenseDate: 'Fecha',
      generated: 'Generado',
      legalNote: 'Documento operativo para control interno. No sustituye comprobantes fiscales ni politicas de aprobacion.',
      movementSource: 'Origen',
      period: 'Periodo',
      provider: 'Proveedor',
      receipt: 'Comprobante',
      receiptsTitle: 'Comprobantes del corte',
      reference: 'Referencia',
      source: 'Fuente: Modulo de caja chica',
      statement: 'Corte',
      statementSummary: 'Resumen del corte',
      status: 'Estado',
      total: 'Total',
      type: 'Tipo',
    };
  }

  return {
    accountingAccount: 'Accounting account',
    amount: 'Amount',
    attachments: 'Attachments',
    budgetLine: 'Budget line',
    closingBalance: 'Declared balance',
    documentTitle: 'Petty Cash Statement',
    expenseDate: 'Date',
    generated: 'Generated',
    legalNote: 'Operational document for internal control. It does not replace tax receipts or approval policies.',
    movementSource: 'Source',
    period: 'Period',
    provider: 'Provider',
    receipt: 'Receipt',
    receiptsTitle: 'Statement receipts',
    reference: 'Reference',
    source: 'Source: Petty cash module',
    statement: 'Statement',
    statementSummary: 'Statement summary',
    status: 'Status',
    total: 'Total',
    type: 'Type',
  };
};

const formatGeneratedAt = (locale: string) => (
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date())
);

const ensureSpace = (doc: jsPDF, y: number, neededHeight: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + neededHeight <= pageHeight - layout.bottom) {
    return y;
  }
  doc.addPage();
  return layout.top;
};

const drawAccentBar = (doc: jsPDF, x: number, y: number, width: number) => {
  const segments = [brand.coral, brand.warning, brand.aqua, brand.blue];
  const segmentWidth = width / segments.length;
  segments.forEach((color, index) => {
    setFill(doc, color);
    doc.rect(x + segmentWidth * index, y, segmentWidth, 2.2, 'F');
  });
};

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const nextY = ensureSpace(doc, y, 22);

  setText(doc, brand.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, layout.left, nextY);
  setDraw(doc, brand.border);
  doc.line(layout.left, nextY + 4, pageWidth - layout.right, nextY + 4);
  return nextY + 9;
};

const addTable = (
  doc: jsPDF,
  title: string,
  head: string[],
  body: string[][],
  y: number,
) => {
  const startY = addSectionTitle(doc, title, y);

  autoTable(doc, {
    body: body.length > 0 ? body : [['-']],
    head: [head],
    margin: { bottom: layout.bottom, left: layout.left, right: layout.right },
    startY,
    styles: {
      cellPadding: 2.7,
      fontSize: 8,
      lineColor: rgb(brand.border),
      lineWidth: 0.1,
      overflow: 'linebreak',
      textColor: rgb(brand.text),
    },
    headStyles: {
      fillColor: rgb(brand.graphite),
      fontStyle: 'bold',
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: rgb(brand.light),
    },
    theme: 'grid',
  });

  return tableEndY(doc, startY) + 11;
};

const addHeader = (
  doc: jsPDF,
  labels: ReturnType<typeof labelsFor>,
  fund: PettyCashFund,
  statement: PettyCashStatement,
  locale: string,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - layout.left - layout.right;

  setText(doc, brand.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(fund.businessName || fund.name, layout.left, layout.top + 8, { maxWidth: contentWidth * 0.58 });

  setFill(doc, brand.blueSoft);
  setDraw(doc, [198, 216, 255]);
  doc.roundedRect(pageWidth - 80, layout.top - 2, 64, 27, 3, 3, 'FD');
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(labels.statement.toUpperCase(), pageWidth - 75, layout.top + 7);
  setText(doc, brand.blue);
  doc.setFontSize(11);
  doc.text(statement.folio, pageWidth - 75, layout.top + 16, { maxWidth: 54 });

  const y = layout.top + 34;
  setText(doc, brand.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(labels.documentTitle, layout.left, y, { maxWidth: contentWidth * 0.72 });
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(fund.name, layout.left, y + 9, { maxWidth: contentWidth * 0.7 });
  doc.text(`${labels.period}: ${statement.periodKey} | ${formatPettyCashIsoDate(statement.periodStart)} - ${formatPettyCashIsoDate(statement.periodEnd)}`, layout.left, y + 16);
  doc.text(`${labels.generated}: ${formatGeneratedAt(locale)}`, layout.left, y + 23);
  drawAccentBar(doc, layout.left, y + 30, 74);

  return y + 43;
};

const addMetricStrip = (
  doc: jsPDF,
  copy: PettyCashTranslations,
  labels: ReturnType<typeof labelsFor>,
  fund: PettyCashFund,
  statement: PettyCashStatement,
  lineCount: number,
  y: number,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 3;
  const cardWidth = (pageWidth - layout.left - layout.right - gap * 3) / 4;
  const pending = getStatementSettlementBalance(statement);
  const cards = [
    { label: copy.reconciliation.statements.columns.assigned, value: formatPettyCashCurrency(statement.assignedAmount + statement.additionalDepositAmount, statement.currencyCode), color: brand.blue },
    { label: labels.closingBalance, value: formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode), color: brand.aqua },
    { label: copy.reconciliation.metrics.receipts, value: formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode), color: brand.warning },
    { label: copy.reconciliation.metrics.pendingSettlement, value: formatPettyCashCurrency(pending, statement.currencyCode), color: pending > 0 ? brand.coral : brand.aqua },
    { label: copy.reconciliation.metrics.fundBalance, value: formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode), color: brand.aqua },
    { label: copy.financial.metrics.shortages, value: formatPettyCashCurrency(statement.shortageAmount, statement.currencyCode), color: statement.shortageAmount > 0 ? brand.coral : brand.graphite },
    { label: labels.receipt, value: String(lineCount), color: brand.blue },
    { label: labels.status, value: copy.status.statement[statement.status], color: brand.graphite },
  ];

  y = ensureSpace(doc, y, 54);
  cards.forEach((card, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = layout.left + column * (cardWidth + gap);
    const cardY = y + row * 25;

    setFill(doc, [255, 255, 255]);
    setDraw(doc, brand.border);
    doc.roundedRect(x, cardY, cardWidth, 20, 2.5, 2.5, 'FD');
    setFill(doc, card.color);
    doc.roundedRect(x, cardY, 2, 20, 1, 1, 'F');
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(card.label.toUpperCase(), x + 4.8, cardY + 6.3, { maxWidth: cardWidth - 8 });
    setText(doc, brand.text);
    doc.setFontSize(9.1);
    doc.text(card.value, x + 4.8, cardY + 14.3, { maxWidth: cardWidth - 8 });
  });

  return y + 56;
};

const addIdentityBlocks = (
  doc: jsPDF,
  copy: PettyCashTranslations,
  labels: ReturnType<typeof labelsFor>,
  fund: PettyCashFund,
  statement: PettyCashStatement,
  y: number,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - layout.left - layout.right;
  const columnWidth = (contentWidth - 6) / 2;

  y = ensureSpace(doc, y, 42);
  [
    {
      title: copy.reconciliation.filters.fund,
      rows: [
        [copy.reconciliation.metrics.responsible, fund.responsibleName],
        [copy.reconciliation.metrics.source, fund.fundingSourceName],
        [labels.budgetLine, fund.budgetLineName ?? copy.common.notAvailable],
      ],
      x: layout.left,
    },
    {
      title: copy.reconciliation.filters.statement,
      rows: [
        [copy.reconciliation.statements.columns.period, statement.periodKey],
        [copy.reconciliation.statements.columns.responsible, statement.responsibleName],
        [copy.reconciliation.receipts.columns.attachments, String(statement.attachmentCount)],
      ],
      x: layout.left + columnWidth + 6,
    },
  ].forEach((block) => {
    setFill(doc, brand.light);
    setDraw(doc, brand.border);
    doc.roundedRect(block.x, y, columnWidth, 38, 3, 3, 'FD');
    setText(doc, brand.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(block.title, block.x + 5, y + 7, { maxWidth: columnWidth - 10 });
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    block.rows.forEach(([label, value], index) => {
      doc.text(`${label}: ${value}`, block.x + 5, y + 16 + index * 6, { maxWidth: columnWidth - 10 });
    });
  });

  return y + 48;
};

export function buildPettyCashStatementPdf({
  copy,
  fund,
  locale,
  movements,
  settlementLines,
  statement,
}: PettyCashStatementPdfContext) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const labels = labelsFor(locale);
  const exactStatementMovements = movements.filter(movement => movement.pettyCashStatementId === statement.id);
  const statementMovements = exactStatementMovements.length > 0
    ? exactStatementMovements
    : movements.filter(movement => movement.pettyCashFundId === fund.id && !movement.pettyCashStatementId);

  applyStandardPdfMetadata(doc, {
    subject: labels.documentTitle,
    title: `${labels.documentTitle} ${statement.folio}`,
  });

  let y = addHeader(doc, labels, fund, statement, locale);
  y = addMetricStrip(doc, copy, labels, fund, statement, settlementLines.length, y);
  y = addIdentityBlocks(doc, copy, labels, fund, statement, y);

  y = addTable(doc, labels.statementSummary, [labels.type, labels.amount], [
    [copy.reconciliation.statements.columns.assigned, formatPettyCashCurrency(statement.assignedAmount + statement.additionalDepositAmount, statement.currencyCode)],
    [copy.reconciliation.statements.columns.declaredBalance, formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)],
    [copy.reconciliation.statements.columns.estimated, formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)],
    [copy.financial.metrics.verifiedExpense, formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)],
    [copy.financial.metrics.shortages, formatPettyCashCurrency(statement.shortageAmount, statement.currencyCode)],
    [copy.reconciliation.statements.columns.pending, formatPettyCashCurrency(getStatementSettlementBalance(statement), statement.currencyCode)],
  ], y);

  y = addTable(doc, copy.reconciliation.movements.title, [
    copy.reconciliation.movements.columns.date,
    labels.type,
    labels.movementSource,
    labels.amount,
    labels.reference,
  ], statementMovements.map(movement => [
    formatPettyCashIsoDate(movement.movementDate),
    copy.status.movement[movement.type],
    movement.fromPaymentAccountName ?? movement.externalSourceName ?? copy.common.notAvailable,
    formatPettyCashCurrency(movement.amount, movement.currencyCode),
    movement.reference || copy.common.notAvailable,
  ]), y);

  y = addTable(doc, labels.receiptsTitle, [
    labels.receipt,
    labels.provider,
    labels.accountingAccount,
    labels.expenseDate,
    labels.total,
    labels.attachments,
    labels.status,
  ], settlementLines.map(line => [
    `${line.description}${line.receiptReference ? `\n${line.receiptReference}` : ''}`,
    line.providerName ?? copy.common.notAvailable,
    line.accountingAccountName ?? copy.common.notAvailable,
    formatPettyCashIsoDate(line.expenseDate),
    formatPettyCashCurrency(line.totalAmount, line.currencyCode),
    String(line.attachmentCount),
    copy.status.line[line.status],
  ]), y);

  const finalY = ensureSpace(doc, y, 20);
  setFill(doc, brand.light);
  setDraw(doc, brand.border);
  doc.roundedRect(layout.left, finalY, doc.internal.pageSize.getWidth() - layout.left - layout.right, 16, 3, 3, 'FD');
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(labels.legalNote, layout.left + 5, finalY + 6, { maxWidth: 176 });
  doc.text(labels.source, layout.left + 5, finalY + 12, { maxWidth: 176 });

  addStandardPdfFooters(doc, {
    confidentiality: 'Internal',
    folio: statement.folio,
    locale,
    version: '1.0',
  });

  return doc;
}

export function downloadPettyCashStatementPdf(context: PettyCashStatementPdfContext) {
  const doc = buildPettyCashStatementPdf(context);
  const { statement } = context;
  doc.save(buildDocumentFileName({
    documentType: 'petty-cash-account-statement',
    identifier: statement.folio,
    period: statement.periodKey,
  }));
}

export function printPettyCashStatementPdf(context: PettyCashStatementPdfContext) {
  const doc = buildPettyCashStatementPdf(context);
  return openStandardPdfForPrint(doc, { locale: context.locale });
}
