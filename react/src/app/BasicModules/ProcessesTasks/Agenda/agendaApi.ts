import { apiClient } from '../../../lib/apiClient';
import type { TaskPriority, TaskStatus } from '../Tasks/tasksApi';

export interface AgendaTaskItem {
  id: number;
  taskId: number;
  folio: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  agendaDate: string;
  dueDate: string;
  completedAt: string | null;
  cancelledAt: string | null;
  assignedEmployeeId: number | null;
  assignedUserId: number | null;
  assignedName: string | null;
  processId: number | null;
  processFolio: string | null;
  processTitle: string | null;
  projectId: number | null;
  projectFolio: string | null;
  projectName: string | null;
  businessId: number | null;
  unitId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  isOverdue: boolean;
}

type AgendaListResponse = {
  items: Partial<AgendaTaskItem>[];
  count: number;
  from: string;
  to: string;
};

function normalizeAgendaTask(record: Partial<AgendaTaskItem>): AgendaTaskItem {
  return {
    id: Number(record.id ?? 0),
    taskId: Number(record.taskId ?? record.id ?? 0),
    folio: record.folio ?? '',
    title: record.title ?? '',
    description: record.description ?? null,
    status: record.status ?? 'pending',
    priority: record.priority ?? 'medium',
    agendaDate: record.agendaDate ?? record.dueDate ?? '',
    dueDate: record.dueDate ?? record.agendaDate ?? '',
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    assignedEmployeeId: record.assignedEmployeeId ?? null,
    assignedUserId: record.assignedUserId ?? null,
    assignedName: record.assignedName ?? null,
    processId: record.processId ?? null,
    processFolio: record.processFolio ?? null,
    processTitle: record.processTitle ?? null,
    projectId: record.projectId ?? null,
    projectFolio: record.projectFolio ?? null,
    projectName: record.projectName ?? null,
    businessId: record.businessId ?? null,
    unitId: record.unitId ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
    isOverdue: Boolean(record.isOverdue),
  };
}

export async function listAgendaTasks(from?: string, to?: string) {
  const params = new URLSearchParams();

  if (from) {
    params.set('from', from);
  }

  if (to) {
    params.set('to', to);
  }

  const query = params.toString();
  const response = await apiClient<AgendaListResponse>(`/api/v1/agenda${query ? `?${query}` : ''}`);

  return {
    items: response.items.map(normalizeAgendaTask),
    count: response.count,
    from: response.from,
    to: response.to,
  };
}
