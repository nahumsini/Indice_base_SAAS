import { apiClient } from '../../../lib/apiClient';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskRecord {
  id: number;
  companyId: number;
  processId: number | null;
  projectId: number | null;
  folio: string;
  title: string;
  description: string | null;
  assignedUserCompanyId: number | null;
  assignedUserId: number | null;
  assignedName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  completedByUserCompanyId: number | null;
  completedByUserId: number | null;
  completionNotes: string | null;
  businessId: number | null;
  unitId: number | null;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
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
  dueDate: string | null;
  businessId: number | null;
  unitId: number | null;
}

type TaskListResponse = {
  items: Partial<TaskRecord>[];
  count: number;
};

function normalizeTaskRecord(record: Partial<TaskRecord>): TaskRecord {
  return {
    id: Number(record.id ?? 0),
    companyId: Number(record.companyId ?? 0),
    processId: record.processId ?? null,
    projectId: record.projectId ?? null,
    folio: record.folio ?? '',
    title: record.title ?? '',
    description: record.description ?? null,
    assignedUserCompanyId: record.assignedUserCompanyId ?? null,
    assignedUserId: record.assignedUserId ?? null,
    assignedName: record.assignedName ?? null,
    status: (record.status as TaskStatus | undefined) ?? 'pending',
    priority: (record.priority as TaskPriority | undefined) ?? 'medium',
    dueDate: record.dueDate ?? null,
    startedAt: record.startedAt ?? null,
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    completedByUserCompanyId: record.completedByUserCompanyId ?? null,
    completedByUserId: record.completedByUserId ?? null,
    completionNotes: record.completionNotes ?? null,
    businessId: record.businessId ?? null,
    unitId: record.unitId ?? null,
    createdBy: record.createdBy ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
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

export async function completeProcessTask(taskId: number, completionNotes?: string | null) {
  const response = await apiClient<Partial<TaskRecord>>(`/api/v1/process-tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      completionNotes: completionNotes?.trim() ? completionNotes.trim() : null,
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
