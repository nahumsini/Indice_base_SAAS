import type { BusinessExchangeRatesPerUsd } from '../../../shared/businessCurrency';
import {
  documentPrintAttribution,
  formatDocumentPrintDateTime,
  getDocumentPrintLabels,
} from '../../../shared/print/documentPrintContract';
import type { PosCashClosingSummaryRow } from '../types/cashClosingHistory.types';
import {
  type CortesAnalytics,
  type CortesFilters,
  type CortesPeriodFilter,
  formatClosingAmount,
  formatCurrency,
  formatDateTime,
  getClosingCurrency,
  toNumber,
} from './cortesUtils';

interface CortesPrintReportParams {
  analytics: CortesAnalytics;
  cashRegisterLabel: string;
  cashierLabel: string;
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd;
  filters: CortesFilters;
  preferredCurrency: string;
  rows: PosCashClosingSummaryRow[];
  scopeNote?: string;
  warehouseLabel: string;
}

const periodLabels: Record<CortesPeriodFilter, string> = {
  custom: 'Personalizado',
  month: 'Este mes',
  today: 'Hoy',
  week: 'Esta semana',
  yesterday: 'Ayer',
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const buildDocumentId = (date: Date) => {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const timePart = [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('');

  return `IDX-POS-CORTES-${datePart}-${timePart}`;
};

const buildDifferenceCopy = (difference: number, currency: string) => {
  if (Math.abs(difference) < 0.01) {
    return 'Los cortes filtrados se mantienen cuadrados, sin diferencia neta relevante.';
  }

  const label = formatCurrency(Math.abs(difference), currency);
  return difference > 0
    ? `Existe un sobrante neto de ${label}; conviene documentar la causa antes de archivar.`
    : `Existe un faltante neto de ${label}; requiere revisión operativa antes de cerrar auditoría.`;
};

const buildNextAction = (analytics: CortesAnalytics) => {
  if (analytics.shortCount > 0) {
    return `Revisar ${analytics.shortCount} corte(s) con faltante y validar movimientos de efectivo contra el arqueo.`;
  }

  if (analytics.overCount > 0) {
    return `Documentar ${analytics.overCount} corte(s) con sobrante y confirmar referencias de pagos o correcciones.`;
  }

  if (analytics.closingCount === 0) {
    return 'Cerrar un turno desde Punto de Venta para alimentar el reporte de cortes.';
  }

    return 'Archivar el reporte y mantener el mismo control operativo para el siguiente período.';
};

const buildCurrencyBreakdown = (analytics: CortesAnalytics) => {
  if (analytics.salesCurrencyTotals.length === 0) {
    return `Sin ventas en ${analytics.preferredCurrency}`;
  }

  return analytics.salesCurrencyTotals
    .map((item) => `${item.currency}: ${item.label}`)
    .join(' · ');
};

export function buildCortesPrintReportHtml({
  analytics,
  cashRegisterLabel,
  cashierLabel,
  exchangeRatesPerUsd,
  filters,
  preferredCurrency,
  rows,
  scopeNote,
  warehouseLabel,
}: CortesPrintReportParams) {
  const generatedAt = new Date();
  const locale = 'es-MX';
  const printLabels = getDocumentPrintLabels(locale);
  const documentId = buildDocumentId(generatedAt);
  const dateRange = filters.dateFrom === filters.dateTo
    ? filters.dateFrom
    : `${filters.dateFrom} a ${filters.dateTo}`;
  const differenceCopy = buildDifferenceCopy(analytics.convertedNetDifference, preferredCurrency);
  const currencyBreakdown = buildCurrencyBreakdown(analytics);

  const insightCards = [
    {
      dot: 'coral',
      title: '1. Qué pasó',
      body: rows.length > 0
        ? `Se analizaron ${analytics.closingCount} corte(s), ${analytics.totalTickets} ticket(s) y ventas equivalentes a ${analytics.convertedSalesLabel}.`
        : 'No se encontraron cortes para el periodo y filtros seleccionados.',
    },
    {
      dot: 'yellow',
      title: '2. Por qué importa',
      body: `${differenceCopy} Cobrado por divisa: ${currencyBreakdown}.`,
    },
    {
      dot: 'aqua',
      title: '3. Siguiente acción',
      body: buildNextAction(analytics),
    },
  ];

  const kpiCards = [
    { accent: 'coral', label: `Ventas en ${preferredCurrency}`, value: analytics.convertedSalesLabel },
    { accent: 'blue', label: 'Cortes', value: analytics.closingCount },
    { accent: 'aqua', label: 'Tickets', value: analytics.totalTickets },
    { accent: 'yellow', label: 'Esperado', value: formatCurrency(analytics.convertedExpectedCash, preferredCurrency) },
    { accent: analytics.convertedNetDifference === 0 ? 'aqua' : 'coral', label: 'Diferencia neta', value: formatCurrency(analytics.convertedNetDifference, preferredCurrency) },
    { accent: 'blue', label: 'Divisas cobradas', value: currencyBreakdown },
  ];

  const filterRows = [
    ['Periodo', periodLabels[filters.period] ?? filters.period],
    ['Rango', dateRange],
    ['Almacén', warehouseLabel],
    ['Cajero', cashierLabel],
    ['Caja', cashRegisterLabel],
    ['Divisa preferida', preferredCurrency],
  ];

  const tableRows = rows.length > 0
    ? rows.map((row) => {
      const sales = formatClosingAmount(
        toNumber(row.totalSalesAmount),
        row,
        preferredCurrency,
        exchangeRatesPerUsd,
      );
      const expected = formatClosingAmount(
        toNumber(row.expectedCashAmount),
        row,
        preferredCurrency,
        exchangeRatesPerUsd,
      );
      const counted = formatClosingAmount(
        toNumber(row.countedCashAmount),
        row,
        preferredCurrency,
        exchangeRatesPerUsd,
      );
      const difference = formatClosingAmount(
        toNumber(row.overShortAmount),
        row,
        preferredCurrency,
        exchangeRatesPerUsd,
      );
      const differenceAmount = toNumber(row.overShortAmount);
      const differenceClass = differenceAmount < 0 ? 'risk' : differenceAmount > 0 ? 'warning' : 'ok';

      return `
        <tr>
          <td><strong>COR-${escapeHtml(row.id)}</strong></td>
          <td>${escapeHtml(formatDateTime(row.closedAt))}</td>
            <td>Almacén ${escapeHtml(row.warehouseId)}</td>
          <td>Caja ${escapeHtml(row.cashRegisterId)}</td>
          <td>Usuario ${escapeHtml(row.closedByUserId)}</td>
          <td>Turno ${escapeHtml(row.shiftId)}</td>
          <td class="number">${escapeHtml(row.ticketsCount)}</td>
          <td>${escapeHtml(getClosingCurrency(row))}</td>
          <td class="amount">
            <strong>${escapeHtml(sales.nativeLabel)}</strong>
            ${sales.nativeCurrency !== preferredCurrency ? `<span>Equiv. ${escapeHtml(sales.convertedLabel)}</span>` : ''}
          </td>
          <td class="amount">${escapeHtml(expected.nativeLabel)}</td>
          <td class="amount">${escapeHtml(counted.nativeLabel)}</td>
          <td class="amount ${differenceClass}">
            <strong>${escapeHtml(difference.nativeLabel)}</strong>
            ${difference.nativeCurrency !== preferredCurrency ? `<span>Equiv. ${escapeHtml(difference.convertedLabel)}</span>` : ''}
          </td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="12" class="empty-row">No hay cortes para imprimir con los filtros actuales.</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentId)} · Reporte de cortes de caja</title>
  <style>
    @page { margin: 14mm; size: A4 portrait; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f7f8fa;
      color: #222831;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      align-items: center;
      background: #222831;
      color: #ffffff;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 12px 24px;
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .toolbar button {
      border: 0;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      padding: 10px 16px;
    }
    .toolbar .primary { background: #ff6b5e; color: white; }
    .toolbar .secondary { background: #ffffff; color: #222831; }
    .page {
      background: #ffffff;
      margin: 22px auto;
      max-width: 980px;
      min-height: 100vh;
      padding: 34px;
    }
    .header {
      align-items: flex-start;
      display: grid;
      gap: 20px;
      grid-template-columns: 1fr 1.35fr 1fr;
    }
    .document-context { color: #4b5563; font-size: 9pt; font-weight: 500; line-height: 1.4; }
    .document-title { text-align: center; }
    .document-title h1 { font-size: 25pt; font-weight: 500; line-height: 1.08; margin: 0; }
    .document-title p { color: #6b7280; font-size: 10pt; font-weight: 400; margin: 8px 0 0; }
    .meta { color: #6b7280; font-size: 8pt; line-height: 1.65; text-align: right; }
    .meta strong { color: #222831; display: block; font-size: 10pt; font-weight: 500; }
    .color-bar { border-radius: 999px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; height: 8px; margin: 22px 0 26px; overflow: hidden; }
    .color-bar span:nth-child(1) { background: #ff6b5e; }
    .color-bar span:nth-child(2) { background: #f4c84a; }
    .color-bar span:nth-child(3) { background: #58c7a7; }
    .color-bar span:nth-child(4) { background: #2563eb; }
    .insights { display: grid; gap: 14px; grid-template-columns: repeat(3, 1fr); margin-bottom: 22px; }
    .insight-card { border: 1px solid #d8dce3; border-radius: 18px; min-height: 150px; padding: 20px; }
    .insight-title { align-items: center; display: flex; font-size: 12pt; font-weight: 500; gap: 10px; margin-bottom: 16px; }
    .dot { border-radius: 999px; display: inline-block; height: 14px; width: 14px; }
    .dot.coral { background: #ff6b5e; }
    .dot.yellow { background: #f4c84a; }
    .dot.aqua { background: #58c7a7; }
    .insight-card p { color: #4b5563; font-size: 10pt; line-height: 1.45; margin: 0; }
    .section-title { font-size: 16pt; font-weight: 500; margin: 26px 0 12px; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(3, 1fr); }
    .kpi { background: #f7f8fa; border: 1px solid #d8dce3; border-radius: 16px; min-height: 98px; padding: 16px 16px 16px 20px; position: relative; }
    .kpi::before { border-radius: 999px; bottom: 14px; content: ""; left: 0; position: absolute; top: 14px; width: 6px; }
    .kpi.coral::before { background: #ff6b5e; }
    .kpi.yellow::before { background: #f4c84a; }
    .kpi.aqua::before { background: #58c7a7; }
    .kpi.blue::before { background: #2563eb; }
    .kpi-label { color: #6b7280; font-size: 8pt; font-weight: 400; }
    .kpi-value { font-size: 17pt; font-weight: 500; line-height: 1.15; margin-top: 12px; word-break: break-word; }
    .filters { border: 1px solid #d8dce3; border-radius: 16px; display: grid; gap: 0; grid-template-columns: repeat(3, 1fr); overflow: hidden; }
    .filter-item { border-bottom: 1px solid #d8dce3; border-right: 1px solid #d8dce3; padding: 11px 14px; }
    .filter-item:nth-child(3n) { border-right: 0; }
    .filter-item:nth-last-child(-n+3) { border-bottom: 0; }
    .filter-label { color: #6b7280; display: block; font-size: 8pt; font-weight: 400; }
    .filter-value { color: #222831; display: block; font-size: 10pt; font-weight: 500; margin-top: 5px; }
    .scope-note { color: #6b7280; font-size: 9pt; font-weight: 400; line-height: 1.4; margin: 10px 0 0; }
    table { border-collapse: collapse; font-size: 9pt; margin-top: 12px; width: 100%; }
    thead { background: #222831; color: white; }
    th { font-size: 8pt; font-weight: 500; padding: 9px 8px; text-align: left; }
    td { border-bottom: 1px solid #d8dce3; padding: 9px 8px; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f7f8fa; }
    .number, .amount { text-align: right; white-space: nowrap; }
    .amount span { color: #6b7280; display: block; font-size: 8pt; margin-top: 3px; }
    .risk { color: #be123c; }
    .warning { color: #a16207; }
    .ok { color: #047857; }
    .empty-row { color: #6b7280; font-weight: 400; padding: 24px; text-align: center; }
    .footer { border-top: 1px solid #d8dce3; color: #6b7280; display: flex; font-size: 8pt; justify-content: space-between; margin-top: 28px; padding-top: 12px; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .page { box-shadow: none; margin: 0; max-width: none; min-height: auto; padding: 0; }
      .insight-card, .kpi, .filters { break-inside: avoid; }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="secondary" type="button" onclick="window.close()">Cerrar</button>
    <button class="primary" type="button" onclick="window.print()">Imprimir reporte</button>
  </div>

  <main class="page">
    <header class="header">
      <div class="document-context">Punto de venta<br />Control operativo</div>
      <div class="document-title">
        <h1>Reporte de cortes de caja</h1>
        <p>Inteligencia operativa del punto de venta</p>
      </div>
      <div class="meta">
        <strong>${escapeHtml(documentId)}</strong>
        Generado: ${escapeHtml(formatDocumentPrintDateTime(generatedAt, locale))}<br />
        Tipo: Documento operativo
      </div>
    </header>

    <div class="color-bar" aria-hidden="true"><span></span><span></span><span></span><span></span></div>

    <section class="insights">
      ${insightCards.map((card) => `
        <article class="insight-card">
          <div class="insight-title"><span class="dot ${card.dot}"></span>${escapeHtml(card.title)}</div>
          <p>${escapeHtml(card.body)}</p>
        </article>
      `).join('')}
    </section>

    <section>
      <h2 class="section-title">Resumen operativo</h2>
      <div class="kpis">
        ${kpiCards.map((card) => `
          <article class="kpi ${card.accent}">
            <div class="kpi-label">${escapeHtml(card.label)}</div>
            <div class="kpi-value">${escapeHtml(card.value)}</div>
          </article>
        `).join('')}
      </div>
    </section>

    <section>
      <h2 class="section-title">Filtros aplicados</h2>
      <div class="filters">
        ${filterRows.map(([label, value]) => `
          <div class="filter-item">
            <span class="filter-label">${escapeHtml(label)}</span>
            <span class="filter-value">${escapeHtml(value)}</span>
          </div>
        `).join('')}
      </div>
      ${scopeNote ? `<p class="scope-note">${escapeHtml(scopeNote)}</p>` : ''}
    </section>

    <section>
      <h2 class="section-title">Datos de soporte</h2>
      <table>
        <thead>
          <tr>
            <th>Corte</th>
            <th>Fecha</th>
            <th>Almacén</th>
            <th>Caja</th>
            <th>Cajero</th>
            <th>Turno</th>
            <th>Tickets</th>
            <th>Divisa</th>
            <th>Ventas</th>
            <th>Esperado</th>
            <th>Contado</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </section>

    <footer class="footer">
      <span>${documentPrintAttribution} · ${escapeHtml(printLabels.updated)}: ${escapeHtml(formatDocumentPrintDateTime(generatedAt, locale))}</span>
      <span>${escapeHtml(documentId)}</span>
    </footer>
  </main>
</body>
</html>`;
}
