import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProcessTaskKpiDashboard } from './kpisApi';
import type { KpisTranslations } from './translations';

const brand = {
  coral: [255, 107, 94] as const,
  yellow: [244, 200, 74] as const,
  aqua: [89, 195, 165] as const,
  blue: [37, 99, 235] as const,
  graphite: [34, 40, 49] as const,
  slate: [107, 114, 128] as const,
  light: [247, 248, 250] as const,
  border: [216, 220, 227] as const,
  success: [34, 197, 94] as const,
  warning: [245, 158, 11] as const,
  error: [239, 68, 68] as const,
};

interface PrintKpisPdfParams {
  dashboard: ProcessTaskKpiDashboard;
  copy: KpisTranslations;
  periodLabel: string;
  rangeLabel: string;
  unitLabel: string;
  businessLabel: string;
  collaboratorLabel: string;
}

type PdfDocumentWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

function setFill(doc: jsPDF, color: readonly number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: readonly number[]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: readonly number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function rgb(color: readonly number[]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

function tableEndY(doc: jsPDF, fallback: number) {
  return (doc as PdfDocumentWithTable).lastAutoTable?.finalY ?? fallback;
}

function drawIndiceMark(doc: jsPDF, x: number, y: number) {
  const bars = [
    { color: brand.coral, height: 8, offset: 12 },
    { color: brand.yellow, height: 12, offset: 8 },
    { color: brand.aqua, height: 16, offset: 4 },
    { color: brand.blue, height: 20, offset: 0 },
  ];

  bars.forEach((bar, index) => {
    setFill(doc, bar.color);
    doc.roundedRect(x + index * 5.4, y + bar.offset, 4.2, bar.height, 1.5, 1.5, 'F');
  });
}

function drawHeader(doc: jsPDF, params: PrintKpisPdfParams) {
  const pageWidth = doc.internal.pageSize.getWidth();
  setFill(doc, brand.graphite);
  doc.rect(0, 0, pageWidth, 38, 'F');

  drawIndiceMark(doc, 16, 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(params.copy.pdf.title, 43, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(216, 220, 227);
  doc.text(params.copy.header.subtitle, 43, 25, { maxWidth: pageWidth - 58 });

  setFill(doc, brand.yellow);
  doc.rect(0, 36.5, pageWidth, 1.5, 'F');
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  detail: string,
  accent: readonly number[],
) {
  setFill(doc, [255, 255, 255]);
  setDraw(doc, brand.border);
  doc.roundedRect(x, y, width, 28, 3, 3, 'FD');
  setFill(doc, accent);
  doc.roundedRect(x, y, 3, 28, 1.5, 1.5, 'F');

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(label, x + 6, y + 8, { maxWidth: width - 10 });

  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(value, x + 6, y + 17);

  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(detail, x + 6, y + 24, { maxWidth: width - 10 });
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  setText(doc, brand.graphite);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 16, y);
  setDraw(doc, brand.border);
  doc.line(16, y + 3, doc.internal.pageSize.getWidth() - 16, y + 3);
}

function addFooter(doc: jsPDF, copy: KpisTranslations) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setDraw(doc, brand.border);
    doc.line(16, pageHeight - 14, pageWidth - 16, pageHeight - 14);
    setText(doc, brand.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Indice', 16, pageHeight - 8);
    doc.text(copy.pdf.page(page, pageCount), pageWidth - 16, pageHeight - 8, { align: 'right' });
  }
}

function addTable(
  doc: jsPDF,
  startY: number,
  head: string[],
  body: Array<Array<string | number>>,
  emptyLabel: string,
) {
  autoTable(doc, {
    startY,
    head: [head],
    body: body.length > 0 ? body : [Array.from({ length: head.length }, (_, index) => (index === 0 ? emptyLabel : ''))],
    theme: 'grid',
    margin: { left: 16, right: 16 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
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
  });
}

function formatSigned(value: number, suffix = '') {
  if (value === 0) {
    return `0${suffix}`;
  }

  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function formatWeighting(value: number | null, fallback: string) {
  return value == null ? fallback : `${value}/5`;
}

function buildKpisPdf(params: PrintKpisPdfParams) {
  const { copy, dashboard } = params;
  const { comparison, summary } = dashboard;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardGap = 4;
  const cardWidth = (pageWidth - 32 - cardGap * 3) / 4;
  const generated = new Intl.DateTimeFormat(copy.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  doc.setProperties({
    title: copy.pdf.title,
    subject: copy.header.title,
    creator: 'Indice',
  });

  drawHeader(doc, params);

  let y = 50;
  setText(doc, brand.slate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(copy.pdf.generatedAt(generated), 16, y);
  doc.text(`${copy.filters.period}: ${params.periodLabel} | ${params.rangeLabel}`, 16, y + 5);
  doc.text(
    `${copy.filters.unit}: ${params.unitLabel} | ${copy.filters.business}: ${params.businessLabel} | ${copy.filters.collaborator}: ${params.collaboratorLabel}`,
    16,
    y + 10,
    { maxWidth: pageWidth - 32 },
  );

  y += 22;
  drawMetricCard(
    doc,
    16,
    y,
    cardWidth,
    copy.cards.productivity.title,
    `${summary.productivityScore}%`,
    comparison.available ? `${copy.pdf.delta}: ${formatSigned(comparison.productivityDelta, ' pts')}` : copy.pdf.noComparison,
    brand.blue,
  );
  drawMetricCard(
    doc,
    16 + (cardWidth + cardGap),
    y,
    cardWidth,
    copy.cards.compliance.title,
    `${summary.completionRate}%`,
    `${summary.completedTasks}/${summary.actionableTasks} ${copy.summary.labels.closed}`,
    brand.success,
  );
  drawMetricCard(
    doc,
    16 + (cardWidth + cardGap) * 2,
    y,
    cardWidth,
    copy.cards.timeliness.title,
    `${summary.timelinessRate}%`,
    copy.cards.timeliness.target(summary.overdueTasks),
    summary.overdueTasks > 0 ? brand.error : brand.success,
  );
  drawMetricCard(
    doc,
    16 + (cardWidth + cardGap) * 3,
    y,
    cardWidth,
    copy.cards.audit.title,
    `${summary.auditRate}%`,
    copy.cards.audit.target(summary.pendingAuditTasks),
    brand.aqua,
  );

  y += 40;
  addSectionTitle(doc, copy.pdf.signals, y);
  y += 8;
  addTable(
    doc,
    y,
    [copy.pdf.columns.metric, copy.pdf.columns.value, copy.pdf.columns.detail],
    [
      [
        copy.signals.comparison.title,
        comparison.available ? `${comparison.productivityScore}%` : copy.common.notApplicable,
        comparison.available ? `${copy.pdf.delta}: ${formatSigned(comparison.productivityDelta, ' pts')}` : copy.signals.comparison.unavailable,
      ],
      [
        copy.signals.unassigned.title,
        summary.unassignedOpenTasks,
        copy.signals.unassigned.description(summary.unassignedOpenTasks, summary.unassignedOverdueTasks),
      ],
      [
        copy.signals.overdueAging.title,
        summary.overdueTasks,
        `${copy.signals.overdueAging.oneToThree}: ${summary.overdue1To3Days} | ${copy.signals.overdueAging.fourToSeven}: ${summary.overdue4To7Days} | ${copy.signals.overdueAging.eightPlus}: ${summary.overdue8PlusDays}`,
      ],
      [
        copy.signals.pendingAudit.title,
        summary.pendingAuditTasks,
        copy.signals.pendingAudit.description(summary.pendingAuditTasks, summary.completedTasks),
      ],
    ],
    copy.pdf.noData,
  );
  y = tableEndY(doc, y) + 12;

  addSectionTitle(doc, copy.collaboratorsTable.title, y);
  y += 8;
  addTable(
    doc,
    y,
    [
      copy.collaboratorsTable.headers.rank,
      copy.collaboratorsTable.headers.collaborator,
      copy.collaboratorsTable.headers.context,
      copy.collaboratorsTable.headers.score,
      copy.collaboratorsTable.headers.tasks,
      copy.collaboratorsTable.headers.audit,
    ],
    dashboard.collaborators.slice(0, 10).map((row) => [
      row.rank,
      row.collaboratorName,
      `${row.unitName ?? copy.common.noUnit} / ${row.businessName ?? copy.common.noBusiness}`,
      `${row.productivityScore}%`,
      `${row.completedTasks}/${row.totalTasks} | ${row.overdueTasks} ${copy.common.overdue}`,
      `${row.auditRate}% | ${row.pendingAuditTasks} ${copy.common.pending}`,
    ]),
    copy.collaboratorsTable.empty,
  );
  y = tableEndY(doc, y) + 12;

  addSectionTitle(doc, copy.processesTable.title, y);
  y += 8;
  addTable(
    doc,
    y,
    [
      copy.processesTable.headers.process,
      copy.processesTable.headers.score,
      copy.processesTable.headers.tasks,
      copy.processesTable.headers.audit,
      copy.processesTable.headers.next,
    ],
    dashboard.processes.slice(0, 8).map((row) => [
      row.processTitle,
      `${row.productivityScore}%`,
      copy.processesTable.details.tasks(row.completedTasks, row.totalTasks, row.overdueTasks),
      copy.processesTable.details.audit(row.auditRate, formatWeighting(row.averageWeighting, copy.common.notApplicable)),
      row.nextOccurrenceDate ?? copy.common.noDate,
    ]),
    copy.processesTable.empty,
  );
  y = tableEndY(doc, y) + 12;

  addSectionTitle(doc, copy.projectsTable.title, y);
  y += 8;
  addTable(
    doc,
    y,
    [
      copy.projectsTable.headers.project,
      copy.projectsTable.headers.health,
      copy.projectsTable.headers.progress,
      copy.projectsTable.headers.tasks,
      copy.projectsTable.headers.audit,
      copy.projectsTable.headers.dueDate,
    ],
    dashboard.projects.slice(0, 8).map((row) => [
      row.projectName,
      `${row.healthScore}%`,
      `${row.averageCompletion}%`,
      copy.projectsTable.details.tasks(row.completedTasks, row.totalTasks, row.overdueTasks),
      copy.projectsTable.details.audit(row.auditRate, row.pendingAuditTasks),
      row.dueDate ?? copy.common.noDate,
    ]),
    copy.projectsTable.empty,
  );

  addFooter(doc, copy);
  return doc;
}

export function printKpisDashboardPdf(params: PrintKpisPdfParams) {
  const doc = buildKpisPdf(params);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    doc.save(params.copy.pdf.fileName);
    URL.revokeObjectURL(url);
    return;
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
