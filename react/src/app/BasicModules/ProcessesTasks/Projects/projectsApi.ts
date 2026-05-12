import { apiClient } from '../../../lib/apiClient';
import { normalizeTaskRecord, type TaskRecord } from '../Tasks/tasksApi';

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high';

export interface ProjectRecord {
  id: number;
  companyId: number;
  folio: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  ownerUserCompanyId: number | null;
  ownerUserId: number | null;
  ownerName: string | null;
  businessId: number | null;
  businessName: string | null;
  business: string | null;
  unitId: number | null;
  unitName: string | null;
  unit: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  taskCount: number;
  tasks: number;
  openTaskCount: number;
  openTasks: number;
  completedTaskCount: number;
  completedTasks: number;
  overdueTaskCount: number;
  overdueTasks: number;
  auditedTaskCount: number;
  auditedTasks: number;
  completionPercent: number;
  progress: number;
}

export interface ProjectPayload {
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  ownerUserCompanyId: number | null;
  ownerName: string | null;
  businessId: number | null;
  unitId: number | null;
  startDate: string | null;
  dueDate: string | null;
}

type ProjectListResponse = {
  items: Partial<ProjectRecord>[];
  count: number;
};

type TaskListResponse = {
  items: Partial<TaskRecord>[];
  count: number;
};

function normalizeProject(record: Partial<ProjectRecord>): ProjectRecord {
  const taskCount = Number(record.taskCount ?? record.tasks ?? 0);
  const openTaskCount = Number(record.openTaskCount ?? record.openTasks ?? 0);
  const completedTaskCount = Number(record.completedTaskCount ?? record.completedTasks ?? 0);
  const overdueTaskCount = Number(record.overdueTaskCount ?? record.overdueTasks ?? 0);
  const auditedTaskCount = Number(record.auditedTaskCount ?? record.auditedTasks ?? 0);
  const completionPercent = Number(
    record.completionPercent ?? record.progress ?? (record.status === 'completed' ? 100 : 0),
  );

  return {
    id: Number(record.id ?? 0),
    companyId: Number(record.companyId ?? 0),
    folio: record.folio ?? '',
    name: record.name ?? '',
    description: record.description ?? null,
    status: (record.status as ProjectStatus | undefined) ?? 'active',
    priority: (record.priority as ProjectPriority | null | undefined) ?? null,
    ownerUserCompanyId: record.ownerUserCompanyId ?? null,
    ownerUserId: record.ownerUserId ?? null,
    ownerName: record.ownerName ?? null,
    businessId: record.businessId ?? null,
    businessName: record.businessName ?? record.business ?? null,
    business: record.business ?? record.businessName ?? null,
    unitId: record.unitId ?? null,
    unitName: record.unitName ?? record.unit ?? null,
    unit: record.unit ?? record.unitName ?? null,
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    createdBy: record.createdBy ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
    taskCount,
    tasks: taskCount,
    openTaskCount,
    openTasks: openTaskCount,
    completedTaskCount,
    completedTasks: completedTaskCount,
    overdueTaskCount,
    overdueTasks: overdueTaskCount,
    auditedTaskCount,
    auditedTasks: auditedTaskCount,
    completionPercent,
    progress: completionPercent,
  };
}

export async function listProjects() {
  const response = await apiClient<ProjectListResponse>('/api/v1/projects');
  return response.items.map(normalizeProject);
}

export async function createProject(payload: ProjectPayload) {
  const response = await apiClient<Partial<ProjectRecord>>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return normalizeProject(response);
}

export async function updateProject(projectId: number, payload: ProjectPayload) {
  const response = await apiClient<Partial<ProjectRecord>>(`/api/v1/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return normalizeProject(response);
}

export async function deleteProject(projectId: number) {
  return apiClient<{ success: boolean }>(`/api/v1/projects/${projectId}`, {
    method: 'DELETE',
  });
}

export async function completeProject(projectId: number) {
  const response = await apiClient<Partial<ProjectRecord>>(`/api/v1/projects/${projectId}/complete`, {
    method: 'POST',
  });

  return normalizeProject(response);
}

export async function cancelProject(projectId: number) {
  const response = await apiClient<Partial<ProjectRecord>>(`/api/v1/projects/${projectId}/cancel`, {
    method: 'POST',
  });

  return normalizeProject(response);
}

export async function listProjectTasks(projectId: number) {
  const response = await apiClient<TaskListResponse>(`/api/v1/projects/${projectId}/tasks`);
  return response.items.map(normalizeTaskRecord);
}
