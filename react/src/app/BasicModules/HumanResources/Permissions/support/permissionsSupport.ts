import type { ApiClientError } from '../../../../lib/apiClient';
import type {
  BackendPermissionItem,
  BackendPermissionPayrollTreatment,
  BackendPermissionStatus,
  BackendPermissionType,
  PermissionsSummary,
} from '../../../../api/HumanResources/permissions';
import type { PermissionItem } from '../types/permissions.types';

export const emptyPermissionSummary: PermissionsSummary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

const supportedPermissionTypes = new Set<BackendPermissionType>([
  'vacation',
  'sick_leave',
  'personal',
  'maternity',
  'bereavement',
  'unpaid',
  'other',
]);

const permissionTypeAliases: Record<string, BackendPermissionType> = {
  absence: 'personal',
  bereavement_leave: 'bereavement',
  leave: 'personal',
  medical: 'sick_leave',
  medical_leave: 'sick_leave',
  paid_leave: 'personal',
  paternity: 'maternity',
  sick: 'sick_leave',
  sickleave: 'sick_leave',
  time_off: 'personal',
  unpaid_leave: 'unpaid',
  unpaidleave: 'unpaid',
};

const permissionStatusAliases: Record<string, BackendPermissionStatus> = {
  accepted: 'approved',
  approved: 'approved',
  authorized: 'approved',
  denied: 'rejected',
  draft: 'pending',
  pending: 'pending',
  rejected: 'rejected',
  requested: 'pending',
};

const payrollTreatmentAliases: Record<string, BackendPermissionPayrollTreatment> = {
  con_goce: 'paid',
  paid: 'paid',
  paid_leave: 'paid',
  pagado: 'paid',
  no_pagado: 'unpaid',
  sin_goce: 'unpaid',
  unpaid: 'unpaid',
  unpaid_leave: 'unpaid',
};

const normalizeStringToken = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const normalizePermissionType = (value: unknown): BackendPermissionType => {
  const normalized = normalizeStringToken(value);

  if (supportedPermissionTypes.has(normalized as BackendPermissionType)) {
    return normalized as BackendPermissionType;
  }

  return permissionTypeAliases[normalized] ?? 'other';
};

const normalizePermissionStatus = (value: unknown): BackendPermissionStatus => {
  const normalized = normalizeStringToken(value);
  return permissionStatusAliases[normalized] ?? 'pending';
};

const normalizePayrollTreatment = (
  value: unknown,
  permissionType: BackendPermissionType,
): BackendPermissionPayrollTreatment => {
  const normalized = normalizeStringToken(value);
  return payrollTreatmentAliases[normalized] ?? (permissionType === 'unpaid' ? 'unpaid' : 'paid');
};

const buildInitials = (name: string, fallback = '') => {
  if (fallback.trim()) {
    return fallback.trim().slice(0, 3).toUpperCase();
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'NA';
};

export const mapBackendPermission = (
  permission: BackendPermissionItem,
): PermissionItem => {
  const employee = permission.employee ?? { name: 'Sin colaborador' };
  const employeeName = employee.name?.trim() || 'Sin colaborador';

  const type = normalizePermissionType(permission.type);

  return {
    id: String(permission.id),
    folio: permission.folio || `PER-${permission.id}`,
    employee: {
      id: employee.id == null ? undefined : String(employee.id),
      name: employeeName,
      avatar: employee.avatar ?? '',
      initials: buildInitials(employeeName, employee.initials ?? ''),
      position: employee.position,
      department: employee.department,
    },
    type,
    payrollTreatment: normalizePayrollTreatment(permission.payrollTreatment, type),
    startDate: permission.startDate,
    endDate: permission.endDate,
    days: Number(permission.days ?? 0),
    halfDay: Boolean(permission.halfDay),
    status: normalizePermissionStatus(permission.status),
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
  };
};

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
