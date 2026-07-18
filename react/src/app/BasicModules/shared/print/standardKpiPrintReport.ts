import { escapeKpiPrintHtml, printKpiHtmlReport } from './kpiHtmlPrintEngine';
import type { CompanyPrintIdentity } from './useCompanyPrintIdentity';

export interface StandardKpiPrintMetric {
  detail?: string;
  label: string;
  value: string;
}

export interface StandardKpiPrintChart {
  rows: Array<{ label: string; value: number; valueLabel: string }>;
  title: string;
}

export interface StandardKpiPrintTable {
  emptyLabel: string;
  headers: string[];
  rows: string[][];
  title: string;
}

export interface StandardKpiPrintReportParams {
  charts?: StandardKpiPrintChart[];
  companyIdentity: CompanyPrintIdentity;
  documentName: string;
  locale: string;
  meta: Array<{ label: string; value: string }>;
  metrics: StandardKpiPrintMetric[];
  reportTitle: string;
  subtitle?: string;
  tables?: StandardKpiPrintTable[];
}

const chunkRows = <TRow,>(rows: TRow[], size: number): TRow[][] => {
  if (rows.length === 0) return [[]];
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => (
    rows.slice(index * size, index * size + size)
  ));
};

const tableHtml = (table: StandardKpiPrintTable, rows: string[][]) => `
  <section class="report-section">
    <div class="section-heading"><h2>${escapeKpiPrintHtml(table.title)}</h2></div>
    <table>
      <thead><tr>${table.headers.map((header) => `<th>${escapeKpiPrintHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows.length > 0
        ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeKpiPrintHtml(cell)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${table.headers.length}" class="muted">${escapeKpiPrintHtml(table.emptyLabel)}</td></tr>`}
      </tbody>
    </table>
  </section>`;

export const printStandardKpiReport = ({
  charts = [],
  companyIdentity,
  documentName,
  locale,
  meta,
  metrics,
  reportTitle,
  subtitle = '',
  tables = [],
}: StandardKpiPrintReportParams) => {
  const overviewPage = `
    <div class="report-title-block">
      <h1 class="report-title">${escapeKpiPrintHtml(reportTitle)}</h1>
      ${subtitle ? `<p class="standard-subtitle">${escapeKpiPrintHtml(subtitle)}</p>` : ''}
    </div>
    <div class="report-meta">
      ${meta.map((item) => `
        <div><span class="meta-label">${escapeKpiPrintHtml(item.label)}</span><span class="meta-value">${escapeKpiPrintHtml(item.value)}</span></div>
      `).join('')}
    </div>
    <div class="metrics">
      ${metrics.map((metric) => `
        <article class="metric">
          <div class="metric-label">${escapeKpiPrintHtml(metric.label)}</div>
          <div class="metric-value">${escapeKpiPrintHtml(metric.value)}</div>
          ${metric.detail ? `<div class="metric-detail">${escapeKpiPrintHtml(metric.detail)}</div>` : ''}
        </article>
      `).join('')}
    </div>`;

  const chartPages = chunkRows(charts, 2).filter((rows) => rows.length > 0).map((pageCharts) => `
    <div class="standard-chart-grid">
      ${pageCharts.map((chart) => {
        const maxValue = Math.max(...chart.rows.map((row) => Math.max(0, row.value)), 0);
        return `
          <section class="standard-chart">
            <div class="section-heading"><h2>${escapeKpiPrintHtml(chart.title)}</h2></div>
            <div class="standard-bars">
              ${chart.rows.length > 0 ? chart.rows.map((row) => {
                const width = maxValue > 0 ? Math.max(2, (Math.max(0, row.value) / maxValue) * 100) : 0;
                return `
                  <div class="standard-bar-row">
                    <span class="standard-bar-label">${escapeKpiPrintHtml(row.label)}</span>
                    <span class="standard-bar-track"><span class="standard-bar-fill" style="width:${width.toFixed(2)}%"></span></span>
                    <span class="standard-bar-value">${escapeKpiPrintHtml(row.valueLabel)}</span>
                  </div>`;
              }).join('') : '<p class="muted">-</p>'}
            </div>
          </section>`;
      }).join('')}
    </div>`);

  const tablePages = tables.flatMap((table) => (
    chunkRows(table.rows, 12).map((rows) => tableHtml(table, rows))
  ));

  return printKpiHtmlReport({
    companyIdentity,
    contentStyles: `
      .standard-subtitle { color: #59616a; font-size: 12px; line-height: 1.5; margin-top: 10px; max-width: 155mm; }
      .metric-detail { color: #64748b; font-size: 9px; font-weight: 400; line-height: 1.35; margin-top: 7px; }
      .standard-chart-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
      .standard-chart { border: 1px solid #d8dcdf; border-radius: 3px; padding: 14px; }
      .standard-bars { display: grid; gap: 10px; }
      .standard-bar-row { align-items: center; display: grid; gap: 9px; grid-template-columns: minmax(42mm, 1fr) 1.5fr 25mm; }
      .standard-bar-label, .standard-bar-value { color: #39414a; font-size: 10px; font-weight: 400; }
      .standard-bar-value { text-align: right; }
      .standard-bar-track { background: #e7e9eb; border-radius: 999px; height: 7px; overflow: hidden; }
      .standard-bar-fill { background: #2f7d73; border-radius: inherit; display: block; height: 100%; }
    `,
    documentName,
    locale,
    pageBodies: [overviewPage, ...chartPages, ...tablePages],
    reportTitle,
    updatedAt: new Date(),
  });
};
