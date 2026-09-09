import { ticketDuration, ticketFileSize } from "./ticketFormatting";
import {
  escapeDocumentPrintHtml,
  printDocumentHtml,
} from '../BasicModules/shared/print/documentHtmlPrintEngine';
import { getSystemTicketCopy } from './translations';
import type {
  SystemTicketDetail,
  SystemTicketEvent,
  SystemTicketPriority,
  SystemTicketStatus,
} from './types';

interface PrintSystemTicketDetailParams {
  detail: SystemTicketDetail;
  locale: string;
  targetWindow?: Window | null;
}

const formatDate = (value: string | null, locale: string) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatDuration = (start: string, end: string | null, pending: string, locale: string) => {
  if (!end) return pending;
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
  return ticketDuration(minutes, locale);
};

const multiline = (value: string) => escapeDocumentPrintHtml(value).replace(/\r?\n/g, '<br />');

const statusLabel = (status: SystemTicketStatus, copy: ReturnType<typeof getSystemTicketCopy>) => ({
  OPEN: copy.open,
  IN_REVIEW: copy.inReview,
  WAITING_ON_REPORTER: copy.waitingOnReporter,
  PLANNED: copy.planned,
  RESOLVED: copy.resolved,
  CLOSED: copy.closed,
}[status]);

const priorityLabel = (priority: SystemTicketPriority, copy: ReturnType<typeof getSystemTicketCopy>) => ({
  LOW: copy.priorityLow,
  MEDIUM: copy.priorityMedium,
  HIGH: copy.priorityHigh,
  CRITICAL: copy.priorityCritical,
}[priority]);

const eventLabel = (event: SystemTicketEvent, english: boolean, copy: ReturnType<typeof getSystemTicketCopy>) => ({
  CREATED: copy.createdEvent,
  ROOT_UPDATED: copy.statusEvent,
  ASSIGNED: copy.ownerEvent,
  PUBLIC_MESSAGE: copy.conversation,
  INTERNAL_NOTE: copy.internalNote,
  ATTACHMENT_ADDED: copy.addEvidence,
  REOPENED: copy.reopenedEvent,
}[event.event_type]);

export const printSystemTicketDetail = ({
  detail,
  locale,
  targetWindow,
}: PrintSystemTicketDetailParams) => {
  const copy = getSystemTicketCopy(locale);
  const english = locale.toLowerCase().startsWith('en');
  const { ticket, events, attachments } = detail;
  const pending = copy.pending;
  const noRecords = copy.emptyRecords;
  const printedAt = formatDate(new Date().toISOString(), locale);
  const eventRows = events.length
    ? events.map((event, index) => {
      const statusChange = event.previous_status && event.new_status
        ? `${statusLabel(event.previous_status, copy)} → ${statusLabel(event.new_status, copy)}`
        : '';
      const details = [event.note?.trim(), statusChange].filter(Boolean).join('\n') || eventLabel(event, english, copy);
      return `
        <tr class="${index % 2 === 1 ? 'alternate' : ''}">
          <td>${escapeDocumentPrintHtml(formatDate(event.created_at, locale))}</td>
          <td>${escapeDocumentPrintHtml(eventLabel(event, english, copy))}</td>
          <td>${escapeDocumentPrintHtml(event.actor_name)}<br /><small>${escapeDocumentPrintHtml(event.actor_email)}</small></td>
          <td>${multiline(details)}</td>
          <td>${escapeDocumentPrintHtml(event.visibility === 'INTERNAL' ? copy.internalNote : (copy.public))}</td>
        </tr>`;
    }).join('')
    : `<tr><td colspan="5">${escapeDocumentPrintHtml(noRecords)}</td></tr>`;
  const attachmentRows = attachments.length
    ? attachments.map((attachment, index) => `
      <tr class="${index % 2 === 1 ? 'alternate' : ''}">
        <td>${escapeDocumentPrintHtml(attachment.original_filename)}</td>
        <td>${escapeDocumentPrintHtml(attachment.mime_type)}</td>
        <td>${escapeDocumentPrintHtml(ticketFileSize(attachment.size_bytes, locale))}</td>
        <td>${escapeDocumentPrintHtml(attachment.uploaded_by)}</td>
        <td>${escapeDocumentPrintHtml(formatDate(attachment.created_at, locale))}</td>
      </tr>`).join('')
    : `<tr><td colspan="5">${escapeDocumentPrintHtml(noRecords)}</td></tr>`;

  const bodyHtml = `
    <main class="sheet">
      <header class="report-header">
        <div>
          <p class="brand">ÍNDICE</p>
          <p class="document-kind">${escapeDocumentPrintHtml(copy.printTitle)}</p>
        </div>
        <div class="folio-block">${escapeDocumentPrintHtml(ticket.folio)}</div>
      </header>

      <section class="title-block">
        <h1>${escapeDocumentPrintHtml(ticket.title)}</h1>
        <p>${escapeDocumentPrintHtml(ticket.type === 'FAILURE' ? copy.failure : copy.improvement)} · ${escapeDocumentPrintHtml(priorityLabel(ticket.priority, copy))} · ${escapeDocumentPrintHtml(statusLabel(ticket.status, copy))}</p>
      </section>

      <section class="metadata-grid">
        <div><span>${escapeDocumentPrintHtml(copy.distributor)}</span><strong>${escapeDocumentPrintHtml(ticket.distributor_name)}</strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.reporter)}</span><strong>${escapeDocumentPrintHtml(ticket.reporter_name)}<br /><small>${escapeDocumentPrintHtml(ticket.reporter_email)}</small></strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.module)}</span><strong>${escapeDocumentPrintHtml(ticket.module || '—')}</strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.assignee)}</span><strong>${escapeDocumentPrintHtml(ticket.assignee_name || copy.noAssignee)}</strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.createdAt)}</span><strong>${escapeDocumentPrintHtml(formatDate(ticket.created_at, locale))}</strong></div>
        <div><span>${escapeDocumentPrintHtml(copy.updated)}</span><strong>${escapeDocumentPrintHtml(formatDate(ticket.updated_at, locale))}</strong></div>
      </section>

      <section class="report-section">
        <h2>${escapeDocumentPrintHtml(copy.descriptionLabel)}</h2>
        <div class="content-box">${multiline(ticket.description)}</div>
      </section>

      ${ticket.root_response?.trim() ? `<section class="report-section"><h2>${escapeDocumentPrintHtml(copy.rootResponse)}</h2><div class="content-box">${multiline(ticket.root_response)}</div></section>` : ''}

      <section class="report-section">
        <h2>${escapeDocumentPrintHtml(copy.sla)}</h2>
        <table class="metrics-table">
          <thead><tr>
            <th>${escapeDocumentPrintHtml(copy.firstResponse)}</th>
            <th>${escapeDocumentPrintHtml(copy.target)}</th>
            <th>${escapeDocumentPrintHtml(copy.status)}</th>
            <th>${escapeDocumentPrintHtml(copy.reopened)}</th>
          </tr></thead>
          <tbody><tr>
            <td>${escapeDocumentPrintHtml(formatDuration(ticket.created_at, ticket.first_responded_at, pending, locale))}</td>
            <td>${escapeDocumentPrintHtml(formatDate(ticket.target_resolution_at, locale))}</td>
            <td>${escapeDocumentPrintHtml(ticket.overdue ? copy.overdue : statusLabel(ticket.status, copy))}</td>
            <td>${escapeDocumentPrintHtml(ticket.reopened_count)}</td>
          </tr></tbody>
        </table>
      </section>

      <section class="report-section">
        <h2>${escapeDocumentPrintHtml(copy.traceability)}</h2>
        <table>
          <thead><tr>
            <th>${escapeDocumentPrintHtml(copy.date)}</th>
            <th>${escapeDocumentPrintHtml(copy.event)}</th>
            <th>${escapeDocumentPrintHtml(copy.user)}</th>
            <th>${escapeDocumentPrintHtml(copy.detail)}</th>
            <th>${escapeDocumentPrintHtml(copy.visibility)}</th>
          </tr></thead>
          <tbody>${eventRows}</tbody>
        </table>
      </section>

      <section class="report-section">
        <h2>${escapeDocumentPrintHtml(copy.evidence)}</h2>
        <table>
          <thead><tr>
            <th>${escapeDocumentPrintHtml(copy.file)}</th>
            <th>${escapeDocumentPrintHtml(copy.type)}</th>
            <th>${escapeDocumentPrintHtml(copy.size)}</th>
            <th>${escapeDocumentPrintHtml(copy.uploadedBy)}</th>
            <th>${escapeDocumentPrintHtml(copy.date)}</th>
          </tr></thead>
          <tbody>${attachmentRows}</tbody>
        </table>
      </section>

      <footer class="report-footer">
        <span>${escapeDocumentPrintHtml(copy.printFooter)}</span>
        <span>${escapeDocumentPrintHtml(copy.printed)}: ${escapeDocumentPrintHtml(printedAt)}</span>
      </footer>
    </main>`;

  return printDocumentHtml({
    bodyHtml,
    contentStyles: `
      body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; }
      .sheet { min-height: 297mm; padding: 14mm 16mm; }
      .report-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px; }
      .brand { margin: 0; font-size: 18pt; font-weight: 700; letter-spacing: .02em; }
      .document-kind { margin: 2px 0 0; color: #555; font-size: 9pt; }
      .folio-block { border: 1px solid #777; background: #f0f0f0; padding: 6px 9px; font-weight: 700; }
      .title-block { padding: 14px 0 10px; }
      .title-block h1 { margin: 0; font-size: 18pt; line-height: 1.2; }
      .title-block p { margin: 5px 0 0; color: #555; }
      .metadata-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #888; border-left: 1px solid #888; margin-bottom: 14px; }
      .metadata-grid div { min-height: 58px; border-right: 1px solid #888; border-bottom: 1px solid #888; padding: 7px 8px; }
      .metadata-grid span { display: block; color: #666; font-size: 8.5pt; }
      .metadata-grid strong { display: block; margin-top: 3px; font-weight: 700; }
      small { color: #666; font-size: 8pt; font-weight: 400; overflow-wrap: anywhere; }
      .report-section { break-inside: auto; margin-top: 12px; }
      .report-section h2 { margin: 0; border: 1px solid #888; background: #e6e6e6; padding: 6px 8px; font-size: 10pt; }
      .content-box { min-height: 34px; border: 1px solid #888; border-top: 0; padding: 8px; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
      thead { display: table-header-group; }
      th, td { border: 1px solid #888; padding: 6px 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #e6e6e6; font-size: 8.5pt; }
      tr { break-inside: avoid; }
      tr.alternate td { background: #f5f5f5; }
      .metrics-table { font-size: 9pt; }
      .report-footer { display: flex; justify-content: space-between; border-top: 1px solid #777; margin-top: 18px; padding-top: 7px; color: #666; font-size: 8pt; }
      @media print { .sheet { min-height: auto; } .metadata-grid, .content-box, .metrics-table { break-inside: avoid; } }
    `,
    documentTitle: `${ticket.folio}-${ticket.title}`,
    locale,
    orientation: 'portrait',
    pageSize: 'a4',
    targetWindow,
  });
};
