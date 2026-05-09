import { apiClient } from '../../../lib/apiClient';
import type { TaskRecord } from '../Tasks/tasksApi';

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
  unitId: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
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
    unitId: record.unitId ?? null,
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    createdBy: record.createdBy ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function normalizeTask(record: Partial<TaskRecord>): TaskRecord {
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
    status: record.status ?? 'pending',
    priority: record.priority ?? 'medium',
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
  return response.items.map(normalizeTask);
}
