import { apiClient } from '../../../lib/apiClient';
import type { TaskAuditStatus, TaskPriority, TaskStatus, TaskType } from '../Tasks/tasksApi';

export interface AgendaTaskItem {
  id: number;
  taskId: number;
  taskType: TaskType;
  type: TaskType;
  folio: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  agendaDate: string;
  startDate: string | null;
  dueDate: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  completedByUserCompanyId: number | null;
  completedByUserId: number | null;
  completedByName: string | null;
  closedByName: string | null;
  completionNotes: string | null;
  assignedUserCompanyId: number | null;
  assignedUserId: number | null;
  assignedName: string | null;
  responsible: string | null;
  processId: number | null;
  processFolio: string | null;
  processTitle: string | null;
  projectId: number | null;
  projectFolio: string | null;
  projectName: string | null;
  project: string | null;
  businessId: number | null;
  businessName: string | null;
  business: string | null;
  unitId: number | null;
  unitName: string | null;
  unit: string | null;
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
  createdBy: number | null;
  createdByName: string | null;
  creator: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attachments: number;
  isOverdue: boolean;
}

type AgendaListResponse = {
  items: Partial<AgendaTaskItem>[];
  count: number;
  from: string;
  to: string;
};

function normalizeAgendaTask(record: Partial<AgendaTaskItem>): AgendaTaskItem {
  const taskType = (record.taskType ?? record.type ?? 'task') as TaskType;
  const completionPercent = Number(record.completionPercent ?? record.completion ?? 0);
  const auditStatus =
    record.auditStatus ??
    (record.audited ? 'audited' : record.status === 'completed' ? 'pending' : 'not_ready');

  return {
    id: Number(record.id ?? 0),
    taskId: Number(record.taskId ?? record.id ?? 0),
    taskType,
    type: taskType,
    folio: record.folio ?? '',
    title: record.title ?? '',
    description: record.description ?? null,
    status: record.status ?? 'pending',
    priority: record.priority ?? 'medium',
    agendaDate: record.agendaDate ?? record.dueDate ?? '',
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? record.agendaDate ?? '',
    startedAt: record.startedAt ?? null,
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    completedByUserCompanyId: record.completedByUserCompanyId ?? null,
    completedByUserId: record.completedByUserId ?? null,
    completedByName: record.completedByName ?? record.closedByName ?? null,
    closedByName: record.closedByName ?? record.completedByName ?? null,
    completionNotes: record.completionNotes ?? null,
    assignedUserCompanyId: record.assignedUserCompanyId ?? null,
    assignedUserId: record.assignedUserId ?? null,
    assignedName: record.assignedName ?? null,
    responsible: record.responsible ?? record.assignedName ?? null,
    processId: record.processId ?? null,
    processFolio: record.processFolio ?? null,
    processTitle: record.processTitle ?? null,
    projectId: record.projectId ?? null,
    projectFolio: record.projectFolio ?? null,
    projectName: record.projectName ?? null,
    project: record.project ?? record.projectName ?? null,
    businessId: record.businessId ?? null,
    businessName: record.businessName ?? record.business ?? null,
    business: record.business ?? record.businessName ?? null,
    unitId: record.unitId ?? null,
    unitName: record.unitName ?? record.unit ?? null,
    unit: record.unit ?? record.unitName ?? null,
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
    auditStatus,
    createdBy: record.createdBy ?? null,
    createdByName: record.createdByName ?? record.creator ?? null,
    creator: record.creator ?? record.createdByName ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
    attachments: Number(record.attachments ?? 0),
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
