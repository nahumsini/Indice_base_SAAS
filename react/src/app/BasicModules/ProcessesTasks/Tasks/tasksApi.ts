import { apiClient } from '../../../lib/apiClient';
import { uploadToPresignedStorage } from '../shared/storageUpload';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'task' | 'project-task' | 'process';
export type TaskAuditStatus = 'not_ready' | 'pending' | 'audited';
export type TaskDependencyType = 'finish_to_start';
export type TaskAssignmentRole = 'lead' | 'collaborator';
export type TaskContributionStatus = 'pending' | 'working' | 'ready';
export type TaskFollowUpType = 'update' | 'decision' | 'blocker' | 'reminder';

export interface TaskAssignee {
  userCompanyId: number;
  userId: number | null;
  name: string | null;
  email: string | null;
  role: TaskAssignmentRole;
  contributionStatus: TaskContributionStatus;
  requiredForCompletion: boolean;
  assignedAt: string | null;
  readyAt: string | null;
  isCurrentUser: boolean;
}

export interface TaskEvent {
  id: number;
  eventType: string;
  actorUserCompanyId: number | null;
  actorName: string | null;
  subjectUserCompanyId: number | null;
  subjectName: string | null;
  detail: string | null;
  createdAt: string | null;
}

export interface TaskFollowUp {
  id: number;
  taskId: number;
  authorUserCompanyId: number | null;
  authorName: string | null;
  followUpDate: string;
  entryType: TaskFollowUpType;
  comment: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaskFollowUpPayload {
  followUpDate: string;
  entryType: TaskFollowUpType;
  comment: string;
}

export interface TaskRecord {
  id: number;
  companyId: number;
  processId: number | null;
  projectId: number | null;
  processFolio: string | null;
  processTitle: string | null;
  projectFolio: string | null;
  projectName: string | null;
  project: string | null;
  taskType: TaskType;
  type: TaskType;
  folio: string;
  title: string;
  description: string | null;
  assignedUserCompanyId: number | null;
  assignedUserId: number | null;
  assignedName: string | null;
  responsible: string | null;
  assignees: TaskAssignee[];
  assigneeUserCompanyIds: number[];
  assignmentMode: 'individual' | 'team';
  completionPolicy: 'all_assignees' | 'lead';
  teamSize: number;
  teamReadyCount: number;
  teamAllReady: boolean;
  currentUserContributionStatus: TaskContributionStatus | null;
  isAssignedToCurrentUser: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  agendaDate: string | null;
  agendaStartTime: string | null;
  agendaEndTime: string | null;
  agendaTimeZone: string | null;
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
  predecessorDependencyId: number | null;
  predecessorTaskId: number | null;
  predecessorTaskFolio: string | null;
  predecessorTaskTitle: string | null;
  dependencyType: TaskDependencyType | null;
  dependencyLagDays: number;
  attachments: number;
  followUpCount: number;
  lastFollowUpAt: string | null;
  nextFollowUpDate: string | null;
}

export interface TaskPayload {
  title: string;
  description: string | null;
  processId: number | null;
  projectId: number | null;
  assignedUserCompanyId: number | null;
  assigneeUserCompanyIds: number[];
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

export interface TaskAgendaPlacementPayload {
  agendaDate: string | null;
  agendaStartTime: string | null;
  agendaEndTime?: string | null;
  agendaTimeZone?: string | null;
}

export interface TaskDependencyPayload {
  predecessorTaskId: number | null;
  dependencyType?: TaskDependencyType;
  lagDays?: number;
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

function normalizeTaskAssignee(record: Partial<TaskAssignee>): TaskAssignee {
  return {
    userCompanyId: Number(record.userCompanyId ?? 0),
    userId: record.userId ?? null,
    name: record.name ?? null,
    email: record.email ?? null,
    role: record.role === 'lead' ? 'lead' : 'collaborator',
    contributionStatus: (record.contributionStatus as TaskContributionStatus | undefined) ?? 'pending',
    requiredForCompletion: record.requiredForCompletion !== false,
    assignedAt: record.assignedAt ?? null,
    readyAt: record.readyAt ?? null,
    isCurrentUser: Boolean(record.isCurrentUser),
  };
}

function normalizeTaskEvent(record: Partial<TaskEvent>): TaskEvent {
  return {
    id: Number(record.id ?? 0),
    eventType: record.eventType ?? '',
    actorUserCompanyId: record.actorUserCompanyId ?? null,
    actorName: record.actorName ?? null,
    subjectUserCompanyId: record.subjectUserCompanyId ?? null,
    subjectName: record.subjectName ?? null,
    detail: record.detail ?? null,
    createdAt: record.createdAt ?? null,
  };
}

function normalizeTaskFollowUp(record: Partial<TaskFollowUp>): TaskFollowUp {
  return {
    id: Number(record.id ?? 0),
    taskId: Number(record.taskId ?? 0),
    authorUserCompanyId: record.authorUserCompanyId ?? null,
    authorName: record.authorName ?? null,
    followUpDate: record.followUpDate ?? '',
    entryType: (record.entryType as TaskFollowUpType | undefined) ?? 'update',
    comment: record.comment ?? '',
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

export function normalizeTaskRecord(record: Partial<TaskRecord>): TaskRecord {
  const taskType = (record.taskType ?? record.type ?? 'task') as TaskType;
  const completionPercent = Number(record.completionPercent ?? record.completion ?? 0);
  const assignees = Array.isArray(record.assignees)
    ? record.assignees.map(normalizeTaskAssignee).filter((assignee) => assignee.userCompanyId > 0)
    : [];
  const assigneeUserCompanyIds = Array.isArray(record.assigneeUserCompanyIds)
    ? record.assigneeUserCompanyIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : assignees.map((assignee) => assignee.userCompanyId);

  return {
    id: Number(record.id ?? 0),
    companyId: Number(record.companyId ?? 0),
    processId: record.processId ?? null,
    projectId: record.projectId ?? null,
    processFolio: record.processFolio ?? null,
    processTitle: record.processTitle ?? null,
    projectFolio: record.projectFolio ?? null,
    projectName: record.projectName ?? record.project ?? null,
    project: record.project ?? record.projectName ?? null,
    taskType,
    type: taskType,
    folio: record.folio ?? '',
    title: record.title ?? '',
    description: record.description ?? null,
    assignedUserCompanyId: record.assignedUserCompanyId ?? null,
    assignedUserId: record.assignedUserId ?? null,
    assignedName: record.assignedName ?? null,
    responsible: record.responsible ?? record.assignedName ?? null,
    assignees,
    assigneeUserCompanyIds,
    assignmentMode: record.assignmentMode === 'team' || assignees.length > 1 ? 'team' : 'individual',
    completionPolicy: record.completionPolicy === 'all_assignees' ? 'all_assignees' : 'lead',
    teamSize: Number(record.teamSize ?? assignees.length),
    teamReadyCount: Number(
      record.teamReadyCount ?? assignees.filter((assignee) => assignee.contributionStatus === 'ready').length,
    ),
    teamAllReady: Boolean(record.teamAllReady ?? (assignees.length > 0 && assignees.every((assignee) => assignee.contributionStatus === 'ready'))),
    currentUserContributionStatus: record.currentUserContributionStatus ?? null,
    isAssignedToCurrentUser: Boolean(record.isAssignedToCurrentUser),
    status: (record.status as TaskStatus | undefined) ?? 'pending',
    priority: (record.priority as TaskPriority | undefined) ?? 'medium',
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    agendaDate: record.agendaDate ?? null,
    agendaStartTime: record.agendaStartTime ?? null,
    agendaEndTime: record.agendaEndTime ?? null,
    agendaTimeZone: record.agendaTimeZone ?? null,
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
    predecessorDependencyId: record.predecessorDependencyId ?? null,
    predecessorTaskId: record.predecessorTaskId ?? null,
    predecessorTaskFolio: record.predecessorTaskFolio ?? null,
    predecessorTaskTitle: record.predecessorTaskTitle ?? null,
    dependencyType: (record.dependencyType as TaskDependencyType | null | undefined) ?? null,
    dependencyLagDays: Number(record.dependencyLagDays ?? 0),
    attachments: Number(record.attachments ?? 0),
    followUpCount: Number(record.followUpCount ?? 0),
    lastFollowUpAt: record.lastFollowUpAt ?? null,
    nextFollowUpDate: record.nextFollowUpDate ?? null,
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

export async function patchProcessTask(taskId: number, payload: Partial<TaskPayload>) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return normalizeTaskRecord(response);
}

export async function updateProcessTaskAgendaPlacement(taskId: number, payload: TaskAgendaPlacementPayload) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/agenda-placement`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return normalizeTaskRecord(response);
}

export async function updateProcessTaskDependencies(taskId: number, payload: TaskDependencyPayload) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/dependencies`, {
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

export async function updateProcessTaskContribution(
  taskId: number,
  contributionStatus: TaskContributionStatus,
  note?: string | null,
) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/contribution`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: contributionStatus,
      note: note?.trim() || null,
    }),
  });

  return normalizeTaskRecord(response);
}

export async function listProcessTaskEvents(taskId: number) {
  const response = await apiClient<{ items: Partial<TaskEvent>[]; count: number }>(
    `/api/v1/process-tasks/${taskId}/events`,
  );
  return response.items.map(normalizeTaskEvent);
}

export async function listProcessTaskFollowUps(taskId: number) {
  const response = await apiClient<{ items: Partial<TaskFollowUp>[]; count: number }>(
    `/api/v1/process-tasks/${taskId}/follow-ups`,
  );
  return response.items.map(normalizeTaskFollowUp);
}

export async function createProcessTaskFollowUp(taskId: number, payload: TaskFollowUpPayload) {
  const response = await apiClient<Partial<TaskFollowUp>>(`/api/v1/process-tasks/${taskId}/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeTaskFollowUp(response);
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
  return uploadToPresignedStorage(uploadUrl, file, contentType, uploadHeaders);
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
