import { apiClient } from '../../../lib/apiClient';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'task' | 'project-task' | 'process';
export type TaskAuditStatus = 'not_ready' | 'pending' | 'audited';

export interface TaskRecord {
  id: number;
  companyId: number;
  processId: number | null;
  projectId: number | null;
  taskType: TaskType;
  type: TaskType;
  folio: string;
  title: string;
  description: string | null;
  assignedUserCompanyId: number | null;
  assignedUserId: number | null;
  assignedName: string | null;
  responsible: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  completedByUserCompanyId: number | null;
  completedByUserId: number | null;
  completedByName: string | null;
  closedByName: string | null;
  completionNotes: string | null;
  notes: string | null;
  completionPercent: number;
  completion: number;
  weighting: number | null;
  audited: boolean;
  auditNotes: string | null;
  auditedAt: string | null;
  auditedByUserCompanyId: number | null;
  auditedByUserId: number | null;
  auditedByName: string | null;
  auditStatus: TaskAuditStatus;
  businessId: number | null;
  businessName: string | null;
  business: string | null;
  unitId: number | null;
  unitName: string | null;
  unit: string | null;
  createdBy: number | null;
  createdByName: string | null;
  creator: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attachments: number;
}

export interface TaskPayload {
  title: string;
  description: string | null;
  processId: number | null;
  projectId: number | null;
  assignedUserCompanyId: number | null;
  assignedName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  notes: string | null;
  completionPercent: number | null;
  weighting: number | null;
  audited: boolean;
  auditNotes: string | null;
  businessId: number | null;
  unitId: number | null;
}

export interface TaskAttachmentRecord {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  downloadUrl: string | null;
  uploadedByUserId: number | null;
  uploadedByName: string | null;
  createdAt: string | null;
}

export interface TaskAttachmentPresignPayload {
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface TaskAttachmentPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers?: Record<string, string>;
}

export interface RegisterTaskAttachmentPayload {
  object_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

type TaskListResponse = {
  items: Partial<TaskRecord>[];
  count: number;
};

type TaskAttachmentListResponse = {
  items: Partial<TaskAttachmentRecord & {
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    object_key: string;
    download_url: string | null;
    uploaded_by_user_id: number | null;
    uploaded_by_name: string | null;
    created_at: string | null;
  }>[];
  count: number;
};

function deriveAuditStatus(record: Partial<TaskRecord>): TaskAuditStatus {
  if (record.audited) {
    return 'audited';
  }

  if (record.status === 'completed') {
    return 'pending';
  }

  return 'not_ready';
}

export function normalizeTaskRecord(record: Partial<TaskRecord>): TaskRecord {
  const taskType = (record.taskType ?? record.type ?? 'task') as TaskType;
  const completionPercent = Number(record.completionPercent ?? record.completion ?? 0);

  return {
    id: Number(record.id ?? 0),
    companyId: Number(record.companyId ?? 0),
    processId: record.processId ?? null,
    projectId: record.projectId ?? null,
    taskType,
    type: taskType,
    folio: record.folio ?? '',
    title: record.title ?? '',
    description: record.description ?? null,
    assignedUserCompanyId: record.assignedUserCompanyId ?? null,
    assignedUserId: record.assignedUserId ?? null,
    assignedName: record.assignedName ?? null,
    responsible: record.responsible ?? record.assignedName ?? null,
    status: (record.status as TaskStatus | undefined) ?? 'pending',
    priority: (record.priority as TaskPriority | undefined) ?? 'medium',
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    startedAt: record.startedAt ?? null,
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    completedByUserCompanyId: record.completedByUserCompanyId ?? null,
    completedByUserId: record.completedByUserId ?? null,
    completedByName: record.completedByName ?? record.closedByName ?? null,
    closedByName: record.closedByName ?? record.completedByName ?? null,
    completionNotes: record.completionNotes ?? null,
    notes: record.notes ?? null,
    completionPercent,
    completion: completionPercent,
    weighting: record.weighting ?? null,
    audited: Boolean(record.audited),
    auditNotes: record.auditNotes ?? null,
    auditedAt: record.auditedAt ?? null,
    auditedByUserCompanyId: record.auditedByUserCompanyId ?? null,
    auditedByUserId: record.auditedByUserId ?? null,
    auditedByName: record.auditedByName ?? null,
    auditStatus: record.auditStatus ?? deriveAuditStatus(record),
    businessId: record.businessId ?? null,
    businessName: record.businessName ?? record.business ?? null,
    business: record.business ?? record.businessName ?? null,
    unitId: record.unitId ?? null,
    unitName: record.unitName ?? record.unit ?? null,
    unit: record.unit ?? record.unitName ?? null,
    createdBy: record.createdBy ?? null,
    createdByName: record.createdByName ?? record.creator ?? null,
    creator: record.creator ?? record.createdByName ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
    attachments: Number(record.attachments ?? 0),
  };
}

export function normalizeTaskAttachment(
  record: Partial<TaskAttachmentRecord> & {
    original_filename?: string;
    mime_type?: string;
    size_bytes?: number;
    object_key?: string;
    download_url?: string | null;
    uploaded_by_user_id?: number | null;
    uploaded_by_name?: string | null;
    created_at?: string | null;
  },
): TaskAttachmentRecord {
  return {
    id: Number(record.id ?? 0),
    originalFilename: record.originalFilename ?? record.original_filename ?? '',
    mimeType: record.mimeType ?? record.mime_type ?? '',
    sizeBytes: Number(record.sizeBytes ?? record.size_bytes ?? 0),
    objectKey: record.objectKey ?? record.object_key ?? '',
    downloadUrl: record.downloadUrl ?? record.download_url ?? null,
    uploadedByUserId: record.uploadedByUserId ?? record.uploaded_by_user_id ?? null,
    uploadedByName: record.uploadedByName ?? record.uploaded_by_name ?? null,
    createdAt: record.createdAt ?? record.created_at ?? null,
  };
}

export async function listProcessTasks() {
  const response = await apiClient<TaskListResponse>('/api/v1/process-tasks');
  return response.items.map(normalizeTaskRecord);
}

export async function createProcessTask(payload: TaskPayload) {
  const response = await apiClient<Partial<TaskRecord>>('/api/v1/process-tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return normalizeTaskRecord(response);
}

export async function updateProcessTask(taskId: number, payload: TaskPayload) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return normalizeTaskRecord(response);
}

export async function completeProcessTask(
  taskId: number,
  completionNotes?: string | null,
  completionPercent?: number | null,
) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      completionNotes: completionNotes?.trim() ? completionNotes.trim() : null,
      completionPercent: completionPercent ?? null,
    }),
  });

  return normalizeTaskRecord(response);
}

export async function auditProcessTask(
  taskId: number,
  weighting: number,
  auditNotes?: string | null,
) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/audit`, {
    method: 'POST',
    body: JSON.stringify({
      weighting,
      auditNotes: auditNotes?.trim() ? auditNotes.trim() : null,
    }),
  });

  return normalizeTaskRecord(response);
}

export async function cancelProcessTask(taskId: number) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/cancel`, {
    method: 'POST',
  });

  return normalizeTaskRecord(response);
}

export async function deleteProcessTask(taskId: number) {
  return apiClient<{ success: boolean }>(`/api/v1/process-tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function listTaskAttachments(taskId: number) {
  const response = await apiClient<TaskAttachmentListResponse>(`/api/v1/process-tasks/${taskId}/attachments`);
  return response.items.map(normalizeTaskAttachment);
}

export async function presignTaskAttachmentUpload(taskId: number, payload: TaskAttachmentPresignPayload) {
  return apiClient<TaskAttachmentPresignResponse>(`/api/v1/process-tasks/${taskId}/attachments/presign-upload`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadTaskAttachment(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  uploadHeaders: Record<string, string> = {},
) {
  const headers = new Headers(uploadHeaders);

  if (contentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', contentType);
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error('Task attachment upload failed.');
  }
}

export async function registerTaskAttachment(taskId: number, payload: RegisterTaskAttachmentPayload) {
  const response = await apiClient<Partial<TaskAttachmentRecord>>(
    `/api/v1/process-tasks/${taskId}/attachments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return normalizeTaskAttachment(response);
}

export async function deleteTaskAttachment(taskId: number, attachmentId: number) {
  return apiClient<{ success: boolean }>(`/api/v1/process-tasks/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}
