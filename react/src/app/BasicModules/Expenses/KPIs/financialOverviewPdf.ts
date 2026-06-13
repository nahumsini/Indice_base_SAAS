import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BudgetHealthStatus } from '../types/finance-status.types';
import type { FinancialOverviewCostDriverType, FinancialOverviewDataSet } from '../types/financial-overview.types';
import type { FinanceLocale, FinanceTranslations } from '../translations';
import { formatKpiCurrency, formatKpiPercent } from './kpiUtils';

type PdfDocumentWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

interface FinancialOverviewPdfContext {
  copy: FinanceTranslations;
  locale: FinanceLocale;
  overview: FinancialOverviewDataSet;
  periodLabel: string;
}

const brand = {
  border: [216, 220, 227] as const,
  green: [20, 117, 20] as const,
  light: [247, 250, 247] as const,
  slate: [71, 85, 105] as const,
  text: [15, 23, 42] as const,
};

const tableEndY = (doc: jsPDF, fallback: number) => (
  (doc as PdfDocumentWithTable).lastAutoTable?.finalY ?? fallback
);

const setText = (doc: jsPDF, color: readonly number[]) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const rgb = (color: readonly number[]): [number, number, number] => [color[0], color[1], color[2]];

const dateStamp = () => new Date().toISOString().slice(0, 10);

const safeFileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-');

const healthLabel = (status: BudgetHealthStatus, copy: FinanceTranslations) => {
  if (status === BudgetHealthStatus.EXCEEDED) return copy.kpis.healthLabels.exceeded;
  if (status === BudgetHealthStatus.WARNING) return copy.kpis.healthLabels.warning;
  return copy.kpis.healthLabels.onTrack;
};

const driverLabel = (
  type: FinancialOverviewCostDriverType,
  copy: FinanceTranslations,
) => ({
  ACCOUNTING_ACCOUNT: copy.kpis.costDrivers.accountingAccounts,
  BUSINESS: copy.kpis.costDrivers.businesses,
  PAYMENT_ACCOUNT: copy.kpis.costDrivers.paymentAccounts,
  PROVIDER: copy.kpis.costDrivers.providers,
  UNIT: copy.kpis.costDrivers.units,
}[type]);

const formatGeneratedAt = (value: string, locale: FinanceLocale) => (
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
);

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(brand.border[0], brand.border[1], brand.border[2]);
    doc.line(16, pageHeight - 14, pageWidth - 16, pageHeight - 14);
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Indice ERP', 16, pageHeight - 8);
    doc.text(`${page} / ${pageCount}`, pageWidth - 16, pageHeight - 8, { align: 'right' });
  }
};

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const nextY = y > pageHeight - 36 ? 24 : y;

  if (nextY !== y) doc.addPage();
  setText(doc, brand.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, 16, nextY);
  return nextY + 4;
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
    body: body.length > 0 ? body : [[head.length > 0 ? '-' : '']],
    head: [head],
    margin: { left: 16, right: 16 },
    startY,
    styles: {
      cellPadding: 2.6,
      fontSize: 8,
      overflow: 'linebreak',
      textColor: rgb(brand.text),
    },
    headStyles: {
      fillColor: rgb(brand.green),
      fontStyle: 'bold',
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: rgb(brand.light),
    },
    theme: 'grid',
  });

  return tableEndY(doc, startY) + 10;
};

export function downloadFinancialOverviewPdf({
  copy,
  locale,
  overview,
  periodLabel,
}: FinancialOverviewPdfContext) {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { currency, metrics } = overview;

  doc.setProperties({
    creator: 'Indice ERP',
    subject: copy.module.title,
    title: copy.kpis.headerTitle,
  });

  doc.setFillColor(brand.green[0], brand.green[1], brand.green[2]);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(copy.kpis.headerTitle, 16, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copy.kpis.headerSubtitle, 16, 22, { maxWidth: pageWidth - 32 });

  setText(doc, brand.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${copy.kpis.baseCurrency}: ${currency}`, 16, 43);
  doc.text(`${copy.kpis.pdfPeriod}: ${periodLabel}`, 16, 50);
  doc.text(`${copy.kpis.pdfGeneratedAt}: ${formatGeneratedAt(overview.generatedAt, locale)}`, 16, 57);

  let y = addTable(doc, copy.kpis.financialSummary, ['Metric', 'Value'], [
    [copy.kpis.planned, formatKpiCurrency(metrics.planned, currency, locale)],
    [copy.kpis.committed, formatKpiCurrency(metrics.committed, currency, locale)],
    [copy.kpis.actual, formatKpiCurrency(metrics.actual, currency, locale)],
    [copy.kpis.available, formatKpiCurrency(metrics.available, currency, locale)],
    [copy.kpis.pending, formatKpiCurrency(metrics.pendingPayments, currency, locale)],
    [copy.kpis.overdue, formatKpiCurrency(metrics.overdueAmount, currency, locale)],
    [copy.kpis.records, String(metrics.expenseCount + metrics.budgetLineCount)],
  ], 70);

  y = addTable(doc, copy.kpis.executiveSignal, ['Title', 'Message', 'Recommendation'], overview.alerts.map(alert => [
    alert.title,
    alert.message,
    alert.recommendation,
  ]), y);

  y = addTable(doc, copy.kpis.cashRequirements, ['Window', 'Amount', copy.kpis.records], overview.cashRequirements.map(item => [
    copy.kpis.cashRequirementCopy[item.id]?.label ?? item.label,
    formatKpiCurrency(item.amount, currency, locale),
    String(item.count),
  ]), y);

  y = addTable(doc, copy.kpis.budgetHealth, [
    copy.kpis.budgetLine,
    copy.kpis.planned,
    copy.kpis.committed,
    copy.kpis.actual,
    copy.kpis.available,
    copy.kpis.consumption,
    'Health',
  ], overview.budgetHealthRows.slice(0, 12).map(row => [
    row.name,
    formatKpiCurrency(row.planned, currency, locale),
    formatKpiCurrency(row.committed, currency, locale),
    formatKpiCurrency(row.actual, currency, locale),
    formatKpiCurrency(row.available, currency, locale),
    formatKpiPercent(row.usagePercent),
    healthLabel(row.healthStatus, copy),
  ]), y);

  y = addTable(doc, copy.kpis.concentrationRisk, ['Type', 'Name', 'Total', '%'], overview.concentrationRisks.map(risk => [
    driverLabel(risk.driverType, copy),
    risk.name,
    formatKpiCurrency(risk.total, currency, locale),
    formatKpiPercent(risk.percentage),
  ]), y);

  Object.entries(overview.costDrivers).forEach(([type, drivers]) => {
    y = addTable(doc, driverLabel(type as FinancialOverviewCostDriverType, copy), [
      'Name',
      'Total',
      '%',
      copy.kpis.records,
    ], drivers.map(driver => [
      driver.name,
      formatKpiCurrency(driver.total, currency, locale),
      formatKpiPercent(driver.percentage),
      String(driver.count),
    ]), y);
  });

  addFooter(doc);
  doc.save(`${safeFileName(copy.kpis.pdfFileName)}-${dateStamp()}.pdf`);
}
