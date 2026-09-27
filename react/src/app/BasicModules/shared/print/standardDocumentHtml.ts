import type { StandardDocumentDefinition, StandardDocumentField } from './standardDocumentPdf';
import { buildDocumentFileName } from './documentFileName';
import { escapeDocumentPrintHtml as escape, printDocumentHtml } from './documentHtmlPrintEngine';
import { formatDocumentPrintDateTime, getDocumentPrintLabels } from './documentPrintContract';
import { notifyDocumentPrintFailure } from './documentPrintFeedback';
import { labelsFor, localizedConfidentiality } from './standardDocumentLabels';

const value = (input: StandardDocumentField['value']) => escape(input === null || input === undefined || input === '' ? '—' : input);
const fields = (items: StandardDocumentField[]) => `<dl class="document-metadata">${items.map(item => `<div class="document-field"><dt>${escape(item.label)}</dt><dd>${value(item.value)}</dd></div>`).join('')}</dl>`;

export const safeDocumentImageUrl = (url?: string) => {
  if (!url?.trim()) return '';
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'https://localhost' : window.location.origin);
    return ['https:', 'http:', 'blob:'].includes(parsed.protocol) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url) ? parsed.href : '';
  } catch { return ''; }
};

/** Presentation adapter only: all values, scopes, snapshots and totals belong to the caller. */
export function buildStandardDocumentHtml(definition: StandardDocumentDefinition) {
  const locale = definition.locale ?? 'es-MX';
  const labels = getDocumentPrintLabels(locale);
  const text = labelsFor(locale);
  const logo = safeDocumentImageUrl(definition.logoUrl);
  return `<article class="quotation-document">
    <header class="document-header">
      <div class="document-identity">${logo ? `<img data-company-logo class="document-logo" src="${escape(logo)}" alt="" />` : ''}${escape(definition.issuer)}</div>
      <h1>${escape(definition.title)}</h1>
      <div class="document-reference">${escape(definition.folio)}${definition.status ? `<p>${escape(definition.status)}</p>` : ''}</div>
    </header>
    ${definition.subtitle ? `<p class="document-subtitle">${escape(definition.subtitle)}</p>` : ''}
    ${definition.recipient ? `<p class="document-identity">${escape(definition.recipient)}</p>` : ''}
    ${definition.metadata?.length ? fields(definition.metadata) : ''}
    ${definition.notice ? `<p class="document-notice">${escape(definition.notice)}</p>` : ''}
    ${(definition.tables ?? []).map(table => `<section class="document-section">${table.title ? `<h2>${escape(table.title)}</h2>` : ''}<table><thead><tr>${table.columns.map((column, index) => `<th scope="col"${table.numericColumnIndices?.includes(index) ? ' class="numeric"' : ''}>${escape(column)}</th>`).join('')}</tr></thead><tbody>${table.rows.length ? table.rows.map(row => `<tr>${table.columns.map((_, index) => `<td${table.numericColumnIndices?.includes(index) ? ' class="numeric"' : ''}>${value(row[index])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(1, table.columns.length)}">${escape(table.emptyMessage || text.noData)}</td></tr>`}</tbody></table></section>`).join('')}
    ${definition.metrics?.length ? `<div class="document-totals">${definition.metrics.map(metric => `<div class="document-total"><span>${escape(metric.label)}</span><strong>${value(metric.value)}</strong></div>`).join('')}</div>` : ''}
    ${(definition.sections ?? []).map(section => `<section class="document-section"><h2>${escape(section.title)}</h2>${section.fields?.length ? fields(section.fields) : ''}${(section.paragraphs ?? []).map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</section>`).join('')}
    ${definition.signatures?.length ? `<div class="document-signatures">${definition.signatures.map(signature => `<div class="document-signature">${escape(signature.label)}${signature.caption ? `<p>${escape(signature.caption)}</p>` : ''}</div>`).join('')}</div>` : ''}
    <footer class="document-footer"><span>${escape(labels.updated)}: ${escape(formatDocumentPrintDateTime(definition.generatedAt ?? new Date(), locale))}</span><span>${escape(localizedConfidentiality(definition.confidentiality, text))} ${escape(definition.folio)} · v${escape(definition.contract.version)}</span></footer>
  </article>`;
}

export function printStandardDocumentHtml(definition: StandardDocumentDefinition) {
  const locale = definition.locale ?? 'es-MX';
  try {
    return printDocumentHtml({
      bodyHtml: buildStandardDocumentHtml(definition), locale,
      documentTitle: buildDocumentFileName({ ...definition.fileName, extension: 'pdf' }).replace(/\.pdf$/i, ''),
      pageSize: definition.contract.pageSize, orientation: definition.contract.orientation,
      presentation: 'quotation',
    });
  } catch {
    notifyDocumentPrintFailure(locale, 'generation');
    return false;
  }
}
