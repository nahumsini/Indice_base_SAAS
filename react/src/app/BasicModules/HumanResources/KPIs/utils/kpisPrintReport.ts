import type { KPIsTranslations } from '../translations';

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
  copy: KPIsTranslations;
  filters: Array<{ label: string; value: string }>;
  healthInsight: string;
  lastUpdatedLabel: string;
  locale: string;
  periodLabel: string;
  unitRows: KpiPrintUnitRow[];
}

const chartColors = ['#10b981', '#f59e0b', '#0ea5e9', '#64748b', '#e11d48', '#94a3b8'];

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

const printHtmlDocument = (title: string, bodyHtml: string, locale: string) => {
  const htmlDocument = `<!doctype html>
<html lang="${escapePrintHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; color: #111827; font-family: "Segoe UI", Arial, Helvetica, sans-serif; }
      body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1, h2, h3, p { margin: 0; }
      .report-shell { padding: 18px 18px 20px; }
      .document-header { border-bottom: 1px solid #d1d5db; padding-bottom: 13px; }
      .document-topline { align-items: center; display: flex; justify-content: space-between; gap: 18px; }
      .brand-lockup { align-items: center; display: inline-flex; gap: 11px; min-width: 0; }
      .indice-mark { align-items: end; display: inline-grid; gap: 3px; grid-template-columns: repeat(4, 7px); height: 25px; }
      .indice-mark span { border-radius: 7px 7px 3px 3px; display: block; width: 7px; }
      .indice-mark span:nth-child(1) { background: #ff6b5e; height: 11px; }
      .indice-mark span:nth-child(2) { background: #f4c84a; height: 15px; }
      .indice-mark span:nth-child(3) { background: #59c3a5; height: 20px; }
      .indice-mark span:nth-child(4) { background: #2563eb; height: 25px; }
      .brand-text { align-items: baseline; display: inline-flex; gap: 12px; }
      .brand-text strong,
      .report-id { color: #111827; font-size: 11px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
      .brand-text span { color: #4b5563; font-size: 10px; font-weight: 750; letter-spacing: 0.1em; text-transform: uppercase; }
      .title-block { margin-top: 22px; max-width: 760px; }
      .kicker { color: #1f3a5f; font-size: 10px; font-weight: 850; letter-spacing: 0.14em; margin-bottom: 8px; text-transform: uppercase; }
      .title-block h1 { color: #111827; font-size: 28px; font-weight: 850; letter-spacing: 0; line-height: 1.08; }
      .title-block::after {
        background: linear-gradient(90deg, #ff6b5e 0 25%, #f4c84a 25% 50%, #59c3a5 50% 75%, #2563eb 75% 100%);
        content: "";
        display: block;
        height: 3px;
        margin-top: 15px;
        width: 96px;
      }
      .meta-grid { border-bottom: 1px solid #d1d5db; border-top: 1px solid #d1d5db; display: grid; gap: 18px; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 18px; padding: 12px 0; }
      .meta-label,
      .section-label,
      th { color: #6b7280; display: block; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; line-height: 1.3; text-transform: uppercase; }
      .meta-value { color: #111827; display: block; font-size: 13px; font-weight: 800; line-height: 1.25; margin-top: 5px; }
      .executive-grid { display: grid; gap: 14px; grid-template-columns: 1.2fr 0.8fr; margin: 14px 0; }
      .insight-panel,
      .illustration-panel,
      .chart-panel,
      .kpi-card,
      .table-panel { border: 1px solid #d1d5db; border-radius: 14px; page-break-inside: avoid; }
      .insight-panel { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; padding: 14px 16px; }
      .insight-panel h2 { color: #111827; font-size: 16px; margin-bottom: 7px; }
      .insight-panel p { font-size: 12px; line-height: 1.45; }
      .illustration-panel { background: linear-gradient(135deg, #f8fafc, #ecfdf5); display: grid; grid-template-columns: 1fr auto; min-height: 104px; overflow: hidden; padding: 14px; }
      .illustration-copy strong { color: #111827; display: block; font-size: 18px; line-height: 1.1; margin-top: 8px; }
      .illustration-copy span { color: #64748b; display: block; font-size: 11px; font-weight: 700; margin-top: 7px; }
      .mini-dashboard { align-self: center; display: grid; gap: 6px; grid-template-columns: repeat(4, 18px); height: 72px; padding: 10px 12px; }
      .mini-dashboard span { align-self: end; border-radius: 7px 7px 3px 3px; display: block; width: 18px; }
      .mini-dashboard span:nth-child(1) { background: #2563eb; height: 34px; }
      .mini-dashboard span:nth-child(2) { background: #55c3a7; height: 56px; }
      .mini-dashboard span:nth-child(3) { background: #f4c84a; height: 42px; }
      .mini-dashboard span:nth-child(4) { background: #ff6b5e; height: 24px; }
      .card-grid { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 12px 0 14px; }
      .kpi-card { min-height: 96px; padding: 10px 11px; }
      .kpi-card.is-healthy { border-top: 4px solid #10b981; }
      .kpi-card.is-watch { border-top: 4px solid #f59e0b; }
      .kpi-card.is-critical { border-top: 4px solid #e11d48; }
      .card-status { border-radius: 999px; display: inline-block; font-size: 8px; font-weight: 850; letter-spacing: 0.06em; margin-bottom: 8px; padding: 3px 8px; text-transform: uppercase; }
      .is-healthy .card-status { background: #dcfce7; color: #047857; }
      .is-watch .card-status { background: #fef3c7; color: #b45309; }
      .is-critical .card-status { background: #ffe4e6; color: #be123c; }
      .card-title { color: #475569; font-size: 11px; font-weight: 850; line-height: 1.2; min-height: 26px; }
      .card-value { color: #111827; font-size: 24px; font-weight: 900; line-height: 1; margin-top: 7px; }
      .card-note { color: #64748b; font-size: 9px; font-weight: 700; line-height: 1.35; margin-top: 7px; }
      .charts-grid { display: grid; gap: 12px; grid-template-columns: 0.86fr 1.14fr; margin-bottom: 14px; }
      .chart-panel { padding: 13px; }
      .chart-title { align-items: baseline; display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .chart-title h2 { color: #111827; font-size: 15px; font-weight: 850; }
      .donut-layout { align-items: center; display: grid; gap: 14px; grid-template-columns: 118px 1fr; }
      .donut { align-items: center; border-radius: 50%; display: flex; height: 118px; justify-content: center; position: relative; width: 118px; }
      .donut::after { background: #ffffff; border-radius: 50%; content: ""; height: 66px; position: absolute; width: 66px; }
      .donut strong { color: #111827; font-size: 18px; font-weight: 900; position: relative; z-index: 1; }
      .legend { display: grid; gap: 6px; }
      .legend-row { align-items: center; display: grid; gap: 8px; grid-template-columns: 9px 1fr auto; }
      .legend-dot { border-radius: 999px; display: block; height: 9px; width: 9px; }
      .legend-name, .legend-value { color: #475569; font-size: 10px; font-weight: 750; }
      .bar-list { display: grid; gap: 7px; }
      .bar-row { align-items: center; display: grid; gap: 10px; grid-template-columns: minmax(130px, 1fr) 2fr 42px; }
      .bar-name { color: #334155; font-size: 10px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bar-track { background: #e5e7eb; border-radius: 999px; height: 9px; overflow: hidden; }
      .bar-fill { background: #55c3a7; border-radius: inherit; height: 100%; }
      .bar-value { color: #111827; font-size: 10px; font-weight: 850; text-align: right; }
      .tables-grid { display: grid; gap: 12px; grid-template-columns: 1.15fr 0.85fr; }
      .table-panel { overflow: hidden; }
      .table-panel h2 { border-bottom: 1px solid #d1d5db; color: #111827; font-size: 15px; font-weight: 850; padding: 11px 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 7px 8px; text-align: left; vertical-align: top; }
      th { background: #f8fafc; display: table-cell; }
      td { color: #111827; font-size: 10px; font-weight: 650; line-height: 1.25; }
      td .muted { color: #64748b; display: block; font-size: 9px; font-weight: 650; margin-top: 2px; }
      .status-pill { border-radius: 999px; display: inline-block; font-size: 8px; font-weight: 850; padding: 3px 7px; text-transform: uppercase; white-space: nowrap; }
      .status-pill.is-healthy { background: #dcfce7; color: #047857; }
      .status-pill.is-watch { background: #fef3c7; color: #b45309; }
      .status-pill.is-critical { background: #ffe4e6; color: #be123c; }
      .footer-note { border-top: 1px solid #d1d5db; color: #6b7280; display: flex; font-size: 9px; font-weight: 750; justify-content: space-between; letter-spacing: 0.06em; margin-top: 14px; padding-top: 10px; text-transform: uppercase; }
      @media print {
        .report-shell { padding: 14px 14px 16px; }
        .card-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .table-panel, .chart-panel, .kpi-card { break-inside: avoid; }
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
  copy,
  filters,
  healthInsight,
  lastUpdatedLabel,
  locale,
  periodLabel,
  unitRows,
}: PrintKpisReportParams) => {
  const topCards = cards.slice(0, 8);
  const topUnits = unitRows.slice(0, 8);
  const topAttention = attentionRows.slice(0, 8);
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

  const cardsHtml = topCards.map((card) => `
    <article class="kpi-card ${statusClass[card.status]}">
      <span class="card-status">${escapePrintHtml(copy.dashboard.statuses[card.status])}</span>
      <p class="card-title">${escapePrintHtml(card.title)}</p>
      <p class="card-value">${escapePrintHtml(card.value)}</p>
      <p class="card-note">${escapePrintHtml(card.target)}</p>
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

  const unitBarsHtml = topUnits.length > 0
    ? topUnits.map((row) => `
      <div class="bar-row">
        <span class="bar-name">${escapePrintHtml(row.name)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${clampPercent(row.readinessValue)}%"></span></span>
        <span class="bar-value">${escapePrintHtml(row.readinessScore)}</span>
      </div>
    `).join('')
    : `<p class="legend-value">${escapePrintHtml(copy.dashboard.table.noRows)}</p>`;

  const unitRowsHtml = unitRows.length > 0
    ? unitRows.map((row) => `
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

  const attentionRowsHtml = topAttention.length > 0
    ? topAttention.map((row) => `
      <tr>
        <td><strong>${escapePrintHtml(row.employee)}</strong><span class="muted">${escapePrintHtml(row.meta)}</span></td>
        <td>${escapePrintHtml(row.signals)}</td>
        <td><span class="status-pill ${statusClass[row.status]}">${escapePrintHtml(copy.dashboard.statuses[row.status])}</span></td>
      </tr>
    `).join('')
    : `<tr><td colspan="3">${escapePrintHtml(copy.dashboard.sections.noAttentionSignals)}</td></tr>`;

  printHtmlDocument(
    `${copy.title} - ${periodLabel}`,
    `
      <header class="document-header">
        <div class="document-topline">
          <div class="brand-lockup">
            <span class="indice-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
            <div class="brand-text">
              <strong>INDICE</strong>
              <span>${escapePrintHtml(copy.title)}</span>
            </div>
          </div>
          <p class="report-id">${escapePrintHtml(copy.dashboard.actions.printReport)} · ${escapePrintHtml(lastUpdatedLabel)}</p>
        </div>
        <div class="title-block">
          <p class="kicker">${escapePrintHtml(copy.dashboard.actions.printReport)}</p>
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
          <div class="mini-dashboard" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        </article>
      </section>

      <section class="card-grid">${cardsHtml}</section>

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
            <span class="section-label">${escapePrintHtml(copy.dashboard.table.readiness)}</span>
          </div>
          <div class="bar-list">${unitBarsHtml}</div>
        </article>
      </section>

      <section class="tables-grid">
        <article class="table-panel">
          <h2>${escapePrintHtml(copy.dashboard.sections.unitSummary)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapePrintHtml(copy.dashboard.table.unit)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.employees)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.attendance)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.permissions)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.records)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.assets)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.readiness)}</th>
              </tr>
            </thead>
            <tbody>${unitRowsHtml}</tbody>
          </table>
        </article>
        <article class="table-panel">
          <h2>${escapePrintHtml(copy.dashboard.sections.attentionQueue)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapePrintHtml(copy.dashboard.table.employees)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.records)}</th>
                <th>${escapePrintHtml(copy.dashboard.table.readiness)}</th>
              </tr>
            </thead>
            <tbody>${attentionRowsHtml}</tbody>
          </table>
        </article>
      </section>

      <footer class="footer-note">
        <span>INDICE</span>
        <span>${escapePrintHtml(copy.title)}</span>
      </footer>
    `,
    locale,
  );
};
