import type { KPIsTranslations } from '../translations';
import { buildKpiPrintDocumentTitle } from '../../../shared/print/kpiPrintFileName';

type KpiPrintStatus = 'healthy' | 'watch' | 'critical';

interface KpiPrintCard {
  description: string;
  status: KpiPrintStatus;
  target: string;
  title: string;
  value: string;
}

interface KpiPrintUnitRow {
  assignedAssets: string;
  attendanceRate: string;
  employees: string;
  name: string;
  pendingPermissions: string;
  readinessScore: string;
  readinessValue: number;
  unresolvedRecords: string;
}

interface KpiPrintAttentionRow {
  employee: string;
  meta: string;
  signals: string;
  status: KpiPrintStatus;
}

interface PrintKpisReportParams {
  attentionRows: KpiPrintAttentionRow[];
  attendanceRows: Array<{ name: string; value: number; valueLabel: string }>;
  cards: KpiPrintCard[];
  companyLogoUrl: string;
  companyName: string;
  copy: KPIsTranslations;
  filters: Array<{ label: string; value: string }>;
  healthInsight: string;
  lastUpdatedLabel: string;
  locale: string;
  periodLabel: string;
  unitRows: KpiPrintUnitRow[];
}

const chartColors = ['#2f7d73', '#bd9142', '#52738d', '#81776d', '#a45f68', '#9aa1a8'];

const statusClass: Record<KpiPrintStatus, string> = {
  healthy: 'is-healthy',
  watch: 'is-watch',
  critical: 'is-critical',
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const escapePrintHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolvePrintImageUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  try {
    const resolvedUrl = new URL(trimmedValue, window.location.origin);
    if (resolvedUrl.protocol === 'data:' && !trimmedValue.toLowerCase().startsWith('data:image/')) {
      return '';
    }
    return ['http:', 'https:', 'data:', 'blob:'].includes(resolvedUrl.protocol) ? resolvedUrl.href : '';
  } catch {
    return '';
  }
};

const printHtmlDocument = (title: string, bodyHtml: string, locale: string) => {
  const htmlDocument = `<!doctype html>
<html lang="${escapePrintHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; color: #24272c; font-family: "Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif; }
      body { background: #eef1f4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1, h2, h3, p { margin: 0; }
      strong { font-weight: 500; }
      .report-shell { margin: 0; padding: 0; }
      .report-page { background: #ffffff; display: flex; flex-direction: column; height: 297mm; overflow: hidden; padding: 12mm 14mm 10mm; position: relative; width: 210mm; }
      .report-page:not(:last-child) { break-after: page; page-break-after: always; }
      .page-header { align-items: center; border-bottom: 1.5px solid #cfd4d8; display: flex; flex: 0 0 auto; gap: 14px; justify-content: space-between; min-height: 12mm; padding-bottom: 9px; }
      .company-identity { align-items: center; display: flex; gap: 10px; min-width: 0; }
      .company-logo { display: block; flex: 0 0 auto; max-height: 10mm; max-width: 27mm; object-fit: contain; }
      .company-name { color: #202328; font-size: 14px; font-weight: 500; line-height: 1.15; max-width: 88mm; overflow-wrap: anywhere; }
      .page-report-title { color: #646b73; flex: 0 0 auto; font-size: 9px; font-weight: 400; letter-spacing: 0.02em; max-width: 45mm; text-align: right; }
      .page-header > .page-report-title:only-child { margin-left: auto; }
      .page-body { flex: 1 1 auto; min-height: 0; padding-top: 14px; }
      .page-footer { align-items: center; border-top: 1px solid #d8dadd; color: #7a8088; display: flex; flex: 0 0 auto; font-size: 8px; font-weight: 400; justify-content: space-between; letter-spacing: 0.02em; margin-top: 10px; padding-top: 7px; }
      .footer-brand { color: #9a9fa6; font-weight: 400; letter-spacing: 0.03em; }
      .document-header { padding-bottom: 10px; }
      .title-block { margin-top: 8px; max-width: 820px; }
      .kicker { color: #686e76; font-size: 9px; font-weight: 400; letter-spacing: 0.04em; margin-bottom: 7px; }
      .title-block h1 { color: #181b1f; font-size: 34px; font-weight: 500; letter-spacing: -0.04em; line-height: 1.06; }
      .title-block::after {
        background: #2f7d73;
        content: "";
        display: block;
        height: 3px;
        margin-top: 13px;
        width: 64px;
      }
      .meta-grid { border-bottom: 1px solid #d7d9dc; border-top: 1px solid #d7d9dc; display: grid; gap: 10px 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 13px; padding: 9px 0; }
      .meta-label,
      .section-label,
      th { color: #6b7280; display: block; font-size: 9px; font-weight: 400; letter-spacing: 0.02em; line-height: 1.3; }
      .meta-value { color: #172033; display: block; font-size: 12px; font-weight: 400; line-height: 1.25; margin-top: 3px; }
      .executive-grid { display: grid; gap: 10px; grid-template-columns: 1.25fr 0.75fr; margin: 12px 0; }
      .insight-panel,
      .illustration-panel,
      .chart-panel,
      .kpi-card { border: 1px solid #d8dcdf; border-radius: 3px; page-break-inside: avoid; }
      .table-panel { border: 1px solid #d8dcdf; border-radius: 3px; break-inside: auto; page-break-inside: auto; }
      .insight-panel { background: #f7faf9; border-color: #d5e2df; border-left: 3px solid #2f7d73; color: #343a40; padding: 14px 16px; }
      .insight-panel h2 { color: #202328; font-size: 18px; font-weight: 500; margin-bottom: 7px; }
      .insight-panel p { font-size: 12px; line-height: 1.45; }
      .illustration-panel { background: #fbfbfa; display: block; min-height: 96px; overflow: hidden; padding: 14px; }
      .illustration-copy strong { color: #111827; display: block; font-size: 20px; line-height: 1.1; margin-top: 8px; }
      .illustration-copy span { color: #64748b; display: block; font-size: 11px; font-weight: 400; margin-top: 7px; }
      .card-grid { display: grid; gap: 9px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 10px 0 12px; }
      .kpi-card { background: #fcfcfb; border-color: #cfd4d8; min-height: 110px; padding: 13px 14px; }
      .kpi-card.is-healthy,
      .kpi-card.is-watch,
      .kpi-card.is-critical { border-top: 1px solid #aeb4ba; }
      .card-status { align-items: center; background: transparent; display: inline-flex; font-size: 8px; font-weight: 400; gap: 5px; letter-spacing: 0.02em; margin-bottom: 9px; padding: 0; }
      .card-status::before,
      .status-pill::before { border-radius: 999px; content: ""; display: inline-block; height: 5px; width: 5px; }
      .is-healthy .card-status,
      .is-watch .card-status,
      .is-critical .card-status { background: transparent; color: #555c65; }
      .is-healthy .card-status::before,
      .status-pill.is-healthy::before { background: #2f7d73; }
      .is-watch .card-status::before,
      .status-pill.is-watch::before { background: #bd9142; }
      .is-critical .card-status::before,
      .status-pill.is-critical::before { background: #a45f68; }
      .card-title { color: #3e4650; font-size: 12px; font-weight: 500; line-height: 1.2; min-height: 27px; }
      .card-value { color: #171a1e; font-size: 30px; font-weight: 500; letter-spacing: -0.035em; line-height: 1; margin-top: 8px; }
      .card-note { color: #64748b; font-size: 9px; font-weight: 400; line-height: 1.35; margin-top: 7px; }
      .card-description { color: #475569; font-size: 9px; line-height: 1.35; margin-top: 5px; }
      .charts-grid { display: grid; gap: 10px; grid-template-columns: 1fr; margin-bottom: 12px; }
      .chart-panel { padding: 13px; }
      .chart-title { align-items: baseline; display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .chart-title h2 { color: #111827; font-size: 16px; font-weight: 500; }
      .donut-layout { align-items: center; display: grid; gap: 14px; grid-template-columns: 118px 1fr; }
      .donut { align-items: center; border-radius: 50%; display: flex; height: 118px; justify-content: center; position: relative; width: 118px; }
      .donut::after { background: #ffffff; border-radius: 50%; content: ""; height: 66px; position: absolute; width: 66px; }
      .donut strong { color: #111827; font-size: 18px; font-weight: 500; position: relative; z-index: 1; }
      .legend { display: grid; gap: 6px; }
      .legend-row { align-items: center; display: grid; gap: 8px; grid-template-columns: 9px 1fr auto; }
      .legend-dot { border-radius: 999px; display: block; height: 9px; width: 9px; }
      .legend-name, .legend-value { color: #475569; font-size: 10px; font-weight: 400; }
      .bar-list { display: grid; gap: 7px; }
      .bar-row { align-items: center; display: grid; gap: 10px; grid-template-columns: minmax(130px, 1fr) 2fr 42px; }
      .bar-name { color: #334155; font-size: 10px; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bar-track { background: #e5e7eb; border-radius: 999px; height: 9px; overflow: hidden; }
      .bar-fill { background: #2f7d73; border-radius: inherit; height: 100%; }
      .bar-value { color: #111827; font-size: 10px; font-weight: 500; text-align: right; }
      .tables-grid { display: block; }
      .tables-grid .table-panel + .table-panel { margin-top: 10px; }
      .table-panel { overflow: visible; }
      .table-panel h2 { border-bottom: 1px solid #d7dde4; color: #25292e; font-size: 15px; font-weight: 500; padding: 10px 11px; }
      table { border-collapse: collapse; width: 100%; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 7px 8px; text-align: left; vertical-align: top; }
      th { background: #f6f7f7; display: table-cell; }
      td { color: #172033; font-size: 9px; font-weight: 400; line-height: 1.22; }
      td .muted { color: #64748b; display: block; font-size: 9px; font-weight: 400; margin-top: 2px; }
      .status-pill { align-items: center; background: transparent; display: inline-flex; font-size: 8px; font-weight: 400; gap: 5px; padding: 0; white-space: nowrap; }
      .status-pill.is-healthy,
      .status-pill.is-watch,
      .status-pill.is-critical { background: transparent; color: #555c65; }
      .section-heading { align-items: end; border-bottom: 2px solid #363b40; display: flex; justify-content: space-between; margin-bottom: 13px; padding-bottom: 8px; }
      .section-heading h2 { color: #202429; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; }
      .section-heading span { color: #2f7d73; font-size: 10px; font-weight: 400; letter-spacing: 0.03em; }
      @media print {
        html, body { background: #ffffff; height: auto; }
        .report-shell { padding: 0; }
        .report-page { margin: 0; }
        .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .chart-panel, .kpi-card { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main class="report-shell">${bodyHtml}</main>
  </body>
</html>`;

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return;
  }

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
  };
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 30_000);
  }, { once: true });
  setTimeout(cleanup, 60_000);
};

const buildDonutBackground = (rows: Array<{ value: number }>) => {
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.value), 0);
  if (total <= 0) {
    return '#e5e7eb';
  }

  let current = 0;
  const segments = rows.map((row, index) => {
    const start = current;
    current += (Math.max(0, row.value) / total) * 100;
    return `${chartColors[index % chartColors.length]} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  });
  return `conic-gradient(${segments.join(', ')})`;
};

export const printKpisReport = ({
  attentionRows,
  attendanceRows,
  cards,
  companyLogoUrl,
  companyName,
  copy,
  filters,
  healthInsight,
  lastUpdatedLabel,
  locale,
  periodLabel,
  unitRows,
}: PrintKpisReportParams) => {
  const resolvedCompanyLogoUrl = resolvePrintImageUrl(companyLogoUrl);
  const trimmedCompanyName = companyName.trim();
  const printDocumentTitle = buildKpiPrintDocumentTitle({
    companyName: trimmedCompanyName,
    documentName: copy.title,
  });
  const chartUnits = unitRows.slice(0, 8);
  const attendanceTotal = attendanceRows.reduce((sum, row) => sum + Math.max(0, row.value), 0);
  const donutBackground = buildDonutBackground(attendanceRows);
  const healthCard = cards.find((card) => card.value.includes('/100')) ?? cards[cards.length - 1];

  const filterRows = filters
    .map(({ label, value }) => `
      <div>
        <span class="meta-label">${escapePrintHtml(label)}</span>
        <strong class="meta-value">${escapePrintHtml(value)}</strong>
      </div>
    `)
    .join('');

  const companyIdentityHtml = resolvedCompanyLogoUrl || trimmedCompanyName
    ? `
      <div class="company-identity">
        ${resolvedCompanyLogoUrl
          ? `<img class="company-logo" src="${escapePrintHtml(resolvedCompanyLogoUrl)}" alt="${escapePrintHtml(trimmedCompanyName)}" />`
          : ''}
        ${trimmedCompanyName ? `<span class="company-name">${escapePrintHtml(trimmedCompanyName)}</span>` : ''}
      </div>
    `
    : '';

  const buildCardsHtml = (rows: KpiPrintCard[]) => rows.map((card) => `
      <article class="kpi-card ${statusClass[card.status]}">
        <span class="card-status">${escapePrintHtml(copy.dashboard.statuses[card.status])}</span>
        <p class="card-title">${escapePrintHtml(card.title)}</p>
        <p class="card-value">${escapePrintHtml(card.value)}</p>
        <p class="card-note">${escapePrintHtml(card.target)}</p>
        <p class="card-description">${escapePrintHtml(card.description)}</p>
      </article>
    `).join('');

  const attendanceLegendHtml = attendanceRows.length > 0
    ? attendanceRows.map((row, index) => `
      <div class="legend-row">
        <span class="legend-dot" style="background:${chartColors[index % chartColors.length]}"></span>
        <span class="legend-name">${escapePrintHtml(row.name)}</span>
        <span class="legend-value">${escapePrintHtml(row.valueLabel)}</span>
      </div>
    `).join('')
    : `<p class="legend-value">${escapePrintHtml(copy.dashboard.common.noData)}</p>`;

  const unitBarsHtml = chartUnits.length > 0
    ? chartUnits.map((row) => `
      <div class="bar-row">
        <span class="bar-name">${escapePrintHtml(row.name)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${clampPercent(row.readinessValue)}%"></span></span>
        <span class="bar-value">${escapePrintHtml(row.readinessScore)}</span>
      </div>
    `).join('')
    : `<p class="legend-value">${escapePrintHtml(copy.dashboard.table.noRows)}</p>`;

  const buildUnitRowsHtml = (rows: KpiPrintUnitRow[]) => rows.length > 0
    ? rows.map((row) => `
      <tr>
        <td>${escapePrintHtml(row.name)}</td>
        <td>${escapePrintHtml(row.employees)}</td>
        <td>${escapePrintHtml(row.attendanceRate)}</td>
        <td>${escapePrintHtml(row.pendingPermissions)}</td>
        <td>${escapePrintHtml(row.unresolvedRecords)}</td>
        <td>${escapePrintHtml(row.assignedAssets)}</td>
        <td><strong>${escapePrintHtml(row.readinessScore)}</strong></td>
      </tr>
    `).join('')
    : `<tr><td colspan="7">${escapePrintHtml(copy.dashboard.table.noRows)}</td></tr>`;

  const buildAttentionRowsHtml = (rows: KpiPrintAttentionRow[]) => rows.length > 0
    ? rows.map((row) => `
      <tr>
        <td><strong>${escapePrintHtml(row.employee)}</strong><span class="muted">${escapePrintHtml(row.meta)}</span></td>
        <td>${escapePrintHtml(row.signals)}</td>
        <td><span class="status-pill ${statusClass[row.status]}">${escapePrintHtml(copy.dashboard.statuses[row.status])}</span></td>
      </tr>
    `).join('')
    : `<tr><td colspan="3">${escapePrintHtml(copy.dashboard.sections.noAttentionSignals)}</td></tr>`;

  const renderUnitTable = (rows: KpiPrintUnitRow[]) => `
    <article class="table-panel">
      <h2>${escapePrintHtml(copy.dashboard.sections.unitSummary)}</h2>
      <table>
        <thead><tr>
          <th>${escapePrintHtml(copy.dashboard.table.unit)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.employees)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.attendance)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.permissions)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.records)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.assets)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.readiness)}</th>
        </tr></thead>
        <tbody>${buildUnitRowsHtml(rows)}</tbody>
      </table>
    </article>`;

  const renderAttentionTable = (rows: KpiPrintAttentionRow[]) => `
    <article class="table-panel">
      <h2>${escapePrintHtml(copy.dashboard.sections.attentionQueue)}</h2>
      <table>
        <thead><tr>
          <th>${escapePrintHtml(copy.dashboard.table.employees)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.records)}</th>
          <th>${escapePrintHtml(copy.dashboard.table.readiness)}</th>
        </tr></thead>
        <tbody>${buildAttentionRowsHtml(rows)}</tbody>
      </table>
    </article>`;

  const headlineCards = cards.slice(0, 4);
  const supportingCards = cards.slice(4, 8);
  const pageBodies: string[] = [
    `
      <header class="document-header">
        <div class="title-block">
          <p class="kicker">01 · ${escapePrintHtml(copy.dashboard.sections.executiveSignal)}</p>
          <h1>${escapePrintHtml(copy.title)}</h1>
        </div>
        <div class="meta-grid">${filterRows}</div>
      </header>
      <section class="executive-grid">
        <article class="insight-panel">
          <span class="section-label">${escapePrintHtml(copy.dashboard.sections.executiveSignal)}</span>
          <h2>${escapePrintHtml(healthCard?.title ?? copy.dashboard.sections.executiveSignal)} · ${escapePrintHtml(healthCard?.value ?? '')}</h2>
          <p>${escapePrintHtml(healthInsight)}</p>
        </article>
        <article class="illustration-panel">
          <div class="illustration-copy">
            <span class="section-label">${escapePrintHtml(copy.dashboard.table.readiness)}</span>
            <strong>${escapePrintHtml(periodLabel)}</strong>
            <span>${escapePrintHtml(copy.subtitle)}</span>
          </div>
        </article>
      </section>
      <section class="card-grid">${buildCardsHtml(headlineCards)}</section>
    `,
    `
      <div class="section-heading">
        <h2>${escapePrintHtml(copy.dashboard.sections.unitPerformance)}</h2>
        <span>02</span>
      </div>
      <section class="card-grid">${buildCardsHtml(supportingCards)}</section>
      <section class="charts-grid">
        <article class="chart-panel">
          <div class="chart-title">
            <h2>${escapePrintHtml(copy.dashboard.sections.attendanceMix)}</h2>
            <span class="section-label">${escapePrintHtml(String(attendanceTotal))}</span>
          </div>
          <div class="donut-layout">
            <div class="donut" style="background:${donutBackground}"><strong>${escapePrintHtml(String(attendanceTotal))}</strong></div>
            <div class="legend">${attendanceLegendHtml}</div>
          </div>
        </article>
        <article class="chart-panel">
          <div class="chart-title">
            <h2>${escapePrintHtml(copy.dashboard.sections.unitPerformance)}</h2>
            <span class="section-label">${escapePrintHtml(copy.dashboard.table.readiness)} · ${escapePrintHtml(`${chartUnits.length}/${unitRows.length}`)}</span>
          </div>
          <div class="bar-list">${unitBarsHtml}</div>
        </article>
      </section>
    `,
  ];

  if (unitRows.length <= 5 && attentionRows.length <= 8) {
    pageBodies.push(`
      <div class="section-heading">
        <h2>${escapePrintHtml(copy.dashboard.sections.unitSummary)} · ${escapePrintHtml(copy.dashboard.sections.attentionQueue)}</h2>
        <span>03</span>
      </div>
      <section class="tables-grid">
        ${renderUnitTable(unitRows)}
        ${renderAttentionTable(attentionRows)}
      </section>
    `);
  } else {
    const unitChunks = Array.from({ length: Math.max(1, Math.ceil(unitRows.length / 12)) }, (_, index) =>
      unitRows.slice(index * 12, index * 12 + 12));
    const attentionChunks = Array.from({ length: Math.max(1, Math.ceil(attentionRows.length / 10)) }, (_, index) =>
      attentionRows.slice(index * 10, index * 10 + 10));

    unitChunks.forEach((rows) => pageBodies.push(`
      <div class="section-heading"><h2>${escapePrintHtml(copy.dashboard.sections.unitSummary)}</h2><span>03</span></div>
      <section class="tables-grid">${renderUnitTable(rows)}</section>
    `));
    attentionChunks.forEach((rows) => pageBodies.push(`
      <div class="section-heading"><h2>${escapePrintHtml(copy.dashboard.sections.attentionQueue)}</h2><span>04</span></div>
      <section class="tables-grid">${renderAttentionTable(rows)}</section>
    `));
  }

  const reportHtml = pageBodies.map((pageBody, index) => `
    <section class="report-page">
      <header class="page-header">
        ${companyIdentityHtml}
        <p class="page-report-title">${escapePrintHtml(copy.title)}</p>
      </header>
      <div class="page-body">${pageBody}</div>
      <footer class="page-footer">
        <span><span class="footer-brand">Powered by www.indiceapp.com</span> · ${escapePrintHtml(copy.dashboard.labels.lastUpdated)}: ${escapePrintHtml(lastUpdatedLabel)}</span>
        <span>${index + 1} / ${pageBodies.length}</span>
      </footer>
    </section>
  `).join('');

  printHtmlDocument(printDocumentTitle, reportHtml, locale);
};
