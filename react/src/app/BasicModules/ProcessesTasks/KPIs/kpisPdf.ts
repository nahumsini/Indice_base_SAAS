import { measurementCards } from './measurementPresentation';
import { getTaskKpiWorkspaceCopy } from './translations/workspaceCopy';
import {
  escapeKpiPrintHtml as escapePrintHtml,
  printKpiHtmlReport,
} from '../../shared/print/kpiHtmlPrintEngine';
import type { CompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import type { ProcessTaskKpiDashboard } from './kpisApi';
import type { KpisTranslations } from './translations';
import { getProcessTaskStandardUiCopy } from './translations/standardUiCopy';

interface PrintKpisPdfParams {
  companyIdentity: CompanyPrintIdentity;
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
    <section class="report-section">
      <div class="section-heading"><h2>${escapePrintHtml(title)}</h2></div>
      ${table}
    </section>
  `;
}

function chunkRows<TRow>(rows: TRow[], size: number): TRow[][] {
  if (rows.length === 0) return [[]];
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => (
    rows.slice(index * size, index * size + size)
  ));
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
  const standardCopy = getProcessTaskStandardUiCopy(copy.locale);
  const { comparison, summary } = dashboard;
  const workspaceCopy = getTaskKpiWorkspaceCopy(copy.locale);
  const measurement = dashboard.measurements;
  const updatedAt = new Date();

  const metricsHtml = measurement ? measurementCards(measurement.summary, workspaceCopy, copy.locale).map(card => metricHtml(card.label, card.value)).join('') : dashboard.cards.map((card) => {
    const localized = standardCopy.cards[card.id];
    return metricHtml(localized?.title ?? card.title, card.value);
  }).join('');

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

  const collaboratorPages = chunkRows(dashboard.collaborators, 10).map((rows) => sectionHtml(
    copy.collaboratorsTable.title,
    tableHtml(
      [
        copy.collaboratorsTable.headers.rank,
        copy.collaboratorsTable.headers.collaborator,
        copy.collaboratorsTable.headers.context,
        copy.collaboratorsTable.headers.score,
        copy.collaboratorsTable.headers.tasks,
        copy.collaboratorsTable.headers.audit,
      ],
      rows.map((row) => [
        textCell(row.rank),
        strongCell(row.collaboratorName),
        textCell(`${row.unitName ?? copy.common.noUnit} / ${row.businessName ?? copy.common.noBusiness}`),
        textCell(`${row.productivityScore}%`),
        textCell(`${row.closedTasks}/${row.totalTasks} | ${row.overdueTasks} ${copy.common.overdue}`),
        textCell(`${row.auditRate}% | ${row.pendingAuditTasks} ${copy.common.pending}`),
      ]),
      copy.collaboratorsTable.empty,
    ),
  ));

  const processPages = chunkRows(dashboard.processes, 12).map((rows) => sectionHtml(
    copy.processesTable.title,
    tableHtml(
      [
        copy.processesTable.headers.process,
        copy.processesTable.headers.score,
        copy.processesTable.headers.tasks,
        copy.processesTable.headers.audit,
        copy.processesTable.headers.next,
      ],
      rows.map((row) => [
        strongCell(row.processTitle, row.processFolio ?? copy.common.noFolio),
        textCell(`${row.productivityScore}%`),
        textCell(copy.processesTable.details.tasks(row.closedTasks, row.totalTasks, row.overdueTasks)),
        textCell(copy.processesTable.details.audit(row.auditRate, formatWeighting(row.averageWeighting, copy.common.notApplicable))),
        textCell(row.nextOccurrenceDate ?? copy.common.noDate),
      ]),
      copy.processesTable.empty,
    ),
  ));

  const projectPages = chunkRows(dashboard.projects, 12).map((rows) => sectionHtml(
    copy.projectsTable.title,
    tableHtml(
      [
        copy.projectsTable.headers.project,
        copy.projectsTable.headers.health,
        copy.projectsTable.headers.progress,
        copy.projectsTable.headers.tasks,
        copy.projectsTable.headers.audit,
        copy.projectsTable.headers.dueDate,
      ],
      rows.map((row) => [
        strongCell(row.projectName, row.projectFolio ?? copy.common.noFolio),
        textCell(`${row.healthScore}%`),
        textCell(`${row.averageCompletion}%`),
        textCell(copy.projectsTable.details.tasks(row.closedTasks, row.totalTasks, row.overdueTasks)),
        textCell(copy.projectsTable.details.audit(row.auditRate, row.pendingAuditTasks)),
        textCell(row.dueDate ?? copy.common.noDate),
      ]),
      copy.projectsTable.empty,
    ),
  ));

  const measurementPages: string[] = [];
  if (measurement) {
    const m = measurement.summary;
    const duration = (n: number | null) => n == null ? workspaceCopy.noSample : `${new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 1 }).format(n)} ${workspaceCopy.days}`;
    measurementPages.push(sectionHtml(workspaceCopy.analysis, tableHtml(
      [copy.pdf.columns.metric, copy.pdf.columns.value],
      [
        [workspaceCopy.cutoff, measurement.cutoffDate],
        [workspaceCopy.aging, `1–3: ${m.late1To3Days} · 4–7: ${m.late4To7Days} · 8+: ${m.late8PlusDays}`],
        [workspaceCopy.highPriority, `${m.highPriorityLateTasks} / ${m.highPriorityOpenTasks}`],
        [workspaceCopy.wait, duration(m.medianAuditWaitDays)],
        [workspaceCopy.reviewTime, `${duration(m.medianAuditDurationDays)} (${workspaceCopy.sample}: ${m.auditDurationSamples})`],
        [workspaceCopy.elapsed, `${duration(m.medianElapsedDays)} (${workspaceCopy.sample}: ${m.elapsedSamples})`],
        [workspaceCopy.distribution, m.ratingDistribution.map((count, rating) => `${rating}/5: ${count}`).join(' · ')],
        [workspaceCopy.required, String(m.requiredEvidenceTasks)],
        [workspaceCopy.openMissing, String(m.openMissingEvidence)],
        [workspaceCopy.closedMissing, String(m.closedMissingEvidence)],
        [workspaceCopy.upcoming, `${m.upcomingTasks} (${measurement.cutoffDate} – ${measurement.upcomingThrough})`],
        [workspaceCopy.runs, String(m.observedRuns)],
        [workspaceCopy.lateRuns, String(m.runsWithLateTasks)],
        [workspaceCopy.completeRuns, String(m.fullyObservedCompletedRuns)],
      ].map(row => row.map(textCell)), workspaceCopy.empty,
    )) + `<p class="muted">${escapePrintHtml(`${workspaceCopy.scopeNote} ${workspaceCopy.elapsedNote} ${workspaceCopy.runsNote}`)}</p>`);
    const measuredGroups = [
      { title: workspaceCopy.units, rows: dashboard.units.map(row => ({ name: row.unitName, m: row.measurements })) },
      { title: workspaceCopy.collaborators, rows: dashboard.collaborators.map(row => ({ name: row.collaboratorName, m: row.measurements })) },
      { title: workspaceCopy.processes, rows: dashboard.processes.map(row => ({ name: row.processTitle, m: row.measurements })) },
      { title: workspaceCopy.projects, rows: dashboard.projects.map(row => ({ name: row.projectName + (row.deadlineExceeded ? ` · ${workspaceCopy.projectLate}` : ''), m: row.measurements })) },
    ];
    for (const group of measuredGroups) {
      measurementPages.push(...chunkRows(group.rows, 12).map(rows => sectionHtml(group.title, tableHtml(
        [group.title, workspaceCopy.open, workspaceCopy.late, workspaceCopy.onTime, workspaceCopy.quality, workspaceCopy.audit],
        rows.map(({ name, m }) => [
          strongCell(name), textCell(m?.openTasks), textCell(m?.lateOpenTasks),
          textCell(m?.onTimeRate == null ? workspaceCopy.noSample : `${m.onTimeRate}% (${m.onTimeDeliveries}/${m.eligibleDeliveries})`),
          textCell(m?.averageRating == null ? workspaceCopy.noSample : `${m.averageRating}/5 (${m.ratedTasks})`),
          textCell(m?.pendingAuditTasks),
        ]), workspaceCopy.empty,
      ))));
    }
  }

  printKpiHtmlReport({
    companyIdentity: params.companyIdentity,
    documentName: copy.pdf.title,
    locale: copy.locale,
    pageBodies: [
      `
        <div class="report-title-block">
          <p class="report-kicker">${escapePrintHtml(copy.header.title)}</p>
          <h1 class="report-title">${escapePrintHtml(copy.pdf.title)}</h1>
        </div>
        <div class="report-meta">
          <div>
            <span class="meta-label">${escapePrintHtml(copy.filters.period)}</span>
            <span class="meta-value">${escapePrintHtml(params.periodLabel)} · ${escapePrintHtml(params.rangeLabel)}</span>
          </div>
          <div>
            <span class="meta-label">${escapePrintHtml(copy.filters.title)}</span>
            <span class="meta-value">${params.filterLines.map(escapePrintHtml).join('<br>')}</span>
          </div>
        </div>
        <div class="metrics">${metricsHtml}</div>
        <p class="muted">${escapePrintHtml(workspaceCopy.scopeNote)}</p>
        ${sectionHtml(workspaceCopy.reference, signalsTable)}
      `,
      ...measurementPages,
      ...collaboratorPages,
      ...processPages,
      ...projectPages,
    ],
    reportTitle: copy.pdf.title,
    updatedAt,
  });
}
