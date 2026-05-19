import type { ApiClientError } from '../../../../lib/apiClient';
import type { BackendPermissionItem, PermissionsSummary } from '../../../../api/HumanResources/permissions';
import type { PermissionItem } from '../types/permissions.types';

export const emptyPermissionSummary: PermissionsSummary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export const mapBackendPermission = (
  permission: BackendPermissionItem,
): PermissionItem => ({
  id: String(permission.id),
  folio: permission.folio,
  employee: {
    id: permission.employee.id == null ? undefined : String(permission.employee.id),
    name: permission.employee.name,
    avatar: permission.employee.avatar ?? '',
    initials: permission.employee.initials ?? '',
    position: permission.employee.position,
    department: permission.employee.department,
  },
  type: permission.type,
  startDate: permission.startDate,
  endDate: permission.endDate,
  days: Number(permission.days ?? 0),
  halfDay: Boolean(permission.halfDay),
  status: permission.status,
  reason: permission.reason || undefined,
  attachmentName: permission.attachmentName || undefined,
  reviewNotes: permission.reviewNotes || undefined,
  reviewedAt: permission.reviewedAt || undefined,
  reviewedBy: permission.reviewedBy?.name ? permission.reviewedBy : undefined,
  createdAt: permission.createdAt || undefined,
  updatedAt: permission.updatedAt || undefined,
  attachments: permission.attachments?.map((attachment) => ({
    id: String(attachment.id),
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    downloadUrl: attachment.downloadUrl ?? null,
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt,
  })) ?? [],
});

export const isPermissionManagementRole = (role: string | null | undefined) => {
  const normalizedRole = (role ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  return [
    'root',
    'superadmin',
    'admin',
    'owner',
    'dueno',
    'manager',
    'approver',
  ].includes(normalizedRole);
};

export const formatPermissionError = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (
    error
    && typeof error === 'object'
    && 'message' in error
    && typeof (error as ApiClientError).message === 'string'
  ) {
    return (error as ApiClientError).message;
  }

  return fallbackMessage;
};
