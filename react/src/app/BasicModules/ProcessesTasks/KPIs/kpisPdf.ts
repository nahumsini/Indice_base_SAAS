import { escapePrintHtml, printHtmlDocument } from '../../HumanResources/Control/utils/timeTablePrint';
import type { ProcessTaskKpiDashboard } from './kpisApi';
import type { KpisTranslations } from './translations';

interface PrintKpisPdfParams {
  dashboard: ProcessTaskKpiDashboard;
  copy: KpisTranslations;
  periodLabel: string;
  rangeLabel: string;
  unitLabel: string;
  businessLabel: string;
  projectLabel: string;
  focusLabel: string;
  statusLabel: string;
  collaboratorLabel: string;
  filterLines: string[];
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

function metricHtml(label: string, value: string | number) {
  return `
    <div class="metric">
      <div class="metric-value">${escapePrintHtml(String(value))}</div>
      <div class="metric-label">${escapePrintHtml(label)}</div>
    </div>
  `;
}

function emptyRowHtml(colSpan: number, label: string) {
  return `<tr><td colspan="${colSpan}" class="muted">${escapePrintHtml(label)}</td></tr>`;
}

function tableHtml(headers: string[], rows: string[][], emptyLabel: string) {
  const headHtml = headers.map((header) => `<th>${escapePrintHtml(header)}</th>`).join('');
  const rowsHtml = rows.length > 0
    ? rows
        .map((row) => `
          <tr>
            ${row.map((cell) => `<td>${cell}</td>`).join('')}
          </tr>
        `)
        .join('')
    : emptyRowHtml(headers.length, emptyLabel);

  return `
    <table>
      <thead>
        <tr>${headHtml}</tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function sectionHtml(title: string, table: string) {
  return `
    <section>
      <p class="kicker">${escapePrintHtml(title)}</p>
      ${table}
    </section>
  `;
}

function textCell(value: string | number | null | undefined) {
  return escapePrintHtml(value == null || value === '' ? '-' : String(value));
}

function strongCell(value: string | number | null | undefined, detail?: string | null) {
  const safeValue = textCell(value);
  const safeDetail = detail ? `<br><span class="muted">${escapePrintHtml(detail)}</span>` : '';
  return `<strong>${safeValue}</strong>${safeDetail}`;
}

export function printKpisDashboardPdf(params: PrintKpisPdfParams) {
  const { copy, dashboard } = params;
  const { comparison, summary } = dashboard;
  const generated = new Intl.DateTimeFormat(copy.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
  const title = `${copy.pdf.title} - ${params.rangeLabel}`;

  const metricsHtml = [
    metricHtml(copy.cards.productivity.title, `${summary.productivityScore}%`),
    metricHtml(copy.cards.compliance.title, `${summary.completionRate}%`),
    metricHtml(copy.cards.timeliness.title, `${summary.timelinessRate}%`),
    metricHtml(copy.cards.audit.title, `${summary.auditRate}%`),
    metricHtml(copy.cards.quality.title, formatWeighting(summary.averageWeighting, copy.common.notApplicable)),
    metricHtml(copy.summary.labels.withEvidence, `${summary.evidenceRate}%`),
  ].join('');

  const signalsTable = tableHtml(
    [copy.pdf.columns.metric, copy.pdf.columns.value, copy.pdf.columns.detail],
    [
      [
        strongCell(copy.signals.comparison.title),
        textCell(comparison.available ? `${comparison.productivityScore}%` : copy.common.notApplicable),
        textCell(comparison.available ? `${copy.pdf.delta}: ${formatSigned(comparison.productivityDelta, ` ${copy.common.points}`)}` : copy.signals.comparison.unavailable),
      ],
      [
        strongCell(copy.signals.unassigned.title),
        textCell(summary.unassignedOpenTasks),
        textCell(copy.signals.unassigned.description(summary.unassignedOpenTasks, summary.unassignedOverdueTasks)),
      ],
      [
        strongCell(copy.signals.overdueAging.title),
        textCell(summary.overdueTasks),
        textCell(`${copy.signals.overdueAging.oneToThree}: ${summary.overdue1To3Days} | ${copy.signals.overdueAging.fourToSeven}: ${summary.overdue4To7Days} | ${copy.signals.overdueAging.eightPlus}: ${summary.overdue8PlusDays}`),
      ],
      [
        strongCell(copy.signals.pendingAudit.title),
        textCell(summary.pendingAuditTasks),
        textCell(copy.signals.pendingAudit.description(summary.pendingAuditTasks, summary.closedTasks)),
      ],
    ],
    copy.pdf.noData,
  );

  const collaboratorsTable = tableHtml(
    [
      copy.collaboratorsTable.headers.rank,
      copy.collaboratorsTable.headers.collaborator,
      copy.collaboratorsTable.headers.context,
      copy.collaboratorsTable.headers.score,
      copy.collaboratorsTable.headers.tasks,
      copy.collaboratorsTable.headers.audit,
    ],
    dashboard.collaborators.slice(0, 10).map((row) => [
      textCell(row.rank),
      strongCell(row.collaboratorName),
      textCell(`${row.unitName ?? copy.common.noUnit} / ${row.businessName ?? copy.common.noBusiness}`),
      textCell(`${row.productivityScore}%`),
      textCell(`${row.closedTasks}/${row.totalTasks} | ${row.overdueTasks} ${copy.common.overdue}`),
      textCell(`${row.auditRate}% | ${row.pendingAuditTasks} ${copy.common.pending}`),
    ]),
    copy.collaboratorsTable.empty,
  );

  const processesTable = tableHtml(
    [
      copy.processesTable.headers.process,
      copy.processesTable.headers.score,
      copy.processesTable.headers.tasks,
      copy.processesTable.headers.audit,
      copy.processesTable.headers.next,
    ],
    dashboard.processes.map((row) => [
      strongCell(row.processTitle, row.processFolio ?? copy.common.noFolio),
      textCell(`${row.productivityScore}%`),
      textCell(copy.processesTable.details.tasks(row.closedTasks, row.totalTasks, row.overdueTasks)),
      textCell(copy.processesTable.details.audit(row.auditRate, formatWeighting(row.averageWeighting, copy.common.notApplicable))),
      textCell(row.nextOccurrenceDate ?? copy.common.noDate),
    ]),
    copy.processesTable.empty,
  );

  const projectsTable = tableHtml(
    [
      copy.projectsTable.headers.project,
      copy.projectsTable.headers.health,
      copy.projectsTable.headers.progress,
      copy.projectsTable.headers.tasks,
      copy.projectsTable.headers.audit,
      copy.projectsTable.headers.dueDate,
    ],
    dashboard.projects.map((row) => [
      strongCell(row.projectName, row.projectFolio ?? copy.common.noFolio),
      textCell(`${row.healthScore}%`),
      textCell(`${row.averageCompletion}%`),
      textCell(copy.projectsTable.details.tasks(row.closedTasks, row.totalTasks, row.overdueTasks)),
      textCell(copy.projectsTable.details.audit(row.auditRate, row.pendingAuditTasks)),
      textCell(row.dueDate ?? copy.common.noDate),
    ]),
    copy.projectsTable.empty,
  );

  printHtmlDocument({
    lang: copy.locale,
    title,
    bodyHtml: `
      <header class="document-header">
        <div class="document-topline">
          <div class="brand-lockup">
            <span class="indice-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
            <div class="brand-text">
              <strong>INDICE</strong>
              <span>${escapePrintHtml(copy.header.title)}</span>
            </div>
          </div>
          <p class="report-id">${escapePrintHtml(copy.pdf.title)}</p>
        </div>
        <div class="title-block">
          <p class="kicker">${escapePrintHtml(copy.header.title)}</p>
          <h1>${escapePrintHtml(copy.pdf.title)}</h1>
        </div>
        <div class="meta-grid">
          <div>
            <span class="meta-label">${escapePrintHtml(copy.filters.period)}</span>
            <strong class="meta-value">${escapePrintHtml(params.periodLabel)} · ${escapePrintHtml(params.rangeLabel)}</strong>
          </div>
          <div>
            <span class="meta-label">${escapePrintHtml(copy.filters.title)}</span>
            <strong class="meta-value">${params.filterLines.map(escapePrintHtml).join('<br>')}</strong>
          </div>
        </div>
      </header>
      <div class="metrics">${metricsHtml}</div>
      ${sectionHtml(copy.pdf.signals, signalsTable)}
      ${sectionHtml(copy.collaboratorsTable.title, collaboratorsTable)}
      ${sectionHtml(copy.processesTable.title, processesTable)}
      ${sectionHtml(copy.projectsTable.title, projectsTable)}
      <footer class="footer-note">
        <span>INDICE</span>
        <span>${escapePrintHtml(copy.pdf.generatedAt(generated))}</span>
      </footer>
    `,
  });
}
