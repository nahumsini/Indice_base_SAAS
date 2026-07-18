import type { PermissionsTranslations } from '../translations';
import type { PermissionItem } from '../types/permissions.types';
import { printStandardDocumentPdf } from '../../../shared/print/standardDocumentPdf';

const parseDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const date = (value: string | undefined, locale: string) => {
  if (!value) return '—';
  const parsed = parseDate(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);
};

export function printPermissionAuthorization({
  copy,
  locale,
  permission,
}: {
  copy: PermissionsTranslations;
  locale: string;
  permission: PermissionItem;
}) {
  const typeLabel = copy.types[permission.type] ?? copy.types.other;
  const statusLabel = copy.status[permission.status] ?? copy.status.pending;
  const treatmentLabel = copy.payrollTreatment[permission.payrollTreatment] ?? copy.payrollTreatment.paid;
  return printStandardDocumentPdf({
    accentColor: [89, 195, 165],
    confidentiality: 'Confidential',
    contract: {
      category: 'legal-document',
      modifiers: ['approval-required', 'confidential', 'employee-facing', 'signature-required'],
      orientation: 'portrait',
      pageSize: 'letter',
      version: '1.0',
    },
    fileName: { documentType: 'autorizacion-de-permiso', identifier: permission.folio },
    folio: permission.folio,
    issuer: permission.employee.department || 'Recursos Humanos',
    locale,
    metadata: [
      { label: copy.detail.type, value: typeLabel },
      { label: copy.detail.startDate, value: date(permission.startDate, locale) },
      { label: copy.detail.endDate, value: date(permission.endDate, locale) },
      { label: copy.detail.duration, value: `${permission.days} ${permission.days === 1 ? copy.detail.day : copy.detail.days}` },
      { label: copy.detail.payrollTreatment, value: treatmentLabel },
      { label: copy.detail.attachments, value: permission.attachments?.length ?? (permission.attachmentName ? 1 : 0) },
    ],
    metrics: [
      { label: copy.detail.duration, value: `${permission.days}` },
      { label: copy.detail.payrollTreatment, value: treatmentLabel },
      { label: copy.detail.reviewedBy, tone: permission.status === 'approved' ? 'positive' : permission.status === 'rejected' ? 'negative' : 'warning', value: statusLabel },
    ],
    notice: 'Documento operativo sujeto a las políticas laborales de la organización y a la normativa aplicable. La presentación no acredita por sí sola cumplimiento legal.',
    recipient: permission.employee.name,
    sections: [
      {
        fields: [
          { label: copy.detail.employeeInformation, value: permission.employee.name },
          { label: copy.detail.type, value: typeLabel },
          { label: copy.detail.payrollTreatment, value: treatmentLabel },
          { label: copy.detail.created, value: date(permission.createdAt, locale) },
        ],
        paragraphs: permission.reason ? [permission.reason] : undefined,
        title: copy.detail.reason,
      },
      {
        fields: [
          { label: copy.detail.reviewedBy, value: permission.reviewedBy?.name },
          { label: copy.detail.reviewedAt, value: date(permission.reviewedAt, locale) },
        ],
        paragraphs: permission.reviewNotes ? [permission.reviewNotes] : undefined,
        title: copy.detail.reviewNotes,
      },
    ],
    signatures: [
      { caption: permission.employee.name, label: copy.detail.employeeInformation },
      { caption: permission.reviewedBy?.name, label: copy.detail.reviewedBy },
      { label: 'Recursos Humanos' },
    ],
    status: statusLabel,
    subtitle: `${typeLabel} · ${permission.employee.name}`,
    title: 'Solicitud y autorización de permiso',
  });
}
