import type { IncidentReport, IncidentReportEmployee } from '../types/incidentReport';
import { incidentStatusLabel, type IncidentReportCopy } from '../translations/incidentReportCopy';
import { incidentDateLabel, incidentTimeLabel } from './incidentReportPeriod';
import type { CompanyPrintIdentity } from '../../../shared/print/useCompanyPrintIdentity';
import type { StandardDocumentDefinition } from '../../../shared/print/standardDocumentPdf';
import { buildStandardDocumentHtml, printStandardDocumentHtml } from '../../../shared/print/standardDocumentHtml';

type IncidentReportIssuer = Pick<CompanyPrintIdentity, 'name' | 'logoUrl'> | string;

/** One owner definition feeds both the isolated preview and the shared print engine. */
export function buildIncidentReportDocument(report: IncidentReport, employees: IncidentReportEmployee[], copy: IncidentReportCopy, locale: string, company: IncidentReportIssuer): StandardDocumentDefinition {
  const identity = typeof company === 'string' ? { name: company, logoUrl: '' } : company;
  const statuses = ['on_time', 'late', 'absence', 'leave', 'rest', 'pending', 'not_scheduled', 'outside_employment'];
  const generatedAt = new Date(report.generatedAt);
  return {
    contract: { category: 'operational-report', modifiers: ['internal', 'confidential', 'employee-facing'],
      pageSize: 'a4', orientation: 'portrait', version: '2.1' },
    fileName: { companyName: identity.name, documentType: copy.title, period: `${report.from}_${report.to}` },
    locale, title: copy.title, issuer: identity.name || undefined, logoUrl: identity.logoUrl || undefined,
    generatedAt: Number.isFinite(generatedAt.getTime()) ? generatedAt : undefined,
    confidentiality: 'confidential', notice: copy.printNote,
    metadata: [
      { label: copy.from, value: incidentDateLabel(report.from, locale) },
      { label: copy.to, value: incidentDateLabel(report.to, locale) },
      { label: copy.people, value: employees.length },
    ],
    tables: employees.map(employee => ({
      title: [employee.person.name, employee.person.code].filter(Boolean).join(' · '),
      metadata: [
        { label: copy.unit, value: employee.person.unitName || copy.unassigned },
        { label: copy.business, value: employee.person.businessName || copy.unassigned },
        { label: copy.entries, value: employee.totals.daysWithEntry },
        ...statuses.filter(status => employee.totals.statuses[status]).map(status => ({
          label: incidentStatusLabel(status, copy), value: employee.totals.statuses[status],
        })),
        { label: copy.incomplete, value: employee.totals.incompleteDays },
      ],
      columns: [copy.day, copy.status, copy.checkIn, copy.checkOut, copy.lateMinutes, copy.notes],
      columnWidths: [15, 18, 14, 14, 12, 27], numericColumnIndices: [4],
      rows: employee.days.map(day => [
        incidentDateLabel(day.date, locale),
        [incidentStatusLabel(day.status, copy), day.correctedStatus ? copy.corrected : ''].filter(Boolean).join('\n'),
        incidentTimeLabel(day.checkIn, locale, day.date), incidentTimeLabel(day.checkOut, locale, day.date),
        day.status === 'late' ? day.minutesLate : '—',
        [day.incomplete ? copy.incomplete : '', day.notes || ''].filter(Boolean).join('\n') || '—',
      ]),
      emptyMessage: copy.empty,
    })),
  };
}

export function incidentReportPrintHtml(report: IncidentReport, employees: IncidentReportEmployee[], copy: IncidentReportCopy, locale: string, company: IncidentReportIssuer) {
  return buildStandardDocumentHtml(buildIncidentReportDocument(report, employees, copy, locale, company));
}

export function printIncidentReport(report: IncidentReport, employees: IncidentReportEmployee[], copy: IncidentReportCopy, locale: string, company: IncidentReportIssuer) {
  if (!employees.length) return false;
  return printStandardDocumentHtml(buildIncidentReportDocument(report, employees, copy, locale, company));
}
