import {
  escapeDocumentPrintHtml,
  printDocumentHtml,
} from '../BasicModules/shared/print/documentHtmlPrintEngine';
import { getInternalDevelopmentCopy } from './internalDevelopment.copy';
import type { InternalDevelopmentDetail } from './internalDevelopment.types';

interface PrintInternalDevelopmentDetailParams {
  detail: InternalDevelopmentDetail;
  english: boolean;
  locale: string;
  targetWindow?: Window | null;
}

const formatDate = (value: string, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
};

const multiline = (value: string) => escapeDocumentPrintHtml(value).replace(/\r?\n/g, '<br />');

const contentSection = (title: string, value: string | null) => value?.trim()
  ? `<section class="report-section"><h2>${escapeDocumentPrintHtml(title)}</h2><div class="content-box">${multiline(value)}</div></section>`
  : '';

export const printInternalDevelopmentDetail = ({
  detail,
  english,
  locale,
  targetWindow,
}: PrintInternalDevelopmentDetailParams) => {
  const copy = getInternalDevelopmentCopy(english);
  const { entry, history } = detail;
  const printedAt = formatDate(new Date().toISOString(), locale);
  const participants = entry.participants.length
    ? entry.participants.map((participant) => escapeDocumentPrintHtml(participant.name)).join(', ')
    : (english ? 'No additional participants' : 'Sin participantes adicionales');
  const historyRows = history.map((item, index) => `
    <tr class="${index % 2 === 1 ? 'alternate' : ''}">
      <td>v${escapeDocumentPrintHtml(item.entryVersion)}</td>
      <td>${escapeDocumentPrintHtml(item.actionCode === 'CREATED'
        ? (english ? 'Record created' : 'Registro creado')
        : (english ? 'Record updated' : 'Registro actualizado'))}</td>
      <td>${escapeDocumentPrintHtml(item.changedByName)}</td>
      <td>${escapeDocumentPrintHtml(formatDate(item.changedAt, locale))}</td>
    </tr>`).join('');

  const bodyHtml = `
    <main class="sheet">
      <header class="report-header">
        <div>
          <p class="brand">ÍNDICE</p>
          <p class="document-kind">${escapeDocumentPrintHtml(english ? 'Internal development record' : 'Registro de desarrollo interno')}</p>
        </div>
        <div class="folio-block">
          <span>${escapeDocumentPrintHtml(entry.folio)}</span>
          <span>v${escapeDocumentPrintHtml(entry.version)}</span>
        </div>
      </header>

      <section class="title-block">
        <h1>${escapeDocumentPrintHtml(entry.title)}</h1>
        <p>${escapeDocumentPrintHtml(copy.types[entry.entryType])} · ${escapeDocumentPrintHtml(copy.areas[entry.area])} · ${escapeDocumentPrintHtml(copy.statuses[entry.status])}</p>
      </section>

      <section class="metadata-grid">
        <div><span>${escapeDocumentPrintHtml(english ? 'Date' : 'Fecha')}</span><strong>${escapeDocumentPrintHtml(formatDate(entry.eventAt, locale))}</strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.owner)}</span><strong>${escapeDocumentPrintHtml(entry.ownerName)}</strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.status)}</span><strong>${escapeDocumentPrintHtml(copy.statuses[entry.status])}</strong></div>
        ${entry.periodStart && entry.periodEnd ? `<div><span>${escapeDocumentPrintHtml(english ? 'Reported period' : 'Periodo reportado')}</span><strong>${escapeDocumentPrintHtml(entry.periodStart)} — ${escapeDocumentPrintHtml(entry.periodEnd)}</strong></div>` : ''}
        ${entry.location ? `<div><span>${escapeDocumentPrintHtml(english ? 'Location or channel' : 'Lugar o canal')}</span><strong>${escapeDocumentPrintHtml(entry.location)}</strong></div>` : ''}
        ${entry.relatedEntryTitle ? `<div><span>${escapeDocumentPrintHtml(english ? 'Related record' : 'Registro relacionado')}</span><strong>${escapeDocumentPrintHtml(entry.relatedEntryTitle)}</strong></div>` : ''}
      </section>

      ${contentSection(english ? 'Executive summary' : 'Resumen ejecutivo', entry.summary)}
      ${contentSection(english ? 'Detailed evidence' : 'Evidencia detallada', entry.details)}
      ${contentSection(english ? 'Decisions' : 'Decisiones', entry.decisions)}
      ${contentSection(english ? 'Next steps' : 'Siguientes pasos', entry.nextSteps)}

      <section class="report-section">
        <h2>${escapeDocumentPrintHtml(copy.participants)}</h2>
        <div class="content-box">${participants}</div>
      </section>

      ${entry.referenceUrl ? `<section class="report-section"><h2>${escapeDocumentPrintHtml(english ? 'Evidence link' : 'Enlace de evidencia')}</h2><div class="content-box break-all">${escapeDocumentPrintHtml(entry.referenceUrl)}</div></section>` : ''}

      <section class="report-section audit-section">
        <h2>${escapeDocumentPrintHtml(english ? 'Revision history' : 'Historial de revisiones')}</h2>
        <table>
          <thead><tr>
            <th>${escapeDocumentPrintHtml(english ? 'Version' : 'Versión')}</th>
            <th>${escapeDocumentPrintHtml(english ? 'Event' : 'Evento')}</th>
            <th>${escapeDocumentPrintHtml(english ? 'User' : 'Usuario')}</th>
            <th>${escapeDocumentPrintHtml(english ? 'Date' : 'Fecha')}</th>
          </tr></thead>
          <tbody>${historyRows}</tbody>
        </table>
      </section>

      <footer class="report-footer">
        <span>${escapeDocumentPrintHtml(english ? 'Internal corporate document' : 'Documento corporativo interno')}</span>
        <span>${escapeDocumentPrintHtml(english ? 'Printed' : 'Impreso')}: ${escapeDocumentPrintHtml(printedAt)}</span>
      </footer>
    </main>`;

  return printDocumentHtml({
    bodyHtml,
    contentStyles: `
      body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.45; }
      .sheet { min-height: 297mm; padding: 14mm 16mm; }
      .report-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px; }
      .brand { margin: 0; font-size: 18pt; font-weight: 700; letter-spacing: .02em; }
      .document-kind { margin: 2px 0 0; color: #555; font-size: 9pt; }
      .folio-block { display: flex; gap: 10px; border: 1px solid #777; background: #f0f0f0; padding: 6px 9px; font-weight: 700; }
      .title-block { padding: 14px 0 10px; }
      .title-block h1 { margin: 0; font-size: 18pt; line-height: 1.2; }
      .title-block p { margin: 5px 0 0; color: #555; }
      .metadata-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #888; border-left: 1px solid #888; margin-bottom: 14px; }
      .metadata-grid div { min-height: 54px; border-right: 1px solid #888; border-bottom: 1px solid #888; padding: 7px 8px; }
      .metadata-grid span { display: block; color: #666; font-size: 8.5pt; }
      .metadata-grid strong { display: block; margin-top: 3px; font-weight: 700; }
      .report-section { break-inside: avoid; margin-top: 12px; }
      .report-section h2 { margin: 0; border: 1px solid #888; background: #e6e6e6; padding: 6px 8px; font-size: 10pt; }
      .content-box { min-height: 34px; border: 1px solid #888; border-top: 0; padding: 8px; white-space: normal; }
      .break-all { overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #888; padding: 6px 7px; text-align: left; vertical-align: top; }
      th { background: #e6e6e6; font-size: 9pt; }
      tr.alternate td { background: #f5f5f5; }
      .report-footer { display: flex; justify-content: space-between; border-top: 1px solid #777; margin-top: 18px; padding-top: 7px; color: #666; font-size: 8pt; }
      @media print {
        .sheet { min-height: auto; }
        .report-section, .metadata-grid, table { break-inside: avoid; }
      }
    `,
    documentTitle: `${entry.folio}-${entry.title}`,
    locale,
    orientation: 'portrait',
    pageSize: 'a4',
    targetWindow,
  });
};
