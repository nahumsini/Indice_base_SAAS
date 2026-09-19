import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BudgetHealthStatus } from '../types/finance-status.types';
import type { FinancialOverviewCostDriverType, FinancialOverviewDataSet } from '../types/financial-overview.types';
import type { FinanceLocale, FinanceTranslations } from '../translations';
import { buildKpiPrintDocumentTitle } from '../../shared/print/kpiPrintFileName';
import type { CompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { formatKpiCurrency, formatKpiPercent } from './kpiUtils';

type PdfDocumentWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

interface FinancialOverviewPdfContext {
  companyIdentity: CompanyPrintIdentity;
  copy: FinanceTranslations;
  locale: FinanceLocale;
  overview: FinancialOverviewDataSet;
  periodLabel: string;
  scopeNotes?: string;
  workspaceTables?: Array<{ title: string; columns: string[]; rows: string[][] }>;
}

const brand = {
  aqua: [89, 195, 165] as const,
  border: [216, 220, 227] as const,
  blue: [37, 99, 235] as const,
  blueSoft: [235, 242, 255] as const,
  coral: [255, 107, 94] as const,
  graphite: [34, 40, 49] as const,
  green: [20, 117, 20] as const,
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

const tableEndY = (doc: jsPDF, fallback: number) => (
  (doc as PdfDocumentWithTable).lastAutoTable?.finalY ?? fallback
);

const setText = (doc: jsPDF, color: readonly number[]) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const setFill = (doc: jsPDF, color: readonly number[]) => {
  doc.setFillColor(color[0], color[1], color[2]);
};

const setDraw = (doc: jsPDF, color: readonly number[]) => {
  doc.setDrawColor(color[0], color[1], color[2]);
};

const rgb = (color: readonly number[]): [number, number, number] => [color[0], color[1], color[2]];

const pdfLabels = (locale: FinanceLocale) => {
  if (locale.toLowerCase().startsWith('es')) {
    return {
      amount: 'Importe',
      count: 'Registros',
      health: 'Salud',
      metric: 'Metrica',
      name: 'Nombre',
      recommendation: 'Recomendacion',
      source: 'Fuente: Modulo financiero Indice ERP',
      type: 'Tipo',
      value: 'Valor',
      window: 'Ventana',
    };
  }

  return {
    amount: 'Amount',
    count: 'Records',
    health: 'Health',
    metric: 'Metric',
    name: 'Name',
    recommendation: 'Recommendation',
    source: 'Source: Indice ERP finance module',
    type: 'Type',
    value: 'Value',
    window: 'Window',
  };
};

const updatedLabel = (locale: FinanceLocale) => {
  const language = locale.toLowerCase().split('-')[0];
  return ({ en: 'Updated', es: 'Actualizado', fr: 'Mis à jour', ko: '업데이트', pt: 'Atualizado', zh: '更新' } as Record<string, string>)[language] ?? 'Updated';
};

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

const ensureSpace = (doc: jsPDF, y: number, neededHeight: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + neededHeight <= pageHeight - layout.bottom) {
    return y;
  }

  doc.addPage();
  return layout.top;
};

const addFooter = (doc: jsPDF, locale: FinanceLocale, updatedAt: Date) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setDraw(doc, brand.border);
    doc.line(layout.left, pageHeight - 14, pageWidth - layout.right, pageHeight - 14);
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Powered by www.indiceapp.com · ${updatedLabel(locale)}: ${formatGeneratedAt(updatedAt.toISOString(), locale)}`, layout.left, pageHeight - 8);
    doc.text(`${page} / ${pageCount}`, pageWidth - layout.right, pageHeight - 8, { align: 'right' });
  }
};

const addRunningHeaders = (
  doc: jsPDF,
  companyIdentity: CompanyPrintIdentity,
  reportTitle: string,
) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let page = 2; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, brand.slate);
    doc.text(companyIdentity.name || reportTitle, layout.left, 8, { maxWidth: 90 });
    doc.text(reportTitle, pageWidth - layout.right, 8, { align: 'right', maxWidth: 90 });
    setDraw(doc, brand.border);
    doc.line(layout.left, 12, pageWidth - layout.right, 12);
  }
};

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const nextY = ensureSpace(doc, y, 22);

  setText(doc, brand.text);
  doc.setFont('helvetica', 'normal');
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
    body: body.length > 0 ? body : [[head.length > 0 ? '-' : '']],
    head: [head],
    margin: { bottom: layout.bottom, left: layout.left, right: layout.right },
    startY,
    styles: {
      cellPadding: 2.8,
      fontSize: 8,
      lineColor: rgb(brand.border),
      lineWidth: 0.1,
      overflow: 'linebreak',
      textColor: rgb(brand.text),
    },
    headStyles: {
      fillColor: rgb(brand.graphite),
      fontStyle: 'normal',
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: rgb(brand.light),
    },
    theme: 'grid',
  });

  return tableEndY(doc, startY) + 11;
};

const addDocumentHeader = (
  doc: jsPDF,
  companyIdentity: CompanyPrintIdentity,
  companyLogoDataUrl: string,
  copy: FinanceTranslations,
  currency: string,
  periodLabel: string,
  generatedAt: string,
  locale: FinanceLocale,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - layout.left - layout.right;

  setText(doc, brand.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  if (companyLogoDataUrl) {
    try {
      doc.addImage(companyLogoDataUrl, 'PNG', layout.left, layout.top - 5, 24, 12, undefined, 'FAST');
    } catch {
      // The company name remains as a stable fallback when the image cannot be embedded.
    }
  }
  const identityTextX = companyLogoDataUrl ? layout.left + 29 : layout.left;
  doc.text(companyIdentity.name || copy.kpis.headerTitle, identityTextX, layout.top + 4, { maxWidth: 105 });
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(copy.kpis.headerTitle, identityTextX, layout.top + 10, { maxWidth: 105 });

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(copy.kpis.baseCurrency, pageWidth - layout.right, layout.top + 4, { align: 'right' });
  setText(doc, brand.blue);
  doc.setFontSize(15);
  doc.text(currency, pageWidth - layout.right, layout.top + 12, { align: 'right' });

  let y = layout.top + 30;
  setText(doc, brand.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(23);
  doc.text(copy.kpis.headerTitle, layout.left, y, { maxWidth: contentWidth * 0.75 });

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copy.kpis.headerSubtitle, layout.left, y + 9, { maxWidth: contentWidth * 0.72, lineHeightFactor: 1.35 });

  setFill(doc, [47, 125, 115]);
  doc.rect(layout.left, y + 23, 42, 1.2, 'F');

  setFill(doc, brand.blueSoft);
  setDraw(doc, [198, 216, 255]);
  doc.roundedRect(pageWidth - 78, y - 5, 62, 34, 3, 3, 'FD');
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(copy.kpis.pdfPeriod, pageWidth - 73, y + 4);
  setText(doc, brand.text);
  doc.setFontSize(9.5);
  doc.text(periodLabel, pageWidth - 73, y + 12, { maxWidth: 52 });
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(formatGeneratedAt(generatedAt, locale), pageWidth - 73, y + 23, { maxWidth: 52 });

  return y + 41;
};

const addMetricStrip = (
  doc: jsPDF,
  copy: FinanceTranslations,
  locale: FinanceLocale,
  currency: string,
  metrics: FinancialOverviewDataSet['metrics'],
  y: number,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 3;
  const cardWidth = (pageWidth - layout.left - layout.right - gap * 3) / 4;
  const cards = [
    { label: copy.kpis.planned, value: formatKpiCurrency(metrics.planned, currency, locale), color: brand.blue },
    { label: copy.kpis.committed, value: formatKpiCurrency(metrics.committed, currency, locale), color: brand.warning },
    { label: copy.kpis.actual, value: formatKpiCurrency(metrics.actual, currency, locale), color: brand.coral },
    { label: copy.kpis.available, value: formatKpiCurrency(metrics.available, currency, locale), color: brand.aqua },
    { label: copy.kpis.pending, value: formatKpiCurrency(metrics.pendingPayments, currency, locale), color: brand.warning },
    { label: copy.kpis.overdue, value: formatKpiCurrency(metrics.overdueAmount, currency, locale), color: brand.coral },
    { label: copy.kpis.records, value: String(metrics.expenseCount + metrics.budgetLineCount), color: brand.blue },
    { label: copy.kpis.baseCurrency, value: currency, color: brand.graphite },
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
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(card.label, x + 4.8, cardY + 6.4, { maxWidth: cardWidth - 8 });
    setText(doc, brand.text);
    doc.setFontSize(9.2);
    doc.text(card.value, x + 4.8, cardY + 14.4, { maxWidth: cardWidth - 8 });
  });

  return y + 56;
};

const addExecutiveSignals = (
  doc: jsPDF,
  title: string,
  alerts: FinancialOverviewDataSet['alerts'],
  y: number,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - layout.left - layout.right;
  const columns = Math.min(Math.max(alerts.length, 1), 3);
  const gap = 4;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const visibleAlerts = alerts.slice(0, 3);

  y = addSectionTitle(doc, title, y);
  y = ensureSpace(doc, y, 38);

  if (visibleAlerts.length === 0) {
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('-', layout.left, y + 6);
    return y + 18;
  }

  visibleAlerts.forEach((alert, index) => {
    const x = layout.left + index * (cardWidth + gap);
    const accent = index === 0 ? brand.blue : index === 1 ? brand.warning : brand.aqua;

    setFill(doc, [255, 255, 255]);
    setDraw(doc, brand.border);
    doc.roundedRect(x, y, cardWidth, 35, 3, 3, 'FD');
    setFill(doc, accent);
    doc.circle(x + 5, y + 7, 1.8, 'F');
    setText(doc, brand.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(alert.title, x + 9, y + 8, { maxWidth: cardWidth - 14 });
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.text(alert.message, x + 5, y + 17, { maxWidth: cardWidth - 10, lineHeightFactor: 1.25 });
    doc.text(alert.recommendation, x + 5, y + 28, { maxWidth: cardWidth - 10, lineHeightFactor: 1.2 });
  });

  return y + 45;
};

export async function downloadFinancialOverviewPdf({
  companyIdentity,
  copy,
  locale,
  overview,
  periodLabel,
  scopeNotes,
  workspaceTables = [],
}: FinancialOverviewPdfContext) {
  const updatedAt = new Date();
  const companyLogoDataUrl = await loadLogoDataUrl(companyIdentity.logoUrl);
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const { currency, metrics } = overview;
  const labels = pdfLabels(locale);

  doc.setProperties({
    creator: 'Indice OS',
    subject: copy.module.title,
    title: copy.kpis.headerTitle,
  });

  let y = addDocumentHeader(doc, companyIdentity, companyLogoDataUrl, copy, currency, periodLabel, overview.generatedAt, locale);
  if (scopeNotes) y = addTable(doc, copy.kpis.financialSummary, [labels.source], [[scopeNotes]], y);
  for (const table of workspaceTables) y = addTable(doc, table.title, table.columns, table.rows, y);
  y = addMetricStrip(doc, copy, locale, currency, metrics, y);
  y = addExecutiveSignals(doc, copy.kpis.executiveSignal, overview.alerts, y);
  y = addTable(doc, copy.kpis.financialSummary, [labels.metric, labels.value], [
    [copy.kpis.planned, formatKpiCurrency(metrics.planned, currency, locale)],
    [copy.kpis.committed, formatKpiCurrency(metrics.committed, currency, locale)],
    [copy.kpis.actual, formatKpiCurrency(metrics.actual, currency, locale)],
    [copy.kpis.available, formatKpiCurrency(metrics.available, currency, locale)],
    [copy.kpis.pending, formatKpiCurrency(metrics.pendingPayments, currency, locale)],
    [copy.kpis.overdue, formatKpiCurrency(metrics.overdueAmount, currency, locale)],
    [copy.kpis.records, String(metrics.expenseCount + metrics.budgetLineCount)],
  ], y);

  y = addTable(doc, copy.kpis.cashRequirements, [labels.window, labels.amount, labels.count], overview.cashRequirements.map(item => [
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
    labels.health,
  ], overview.budgetHealthRows.map(row => [
    row.name,
    formatKpiCurrency(row.planned, currency, locale),
    formatKpiCurrency(row.committed, currency, locale),
    formatKpiCurrency(row.actual, currency, locale),
    formatKpiCurrency(row.available, currency, locale),
    formatKpiPercent(row.usagePercent),
    healthLabel(row.healthStatus, copy),
  ]), y);

  y = addTable(doc, copy.kpis.concentrationRisk, [labels.type, labels.name, 'Total', '%'], overview.concentrationRisks.map(risk => [
    driverLabel(risk.driverType, copy),
    risk.name,
    formatKpiCurrency(risk.total, currency, locale),
    formatKpiPercent(risk.percentage),
  ]), y);

  Object.entries(overview.costDrivers).forEach(([type, drivers]) => {
    y = addTable(doc, driverLabel(type as FinancialOverviewCostDriverType, copy), [
      labels.name,
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

  const finalY = ensureSpace(doc, y, 16);
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(labels.source, layout.left, finalY);

  addRunningHeaders(doc, companyIdentity, copy.kpis.headerTitle);
  addFooter(doc, locale, updatedAt);
  doc.save(`${buildKpiPrintDocumentTitle({
    companyName: companyIdentity.name,
    documentName: copy.kpis.pdfFileName,
    printedAt: updatedAt,
  })}.pdf`);
}
